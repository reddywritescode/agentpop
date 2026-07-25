package main

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
	runtimeapi "github.com/reddywritescode/agentpop/internal/runtime"
)

const version = "0.1.0"

type server struct {
	driver   runtimeapi.Driver
	registry *runtimeapi.Registry
	image    string
}

func main() {
	logger := log.New(os.Stdout, "host-agent ", log.LstdFlags|log.LUTC)
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	stateDir := env("HOST_STATE_DIR", ".local/host-agent")
	cfg := runtimeapi.Config{
		Mode:              env("RUNTIME_DRIVER", "auto"),
		HostID:            env("HOST_ID", "local-docker"),
		HostName:          env("HOST_NAME", "Local data plane"),
		Region:            env("HOST_REGION", "local"),
		HostSSHCommand:    os.Getenv("HOST_SSH_COMMAND"),
		DockerImage:       env("DOCKER_SANDBOX_IMAGE", "agentpop/devbox:local"),
		DockerBinary:      env("DOCKER_BINARY", "docker"),
		SSHPrivateKeyPath: env("SANDBOX_SSH_KEY", ".local/ssh/id_ed25519"),
		FirecrackerBinary: env("FIRECRACKER_BINARY", "/usr/local/bin/firecracker"),
		JailerBinary:      env("JAILER_BINARY", "/usr/local/bin/jailer"),
		KernelImagePath:   os.Getenv("FIRECRACKER_KERNEL"),
		RootFSPath:        os.Getenv("FIRECRACKER_ROOTFS"),
		StateDirectory:    env("FIRECRACKER_STATE_DIR", "/var/lib/agentpop"),
	}
	driver, err := runtimeapi.NewDriver(ctx, cfg)
	if err != nil {
		logger.Fatalf("runtime preflight failed: %v", err)
	}
	registry, err := runtimeapi.OpenRegistry(filepath.Join(stateDir, "registry.json"))
	if err != nil {
		logger.Fatalf("open runtime registry: %v", err)
	}
	srv := &server{driver: driver, registry: registry, image: cfg.DockerImage}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", srv.health)
	mux.HandleFunc("GET /v1/host", srv.hostInfo)
	mux.HandleFunc("GET /v1/runtime/sandboxes", srv.list)
	mux.HandleFunc("POST /v1/runtime/sandboxes", srv.create)
	mux.HandleFunc("GET /v1/runtime/sandboxes/{id}", srv.inspect)
	mux.HandleFunc("PATCH /v1/runtime/sandboxes/{id}", srv.update)
	mux.HandleFunc("PUT /v1/runtime/sandboxes/{id}/secrets", srv.setSecrets)
	mux.HandleFunc("POST /v1/runtime/sandboxes/{id}/exec", srv.exec)
	mux.HandleFunc("PUT /v1/runtime/sandboxes/{id}/files", srv.writeFile)
	mux.HandleFunc("GET /v1/runtime/sandboxes/{id}/files", srv.readFile)
	mux.HandleFunc("POST /v1/runtime/sandboxes/{id}/pause", srv.pause)
	mux.HandleFunc("POST /v1/runtime/sandboxes/{id}/resume", srv.resume)
	mux.HandleFunc("POST /v1/runtime/sandboxes/{id}/commit", srv.commit)
	mux.HandleFunc("DELETE /v1/runtime/images", srv.removeImage)
	mux.HandleFunc("DELETE /v1/runtime/sandboxes/{id}", srv.destroy)

	addr := env("HOST_AGENT_ADDR", "127.0.0.1:9090")
	hostToken := os.Getenv("HOST_AGENT_TOKEN")
	if hostToken == "" && (cfg.Mode == "firecracker" || !loopbackAddress(addr)) {
		logger.Fatal("HOST_AGENT_TOKEN is required for Firecracker or non-loopback data-plane listeners")
	}
	httpServer := &http.Server{
		Addr:              addr,
		Handler:           apiutil.RequestID(apiutil.CORS(hostAuth(mux, hostToken))),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       90 * time.Second,
	}
	go func() {
		logger.Printf("version=%s driver=%s listen=%s", version, driver.Name(), addr)
		if err := httpServer.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			logger.Fatalf("serve: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	info := s.driver.HostInfo(r.Context())
	status := http.StatusOK
	if !info.Healthy {
		status = http.StatusServiceUnavailable
	}
	apiutil.WriteJSON(w, status, map[string]any{
		"healthy": info.Healthy,
		"driver":  info.Driver,
		"hostId":  info.ID,
	})
}

func (s *server) hostInfo(w http.ResponseWriter, r *http.Request) {
	info := s.driver.HostInfo(r.Context())
	items := s.registry.Refresh(func(id string) (model.RuntimeSandbox, error) {
		return s.driver.Inspect(r.Context(), id)
	})
	for _, item := range items {
		info.Capacity.AllocatedVCPU += item.VCPU
		info.Capacity.AllocatedMemMB += item.MemoryMB
	}
	info.Capacity.Sandboxes = len(items)
	apiutil.WriteJSON(w, http.StatusOK, info)
}

func (s *server) list(w http.ResponseWriter, r *http.Request) {
	items := s.registry.Refresh(func(id string) (model.RuntimeSandbox, error) {
		return s.driver.Inspect(r.Context(), id)
	})
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *server) create(w http.ResponseWriter, r *http.Request) {
	var req model.RuntimeCreateRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.ID == "" || req.Name == "" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "id and name are required")
		return
	}
	existed := false
	if _, exists := s.registry.Get(req.ID); exists {
		existed = true
		item, err := s.driver.Inspect(r.Context(), req.ID)
		if err == nil && item.Status != model.StatusFailed {
			apiutil.WriteJSON(w, http.StatusOK, item)
			return
		}
	}
	if req.Image == "" {
		req.Image = s.image
	}
	if req.VCPU <= 0 {
		req.VCPU = 1
	}
	if req.MemoryMB <= 0 {
		req.MemoryMB = 1024
	}
	if req.DiskGB <= 0 {
		req.DiskGB = 10
	}
	item, err := s.driver.Create(r.Context(), req)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_create_failed", err.Error())
		return
	}
	if err := s.registry.Put(item); err != nil {
		_ = s.driver.Destroy(r.Context(), req.ID)
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	status := http.StatusCreated
	if existed {
		status = http.StatusOK
	}
	apiutil.WriteJSON(w, status, item)
}

func (s *server) inspect(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	item, err := s.driver.Inspect(r.Context(), id)
	if errors.Is(err, runtimeapi.ErrNotFound) {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox runtime not found")
		return
	}
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_inspect_failed", err.Error())
		return
	}
	_ = s.registry.Put(item)
	apiutil.WriteJSON(w, http.StatusOK, item)
}

func (s *server) update(w http.ResponseWriter, r *http.Request) {
	var req model.RuntimeUpdateRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	item, err := s.driver.Update(r.Context(), r.PathValue("id"), req)
	if err != nil {
		apiutil.WriteError(w, http.StatusConflict, "runtime_update_failed", err.Error())
		return
	}
	if err := s.registry.Put(item); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, item)
}

func (s *server) setSecrets(w http.ResponseWriter, r *http.Request) {
	var req model.RuntimeSecretsRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.Secrets == nil {
		req.Secrets = map[string]string{}
	}
	if err := s.driver.SetSecrets(r.Context(), r.PathValue("id"), req); err != nil {
		apiutil.WriteError(w, http.StatusConflict, "runtime_secrets_failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) exec(w http.ResponseWriter, r *http.Request) {
	var req model.ExecRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.Command == "" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "command is required")
		return
	}
	result, err := s.driver.Exec(r.Context(), r.PathValue("id"), req)
	if err != nil && result.ExitCode == 0 {
		apiutil.WriteError(w, http.StatusInternalServerError, "exec_failed", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, result)
}

func (s *server) writeFile(w http.ResponseWriter, r *http.Request) {
	guestPath, err := runtimeapi.NormalizeGuestFilePath(r.URL.Query().Get("path"))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_path", err.Error())
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 32<<20)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		apiutil.WriteError(w, http.StatusRequestEntityTooLarge, "file_too_large", "file must not exceed 32 MiB")
		return
	}
	if err := s.driver.WriteFile(r.Context(), r.PathValue("id"), guestPath, data); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "file_write_failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) readFile(w http.ResponseWriter, r *http.Request) {
	guestPath, err := runtimeapi.NormalizeGuestFilePath(r.URL.Query().Get("path"))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_path", err.Error())
		return
	}
	data, err := s.driver.ReadFile(r.Context(), r.PathValue("id"), guestPath)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "file_read_failed", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *server) pause(w http.ResponseWriter, r *http.Request) {
	s.lifecycle(w, r, s.driver.Pause)
}

func (s *server) resume(w http.ResponseWriter, r *http.Request) {
	s.lifecycle(w, r, s.driver.Resume)
}

func (s *server) lifecycle(
	w http.ResponseWriter,
	r *http.Request,
	action func(context.Context, string) (model.RuntimeSandbox, error),
) {
	item, err := action(r.Context(), r.PathValue("id"))
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_action_failed", err.Error())
		return
	}
	if err := s.registry.Put(item); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, item)
}

func (s *server) commit(w http.ResponseWriter, r *http.Request) {
	var req model.RuntimeCommitRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if strings.TrimSpace(req.Reference) == "" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "reference is required")
		return
	}
	image, err := s.driver.Commit(r.Context(), r.PathValue("id"), req)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_commit_failed", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusCreated, image)
}

func (s *server) removeImage(w http.ResponseWriter, r *http.Request) {
	ref := strings.TrimSpace(r.URL.Query().Get("ref"))
	if ref == "" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "ref query parameter is required")
		return
	}
	if err := s.driver.RemoveImage(r.Context(), ref); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_image_remove_failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) destroy(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := s.driver.Destroy(r.Context(), id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_destroy_failed", err.Error())
		return
	}
	if err := s.registry.Delete(id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func hostAuth(next http.Handler, expected string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || expected == "" {
			next.ServeHTTP(w, r)
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+expected {
			apiutil.WriteError(w, http.StatusUnauthorized, "unauthorized", "valid host-agent token required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loopbackAddress(addr string) bool {
	return strings.HasPrefix(addr, "127.") || strings.HasPrefix(addr, "localhost:") || strings.HasPrefix(addr, "[::1]:")
}
