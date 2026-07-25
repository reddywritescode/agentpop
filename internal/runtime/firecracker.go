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

// FirecrackerDriver intentionally delegates privileged VM setup to a small
// Linux-only runtime helper. This keeps the host agent API identical between
// local Docker development and the production KVM data plane while making the
// privileged surface easy to audit.
type FirecrackerDriver struct {
	cfg Config
}

func NewFirecrackerDriver(cfg Config) (*FirecrackerDriver, error) {
	if goruntime.GOOS != "linux" {
		return nil, errors.New("Firecracker requires a Linux KVM host; use RUNTIME_DRIVER=docker on macOS")
	}
	if cfg.FirecrackerBinary == "" {
		cfg.FirecrackerBinary = "/usr/local/bin/firecracker"
	}
	if cfg.JailerBinary == "" {
		cfg.JailerBinary = "/usr/local/bin/jailer"
	}
	if cfg.StateDirectory == "" {
		cfg.StateDirectory = "/var/lib/agentpop"
	}
	if !fileExists("/dev/kvm") {
		return nil, errors.New("/dev/kvm is unavailable; enable nested virtualization or use bare metal")
	}
	for label, path := range map[string]string{
		"firecracker": cfg.FirecrackerBinary,
		"jailer":      cfg.JailerBinary,
		"kernel":      cfg.KernelImagePath,
		"rootfs":      cfg.RootFSPath,
	} {
		if !fileExists(path) {
			return nil, fmt.Errorf("%s asset is missing at %s", label, path)
		}
	}
	return &FirecrackerDriver{cfg: cfg}, nil
}

func (d *FirecrackerDriver) Name() string { return "firecracker" }

func (d *FirecrackerDriver) HostInfo(ctx context.Context) model.HostInfo {
	version := ""
	if output, err := exec.CommandContext(ctx, d.cfg.FirecrackerBinary, "--version").CombinedOutput(); err == nil {
		version = strings.TrimSpace(string(output))
	}
	return model.HostInfo{
		ID:                 valueOr(d.cfg.HostID, "firecracker-host"),
		Name:               valueOr(d.cfg.HostName, "Firecracker data plane"),
		Region:             valueOr(d.cfg.Region, "local"),
		Driver:             d.Name(),
		OS:                 goruntime.GOOS,
		Architecture:       goruntime.GOARCH,
		Healthy:            fileExists("/dev/kvm") && version != "",
		KVMAvailable:       fileExists("/dev/kvm"),
		FirecrackerVersion: version,
		Message:            "Linux KVM and Firecracker are ready",
		SSHCommand:         d.cfg.HostSSHCommand,
		Capacity: model.HostCapacity{
			CPUCores: goruntime.NumCPU(),
			MemoryMB: hostMemoryMB(),
		},
		UpdatedAt: time.Now().UTC(),
	}
}

func (d *FirecrackerDriver) Create(ctx context.Context, req model.RuntimeCreateRequest) (model.RuntimeSandbox, error) {
	args := []string{
		"create",
		"--id", req.ID,
		"--name", req.Name,
		"--vcpu", strconv.FormatFloat(req.VCPU, 'f', -1, 64),
		"--memory-mb", strconv.FormatInt(req.MemoryMB, 10),
		"--disk-gb", strconv.FormatInt(req.DiskGB, 10),
		"--kernel", d.cfg.KernelImagePath,
		"--rootfs", d.cfg.RootFSPath,
		"--firecracker", d.cfg.FirecrackerBinary,
		"--jailer", d.cfg.JailerBinary,
		"--state-dir", d.cfg.StateDirectory,
		"--authorized-key", req.AuthorizedKey,
		"--private-key-path", req.PrivateKeyPath,
	}
	for _, destination := range req.AllowedEgress {
		args = append(args, "--allow-egress", destination)
	}
	for key, value := range req.Environment {
		args = append(args, "--env", key+"="+value)
	}
	secretPayload, err := jsonMarshal(req.Secrets)
	if err != nil {
		return model.RuntimeSandbox{}, fmt.Errorf("encode runtime secrets: %w", err)
	}
	if strings.TrimSpace(req.Image) != "" {
		// The helper boots from a committed template rootfs when one exists
		// for this reference; otherwise it falls back to the base rootfs.
		if err := ValidateImageRef(req.Image); err != nil {
			return model.RuntimeSandbox{}, err
		}
		args = append(args, "--image-ref", req.Image)
	}
	args = append(args, "--secrets-stdin")
	var result model.RuntimeSandbox
	if err := runRuntimeHelperInput(ctx, d.cfg, args, secretPayload, &result); err != nil {
		return model.RuntimeSandbox{}, err
	}
	return result, nil
}

func (d *FirecrackerDriver) Commit(ctx context.Context, id string, req model.RuntimeCommitRequest) (model.RuntimeImage, error) {
	if err := ValidateImageRef(strings.TrimSpace(req.Reference)); err != nil {
		return model.RuntimeImage{}, err
	}
	args := []string{
		"commit",
		"--id", id,
		"--reference", strings.TrimSpace(req.Reference),
		"--state-dir", d.cfg.StateDirectory,
	}
	var result model.RuntimeImage
	err := runRuntimeHelper(ctx, d.cfg, args, &result)
	return result, err
}

func (d *FirecrackerDriver) RemoveImage(ctx context.Context, ref string) error {
	if err := ValidateImageRef(strings.TrimSpace(ref)); err != nil {
		return err
	}
	return runRuntimeHelper(ctx, d.cfg, []string{
		"remove-image",
		"--reference", strings.TrimSpace(ref),
		"--state-dir", d.cfg.StateDirectory,
	}, nil)
}

func (d *FirecrackerDriver) Update(_ context.Context, _ string, _ model.RuntimeUpdateRequest) (model.RuntimeSandbox, error) {
	return model.RuntimeSandbox{}, fmt.Errorf("Firecracker resource changes require a stop, snapshot, and restore operation")
}

func (d *FirecrackerDriver) SetSecrets(ctx context.Context, id string, req model.RuntimeSecretsRequest) error {
	payload, err := jsonMarshal(req.Secrets)
	if err != nil {
		return fmt.Errorf("encode runtime secrets: %w", err)
	}
	_, err = runRuntimeHelperRaw(
		ctx,
		d.cfg,
		[]string{"put-secrets", "--id", id, "--state-dir", d.cfg.StateDirectory},
		payload,
	)
	return err
}

func (d *FirecrackerDriver) Exec(ctx context.Context, id string, req model.ExecRequest) (model.ExecResult, error) {
	args := []string{"exec", "--id", id, "--command", req.Command, "--state-dir", d.cfg.StateDirectory}
	var result model.ExecResult
	err := runRuntimeHelper(ctx, d.cfg, args, &result)
	return result, err
}

func (d *FirecrackerDriver) WriteFile(ctx context.Context, id, guestPath string, data []byte) error {
	_, err := runRuntimeHelperRaw(
		ctx,
		d.cfg,
		[]string{"put-file", "--id", id, "--path", guestPath, "--state-dir", d.cfg.StateDirectory},
		data,
	)
	return err
}

func (d *FirecrackerDriver) ReadFile(ctx context.Context, id, guestPath string) ([]byte, error) {
	return runRuntimeHelperRaw(
		ctx,
		d.cfg,
		[]string{"get-file", "--id", id, "--path", guestPath, "--state-dir", d.cfg.StateDirectory},
		nil,
	)
}

func (d *FirecrackerDriver) Pause(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	var result model.RuntimeSandbox
	err := runRuntimeHelper(ctx, d.cfg, []string{"pause", "--id", id, "--state-dir", d.cfg.StateDirectory}, &result)
	return result, err
}

func (d *FirecrackerDriver) Resume(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	var result model.RuntimeSandbox
	err := runRuntimeHelper(ctx, d.cfg, []string{"resume", "--id", id, "--state-dir", d.cfg.StateDirectory}, &result)
	return result, err
}

func (d *FirecrackerDriver) Destroy(ctx context.Context, id string) error {
	return runRuntimeHelper(ctx, d.cfg, []string{"destroy", "--id", id, "--state-dir", d.cfg.StateDirectory}, nil)
}

func (d *FirecrackerDriver) Inspect(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	var result model.RuntimeSandbox
	err := runRuntimeHelper(ctx, d.cfg, []string{"inspect", "--id", id, "--state-dir", d.cfg.StateDirectory}, &result)
	return result, err
}

func runRuntimeHelper(ctx context.Context, cfg Config, args []string, dst any) error {
	return runRuntimeHelperInput(ctx, cfg, args, nil, dst)
}

func runRuntimeHelperInput(ctx context.Context, cfg Config, args []string, input []byte, dst any) error {
	helper := os.Getenv("FIRECRACKER_RUNTIME_HELPER")
	if helper == "" {
		helper = "/usr/local/libexec/agentpop-firecracker"
	}
	cmd := exec.CommandContext(ctx, helper, args...)
	cmd.Stdin = bytes.NewReader(input)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if strings.Contains(string(output), "runtime sandbox not found") {
			return ErrNotFound
		}
		return fmt.Errorf("firecracker runtime helper: %w: %s", err, output)
	}
	if dst == nil {
		return nil
	}
	if err := jsonUnmarshal(output, dst); err != nil {
		return fmt.Errorf("decode firecracker runtime response: %w: %s", err, output)
	}
	return nil
}

func runRuntimeHelperRaw(ctx context.Context, _ Config, args []string, input []byte) ([]byte, error) {
	helper := os.Getenv("FIRECRACKER_RUNTIME_HELPER")
	if helper == "" {
		helper = "/usr/local/libexec/agentpop-firecracker"
	}
	cmd := exec.CommandContext(ctx, helper, args...)
	cmd.Stdin = bytes.NewReader(input)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if strings.Contains(stderr.String(), "runtime sandbox not found") {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("firecracker runtime helper: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return stdout.Bytes(), nil
}
