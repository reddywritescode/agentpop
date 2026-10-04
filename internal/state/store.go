package state

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/reddywritescode/agentpop/internal/model"
)

type snapshot struct {
	Sandboxes            map[string]model.Sandbox             `json:"sandboxes"`
	SandboxLogs          map[string][]model.SandboxLogEntry   `json:"sandboxLogs,omitempty"`
	SandboxSecrets       map[string]string                    `json:"sandboxSecrets,omitempty"`
	Agents               map[string]model.Agent               `json:"agents"`
	AgentSecrets         map[string]string                    `json:"agentSecrets,omitempty"`
	EvalSuites           map[string]model.EvalSuite           `json:"evalSuites,omitempty"`
	EvalRuns             map[string]model.EvalRun             `json:"evalRuns,omitempty"`
	CustomerUsers        map[string]model.CustomerUser        `json:"customerUsers,omitempty"`
	Templates            map[string]model.Template            `json:"templates,omitempty"`
	TemplateBuilds       map[string]model.TemplateBuild       `json:"templateBuilds,omitempty"`
	Networks             map[string]model.Network             `json:"networks,omitempty"`
	Storages             map[string]model.Storage             `json:"storages,omitempty"`
	Webhooks             map[string]model.Webhook             `json:"webhooks,omitempty"`
	Members              map[string]model.Member              `json:"members,omitempty"`
	APIKeys              map[string]model.APIKey              `json:"apiKeys,omitempty"`
	ConnectorConnections map[string]model.ConnectorConnection `json:"connectorConnections,omitempty"`
	Project              model.ProjectSettings                `json:"project,omitempty"`
	QuotaRequests        []model.QuotaRequest                 `json:"quotaRequests,omitempty"`
	Credits              float64                              `json:"credits"`
	Audit                []model.AuditEvent                   `json:"audit"`
	Idempotency          map[string]string                    `json:"idempotency,omitempty"`
	Operator             model.OperatorState                  `json:"operator,omitempty"`
}

type Store struct {
	mu   sync.RWMutex
	path string
	data snapshot
}

func Open(path string) (*Store, error) {
	s := &Store{
		path: path,
		data: snapshot{
			Sandboxes:            map[string]model.Sandbox{},
			SandboxLogs:          map[string][]model.SandboxLogEntry{},
			SandboxSecrets:       map[string]string{},
			Agents:               map[string]model.Agent{},
			AgentSecrets:         map[string]string{},
			EvalSuites:           map[string]model.EvalSuite{},
			EvalRuns:             map[string]model.EvalRun{},
			CustomerUsers:        map[string]model.CustomerUser{},
			Templates:            map[string]model.Template{},
			TemplateBuilds:       map[string]model.TemplateBuild{},
			Networks:             map[string]model.Network{},
			Storages:             map[string]model.Storage{},
			Webhooks:             map[string]model.Webhook{},
			Members:              map[string]model.Member{},
			APIKeys:              map[string]model.APIKey{},
			ConnectorConnections: map[string]model.ConnectorConnection{},
			Project: model.ProjectSettings{
				Name:               "production",
				Region:             "local",
				DefaultIdleSeconds: 900,
			},
			QuotaRequests: []model.QuotaRequest{},
			Credits:       500,
			Audit:         []model.AuditEvent{},
			Idempotency:   map[string]string{},
			Operator: model.OperatorState{
				DrainingHosts: map[string]bool{},
			},
		},
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) Path() string {
	return s.path
}

func (s *Store) load() error {
	raw, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read state: %w", err)
	}
	if err := json.Unmarshal(raw, &s.data); err != nil {
		return fmt.Errorf("decode state: %w", err)
	}
	if s.data.Sandboxes == nil {
		s.data.Sandboxes = map[string]model.Sandbox{}
	}
	if s.data.SandboxLogs == nil {
		s.data.SandboxLogs = map[string][]model.SandboxLogEntry{}
	}
	if s.data.SandboxSecrets == nil {
		s.data.SandboxSecrets = map[string]string{}
	}
	if s.data.Agents == nil {
		s.data.Agents = map[string]model.Agent{}
	}
	if s.data.AgentSecrets == nil {
		s.data.AgentSecrets = map[string]string{}
	}
	if s.data.EvalSuites == nil {
		s.data.EvalSuites = map[string]model.EvalSuite{}
	}
	if s.data.EvalRuns == nil {
		s.data.EvalRuns = map[string]model.EvalRun{}
	}
	if s.data.CustomerUsers == nil {
		s.data.CustomerUsers = map[string]model.CustomerUser{}
	}
	if s.data.Templates == nil {
		s.data.Templates = map[string]model.Template{}
	}
	if s.data.TemplateBuilds == nil {
		s.data.TemplateBuilds = map[string]model.TemplateBuild{}
	}
	if s.data.Networks == nil {
		s.data.Networks = map[string]model.Network{}
	}
	if s.data.Storages == nil {
		s.data.Storages = map[string]model.Storage{}
	}
	if s.data.Webhooks == nil {
		s.data.Webhooks = map[string]model.Webhook{}
	}
	if s.data.Members == nil {
		s.data.Members = map[string]model.Member{}
	}
	if s.data.APIKeys == nil {
		s.data.APIKeys = map[string]model.APIKey{}
	}
	if s.data.ConnectorConnections == nil {
		s.data.ConnectorConnections = map[string]model.ConnectorConnection{}
	}
	if s.data.Project.Name == "" {
		s.data.Project = model.ProjectSettings{Name: "production", Region: "local", DefaultIdleSeconds: 900}
	}
	if s.data.Credits == 0 {
		s.data.Credits = 500
	}
	if s.data.Idempotency == nil {
		s.data.Idempotency = map[string]string{}
	}
	if s.data.Operator.DrainingHosts == nil {
		s.data.Operator.DrainingHosts = map[string]bool{}
	}
	return nil
}

func (s *Store) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return fmt.Errorf("create state directory: %w", err)
	}
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return fmt.Errorf("encode state: %w", err)
	}
	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".state-*.json")
	if err != nil {
		return fmt.Errorf("create state temp file: %w", err)
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err := tmp.Chmod(0o600); err != nil {
		_ = tmp.Close()
		return err
	}
	if _, err := tmp.Write(raw); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmpName, s.path); err != nil {
		return fmt.Errorf("replace state: %w", err)
	}
	return nil
}

func (s *Store) UpsertSandbox(sb model.Sandbox) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Sandboxes[sb.ID] = sb
	return s.saveLocked()
}

func (s *Store) GetSandbox(id string) (model.Sandbox, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sb, ok := s.data.Sandboxes[id]
	return sb, ok
}

func (s *Store) ListSandboxes() []model.Sandbox {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Sandbox, 0, len(s.data.Sandboxes))
	for _, sb := range s.data.Sandboxes {
		out = append(out, sb)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) DeleteSandbox(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Sandboxes, id)
	delete(s.data.SandboxLogs, id)
	delete(s.data.SandboxSecrets, id)
	return s.saveLocked()
}

func (s *Store) SetSandboxSecrets(sandboxID, encrypted string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if encrypted == "" {
		delete(s.data.SandboxSecrets, sandboxID)
	} else {
		s.data.SandboxSecrets[sandboxID] = encrypted
	}
	return s.saveLocked()
}

func (s *Store) GetSandboxSecrets(sandboxID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	encrypted, ok := s.data.SandboxSecrets[sandboxID]
	return encrypted, ok
}

func (s *Store) AppendSandboxLogs(id string, entries ...model.SandboxLogEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.data.Sandboxes[id]; !ok {
		return fmt.Errorf("sandbox %s not found", id)
	}
	const retainedEntries = 1000
	logs := append(s.data.SandboxLogs[id], entries...)
	if len(logs) > retainedEntries {
		logs = append([]model.SandboxLogEntry(nil), logs[len(logs)-retainedEntries:]...)
	}
	s.data.SandboxLogs[id] = logs
	return s.saveLocked()
}

func (s *Store) ListSandboxLogs(id string, limit int) []model.SandboxLogEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	logs := s.data.SandboxLogs[id]
	if limit <= 0 || limit > len(logs) {
		limit = len(logs)
	}
	start := len(logs) - limit
	return append([]model.SandboxLogEntry(nil), logs[start:]...)
}

func (s *Store) UpsertAgent(agent model.Agent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Agents[agent.ID] = agent
	return s.saveLocked()
}

func (s *Store) ListAgents() []model.Agent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Agent, 0, len(s.data.Agents))
	for _, agent := range s.data.Agents {
		out = append(out, agent)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) GetAgentByName(name string) (model.Agent, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, agent := range s.data.Agents {
		if agent.Name == name {
			return agent, true
		}
	}
	return model.Agent{}, false
}

func (s *Store) SetAgentSecrets(agentID, encrypted string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if encrypted == "" {
		delete(s.data.AgentSecrets, agentID)
	} else {
		s.data.AgentSecrets[agentID] = encrypted
	}
	return s.saveLocked()
}

func (s *Store) GetAgentSecrets(agentID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	encrypted, ok := s.data.AgentSecrets[agentID]
	return encrypted, ok
}

func (s *Store) UpdateAgentAndSecrets(agent model.Agent, encrypted string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Agents[agent.ID] = agent
	if encrypted == "" {
		delete(s.data.AgentSecrets, agent.ID)
	} else {
		s.data.AgentSecrets[agent.ID] = encrypted
	}
	return s.saveLocked()
}

func (s *Store) DeleteAgent(agentID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Agents, agentID)
	delete(s.data.AgentSecrets, agentID)
	for suiteID, suite := range s.data.EvalSuites {
		if suite.AgentID == agentID {
			delete(s.data.EvalSuites, suiteID)
			for runID, run := range s.data.EvalRuns {
				if run.SuiteID == suiteID {
					delete(s.data.EvalRuns, runID)
				}
			}
		}
	}
	return s.saveLocked()
}

func (s *Store) UpsertEvalSuite(suite model.EvalSuite) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.EvalSuites[suite.ID] = suite
	return s.saveLocked()
}

func (s *Store) GetEvalSuite(id string) (model.EvalSuite, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	suite, ok := s.data.EvalSuites[id]
	return suite, ok
}

func (s *Store) ListEvalSuites(agentID string) []model.EvalSuite {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.EvalSuite, 0, len(s.data.EvalSuites))
	for _, suite := range s.data.EvalSuites {
		if agentID == "" || suite.AgentID == agentID {
			out = append(out, suite)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out
}

func (s *Store) DeleteEvalSuite(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.EvalSuites, id)
	for runID, run := range s.data.EvalRuns {
		if run.SuiteID == id {
			delete(s.data.EvalRuns, runID)
		}
	}
	return s.saveLocked()
}

func (s *Store) UpsertEvalRun(run model.EvalRun) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.EvalRuns[run.ID] = run
	return s.saveLocked()
}

func (s *Store) GetEvalRun(id string) (model.EvalRun, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	run, ok := s.data.EvalRuns[id]
	return run, ok
}

func (s *Store) ListEvalRuns(suiteID, agentID string) []model.EvalRun {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.EvalRun, 0, len(s.data.EvalRuns))
	for _, run := range s.data.EvalRuns {
		if suiteID != "" && run.SuiteID != suiteID {
			continue
		}
		if agentID != "" && run.AgentID != agentID {
			continue
		}
		out = append(out, run)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartedAt.After(out[j].StartedAt) })
	return out
}

func (s *Store) UpsertCustomerUser(user model.CustomerUser) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.CustomerUsers[user.ID] = user
	return s.saveLocked()
}

func (s *Store) GetCustomerUser(id string) (model.CustomerUser, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.data.CustomerUsers[id]
	return user, ok
}

func (s *Store) UpsertTemplate(template model.Template) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Templates[template.ID] = template
	return s.saveLocked()
}

func (s *Store) GetTemplate(id string) (model.Template, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	template, ok := s.data.Templates[id]
	return template, ok
}

func (s *Store) GetTemplateByName(name string) (model.Template, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, template := range s.data.Templates {
		if template.Name == name {
			return template, true
		}
	}
	return model.Template{}, false
}

func (s *Store) FindTemplateByImageRef(imageRef string) (model.Template, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, template := range s.data.Templates {
		if template.ImageRef != "" && template.ImageRef == imageRef {
			return template, true
		}
	}
	return model.Template{}, false
}

func (s *Store) ListTemplates() []model.Template {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Template, 0, len(s.data.Templates))
	for _, template := range s.data.Templates {
		out = append(out, template)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) DeleteTemplate(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Templates, id)
	for buildID, build := range s.data.TemplateBuilds {
		if build.TemplateID == id {
			delete(s.data.TemplateBuilds, buildID)
		}
	}
	return s.saveLocked()
}

func (s *Store) UpsertTemplateBuild(build model.TemplateBuild) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.TemplateBuilds[build.ID] = build
	return s.saveLocked()
}

func (s *Store) GetTemplateBuild(id string) (model.TemplateBuild, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	build, ok := s.data.TemplateBuilds[id]
	return build, ok
}

func (s *Store) ListTemplateBuilds(templateID string) []model.TemplateBuild {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.TemplateBuild, 0, len(s.data.TemplateBuilds))
	for _, build := range s.data.TemplateBuilds {
		if templateID == "" || build.TemplateID == templateID {
			out = append(out, build)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) AppendTemplateBuildLogs(id string, entries ...model.TemplateBuildLogEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	build, ok := s.data.TemplateBuilds[id]
	if !ok {
		return fmt.Errorf("template build %s not found", id)
	}
	build.Logs = append(build.Logs, entries...)
	s.data.TemplateBuilds[id] = build
	return s.saveLocked()
}

func (s *Store) UpsertNetwork(network model.Network) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Networks[network.ID] = network
	return s.saveLocked()
}

func (s *Store) GetNetwork(id string) (model.Network, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	network, ok := s.data.Networks[id]
	return network, ok
}

func (s *Store) ListNetworks() []model.Network {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Network, 0, len(s.data.Networks))
	for _, network := range s.data.Networks {
		out = append(out, network)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) DeleteNetwork(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Networks, id)
	return s.saveLocked()
}

func (s *Store) UpsertStorage(storage model.Storage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Storages[storage.ID] = storage
	return s.saveLocked()
}

func (s *Store) GetStorage(id string) (model.Storage, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	storage, ok := s.data.Storages[id]
	return storage, ok
}

func (s *Store) ListStorages() []model.Storage {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Storage, 0, len(s.data.Storages))
	for _, storage := range s.data.Storages {
		out = append(out, storage)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) DeleteStorage(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Storages, id)
	return s.saveLocked()
}

func (s *Store) UpsertWebhook(webhook model.Webhook) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Webhooks[webhook.ID] = webhook
	return s.saveLocked()
}

func (s *Store) GetWebhook(id string) (model.Webhook, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	webhook, ok := s.data.Webhooks[id]
	return webhook, ok
}

func (s *Store) ListWebhooks() []model.Webhook {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Webhook, 0, len(s.data.Webhooks))
	for _, webhook := range s.data.Webhooks {
		out = append(out, webhook)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) DeleteWebhook(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Webhooks, id)
	return s.saveLocked()
}

func (s *Store) UpsertMember(member model.Member) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Members[member.Email] = member
	return s.saveLocked()
}

func (s *Store) GetMember(email string) (model.Member, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	member, ok := s.data.Members[email]
	return member, ok
}

func (s *Store) ListMembers() []model.Member {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Member, 0, len(s.data.Members))
	for _, member := range s.data.Members {
		out = append(out, member)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out
}

func (s *Store) DeleteMember(email string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Members, email)
	return s.saveLocked()
}

func (s *Store) UpsertAPIKey(key model.APIKey) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.APIKeys[key.ID] = key
	return s.saveLocked()
}

func (s *Store) ListAPIKeys() []model.APIKey {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.APIKey, 0, len(s.data.APIKeys))
	for _, key := range s.data.APIKeys {
		out = append(out, key)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) DeleteAPIKey(idOrName string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, key := range s.data.APIKeys {
		if id == idOrName || key.Name == idOrName {
			delete(s.data.APIKeys, id)
		}
	}
	return s.saveLocked()
}

func (s *Store) FindAPIKeyByHash(hash string, now time.Time) (model.APIKey, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, key := range s.data.APIKeys {
		if key.SecretHash == hash && now.Before(key.ExpiresAt) {
			return key, true
		}
	}
	return model.APIKey{}, false
}

func (s *Store) SetConnectorConnection(connection model.ConnectorConnection) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.ConnectorConnections[connection.ConnectorID] = connection
	return s.saveLocked()
}

func (s *Store) GetConnectorConnection(id string) (model.ConnectorConnection, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	connection, ok := s.data.ConnectorConnections[id]
	return connection, ok
}

func (s *Store) ListConnectorConnections() []model.ConnectorConnection {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := make([]model.ConnectorConnection, 0, len(s.data.ConnectorConnections))
	for _, connection := range s.data.ConnectorConnections {
		items = append(items, connection)
	}
	return items
}

func (s *Store) DeleteConnectorConnection(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.ConnectorConnections, id)
	return s.saveLocked()
}

func (s *Store) ProjectSettings() model.ProjectSettings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Project
}

func (s *Store) SetProjectSettings(project model.ProjectSettings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Project = project
	return s.saveLocked()
}

func (s *Store) ResetProject(project model.ProjectSettings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Sandboxes = map[string]model.Sandbox{}
	s.data.SandboxLogs = map[string][]model.SandboxLogEntry{}
	s.data.SandboxSecrets = map[string]string{}
	s.data.Agents = map[string]model.Agent{}
	s.data.AgentSecrets = map[string]string{}
	s.data.EvalSuites = map[string]model.EvalSuite{}
	s.data.EvalRuns = map[string]model.EvalRun{}
	s.data.Templates = map[string]model.Template{}
	s.data.TemplateBuilds = map[string]model.TemplateBuild{}
	s.data.Networks = map[string]model.Network{}
	s.data.Storages = map[string]model.Storage{}
	s.data.Webhooks = map[string]model.Webhook{}
	s.data.APIKeys = map[string]model.APIKey{}
	s.data.ConnectorConnections = map[string]model.ConnectorConnection{}
	for email, member := range s.data.Members {
		if member.Role != "Owner" {
			delete(s.data.Members, email)
		}
	}
	s.data.Project = project
	return s.saveLocked()
}

func (s *Store) Credits() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Credits
}

func (s *Store) AddCredits(amount float64) (float64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Credits += amount
	return s.data.Credits, s.saveLocked()
}

func (s *Store) AddQuotaRequest(request model.QuotaRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.QuotaRequests = append([]model.QuotaRequest{request}, s.data.QuotaRequests...)
	return s.saveLocked()
}

func (s *Store) ListQuotaRequests() []model.QuotaRequest {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.QuotaRequest, len(s.data.QuotaRequests))
	copy(out, s.data.QuotaRequests)
	return out
}

func (s *Store) AppendAudit(event model.AuditEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	s.data.Audit = append([]model.AuditEvent{event}, s.data.Audit...)
	if len(s.data.Audit) > 2000 {
		s.data.Audit = s.data.Audit[:2000]
	}
	return s.saveLocked()
}

func (s *Store) ListAudit() []model.AuditEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.AuditEvent, len(s.data.Audit))
	copy(out, s.data.Audit)
	return out
}

func (s *Store) GetIdempotency(key string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	resourceID, ok := s.data.Idempotency[key]
	return resourceID, ok
}

func (s *Store) PutIdempotency(key, resourceID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Idempotency[key] = resourceID
	return s.saveLocked()
}

func (s *Store) OperatorState() model.OperatorState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	draining := make(map[string]bool, len(s.data.Operator.DrainingHosts))
	for hostID, value := range s.data.Operator.DrainingHosts {
		draining[hostID] = value
	}
	return model.OperatorState{
		DrainingHosts: draining,
		LastReconcile: s.data.Operator.LastReconcile,
	}
}

func (s *Store) SetHostDraining(hostID string, draining bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.data.Operator.DrainingHosts == nil {
		s.data.Operator.DrainingHosts = map[string]bool{}
	}
	s.data.Operator.DrainingHosts[hostID] = draining
	return s.saveLocked()
}

func (s *Store) SetLastReconcile(at time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Operator.LastReconcile = at.UTC()
	return s.saveLocked()
}
