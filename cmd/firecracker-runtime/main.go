//go:build linux

// agentpop-firecracker is the deliberately small privileged component used by
// the host agent. It owns the Linux operations that should never live in the
// public control-plane process: TAP devices, NAT rules, jail directories,
// rootfs cloning, and the Firecracker Unix-socket API.
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/reddywritescode/agentpop/internal/model"
)

const (
	jailerBase = "/srv/jailer"
	jailerUID  = 1000
	jailerGID  = 1000
)

var safeID = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$`)

type vmState struct {
	ID             string              `json:"id"`
	Name           string              `json:"name"`
	Status         model.SandboxStatus `json:"status"`
	PID            int                 `json:"pid"`
	Tap            string              `json:"tap"`
	HostIP         string              `json:"hostIp"`
	GuestIP        string              `json:"guestIp"`
	Prefix         string              `json:"prefix"`
	GuestMAC       string              `json:"guestMac"`
	SocketPath     string              `json:"socketPath"`
	JailDirectory  string              `json:"jailDirectory"`
	StateDirectory string              `json:"stateDirectory"`
	PrivateKeyPath string              `json:"privateKeyPath"`
	VCPU           int                 `json:"vcpu"`
	MemoryMB       int64               `json:"memoryMb"`
	DiskGB         int64               `json:"diskGb"`
	Environment    map[string]string   `json:"environment,omitempty"`
	StartedAt      time.Time           `json:"startedAt"`
}

type createOptions struct {
	id                string
	name              string
	vcpu              float64
	memoryMB          int64
	diskGB            int64
	kernel            string
	rootfs            string
	firecracker       string
	jailer            string
	stateDir          string
	authorizedKey     string
	privateKeyPath    string
	imageRef          string
	allowedEgress     stringList
	environment       stringList
	secretEnvironment map[string]string
	secretsStdin      bool
}

type stringList []string

func (s *stringList) String() string { return strings.Join(*s, ",") }
func (s *stringList) Set(value string) error {
	*s = append(*s, value)
	return nil
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if len(os.Args) < 2 {
		fatalf("usage: agentpop-firecracker <create|inspect|exec|put-file|get-file|put-secrets|pause|resume|commit|remove-image|destroy>")
	}
	if os.Geteuid() != 0 {
		fatalf("agentpop-firecracker must run as root")
	}

	var result any
	var err error
	switch os.Args[1] {
	case "create":
		result, err = create(ctx, parseCreate(os.Args[2:]))
	case "inspect":
		result, err = inspect(parseIDStateFlags("inspect", os.Args[2:]))
	case "exec":
		result, err = runExec(ctx, parseExec(os.Args[2:]))
	case "put-file":
		err = putFile(ctx, parseFile(os.Args[2:]))
	case "get-file":
		err = getFile(ctx, parseFile(os.Args[2:]))
	case "put-secrets":
		id, stateDir := parseIDStateFlags("put-secrets", os.Args[2:])
		err = putSecrets(ctx, id, stateDir)
	case "pause":
		id, stateDir := parseIDStateFlags("pause", os.Args[2:])
		result, err = changeState(ctx, id, stateDir, true)
	case "resume":
		id, stateDir := parseIDStateFlags("resume", os.Args[2:])
		result, err = changeState(ctx, id, stateDir, false)
	case "commit":
		result, err = commit(ctx, parseCommit(os.Args[2:]))
	case "remove-image":
		err = removeImage(parseImage(os.Args[2:]))
	case "destroy":
		err = destroy(parseIDStateFlags("destroy", os.Args[2:]))
	default:
		fatalf("unknown command %q", os.Args[1])
	}
	if err != nil {
		fatalf("%v", err)
	}
	if result != nil {
		writeJSON(result)
	}
}

func parseCreate(args []string) createOptions {
	var opts createOptions
	fs := flag.NewFlagSet("create", flag.ExitOnError)
	fs.StringVar(&opts.id, "id", "", "sandbox id")
	fs.StringVar(&opts.name, "name", "", "sandbox name")
	fs.Float64Var(&opts.vcpu, "vcpu", 1, "virtual CPU count")
	fs.Int64Var(&opts.memoryMB, "memory-mb", 1024, "memory in MiB")
	fs.Int64Var(&opts.diskGB, "disk-gb", 10, "root disk size in GiB")
	fs.StringVar(&opts.kernel, "kernel", "", "kernel image")
	fs.StringVar(&opts.rootfs, "rootfs", "", "base ext4 rootfs")
	fs.StringVar(&opts.firecracker, "firecracker", "/usr/local/bin/firecracker", "Firecracker binary")
	fs.StringVar(&opts.jailer, "jailer", "/usr/local/bin/jailer", "jailer binary")
	fs.StringVar(&opts.stateDir, "state-dir", "/var/lib/agentpop", "runtime state directory")
	fs.StringVar(&opts.authorizedKey, "authorized-key", "", "SSH public key")
	fs.StringVar(&opts.privateKeyPath, "private-key-path", "", "corresponding private key")
	fs.StringVar(&opts.imageRef, "image-ref", "", "template image reference; boots from a committed template rootfs when present")
	fs.Var(&opts.allowedEgress, "allow-egress", "allowed destination; may be repeated")
	fs.Var(&opts.environment, "env", "environment KEY=VALUE; may be repeated")
	fs.BoolVar(&opts.secretsStdin, "secrets-stdin", false, "read a JSON object of write-only environment secrets from stdin")
	_ = fs.Parse(args)
	if opts.secretsStdin {
		decoder := json.NewDecoder(io.LimitReader(os.Stdin, 1<<20))
		if err := decoder.Decode(&opts.secretEnvironment); err != nil && !errors.Is(err, io.EOF) {
			fatalf("decode secret environment: %v", err)
		}
	}
	return opts
}

type commitOptions struct {
	id        string
	reference string
	stateDir  string
}

func parseCommit(args []string) commitOptions {
	var opts commitOptions
	fs := flag.NewFlagSet("commit", flag.ExitOnError)
	fs.StringVar(&opts.id, "id", "", "sandbox id")
	fs.StringVar(&opts.reference, "reference", "", "template image reference")
	fs.StringVar(&opts.stateDir, "state-dir", "/var/lib/agentpop", "runtime state directory")
	_ = fs.Parse(args)
	return opts
}

func parseImage(args []string) (string, string) {
	fs := flag.NewFlagSet("remove-image", flag.ExitOnError)
	reference := fs.String("reference", "", "template image reference")
	stateDir := fs.String("state-dir", "/var/lib/agentpop", "runtime state directory")
	_ = fs.Parse(args)
	return *reference, *stateDir
}

func parseIDStateFlags(name string, args []string) (string, string) {
	fs := flag.NewFlagSet(name, flag.ExitOnError)
	id := fs.String("id", "", "sandbox id")
	stateDir := fs.String("state-dir", "/var/lib/agentpop", "runtime state directory")
	_ = fs.Parse(args)
	return *id, *stateDir
}

type execOptions struct {
	id       string
	stateDir string
	command  string
}

type fileOptions struct {
	id       string
	stateDir string
	path     string
}

func parseExec(args []string) execOptions {
	var opts execOptions
	fs := flag.NewFlagSet("exec", flag.ExitOnError)
	fs.StringVar(&opts.id, "id", "", "sandbox id")
	fs.StringVar(&opts.stateDir, "state-dir", "/var/lib/agentpop", "runtime state directory")
	fs.StringVar(&opts.command, "command", "", "command")
	_ = fs.Parse(args)
	return opts
}

func parseFile(args []string) fileOptions {
	var opts fileOptions
	fs := flag.NewFlagSet("file", flag.ExitOnError)
	fs.StringVar(&opts.id, "id", "", "sandbox id")
	fs.StringVar(&opts.stateDir, "state-dir", "/var/lib/agentpop", "runtime state directory")
	fs.StringVar(&opts.path, "path", "", "absolute guest path under /workspace")
	_ = fs.Parse(args)
	return opts
}

func create(ctx context.Context, opts createOptions) (_ model.RuntimeSandbox, returnedErr error) {
	if err := validateCreate(opts); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if _, err := os.Stat(statePath(opts.stateDir, opts.id)); err == nil {
		st, readErr := readState(opts.id, opts.stateDir)
		if readErr != nil {
			return model.RuntimeSandbox{}, readErr
		}
		if processAlive(st) {
			return runtimeSandbox(st), nil
		}
		return recoverExisting(ctx, opts, st)
	} else if !errors.Is(err, os.ErrNotExist) {
		return model.RuntimeSandbox{}, err
	}
	if err := os.MkdirAll(filepath.Join(opts.stateDir, "vms", opts.id), 0o700); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := os.MkdirAll(filepath.Join(opts.stateDir, "ssh"), 0o700); err != nil {
		return model.RuntimeSandbox{}, err
	}

	privateKey, publicKey, err := ensureSSHKey(ctx, opts.stateDir, opts.privateKeyPath, opts.authorizedKey)
	if err != nil {
		return model.RuntimeSandbox{}, err
	}
	network := networkFor(opts.id)
	jailDir := filepath.Join(jailerBase, "firecracker", opts.id)
	jailRoot := filepath.Join(jailDir, "root")
	socketPath := filepath.Join(jailRoot, "run", "firecracker.socket")
	st := vmState{
		ID:             opts.id,
		Name:           opts.name,
		Status:         model.StatusProvisioning,
		Tap:            network.tap,
		HostIP:         network.hostIP,
		GuestIP:        network.guestIP,
		Prefix:         network.prefix,
		GuestMAC:       network.mac,
		SocketPath:     socketPath,
		JailDirectory:  jailDir,
		StateDirectory: opts.stateDir,
		PrivateKeyPath: privateKey,
		VCPU:           max(1, int(opts.vcpu+0.999)),
		MemoryMB:       opts.memoryMB,
		DiskGB:         opts.diskGB,
		Environment:    parseEnvironment(opts.environment),
		StartedAt:      time.Now().UTC(),
	}

	created := false
	defer func() {
		if returnedErr != nil && !created {
			_ = destroyState(st)
		}
	}()
	if err := prepareJail(ctx, opts, st, publicKey); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := configureNetwork(ctx, st, opts.allowedEgress); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := launchJailer(ctx, opts, st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	pid, err := waitForFirecracker(st, 15*time.Second)
	if err != nil {
		return model.RuntimeSandbox{}, err
	}
	st.PID = pid
	if err := configureVM(ctx, st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := waitForSSH(ctx, st.GuestIP, 60*time.Second); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := ensureGuestWorkspace(ctx, st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	st.Status = model.StatusRunning
	if err := writeState(st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	created = true
	return runtimeSandbox(st), nil
}

// recoverExisting restarts a dead microVM from its existing jailed rootfs.
// It deliberately does not call prepareJail: doing so would replace the
// customer disk with the base image and destroy /workspace.
func recoverExisting(ctx context.Context, opts createOptions, st vmState) (_ model.RuntimeSandbox, returnedErr error) {
	if st.ID != opts.id || st.StateDirectory != opts.stateDir {
		return model.RuntimeSandbox{}, errors.New("existing runtime metadata does not match the requested sandbox")
	}
	jailRoot := filepath.Join(st.JailDirectory, "root")
	for label, path := range map[string]string{
		"existing rootfs": filepath.Join(jailRoot, "rootfs.ext4"),
		"existing kernel": filepath.Join(jailRoot, "vmlinux"),
		"SSH private key": st.PrivateKeyPath,
	} {
		info, err := os.Stat(path)
		if err != nil || info.IsDir() {
			return model.RuntimeSandbox{}, fmt.Errorf("%s is unavailable at %q", label, path)
		}
	}

	// Jailer recreates its own executable, pid file, and API socket. Only
	// remove those transient artifacts; rootfs.ext4 and vmlinux are preserved.
	for _, path := range []string{
		st.SocketPath,
		filepath.Join(jailRoot, "firecracker.pid"),
		filepath.Join(jailRoot, filepath.Base(opts.firecracker)),
	} {
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			return model.RuntimeSandbox{}, err
		}
	}
	// The jailer recreates its character devices on every launch and rejects
	// an existing device with EEXIST.
	if err := os.RemoveAll(filepath.Join(jailRoot, "dev")); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := os.MkdirAll(filepath.Join(jailRoot, "run"), 0o755); err != nil {
		return model.RuntimeSandbox{}, err
	}

	st.Status = model.StatusProvisioning
	st.PID = 0
	recovered := false
	defer func() {
		if returnedErr == nil || recovered {
			return
		}
		cleanupRecoveredRuntime(st)
		st.Status = model.StatusFailed
		st.PID = 0
		_ = writeState(st)
	}()

	if err := configureNetwork(ctx, st, opts.allowedEgress); err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("restore sandbox network: %w", err)
	}
	if err := launchJailer(ctx, opts, st); err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("restart Firecracker jailer: %w", err)
	}
	pid, err := waitForFirecracker(st, 15*time.Second)
	if err != nil {
		return model.RuntimeSandbox{}, err
	}
	st.PID = pid
	if err := configureVM(ctx, st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := waitForSSH(ctx, st.GuestIP, 60*time.Second); err != nil {
		return model.RuntimeSandbox{}, err
	}
	if err := ensureGuestWorkspace(ctx, st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	st.Status = model.StatusRunning
	st.StartedAt = time.Now().UTC()
	if err := writeState(st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	recovered = true
	return runtimeSandbox(st), nil
}

func cleanupRecoveredRuntime(st vmState) {
	if processAlive(st) {
		_ = syscall.Kill(st.PID, syscall.SIGTERM)
		for range 20 {
			if !processAlive(st) {
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if processAlive(st) {
			_ = syscall.Kill(st.PID, syscall.SIGKILL)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	removeNetworkRules(ctx, st)
	_ = run(ctx, "ip", "link", "delete", st.Tap)
	_ = os.Remove(st.SocketPath)
	_ = os.Remove(filepath.Join(st.JailDirectory, "root", "firecracker.pid"))
}

func ensureGuestWorkspace(ctx context.Context, st vmState) error {
	var stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, "ssh", sshCommandArgs(st, "install -d -m 0755 /workspace")...)
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("initialize guest workspace: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func validateCreate(opts createOptions) error {
	if !safeID.MatchString(opts.id) {
		return errors.New("id must contain only letters, digits, underscores, or hyphens")
	}
	if strings.TrimSpace(opts.name) == "" {
		return errors.New("name is required")
	}
	if opts.vcpu <= 0 || opts.memoryMB < 128 || opts.diskGB < 1 {
		return errors.New("vcpu, memory-mb, and disk-gb must be positive")
	}
	for label, path := range map[string]string{
		"kernel": opts.kernel, "rootfs": opts.rootfs,
		"firecracker": opts.firecracker, "jailer": opts.jailer,
	} {
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			return fmt.Errorf("%s is unavailable at %q", label, path)
		}
	}
	if _, err := os.Stat("/dev/kvm"); err != nil {
		return errors.New("/dev/kvm is unavailable")
	}
	for _, value := range opts.environment {
		key, _, ok := strings.Cut(value, "=")
		if !ok || !validEnvironmentName(key) {
			return fmt.Errorf("invalid environment entry %q", value)
		}
	}
	return validateSecretEnvironment(opts.secretEnvironment)
}

func ensureSSHKey(ctx context.Context, stateDir, requestedPrivateKey, requestedPublicKey string) (string, string, error) {
	privateKey := requestedPrivateKey
	if privateKey == "" {
		privateKey = filepath.Join(stateDir, "ssh", "id_ed25519")
	}
	if requestedPublicKey != "" {
		return privateKey, strings.TrimSpace(requestedPublicKey), nil
	}
	if _, err := os.Stat(privateKey); errors.Is(err, os.ErrNotExist) {
		if err := run(ctx, "ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "agentpop-data-plane", "-f", privateKey); err != nil {
			return "", "", err
		}
	}
	publicBytes, err := os.ReadFile(privateKey + ".pub")
	if err != nil {
		return "", "", fmt.Errorf("read SSH public key: %w", err)
	}
	return privateKey, strings.TrimSpace(string(publicBytes)), nil
}

func prepareJail(ctx context.Context, opts createOptions, st vmState, publicKey string) error {
	jailRoot := filepath.Join(st.JailDirectory, "root")
	if err := os.MkdirAll(filepath.Join(jailRoot, "run"), 0o755); err != nil {
		return err
	}
	rootfs := filepath.Join(jailRoot, "rootfs.ext4")
	kernel := filepath.Join(jailRoot, "vmlinux")
	sourceRootfs := opts.rootfs
	if opts.imageRef != "" {
		if templateRootfs, err := templateRootfsPath(opts.stateDir, opts.imageRef); err == nil {
			if _, statErr := os.Stat(templateRootfs); statErr == nil {
				sourceRootfs = templateRootfs
			}
		}
	}
	if err := copySparse(ctx, sourceRootfs, rootfs); err != nil {
		return fmt.Errorf("clone rootfs: %w", err)
	}
	if err := growExt4(ctx, rootfs, opts.diskGB); err != nil {
		return fmt.Errorf("grow rootfs: %w", err)
	}
	if err := installAuthorizedKey(ctx, rootfs, publicKey, st, opts.secretEnvironment); err != nil {
		return err
	}
	if err := copySparse(ctx, opts.kernel, kernel); err != nil {
		return fmt.Errorf("copy kernel: %w", err)
	}
	if err := os.Chown(rootfs, jailerUID, jailerGID); err != nil {
		return err
	}
	if err := os.Chown(kernel, jailerUID, jailerGID); err != nil {
		return err
	}
	if err := os.Chmod(rootfs, 0o600); err != nil {
		return err
	}
	return os.Chmod(kernel, 0o500)
}

func copySparse(ctx context.Context, source, target string) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	return run(ctx, "cp", "--reflink=auto", "--sparse=always", source, target)
}

func growExt4(ctx context.Context, rootfs string, diskGB int64) error {
	info, err := os.Stat(rootfs)
	if err != nil {
		return err
	}
	target := diskGB * 1024 * 1024 * 1024
	if info.Size() >= target {
		return nil
	}
	if err := run(ctx, "truncate", "-s", strconv.FormatInt(target, 10), rootfs); err != nil {
		return err
	}
	if err := runAllowExit(ctx, []int{0, 1}, "e2fsck", "-f", "-y", rootfs); err != nil {
		return err
	}
	return run(ctx, "resize2fs", rootfs)
}

func installAuthorizedKey(ctx context.Context, rootfs, publicKey string, st vmState, secrets map[string]string) error {
	mountDir, err := os.MkdirTemp("", "agentpop-rootfs-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(mountDir)
	if err := run(ctx, "mount", "-o", "loop", rootfs, mountDir); err != nil {
		return fmt.Errorf("mount cloned rootfs: %w", err)
	}
	mounted := true
	defer func() {
		if mounted {
			_ = run(context.Background(), "umount", mountDir)
		}
	}()
	sshDir := filepath.Join(mountDir, "root", ".ssh")
	if err := os.MkdirAll(sshDir, 0o700); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(sshDir, "authorized_keys"), []byte(publicKey+"\n"), 0o600); err != nil {
		return err
	}
	hostname := sanitizeHostname(st.Name)
	if err := os.WriteFile(filepath.Join(mountDir, "etc", "hostname"), []byte(hostname+"\n"), 0o644); err != nil {
		return err
	}
	hostsPath := filepath.Join(mountDir, "etc", "hosts")
	hosts, _ := os.ReadFile(hostsPath)
	if !bytes.Contains(hosts, []byte(hostname)) {
		hosts = append(hosts, []byte("\n127.0.1.1 "+hostname+"\n")...)
		_ = os.WriteFile(hostsPath, hosts, 0o644)
	}
	resolvPath := filepath.Join(mountDir, "etc", "resolv.conf")
	_ = os.Remove(resolvPath)
	_ = os.WriteFile(resolvPath, []byte("nameserver 1.1.1.1\nnameserver 8.8.8.8\n"), 0o644)
	if err := writeGuestEnvironment(mountDir, st.Environment, secrets); err != nil {
		return err
	}
	if err := run(ctx, "sync"); err != nil {
		return err
	}
	if err := run(ctx, "umount", mountDir); err != nil {
		return err
	}
	mounted = false
	return nil
}

func writeGuestEnvironment(root string, environment, secrets map[string]string) error {
	profileDir := filepath.Join(root, "etc", "profile.d")
	secretDir := filepath.Join(root, "etc", "agentpop")
	if err := os.MkdirAll(profileDir, 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(secretDir, 0o700); err != nil {
		return err
	}
	environmentProfile, err := renderGuestProfile(environment, "# Generated AgentPop agent environment.")
	if err != nil {
		return err
	}
	secretProfile, err := renderGuestProfile(secrets, "# Generated AgentPop write-only model secrets.")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(profileDir, "agentpop-env.sh"), environmentProfile, 0o600); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(secretDir, "model-secrets.sh"), secretProfile, 0o600); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(profileDir, "agentpop-model-secrets.sh"), secretProfile, 0o600)
}

func renderGuestProfile(values map[string]string, header string) ([]byte, error) {
	keys := make([]string, 0, len(values))
	for key := range values {
		if !validEnvironmentName(key) {
			return nil, fmt.Errorf("invalid environment key %q", key)
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var profile strings.Builder
	profile.WriteString(header + "\n")
	for _, key := range keys {
		profile.WriteString("export " + key + "=" + shellQuote(values[key]) + "\n")
	}
	return []byte(profile.String()), nil
}

func validateSecretEnvironment(secrets map[string]string) error {
	if len(secrets) > 64 {
		return errors.New("no more than 64 secrets are allowed")
	}
	for key, value := range secrets {
		if !validEnvironmentName(key) {
			return fmt.Errorf("invalid secret environment key %q", key)
		}
		if len(value) > 32<<10 {
			return fmt.Errorf("secret %q exceeds 32 KiB", key)
		}
	}
	return nil
}

type vmNetwork struct {
	tap, hostIP, guestIP, prefix, mac string
}

func networkFor(id string) vmNetwork {
	sum := sha256.Sum256([]byte(id))
	slot := int(sum[0])<<6 | int(sum[1]&0x3f)
	third := slot / 64
	base := (slot % 64) * 4
	hostIP := fmt.Sprintf("172.30.%d.%d", third, base+1)
	guestIP := fmt.Sprintf("172.30.%d.%d", third, base+2)
	return vmNetwork{
		tap:     "ap" + hex.EncodeToString(sum[:5]),
		hostIP:  hostIP,
		guestIP: guestIP,
		prefix:  hostIP + "/30",
		mac:     fmt.Sprintf("06:00:%02x:%02x:%02x:%02x", sum[2], sum[3], sum[4], sum[5]),
	}
}

func configureNetwork(ctx context.Context, st vmState, allowed stringList) error {
	chain := networkChain(st)
	_ = run(ctx, "ip", "link", "delete", st.Tap)
	if err := run(ctx, "ip", "tuntap", "add", "dev", st.Tap, "mode", "tap", "user", strconv.Itoa(jailerUID)); err != nil {
		return err
	}
	if err := run(ctx, "ip", "addr", "add", st.Prefix, "dev", st.Tap); err != nil {
		return err
	}
	if err := run(ctx, "ip", "link", "set", st.Tap, "up"); err != nil {
		return err
	}
	if err := run(ctx, "sysctl", "-w", "net.ipv4.ip_forward=1"); err != nil {
		return err
	}
	if err := iptablesEnsure(ctx, "-t", "nat", "-A", "POSTROUTING", "-s", st.GuestIP+"/32", "-j", "MASQUERADE"); err != nil {
		return err
	}
	if err := iptablesEnsure(ctx, "-A", "FORWARD", "-o", st.Tap, "-d", st.GuestIP+"/32", "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT"); err != nil {
		return err
	}
	_ = run(ctx, "iptables", "-N", chain)
	if err := run(ctx, "iptables", "-F", chain); err != nil {
		return err
	}
	if err := iptablesEnsure(ctx, "-A", "FORWARD", "-i", st.Tap, "-s", st.GuestIP+"/32", "-j", chain); err != nil {
		return err
	}
	if err := run(ctx, "iptables", "-A", chain, "-d", "169.254.169.254/32", "-j", "REJECT"); err != nil {
		return err
	}
	if len(allowed) == 0 {
		return run(ctx, "iptables", "-A", chain, "-j", "ACCEPT")
	}
	if err := run(ctx, "iptables", "-A", chain, "-p", "udp", "--dport", "53", "-j", "ACCEPT"); err != nil {
		return err
	}
	for _, destination := range allowed {
		ips, port, err := resolveDestination(destination)
		if err != nil {
			return err
		}
		for _, ip := range ips {
			rule := []string{"-A", chain, "-d", ip}
			if port != "" {
				rule = append(rule, "-p", "tcp", "--dport", port)
			}
			rule = append(rule, "-j", "ACCEPT")
			if err := run(ctx, "iptables", rule...); err != nil {
				return err
			}
		}
	}
	return run(ctx, "iptables", "-A", chain, "-j", "REJECT")
}

func resolveDestination(value string) ([]string, string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, "", errors.New("empty egress destination")
	}
	host, port := value, ""
	if parsedHost, parsedPort, err := net.SplitHostPort(value); err == nil {
		host, port = parsedHost, parsedPort
	}
	if strings.Contains(host, "/") {
		if _, _, err := net.ParseCIDR(host); err != nil {
			return nil, "", fmt.Errorf("invalid egress CIDR %q", host)
		}
		return []string{host}, port, nil
	}
	if ip := net.ParseIP(host); ip != nil {
		return []string{ip.String() + "/32"}, port, nil
	}
	host = strings.TrimPrefix(host, "*.")
	resolved, err := net.LookupIP(host)
	if err != nil {
		return nil, "", fmt.Errorf("resolve egress host %q: %w", host, err)
	}
	var ips []string
	for _, ip := range resolved {
		if v4 := ip.To4(); v4 != nil {
			ips = append(ips, v4.String()+"/32")
		}
	}
	if len(ips) == 0 {
		return nil, "", fmt.Errorf("egress host %q has no IPv4 address", host)
	}
	return ips, port, nil
}

func iptablesEnsure(ctx context.Context, args ...string) error {
	check := append([]string(nil), args...)
	for i, arg := range check {
		if arg == "-A" {
			check[i] = "-C"
			break
		}
	}
	if commandOK(ctx, "iptables", check...) {
		return nil
	}
	return run(ctx, "iptables", args...)
}

func launchJailer(ctx context.Context, opts createOptions, st vmState) error {
	args := []string{
		"--id", st.ID,
		"--exec-file", opts.firecracker,
		"--uid", strconv.Itoa(jailerUID),
		"--gid", strconv.Itoa(jailerGID),
		"--chroot-base-dir", jailerBase,
		"--daemonize",
		"--",
		"--api-sock", "/run/firecracker.socket",
	}
	return run(ctx, opts.jailer, args...)
}

func waitForFirecracker(st vmState, timeout time.Duration) (int, error) {
	deadline := time.Now().Add(timeout)
	pidPath := filepath.Join(st.JailDirectory, "root", "firecracker.pid")
	for time.Now().Before(deadline) {
		if _, err := os.Stat(st.SocketPath); err == nil {
			pidBytes, readErr := os.ReadFile(pidPath)
			if readErr != nil {
				time.Sleep(100 * time.Millisecond)
				continue
			}
			pid, parseErr := strconv.Atoi(strings.TrimSpace(string(pidBytes)))
			if parseErr == nil && pid > 1 {
				return pid, nil
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	return 0, fmt.Errorf("Firecracker API socket did not become ready at %s", st.SocketPath)
}

func configureVM(ctx context.Context, st vmState) error {
	if err := firecrackerRequest(ctx, st.SocketPath, http.MethodPut, "/machine-config", map[string]any{
		"vcpu_count":   st.VCPU,
		"mem_size_mib": st.MemoryMB,
		"smt":          false,
	}); err != nil {
		return err
	}
	bootArgs := strings.Join([]string{
		"console=ttyS0", "reboot=k", "panic=1", "pci=off",
		"root=/dev/vda", "rw",
		fmt.Sprintf("ip=%s::%s:255.255.255.252:%s:eth0:off", st.GuestIP, st.HostIP, sanitizeHostname(st.Name)),
	}, " ")
	if err := firecrackerRequest(ctx, st.SocketPath, http.MethodPut, "/boot-source", map[string]any{
		"kernel_image_path": "/vmlinux",
		"boot_args":         bootArgs,
	}); err != nil {
		return err
	}
	if err := firecrackerRequest(ctx, st.SocketPath, http.MethodPut, "/drives/rootfs", map[string]any{
		"drive_id": "rootfs", "path_on_host": "/rootfs.ext4",
		"is_root_device": true, "is_read_only": false,
	}); err != nil {
		return err
	}
	if err := firecrackerRequest(ctx, st.SocketPath, http.MethodPut, "/network-interfaces/eth0", map[string]any{
		"iface_id": "eth0", "guest_mac": st.GuestMAC, "host_dev_name": st.Tap,
	}); err != nil {
		return err
	}
	return firecrackerRequest(ctx, st.SocketPath, http.MethodPut, "/actions", map[string]any{
		"action_type": "InstanceStart",
	})
}

func firecrackerRequest(ctx context.Context, socketPath, method, path string, body any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
		},
	}
	client := &http.Client{Transport: transport, Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, method, "http://firecracker"+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Firecracker %s %s: %w", method, path, err)
	}
	defer resp.Body.Close()
	responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Firecracker %s %s returned %s: %s", method, path, resp.Status, responseBody)
	}
	return nil
}

func waitForSSH(ctx context.Context, guestIP string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := (&net.Dialer{Timeout: time.Second}).DialContext(ctx, "tcp", net.JoinHostPort(guestIP, "22"))
		if err == nil {
			_ = conn.Close()
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(500 * time.Millisecond):
		}
	}
	return fmt.Errorf("SSH did not become ready on %s:22", guestIP)
}

func inspect(id, stateDir string) (model.RuntimeSandbox, error) {
	st, err := readState(id, stateDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return model.RuntimeSandbox{}, errors.New("runtime sandbox not found")
		}
		return model.RuntimeSandbox{}, err
	}
	if !processAlive(st) {
		st.Status = model.StatusFailed
	}
	return runtimeSandbox(st), nil
}

func processAlive(st vmState) bool {
	if st.PID <= 1 || syscall.Kill(st.PID, 0) != nil {
		return false
	}
	executable, err := os.Readlink(filepath.Join("/proc", strconv.Itoa(st.PID), "exe"))
	if err != nil {
		return false
	}
	return strings.HasPrefix(filepath.Base(executable), "firecracker")
}

func runExec(ctx context.Context, opts execOptions) (model.ExecResult, error) {
	st, err := readState(opts.id, opts.stateDir)
	if err != nil {
		return model.ExecResult{}, err
	}
	if st.Status != model.StatusRunning {
		return model.ExecResult{}, fmt.Errorf("sandbox is %s", st.Status)
	}
	started := time.Now().UTC()
	command := ". /etc/profile.d/agentpop-env.sh 2>/dev/null || true; " +
		". /etc/profile.d/agentpop-model-secrets.sh 2>/dev/null || true; " +
		"exec /bin/sh -lc " + shellQuote(opts.command)
	args := []string{
		"-o", "BatchMode=yes",
		"-o", "LogLevel=ERROR",
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "ConnectTimeout=5",
		"-i", st.PrivateKeyPath,
		"root@" + st.GuestIP,
		command,
	}
	cmd := exec.CommandContext(ctx, "ssh", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	runErr := cmd.Run()
	finished := time.Now().UTC()
	exitCode := 0
	transportErr := runErr
	if runErr != nil {
		var exitErr *exec.ExitError
		if errors.As(runErr, &exitErr) {
			exitCode = exitErr.ExitCode()
			transportErr = nil
		} else {
			exitCode = 1
		}
	}
	return model.ExecResult{
		ExitCode: exitCode, Stdout: stdout.String(), Stderr: stderr.String(),
		DurationMS: finished.Sub(started).Milliseconds(),
		StartedAt:  started, FinishedAt: finished,
	}, transportErr
}

func putSecrets(ctx context.Context, id, stateDir string) error {
	st, err := readState(id, stateDir)
	if err != nil {
		return err
	}
	if st.Status != model.StatusRunning {
		return fmt.Errorf("sandbox is %s", st.Status)
	}
	var secrets map[string]string
	decoder := json.NewDecoder(io.LimitReader(os.Stdin, 1<<20))
	if err := decoder.Decode(&secrets); err != nil {
		return fmt.Errorf("decode secrets: %w", err)
	}
	if err := validateSecretEnvironment(secrets); err != nil {
		return err
	}
	profile, err := renderGuestProfile(secrets, "# Generated by AgentPop. Values are write-only in the control plane.")
	if err != nil {
		return err
	}
	command := "install -d -m 0700 /etc/agentpop /etc/profile.d && umask 077 && " +
		"cat > /etc/agentpop/model-secrets.sh && " +
		"cp /etc/agentpop/model-secrets.sh /etc/profile.d/agentpop-model-secrets.sh && " +
		"chmod 0600 /etc/agentpop/model-secrets.sh /etc/profile.d/agentpop-model-secrets.sh"
	cmd := exec.CommandContext(ctx, "ssh", sshCommandArgs(st, command)...)
	cmd.Stdin = bytes.NewReader(profile)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("update guest secrets: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func parseEnvironment(values []string) map[string]string {
	environment := make(map[string]string, len(values))
	for _, value := range values {
		key, item, ok := strings.Cut(value, "=")
		if ok && validEnvironmentName(key) {
			environment[key] = item
		}
	}
	return environment
}

func validEnvironmentName(value string) bool {
	if value == "" {
		return false
	}
	for index, r := range value {
		if (r >= 'A' && r <= 'Z') || r == '_' || (index > 0 && r >= '0' && r <= '9') {
			continue
		}
		return false
	}
	return true
}

func putFile(ctx context.Context, opts fileOptions) error {
	st, guestPath, err := prepareFileOperation(opts)
	if err != nil {
		return err
	}
	command := "mkdir -p -- " + shellQuote(filepath.Dir(guestPath)) + " && cat > " + shellQuote(guestPath)
	cmd := exec.CommandContext(ctx, "ssh", sshCommandArgs(st, command)...)
	cmd.Stdin = os.Stdin
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("write guest file: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func getFile(ctx context.Context, opts fileOptions) error {
	st, guestPath, err := prepareFileOperation(opts)
	if err != nil {
		return err
	}
	cmd := exec.CommandContext(ctx, "ssh", sshCommandArgs(st, "cat -- "+shellQuote(guestPath))...)
	cmd.Stdout = os.Stdout
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("read guest file: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func prepareFileOperation(opts fileOptions) (vmState, string, error) {
	st, err := readState(opts.id, opts.stateDir)
	if err != nil {
		return vmState{}, "", err
	}
	if st.Status != model.StatusRunning {
		return vmState{}, "", fmt.Errorf("sandbox is %s", st.Status)
	}
	guestPath := filepath.Clean(opts.path)
	if guestPath == "/workspace" || !strings.HasPrefix(guestPath, "/workspace/") {
		return vmState{}, "", errors.New("path must name a file under /workspace")
	}
	return st, guestPath, nil
}

func sshCommandArgs(st vmState, command string) []string {
	return []string{
		"-o", "BatchMode=yes",
		"-o", "LogLevel=ERROR",
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "ConnectTimeout=5",
		"-i", st.PrivateKeyPath,
		"root@" + st.GuestIP,
		command,
	}
}

func changeState(ctx context.Context, id, stateDir string, pause bool) (model.RuntimeSandbox, error) {
	st, err := readState(id, stateDir)
	if err != nil {
		return model.RuntimeSandbox{}, err
	}
	state := "Resumed"
	status := model.StatusRunning
	if pause {
		state = "Paused"
		status = model.StatusPaused
	}
	if err := firecrackerRequest(ctx, st.SocketPath, http.MethodPatch, "/vm", map[string]string{"state": state}); err != nil {
		return model.RuntimeSandbox{}, err
	}
	st.Status = status
	if err := writeState(st); err != nil {
		return model.RuntimeSandbox{}, err
	}
	return runtimeSandbox(st), nil
}

var safeImageRef = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,200}(:[A-Za-z0-9._-]{1,64})?$`)

func templateRootfsPath(stateDir, reference string) (string, error) {
	if !safeImageRef.MatchString(reference) {
		return "", fmt.Errorf("invalid template image reference %q", reference)
	}
	encoded := strings.NewReplacer("/", "-", ":", "-").Replace(reference)
	return filepath.Join(stateDir, "templates", encoded+".ext4"), nil
}

// commit snapshots a build VM's root filesystem into an immutable template
// rootfs. The guest filesystem is synced and the VM paused during the copy so
// the ext4 image is consistent.
func commit(ctx context.Context, opts commitOptions) (model.RuntimeImage, error) {
	st, err := readState(opts.id, opts.stateDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return model.RuntimeImage{}, errors.New("runtime sandbox not found")
		}
		return model.RuntimeImage{}, err
	}
	target, err := templateRootfsPath(opts.stateDir, opts.reference)
	if err != nil {
		return model.RuntimeImage{}, err
	}
	if st.Status != model.StatusRunning && st.Status != model.StatusPaused {
		return model.RuntimeImage{}, fmt.Errorf("sandbox is %s", st.Status)
	}
	wasRunning := st.Status == model.StatusRunning
	if wasRunning {
		var stderr bytes.Buffer
		syncCmd := exec.CommandContext(ctx, "ssh", sshCommandArgs(st, "sync")...)
		syncCmd.Stderr = &stderr
		if err := syncCmd.Run(); err != nil {
			return model.RuntimeImage{}, fmt.Errorf("sync guest filesystem: %w: %s", err, strings.TrimSpace(stderr.String()))
		}
		if err := firecrackerRequest(ctx, st.SocketPath, http.MethodPatch, "/vm", map[string]string{"state": "Paused"}); err != nil {
			return model.RuntimeImage{}, err
		}
		defer func() {
			_ = firecrackerRequest(context.Background(), st.SocketPath, http.MethodPatch, "/vm", map[string]string{"state": "Resumed"})
		}()
	}
	source := filepath.Join(st.JailDirectory, "root", "rootfs.ext4")
	if err := os.MkdirAll(filepath.Dir(target), 0o700); err != nil {
		return model.RuntimeImage{}, err
	}
	staging := target + ".tmp"
	if err := copySparse(ctx, source, staging); err != nil {
		_ = os.Remove(staging)
		return model.RuntimeImage{}, fmt.Errorf("copy template rootfs: %w", err)
	}
	if err := os.Chmod(staging, 0o600); err != nil {
		_ = os.Remove(staging)
		return model.RuntimeImage{}, err
	}
	if err := os.Rename(staging, target); err != nil {
		_ = os.Remove(staging)
		return model.RuntimeImage{}, err
	}
	info, err := os.Stat(target)
	if err != nil {
		return model.RuntimeImage{}, err
	}
	return model.RuntimeImage{
		Reference: opts.reference,
		SizeMB:    info.Size() / 1024 / 1024,
		Driver:    "firecracker",
		CreatedAt: time.Now().UTC(),
	}, nil
}

func removeImage(reference, stateDir string) error {
	target, err := templateRootfsPath(stateDir, reference)
	if err != nil {
		return err
	}
	if err := os.Remove(target); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func destroy(id, stateDir string) error {
	if !safeID.MatchString(id) {
		return errors.New("invalid id")
	}
	st, err := readState(id, stateDir)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	return destroyState(st)
}

func destroyState(st vmState) error {
	if processAlive(st) {
		_ = syscall.Kill(st.PID, syscall.SIGTERM)
		for range 20 {
			if !processAlive(st) {
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if processAlive(st) {
			_ = syscall.Kill(st.PID, syscall.SIGKILL)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	removeNetworkRules(ctx, st)
	_ = run(ctx, "ip", "link", "delete", st.Tap)
	if safeID.MatchString(st.ID) {
		_ = os.RemoveAll(filepath.Join(st.StateDirectory, "vms", st.ID))
		_ = os.RemoveAll(filepath.Join(jailerBase, "firecracker", st.ID))
	}
	return nil
}

func removeNetworkRules(ctx context.Context, st vmState) {
	chain := networkChain(st)
	commands := [][]string{
		{"-t", "nat", "-D", "POSTROUTING", "-s", st.GuestIP + "/32", "-j", "MASQUERADE"},
		{"-D", "FORWARD", "-o", st.Tap, "-d", st.GuestIP + "/32", "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT"},
		{"-D", "FORWARD", "-i", st.Tap, "-s", st.GuestIP + "/32", "-j", chain},
		{"-F", chain},
		{"-X", chain},
	}
	for _, args := range commands {
		_ = run(ctx, "iptables", args...)
	}
}

func networkChain(st vmState) string {
	return "AP_" + strings.ToUpper(st.Tap)
}

func runtimeSandbox(st vmState) model.RuntimeSandbox {
	ssh := &model.SSHAccess{
		Host: st.GuestIP, Port: 22, User: "root", PrivateKeyPath: st.PrivateKeyPath,
		Command: fmt.Sprintf(
			"sudo ssh -o LogLevel=ERROR -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i %s root@%s",
			shellQuote(st.PrivateKeyPath), st.GuestIP,
		),
	}
	return model.RuntimeSandbox{
		ID: st.ID, RuntimeID: strconv.Itoa(st.PID), RuntimeName: st.ID,
		Driver: "firecracker", Status: st.Status, PrivateIP: st.GuestIP,
		VCPU: float64(st.VCPU), MemoryMB: st.MemoryMB, DiskGB: st.DiskGB,
		SSH: ssh, StartedAt: st.StartedAt,
	}
}

func statePath(stateDir, id string) string {
	return filepath.Join(stateDir, "vms", id, "metadata.json")
}

func readState(id, stateDir string) (vmState, error) {
	if !safeID.MatchString(id) {
		return vmState{}, errors.New("invalid id")
	}
	data, err := os.ReadFile(statePath(stateDir, id))
	if err != nil {
		return vmState{}, err
	}
	var st vmState
	if err := json.Unmarshal(data, &st); err != nil {
		return vmState{}, err
	}
	return st, nil
}

func writeState(st vmState) error {
	path := statePath(st.StateDirectory, st.ID)
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return err
	}
	temp := path + ".tmp"
	if err := os.WriteFile(temp, append(data, '\n'), 0o600); err != nil {
		return err
	}
	return os.Rename(temp, path)
}

func sanitizeHostname(value string) string {
	value = strings.ToLower(value)
	var b strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	result := strings.Trim(b.String(), "-")
	if result == "" {
		return "sandbox"
	}
	if len(result) > 63 {
		result = result[:63]
	}
	return result
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}

func run(ctx context.Context, command string, args ...string) error {
	cmd := exec.CommandContext(ctx, command, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s %s: %w: %s", command, strings.Join(args, " "), err, strings.TrimSpace(string(output)))
	}
	return nil
}

func runAllowExit(ctx context.Context, exits []int, command string, args ...string) error {
	cmd := exec.CommandContext(ctx, command, args...)
	output, err := cmd.CombinedOutput()
	if err == nil {
		return nil
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		for _, allowed := range exits {
			if exitErr.ExitCode() == allowed {
				return nil
			}
		}
	}
	return fmt.Errorf("%s: %w: %s", command, err, output)
}

func commandOK(ctx context.Context, command string, args ...string) bool {
	return exec.CommandContext(ctx, command, args...).Run() == nil
}

func writeJSON(value any) {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		fatalf("encode response: %v", err)
	}
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
