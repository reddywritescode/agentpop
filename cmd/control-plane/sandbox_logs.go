package main

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

const (
	defaultSandboxLogLimit = 200
	maxSandboxLogLimit     = 500
	maxSandboxLogLines     = 200
	maxSandboxLogLineBytes = 4096
)

func (s *server) sandboxLogs(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, ok := s.store.GetSandbox(id); !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	limit := defaultSandboxLogLimit
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > maxSandboxLogLimit {
			apiutil.WriteError(w, http.StatusBadRequest, "invalid_limit", fmt.Sprintf("limit must be between 1 and %d", maxSandboxLogLimit))
			return
		}
		limit = parsed
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": s.combinedSandboxLogs(id, limit)})
}

func (s *server) combinedSandboxLogs(sandboxID string, limit int) []model.SandboxLogEntry {
	items := s.store.ListSandboxLogs(sandboxID, maxSandboxLogLimit)
	for _, event := range s.store.ListAudit() {
		if event.ResourceID != sandboxID {
			continue
		}
		items = append(items, model.SandboxLogEntry{
			ID:        event.ID,
			SandboxID: sandboxID,
			Source:    "control-plane",
			Stream:    "event",
			Message:   fmt.Sprintf("%s result=%s", event.Action, event.Result),
			CreatedAt: event.CreatedAt,
		})
	}
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].CreatedAt.Before(items[j].CreatedAt)
	})
	if limit > 0 && len(items) > limit {
		items = items[len(items)-limit:]
	}
	return items
}

func (s *server) recordSandboxExecLogs(sandboxID, label string, result model.ExecResult, runtimeErr error) {
	redactions := s.sandboxSecretValues(sandboxID)
	label = strings.TrimSpace(label)
	if len(label) > 120 {
		label = label[:120]
	}
	runID := apiutil.RandomID("run")
	startedAt := result.StartedAt
	if startedAt.IsZero() {
		startedAt = time.Now().UTC()
	}
	entries := []model.SandboxLogEntry{{
		ID: apiutil.RandomID("log"), SandboxID: sandboxID, RunID: runID,
		Label: label, Source: "exec", Stream: "system",
		Message: "run started" + labeledSandboxLogSuffix(label), CreatedAt: startedAt,
	}}
	entries = append(entries, sandboxOutputEntries(sandboxID, runID, label, "stdout", result.Stdout, startedAt, redactions)...)
	entries = append(entries, sandboxOutputEntries(sandboxID, runID, label, "stderr", result.Stderr, startedAt, redactions)...)
	exitCode := result.ExitCode
	message := fmt.Sprintf("command completed exit=%d duration=%dms", result.ExitCode, result.DurationMS)
	if runtimeErr != nil {
		message = "runtime execution failed: " + redactSandboxLog(runtimeErr.Error(), redactions)
	}
	finishedAt := result.FinishedAt
	if finishedAt.IsZero() {
		finishedAt = time.Now().UTC()
	}
	entries = append(entries, model.SandboxLogEntry{
		ID:         apiutil.RandomID("log"),
		SandboxID:  sandboxID,
		RunID:      runID,
		Label:      label,
		Source:     "exec",
		Stream:     "system",
		Message:    sanitizeSandboxLogLine(message),
		ExitCode:   &exitCode,
		DurationMS: result.DurationMS,
		CreatedAt:  finishedAt,
	})
	_ = s.store.AppendSandboxLogs(sandboxID, entries...)
}

func labeledSandboxLogSuffix(label string) string {
	if label == "" {
		return ""
	}
	return " · " + sanitizeSandboxLogLine(label)
}

func (s *server) sandboxSecretValues(sandboxID string) []string {
	values := make([]string, 0)
	for _, agent := range s.store.ListAgents() {
		if agent.SandboxID != sandboxID {
			continue
		}
		secrets, err := s.openAgentSecrets(agent.ID)
		if err != nil {
			continue
		}
		for _, value := range secrets {
			if strings.TrimSpace(value) != "" {
				values = append(values, value)
			}
		}
	}
	sort.Slice(values, func(i, j int) bool { return len(values[i]) > len(values[j]) })
	return values
}

func sandboxOutputEntries(sandboxID, runID, label, stream, output string, createdAt time.Time, redactions []string) []model.SandboxLogEntry {
	output = redactSandboxLog(output, redactions)
	lines := strings.Split(strings.ReplaceAll(output, "\r\n", "\n"), "\n")
	if len(lines) > maxSandboxLogLines {
		lines = lines[len(lines)-maxSandboxLogLines:]
	}
	entries := make([]model.SandboxLogEntry, 0, len(lines))
	for _, line := range lines {
		line = sanitizeSandboxLogLine(line)
		if line == "" {
			continue
		}
		entries = append(entries, model.SandboxLogEntry{
			ID:        apiutil.RandomID("log"),
			SandboxID: sandboxID,
			RunID:     runID,
			Label:     label,
			Source:    "exec",
			Stream:    stream,
			Message:   line,
			CreatedAt: createdAt,
		})
	}
	return entries
}

func redactSandboxLog(value string, redactions []string) string {
	for _, secret := range redactions {
		value = strings.ReplaceAll(value, secret, "[REDACTED]")
	}
	return value
}

func sanitizeSandboxLogLine(value string) string {
	value = strings.Map(func(r rune) rune {
		switch {
		case r == '\t':
			return r
		case unicode.IsControl(r):
			return -1
		default:
			return r
		}
	}, value)
	if len(value) <= maxSandboxLogLineBytes {
		return value
	}
	value = value[:maxSandboxLogLineBytes]
	for !utf8.ValidString(value) {
		value = value[:len(value)-1]
	}
	return value + "…"
}
