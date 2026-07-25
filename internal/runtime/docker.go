package runtime

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	goruntime "runtime"
	"strconv"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/model"
)

type DockerDriver struct {
	cfg Config
}

func NewDockerDriver(cfg Config) (*DockerDriver, error) {
	if cfg.DockerBinary == "" {
		cfg.DockerBinary = "docker"
	}
	if cfg.DockerImage == "" {
		cfg.DockerImage = "agentpop/devbox:local"
	}
	if cfg.SSHPrivateKeyPath == "" {
		cfg.SSHPrivateKeyPath = ".local/ssh/id_ed25519"
	}
	return &DockerDriver{cfg: cfg}, nil
}

func (d *DockerDriver) Name() string { return "docker" }

func (d *DockerDriver) HostInfo(ctx context.Context) model.HostInfo {
	healthy := commandWorks(ctx, d.cfg.DockerBinary, "info")
	message := "Docker Engine is ready"
	if !healthy {
		message = "Docker Engine is unavailable"
	}
	capacity := model.HostCapacity{CPUCores: goruntime.NumCPU()}
	if output, _, err := d.run(ctx, "info", "--format", "{{.NCPU}} {{.MemTotal}}"); err == nil {
		fields := strings.Fields(output)
		if len(fields) == 2 {
			if cpu, parseErr := strconv.Atoi(fields[0]); parseErr == nil {
				capacity.CPUCores = cpu
			}
			if memoryBytes, parseErr := strconv.ParseInt(fields[1], 10, 64); parseErr == nil {
				capacity.MemoryMB = memoryBytes / 1024 / 1024
			}
		}
	}
	return model.HostInfo{
		ID:           valueOr(d.cfg.HostID, "local-docker"),
		Name:         valueOr(d.cfg.HostName, "Local Docker data plane"),
		Region:       valueOr(d.cfg.Region, "local"),
		Driver:       d.Name(),
		OS:           goruntime.GOOS,
		Architecture: goruntime.GOARCH,
		Healthy:      healthy,
		KVMAvailable: fileExists("/dev/kvm"),
		Message:      message,
		SSHCommand:   d.cfg.HostSSHCommand,
		Capacity:     capacity,
		UpdatedAt:    time.Now().UTC(),
	}
}

func (d *DockerDriver) Create(ctx context.Context, req model.RuntimeCreateRequest) (model.RuntimeSandbox, error) {
	if err := d.ensureSSHKey(ctx); err != nil {
		return model.RuntimeSandbox{}, err
	}
	publicKey, err := os.ReadFile(d.cfg.SSHPrivateKeyPath + ".pub")
	if err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("read sandbox SSH public key: %w", err)
	}
	if !commandWorks(ctx, d.cfg.DockerBinary, "image", "inspect", req.Image) {
		return model.RuntimeSandbox{}, fmt.Errorf("runtime image %q is not available; run `make devbox-image`", req.Image)
	}

	name := containerName(req.ID)
	_ = d.Destroy(ctx, req.ID)

	args := []string{
		"run", "-d",
		"--name", name,
		"--hostname", sanitizeName(req.Name),
		"--label", "agentpop.managed=true",
		"--label", "agentpop.sandbox.id=" + req.ID,
		"--label", "agentpop.disk.gb=" + strconv.FormatInt(req.DiskGB, 10),
		"--cpus", strconv.FormatFloat(req.VCPU, 'f', -1, 64),
		"--memory", fmt.Sprintf("%dm", req.MemoryMB),
		"--memory-swap", fmt.Sprintf("%dm", req.MemoryMB),
		"--pids-limit", "1024",
		"--security-opt", "no-new-privileges",
		"-p", "127.0.0.1::22",
		"-e", "AUTHORIZED_KEY=" + strings.TrimSpace(string(publicKey)),
		"-e", "SANDBOX_NAME=" + req.Name,
	}
	for key, value := range req.Environment {
		if validEnvironmentKey(key) {
			args = append(args, "-e", key+"="+value)
		}
	}
	args = append(args, req.Image)
	output, stderr, err := d.run(ctx, args...)
	if err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("create Docker sandbox: %w: %s", err, stderr)
	}
	runtimeID := strings.TrimSpace(output)
	port, err := d.waitMappedPort(ctx, name, "22/tcp", 5*time.Second)
	if err != nil {
		_ = d.Destroy(ctx, req.ID)
		return model.RuntimeSandbox{}, err
	}
	if err := d.SetSecrets(ctx, req.ID, model.RuntimeSecretsRequest{Secrets: req.Secrets}); err != nil {
		_ = d.Destroy(ctx, req.ID)
		return model.RuntimeSandbox{}, err
	}
	ip, _, _ := d.run(ctx, "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", name)
	ssh := &model.SSHAccess{
		Host:           "127.0.0.1",
		Port:           port,
		User:           "root",
		PrivateKeyPath: d.cfg.SSHPrivateKeyPath,
	}
	ssh.Command = fmt.Sprintf(
		"ssh -o LogLevel=ERROR -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i %s -p %d root@127.0.0.1",
		shellQuote(d.cfg.SSHPrivateKeyPath),
		port,
	)
	return model.RuntimeSandbox{
		ID:          req.ID,
		RuntimeID:   runtimeID,
		RuntimeName: name,
		Driver:      d.Name(),
		Status:      model.StatusRunning,
		VCPU:        req.VCPU,
		MemoryMB:    req.MemoryMB,
		DiskGB:      req.DiskGB,
		PrivateIP:   strings.TrimSpace(ip),
		SSH:         ssh,
		StartedAt:   time.Now().UTC(),
	}, nil
}

func (d *DockerDriver) SetSecrets(ctx context.Context, id string, req model.RuntimeSecretsRequest) error {
	profile, err := renderSecretProfile(req.Secrets)
	if err != nil {
		return err
	}
	_, stderr, err := d.runInput(
		ctx,
		profile,
		"exec", "-i", containerName(id), "/bin/sh", "-c",
		"install -d -m 0700 /etc/agentpop /etc/profile.d && umask 077 && cat > /etc/agentpop/model-secrets.sh && cp /etc/agentpop/model-secrets.sh /etc/profile.d/agentpop-model-secrets.sh && chmod 0600 /etc/agentpop/model-secrets.sh /etc/profile.d/agentpop-model-secrets.sh",
	)
	if err != nil {
		return fmt.Errorf("update Docker sandbox secrets: %w: %s", err, strings.TrimSpace(stderr))
	}
	return nil
}

func (d *DockerDriver) Update(ctx context.Context, id string, req model.RuntimeUpdateRequest) (model.RuntimeSandbox, error) {
	if req.VCPU <= 0 || req.MemoryMB <= 0 {
		return model.RuntimeSandbox{}, fmt.Errorf("vcpu and memoryMb must be greater than zero")
	}
	_, stderr, err := d.run(
		ctx,
		"update",
		"--cpus", strconv.FormatFloat(req.VCPU, 'f', -1, 64),
		"--memory", fmt.Sprintf("%dm", req.MemoryMB),
		"--memory-swap", fmt.Sprintf("%dm", req.MemoryMB),
		containerName(id),
	)
	if err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("update sandbox resources: %w: %s", err, stderr)
	}
	return d.Inspect(ctx, id)
}

func (d *DockerDriver) Exec(ctx context.Context, id string, req model.ExecRequest) (model.ExecResult, error) {
	timeout := time.Duration(req.TimeoutSeconds) * time.Second
	if timeout <= 0 || timeout > 10*time.Minute {
		timeout = 2 * time.Minute
	}
	execCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	started := time.Now().UTC()
	command := ". /etc/profile.d/agentpop-model-secrets.sh 2>/dev/null || true; exec /bin/sh -lc " + shellQuote(req.Command)
	stdout, stderr, err := d.run(execCtx, "exec", containerName(id), "/bin/sh", "-lc", command)
	finished := time.Now().UTC()
	exitCode := 0
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}
	return model.ExecResult{
		ExitCode:   exitCode,
		Stdout:     stdout,
		Stderr:     stderr,
		DurationMS: finished.Sub(started).Milliseconds(),
		StartedAt:  started,
		FinishedAt: finished,
	}, err
}

func (d *DockerDriver) WriteFile(ctx context.Context, id, guestPath string, data []byte) error {
	parent := filepathDir(guestPath)
	command := "mkdir -p -- " + shellQuote(parent) + " && cat > " + shellQuote(guestPath)
	_, stderr, err := d.runInput(ctx, data, "exec", "-i", containerName(id), "/bin/sh", "-lc", command)
	if err != nil {
		return fmt.Errorf("write sandbox file: %w: %s", err, stderr)
	}
	return nil
}

func (d *DockerDriver) ReadFile(ctx context.Context, id, guestPath string) ([]byte, error) {
	stdout, stderr, err := d.run(ctx, "exec", containerName(id), "/bin/sh", "-lc", "cat -- "+shellQuote(guestPath))
	if err != nil {
		return nil, fmt.Errorf("read sandbox file: %w: %s", err, stderr)
	}
	return []byte(stdout), nil
}

func (d *DockerDriver) Pause(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	_, stderr, err := d.run(ctx, "pause", containerName(id))
	if err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("pause sandbox: %w: %s", err, stderr)
	}
	item, err := d.Inspect(ctx, id)
	item.Status = model.StatusPaused
	return item, err
}

func (d *DockerDriver) Resume(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	_, stderr, err := d.run(ctx, "unpause", containerName(id))
	if err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("resume sandbox: %w: %s", err, stderr)
	}
	item, err := d.Inspect(ctx, id)
	item.Status = model.StatusRunning
	return item, err
}

func (d *DockerDriver) Commit(ctx context.Context, id string, req model.RuntimeCommitRequest) (model.RuntimeImage, error) {
	ref := strings.TrimSpace(req.Reference)
	if err := ValidateImageRef(ref); err != nil {
		return model.RuntimeImage{}, err
	}
	args := []string{"commit", "--change", "LABEL agentpop.template=true"}
	if strings.TrimSpace(req.Comment) != "" {
		args = append(args, "--message", req.Comment)
	}
	args = append(args, containerName(id), ref)
	output, stderr, err := d.run(ctx, args...)
	if err != nil {
		return model.RuntimeImage{}, fmt.Errorf("commit template image: %w: %s", err, strings.TrimSpace(stderr))
	}
	digest := strings.TrimSpace(output)
	var sizeMB int64
	if sizeOutput, _, sizeErr := d.run(ctx, "image", "inspect", "-f", "{{.Size}}", ref); sizeErr == nil {
		if sizeBytes, parseErr := strconv.ParseInt(strings.TrimSpace(sizeOutput), 10, 64); parseErr == nil {
			sizeMB = sizeBytes / 1024 / 1024
		}
	}
	return model.RuntimeImage{
		Reference: ref,
		Digest:    digest,
		SizeMB:    sizeMB,
		Driver:    d.Name(),
		CreatedAt: time.Now().UTC(),
	}, nil
}

func (d *DockerDriver) RemoveImage(ctx context.Context, ref string) error {
	if err := ValidateImageRef(strings.TrimSpace(ref)); err != nil {
		return err
	}
	_, stderr, err := d.run(ctx, "rmi", "-f", strings.TrimSpace(ref))
	if err == nil || strings.Contains(stderr, "No such image") {
		return nil
	}
	return fmt.Errorf("remove template image: %w: %s", err, strings.TrimSpace(stderr))
}

func (d *DockerDriver) Destroy(ctx context.Context, id string) error {
	_, stderr, err := d.run(ctx, "rm", "-f", containerName(id))
	if err == nil || strings.Contains(stderr, "No such container") {
		return nil
	}
	return fmt.Errorf("destroy sandbox: %w: %s", err, stderr)
}

func (d *DockerDriver) Inspect(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	name := containerName(id)
	runtimeID, stderr, err := d.run(ctx, "inspect", "-f", "{{.Id}}", name)
	if err != nil {
		if strings.Contains(stderr, "No such") {
			return model.RuntimeSandbox{}, ErrNotFound
		}
		return model.RuntimeSandbox{}, err
	}
	status, _, _ := d.run(ctx, "inspect", "-f", "{{.State.Status}}", name)
	resources, _, _ := d.run(ctx, "inspect", "-f", "{{.HostConfig.NanoCpus}} {{.HostConfig.Memory}}", name)
	diskLabel, _, _ := d.run(ctx, "inspect", "-f", "{{index .Config.Labels \"agentpop.disk.gb\"}}", name)
	startedValue, _, _ := d.run(ctx, "inspect", "-f", "{{.State.StartedAt}}", name)
	ip, _, _ := d.run(ctx, "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", name)
	portOutput, _, _ := d.run(ctx, "port", name, "22/tcp")
	port, _ := parseMappedPort(portOutput)
	modelStatus := model.StatusRunning
	if strings.TrimSpace(status) == "paused" {
		modelStatus = model.StatusPaused
	}
	var vcpu float64
	var memoryMB, diskGB int64
	var startedAt time.Time
	resourceFields := strings.Fields(resources)
	if len(resourceFields) >= 2 {
		nanoCPUs, _ := strconv.ParseInt(resourceFields[0], 10, 64)
		memoryBytes, _ := strconv.ParseInt(resourceFields[1], 10, 64)
		vcpu = float64(nanoCPUs) / 1_000_000_000
		memoryMB = memoryBytes / 1024 / 1024
	}
	diskGB, _ = strconv.ParseInt(strings.TrimSpace(diskLabel), 10, 64)
	startedAt, _ = time.Parse(time.RFC3339Nano, strings.TrimSpace(startedValue))
	ssh := &model.SSHAccess{
		Host:           "127.0.0.1",
		Port:           port,
		User:           "root",
		PrivateKeyPath: d.cfg.SSHPrivateKeyPath,
	}
	ssh.Command = fmt.Sprintf(
		"ssh -o LogLevel=ERROR -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i %s -p %d root@127.0.0.1",
		shellQuote(d.cfg.SSHPrivateKeyPath),
		port,
	)
	return model.RuntimeSandbox{
		ID:          id,
		RuntimeID:   strings.TrimSpace(runtimeID),
		RuntimeName: name,
		Driver:      d.Name(),
		Status:      modelStatus,
		VCPU:        vcpu,
		MemoryMB:    memoryMB,
		DiskGB:      diskGB,
		PrivateIP:   strings.TrimSpace(ip),
		SSH:         ssh,
		StartedAt:   startedAt,
	}, nil
}

func (d *DockerDriver) ensureSSHKey(ctx context.Context) error {
	if fileExists(d.cfg.SSHPrivateKeyPath) && fileExists(d.cfg.SSHPrivateKeyPath+".pub") {
		return nil
	}
	if err := os.MkdirAll(filepathDir(d.cfg.SSHPrivateKeyPath), 0o700); err != nil {
		return err
	}
	cmd := exec.CommandContext(ctx, "ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "agentpop-local", "-f", d.cfg.SSHPrivateKeyPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("create local SSH key: %w: %s", err, output)
	}
	return nil
}

func (d *DockerDriver) run(ctx context.Context, args ...string) (string, string, error) {
	cmd := exec.CommandContext(ctx, d.cfg.DockerBinary, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}

func (d *DockerDriver) runInput(ctx context.Context, input []byte, args ...string) (string, string, error) {
	cmd := exec.CommandContext(ctx, d.cfg.DockerBinary, args...)
	cmd.Stdin = bytes.NewReader(input)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}

func (d *DockerDriver) waitMappedPort(ctx context.Context, name, containerPort string, timeout time.Duration) (int, error) {
	deadline := time.Now().Add(timeout)
	var lastOutput string
	for time.Now().Before(deadline) {
		output, _, err := d.run(ctx, "port", name, containerPort)
		lastOutput = output
		if err == nil && strings.TrimSpace(output) != "" {
			if port, parseErr := parseMappedPort(output); parseErr == nil {
				return port, nil
			}
		}
		select {
		case <-ctx.Done():
			return 0, ctx.Err()
		case <-time.After(50 * time.Millisecond):
		}
	}
	return 0, fmt.Errorf("Docker did not publish %s for %s within %s (last mapping %q)", containerPort, name, timeout, lastOutput)
}

func parseMappedPort(value string) (int, error) {
	line := strings.TrimSpace(strings.Split(value, "\n")[0])
	idx := strings.LastIndex(line, ":")
	if idx < 0 {
		return 0, fmt.Errorf("unexpected Docker port mapping %q", value)
	}
	port, err := strconv.Atoi(line[idx+1:])
	if err != nil {
		return 0, fmt.Errorf("parse Docker port mapping %q: %w", value, err)
	}
	return port, nil
}

func containerName(id string) string {
	return "agentpop-" + sanitizeName(id)
}

func sanitizeName(value string) string {
	value = strings.ToLower(value)
	var b strings.Builder
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-' || r == '_':
			b.WriteRune(r)
		default:
			b.WriteByte('-')
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return "sandbox"
	}
	if len(out) > 63 {
		return out[:63]
	}
	return out
}

func validEnvironmentKey(value string) bool {
	if value == "" {
		return false
	}
	for i, r := range value {
		if (r >= 'A' && r <= 'Z') || r == '_' || (i > 0 && r >= '0' && r <= '9') {
			continue
		}
		return false
	}
	return true
}

func valueOr(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
}

func filepathDir(path string) string {
	idx := strings.LastIndex(path, string(os.PathSeparator))
	if idx < 0 {
		return "."
	}
	return path[:idx]
}
