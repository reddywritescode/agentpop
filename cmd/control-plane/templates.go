package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

// Template builds run real steps inside a data-plane build sandbox and are
// committed into an immutable image through the host agent. The control plane
// never touches Docker or Firecracker directly.

var templateNamePattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$`)

var errTemplateConflict = errors.New("template cannot be used for new sandboxes")

const (
	templateImagePrefix  = "agentpop/tpl-"
	templateBuildTimeout = 20 * time.Minute
	templateStepTimeout  = int64(600)
)

// parseTemplateDefinition accepts the single-stage Dockerfile subset the
// builder supports: one FROM plus RUN steps. COPY/ADD and multi-stage builds
// are rejected so a definition alone always reproduces the image.
func parseTemplateDefinition(definition string) (string, []string, error) {
	var (
		baseImage string
		steps     []string
		pending   string
	)
	flush := func() error {
		line := strings.TrimSpace(pending)
		pending = ""
		if line == "" {
			return nil
		}
		instruction, rest, _ := strings.Cut(line, " ")
		rest = strings.TrimSpace(rest)
		switch strings.ToUpper(instruction) {
		case "FROM":
			if baseImage != "" {
				return errors.New("multi-stage builds are not supported; use a single FROM")
			}
			if len(steps) > 0 {
				return errors.New("FROM must be the first instruction")
			}
			fields := strings.Fields(rest)
			if len(fields) != 1 {
				return errors.New("FROM must name exactly one base image (no --platform or AS)")
			}
			baseImage = fields[0]
		case "RUN":
			if baseImage == "" {
				return errors.New("the definition must start with FROM")
			}
			if rest == "" {
				return errors.New("RUN requires a command")
			}
			steps = append(steps, rest)
		default:
			return fmt.Errorf("instruction %q is not supported; use FROM and RUN only", instruction)
		}
		return nil
	}
	for _, raw := range strings.Split(definition, "\n") {
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasSuffix(line, "\\") {
			pending += strings.TrimSuffix(line, "\\") + " "
			continue
		}
		pending += line
		if err := flush(); err != nil {
			return "", nil, err
		}
	}
	if err := flush(); err != nil {
		return "", nil, err
	}
	if baseImage == "" {
		return "", nil, errors.New("the definition must contain a FROM instruction")
	}
	if !strings.HasPrefix(baseImage, "agentpop/") {
		return "", nil, fmt.Errorf("base image %q must be an AgentPop base or template image (agentpop/...)", baseImage)
	}
	return baseImage, steps, nil
}

func builtinTemplates() []map[string]any {
	return []map[string]any{
		{
			"id": "devbox:local", "name": "devbox", "version": 0, "versionLabel": "local",
			"architecture": "multi-arch", "status": "ready", "runtime": "docker/firecracker",
			"source": "builtin", "deprecated": false, "imageRef": "agentpop/devbox:local",
		},
		{
			"id": "openclaw:local", "name": "openclaw", "version": 0, "versionLabel": "local",
			"architecture": "multi-arch", "status": "planned", "runtime": "managed sandbox",
			"source": "builtin", "deprecated": false,
		},
	}
}

func templateWire(template model.Template, usedBy int) map[string]any {
	status := string(template.Status)
	if template.Deprecated {
		status = "deprecated"
	}
	versionLabel := "draft"
	if template.Version > 0 {
		versionLabel = fmt.Sprintf("v%d", template.Version)
	}
	return map[string]any{
		"id":            template.ID,
		"name":          template.Name,
		"description":   template.Description,
		"version":       template.Version,
		"versionLabel":  versionLabel,
		"architecture":  template.Architecture,
		"status":        status,
		"runtime":       "sandbox image",
		"source":        template.Source,
		"baseImage":     template.BaseImage,
		"steps":         template.Steps,
		"definition":    template.Definition,
		"imageRef":      template.ImageRef,
		"sizeMb":        template.SizeMB,
		"latestBuildId": template.LatestBuildID,
		"deprecated":    template.Deprecated,
		"error":         template.Error,
		"usedBy":        usedBy,
		"createdAt":     template.CreatedAt,
		"updatedAt":     template.UpdatedAt,
	}
}

func (s *server) templateUsage(imageRef string) int {
	if imageRef == "" {
		return 0
	}
	used := 0
	for _, sb := range s.store.ListSandboxes() {
		if sb.Image == imageRef {
			used++
		}
	}
	return used
}

func (s *server) resolveTemplate(idOrName string) (model.Template, bool) {
	if template, ok := s.store.GetTemplate(idOrName); ok {
		return template, true
	}
	return s.store.GetTemplateByName(idOrName)
}

// resolveSandboxImage maps template references to their immutable image and
// blocks new use of deprecated templates while preserving existing runtimes.
func (s *server) resolveSandboxImage(image string) (string, error) {
	if !strings.Contains(image, "/") {
		name, _, _ := strings.Cut(image, ":")
		if template, ok := s.store.GetTemplateByName(name); ok {
			if template.Deprecated {
				return "", fmt.Errorf("%w: template %s is deprecated", errTemplateConflict, template.Name)
			}
			if template.Status != model.TemplateStatusReady || template.ImageRef == "" {
				return "", fmt.Errorf("%w: template %s has no successful build", errTemplateConflict, template.Name)
			}
			return template.ImageRef, nil
		}
	}
	if template, ok := s.store.FindTemplateByImageRef(image); ok && template.Deprecated {
		return "", fmt.Errorf("%w: template %s is deprecated", errTemplateConflict, template.Name)
	}
	return image, nil
}

func (s *server) listTemplates(w http.ResponseWriter, _ *http.Request) {
	items := make([]map[string]any, 0)
	for _, template := range s.store.ListTemplates() {
		items = append(items, templateWire(template, s.templateUsage(template.ImageRef)))
	}
	for _, builtin := range builtinTemplates() {
		if ref, ok := builtin["imageRef"].(string); ok {
			builtin["usedBy"] = s.templateUsage(ref)
		}
		items = append(items, builtin)
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *server) createTemplate(w http.ResponseWriter, r *http.Request) {
	var req model.CreateTemplateRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if !templateNamePattern.MatchString(req.Name) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "template name must use lowercase letters, digits, and hyphens (max 32 characters)")
		return
	}
	for _, builtin := range builtinTemplates() {
		if builtin["name"] == req.Name {
			apiutil.WriteError(w, http.StatusConflict, "template_exists", "a built-in template already uses this name")
			return
		}
	}
	if _, exists := s.store.GetTemplateByName(req.Name); exists {
		apiutil.WriteError(w, http.StatusConflict, "template_exists", "a template with this name already exists")
		return
	}
	baseImage, steps, err := parseTemplateDefinition(req.Definition)
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_definition", err.Error())
		return
	}
	architecture := ""
	if host, hostErr := s.runtime.HostInfo(r.Context()); hostErr == nil {
		architecture = host.Architecture
	}
	now := time.Now().UTC()
	template := model.Template{
		ID:           apiutil.RandomID("tpl"),
		Name:         req.Name,
		Description:  strings.TrimSpace(req.Description),
		Source:       "custom",
		Status:       model.TemplateStatusDraft,
		Architecture: architecture,
		BaseImage:    baseImage,
		Steps:        steps,
		Definition:   req.Definition,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.store.UpsertTemplate(template); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("template.create", template.ID, "ok", map[string]any{"name": template.Name, "baseImage": baseImage, "steps": len(steps)})
	apiutil.WriteJSON(w, http.StatusCreated, templateWire(template, 0))
}

func (s *server) getTemplate(w http.ResponseWriter, r *http.Request) {
	template, ok := s.resolveTemplate(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "template not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, templateWire(template, s.templateUsage(template.ImageRef)))
}

func (s *server) deleteTemplate(w http.ResponseWriter, r *http.Request) {
	template, ok := s.resolveTemplate(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "template not found")
		return
	}
	if used := s.templateUsage(template.ImageRef); used > 0 {
		apiutil.WriteError(w, http.StatusConflict, "template_in_use", fmt.Sprintf("%d sandboxes still use this template image", used))
		return
	}
	if template.Status == model.TemplateStatusBuilding {
		apiutil.WriteError(w, http.StatusConflict, "template_building", "a build is in progress for this template")
		return
	}
	if template.ImageRef != "" {
		if err := s.runtime.RemoveImage(r.Context(), template.ImageRef); err != nil {
			apiutil.WriteError(w, http.StatusBadGateway, "runtime_image_remove_failed", err.Error())
			return
		}
	}
	if err := s.store.DeleteTemplate(template.ID); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("template.delete", template.ID, "ok", map[string]any{"name": template.Name})
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) startTemplateBuild(w http.ResponseWriter, r *http.Request) {
	template, ok := s.resolveTemplate(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "template not found")
		return
	}
	if template.Source != "custom" {
		apiutil.WriteError(w, http.StatusConflict, "template_builtin", "built-in templates cannot be rebuilt")
		return
	}
	if template.Deprecated {
		apiutil.WriteError(w, http.StatusConflict, "template_deprecated", "deprecated templates cannot be rebuilt; restore the template first")
		return
	}
	for _, existing := range s.store.ListTemplateBuilds(template.ID) {
		if existing.Status == model.TemplateBuildQueued || existing.Status == model.TemplateBuildRunning {
			apiutil.WriteError(w, http.StatusConflict, "build_in_progress", "a build is already in progress for this template")
			return
		}
	}
	build, err := s.enqueueTemplateBuild(template)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("template.build", template.ID, "ok", map[string]any{"buildId": build.ID, "version": build.Version})
	apiutil.WriteJSON(w, http.StatusAccepted, build)
}

func (s *server) runTemplateBuild(templateID, buildID string) {
	ctx, cancel := context.WithTimeout(context.Background(), templateBuildTimeout)
	defer cancel()

	appendLog := func(stream, text string) {
		entries := make([]model.TemplateBuildLogEntry, 0)
		for _, line := range strings.Split(strings.TrimRight(text, "\n"), "\n") {
			if strings.TrimSpace(line) == "" && stream != "system" {
				continue
			}
			entries = append(entries, model.TemplateBuildLogEntry{At: time.Now().UTC(), Stream: stream, Line: line})
		}
		if len(entries) > 0 {
			_ = s.store.AppendTemplateBuildLogs(buildID, entries...)
		}
	}

	fail := func(message string) {
		appendLog("system", "BUILD FAILED: "+message)
		now := time.Now().UTC()
		if build, ok := s.store.GetTemplateBuild(buildID); ok {
			build.Status = model.TemplateBuildFailed
			build.Error = message
			build.FinishedAt = now
			_ = s.store.UpsertTemplateBuild(build)
		}
		if template, ok := s.store.GetTemplate(templateID); ok {
			template.Status = model.TemplateStatusFailed
			template.Error = message
			template.UpdatedAt = now
			_ = s.store.UpsertTemplate(template)
		}
		_ = s.audit("template.build.failed", templateID, "error", map[string]any{"buildId": buildID, "error": message})
	}

	build, ok := s.store.GetTemplateBuild(buildID)
	if !ok {
		return
	}
	template, ok := s.store.GetTemplate(templateID)
	if !ok {
		fail("template disappeared before the build started")
		return
	}

	now := time.Now().UTC()
	build.Status = model.TemplateBuildRunning
	build.StartedAt = now
	if err := s.store.UpsertTemplateBuild(build); err != nil {
		return
	}

	builderID := apiutil.RandomID("tplb")
	build.SandboxID = builderID
	_ = s.store.UpsertTemplateBuild(build)
	appendLog("system", fmt.Sprintf("provisioning build sandbox %s from %s", builderID, build.BaseImage))
	if _, err := s.runtime.Create(ctx, model.RuntimeCreateRequest{
		ID:       builderID,
		Name:     "tpl-build-" + template.Name,
		Image:    build.BaseImage,
		VCPU:     1,
		MemoryMB: 1024,
		DiskGB:   10,
	}); err != nil {
		fail("provision build sandbox: " + err.Error())
		return
	}
	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), time.Minute)
		defer cleanupCancel()
		if err := s.runtime.Destroy(cleanupCtx, builderID); err != nil {
			appendLog("system", "warning: build sandbox cleanup failed: "+err.Error())
		} else {
			appendLog("system", "build sandbox destroyed")
		}
	}()

	for index, step := range build.Steps {
		appendLog("system", fmt.Sprintf("STEP %d/%d: RUN %s", index+1, len(build.Steps), step))
		result, err := s.runtime.Exec(ctx, builderID, model.ExecRequest{Command: step, TimeoutSeconds: templateStepTimeout})
		if result.Stdout != "" {
			appendLog("stdout", result.Stdout)
		}
		if result.Stderr != "" {
			appendLog("stderr", result.Stderr)
		}
		if err != nil {
			fail(fmt.Sprintf("step %d transport error: %v", index+1, err))
			return
		}
		if result.ExitCode != 0 {
			fail(fmt.Sprintf("step %d exited with code %d", index+1, result.ExitCode))
			return
		}
	}

	imageRef := fmt.Sprintf("%s%s:v%d", templateImagePrefix, template.Name, build.Version)
	appendLog("system", "committing immutable template image "+imageRef)
	image, err := s.runtime.Commit(ctx, builderID, model.RuntimeCommitRequest{
		Reference: imageRef,
		Comment:   fmt.Sprintf("AgentPop template %s v%d", template.Name, build.Version),
	})
	if err != nil {
		fail("commit template image: " + err.Error())
		return
	}
	appendLog("system", fmt.Sprintf("BUILD SUCCEEDED: %s (%d MiB)", image.Reference, image.SizeMB))

	finished := time.Now().UTC()
	if current, ok := s.store.GetTemplateBuild(buildID); ok {
		build = current
	}
	build.Status = model.TemplateBuildSucceeded
	build.ImageRef = image.Reference
	build.SizeMB = image.SizeMB
	build.FinishedAt = finished
	if err := s.store.UpsertTemplateBuild(build); err != nil {
		return
	}
	if current, ok := s.store.GetTemplate(templateID); ok {
		template = current
	}
	previousImageRef := template.ImageRef
	template.Status = model.TemplateStatusReady
	template.Version = build.Version
	template.ImageRef = image.Reference
	template.SizeMB = image.SizeMB
	template.LatestBuildID = build.ID
	template.Error = ""
	template.UpdatedAt = finished
	if err := s.store.UpsertTemplate(template); err != nil {
		return
	}
	if previousImageRef != "" && previousImageRef != image.Reference && s.templateUsage(previousImageRef) == 0 {
		if err := s.runtime.RemoveImage(ctx, previousImageRef); err != nil {
			appendLog("system", "warning: previous image cleanup failed: "+err.Error())
		}
	}
	_ = s.audit("template.build.succeeded", templateID, "ok", map[string]any{
		"buildId": buildID, "imageRef": image.Reference, "sizeMb": image.SizeMB, "version": build.Version,
	})
}

func (s *server) listTemplateBuilds(w http.ResponseWriter, r *http.Request) {
	template, ok := s.resolveTemplate(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "template not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": s.store.ListTemplateBuilds(template.ID)})
}

func (s *server) getTemplateBuild(w http.ResponseWriter, r *http.Request) {
	build, ok := s.store.GetTemplateBuild(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "template build not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, build)
}

func (s *server) getTemplateBuildLogs(w http.ResponseWriter, r *http.Request) {
	build, ok := s.store.GetTemplateBuild(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "template build not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"buildId": build.ID, "status": build.Status, "items": build.Logs,
	})
}

func (s *server) deprecateTemplate(w http.ResponseWriter, r *http.Request) {
	s.setTemplateDeprecation(w, r, true)
}

func (s *server) restoreTemplate(w http.ResponseWriter, r *http.Request) {
	s.setTemplateDeprecation(w, r, false)
}

func (s *server) setTemplateDeprecation(w http.ResponseWriter, r *http.Request, deprecated bool) {
	template, ok := s.resolveTemplate(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "template not found")
		return
	}
	if template.Source != "custom" {
		apiutil.WriteError(w, http.StatusConflict, "template_builtin", "built-in templates cannot be deprecated")
		return
	}
	now := time.Now().UTC()
	template.Deprecated = deprecated
	if deprecated {
		template.DeprecatedAt = now
	} else {
		template.DeprecatedAt = time.Time{}
	}
	template.UpdatedAt = now
	if err := s.store.UpsertTemplate(template); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	action := "template.deprecate"
	if !deprecated {
		action = "template.restore"
	}
	_ = s.audit(action, template.ID, "ok", map[string]any{"name": template.Name})
	apiutil.WriteJSON(w, http.StatusOK, templateWire(template, s.templateUsage(template.ImageRef)))
}
