package model

import "time"

type SandboxStatus string

const (
	StatusQueued       SandboxStatus = "queued"
	StatusProvisioning SandboxStatus = "provisioning"
	StatusRunning      SandboxStatus = "running"
	StatusPausing      SandboxStatus = "pausing"
	StatusPaused       SandboxStatus = "paused"
	StatusResuming     SandboxStatus = "resuming"
	StatusDeleting     SandboxStatus = "deleting"
	StatusDeleted      SandboxStatus = "deleted"
	StatusFailed       SandboxStatus = "failed"
)

type SSHAccess struct {
	Host           string `json:"host"`
	Port           int    `json:"port"`
	User           string `json:"user"`
	PrivateKeyPath string `json:"privateKeyPath,omitempty"`
	Command        string `json:"command"`
	HostCommand    string `json:"hostCommand,omitempty"`
}

type RuntimeSandbox struct {
	ID          string        `json:"id"`
	RuntimeID   string        `json:"runtimeId"`
	RuntimeName string        `json:"runtimeName"`
	Driver      string        `json:"driver"`
	Status      SandboxStatus `json:"status"`
	VCPU        float64       `json:"vcpu,omitempty"`
	MemoryMB    int64         `json:"memoryMb,omitempty"`
	DiskGB      int64         `json:"diskGb,omitempty"`
	PrivateIP   string        `json:"privateIp,omitempty"`
	SSH         *SSHAccess    `json:"ssh,omitempty"`
	StartedAt   time.Time     `json:"startedAt,omitempty"`
}

type Sandbox struct {
	ID            string        `json:"id"`
	ProjectID     string        `json:"projectId"`
	Name          string        `json:"name"`
	Kind          string        `json:"kind,omitempty"`
	RecipeID      string        `json:"recipeId,omitempty"`
	Status        SandboxStatus `json:"status"`
	DesiredStatus SandboxStatus `json:"desiredStatus"`
	Generation    int64         `json:"generation"`
	Observed      int64         `json:"observedGeneration"`
	Image         string        `json:"image"`
	Region        string        `json:"region"`
	VCPU          float64       `json:"vcpu"`
	MemoryMB      int64         `json:"memoryMb"`
	DiskGB        int64         `json:"diskGb"`
	PublicWeb     bool          `json:"publicWeb"`
	// Lifecycle is either persistent (kept until the customer deletes it) or
	// ephemeral (automatically expires after TTLSeconds).
	Lifecycle        string            `json:"lifecycle"`
	PauseWhenIdle    bool              `json:"pauseWhenIdle"`
	IdleTimeoutSec   int64             `json:"idleTimeoutSec,omitempty"`
	TTLSeconds       int64             `json:"ttlSeconds,omitempty"`
	AllowedEgress    []string          `json:"allowedEgress,omitempty"`
	Environment      map[string]string `json:"environment,omitempty"`
	SecretNames      []string          `json:"secretNames,omitempty"`
	SecretsUpdatedAt time.Time         `json:"secretsUpdatedAt,omitempty"`
	Ports            []PreviewPort     `json:"ports,omitempty"`
	HostID           string            `json:"hostId,omitempty"`
	Runtime          *RuntimeSandbox   `json:"runtime,omitempty"`
	Error            string            `json:"error,omitempty"`
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt"`
}

type PreviewPort struct {
	Port int    `json:"port"`
	Mode string `json:"mode"`
	URL  string `json:"url"`
}

type CreateSandboxRequest struct {
	Name           string            `json:"name"`
	ProjectID      string            `json:"projectId,omitempty"`
	Kind           string            `json:"kind,omitempty"`
	RecipeID       string            `json:"recipeId,omitempty"`
	Image          string            `json:"image,omitempty"`
	Region         string            `json:"region,omitempty"`
	VCPU           float64           `json:"vcpu,omitempty"`
	MemoryMB       int64             `json:"memoryMb,omitempty"`
	DiskGB         int64             `json:"diskGb,omitempty"`
	PublicWeb      bool              `json:"publicWeb,omitempty"`
	Lifecycle      string            `json:"lifecycle,omitempty"`
	PauseWhenIdle  bool              `json:"pauseWhenIdle,omitempty"`
	IdleTimeoutSec int64             `json:"idleTimeoutSec,omitempty"`
	TTLSeconds     int64             `json:"ttlSeconds,omitempty"`
	AllowedEgress  []string          `json:"allowedEgress,omitempty"`
	Environment    map[string]string `json:"environment,omitempty"`
	// Secrets are write-only environment values. They are encrypted at rest,
	// injected by the data plane, and never returned by the sandbox API.
	Secrets map[string]string `json:"secrets,omitempty"`
	// SecretEnvironment is an internal-only channel from the control plane to
	// the runtime. It is deliberately excluded from customer JSON and sandbox
	// state so write-only credentials never become ordinary environment data.
	SecretEnvironment map[string]string `json:"-"`
}

type RuntimeCreateRequest struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Image          string            `json:"image"`
	VCPU           float64           `json:"vcpu"`
	MemoryMB       int64             `json:"memoryMb"`
	DiskGB         int64             `json:"diskGb"`
	AllowedEgress  []string          `json:"allowedEgress,omitempty"`
	Environment    map[string]string `json:"environment,omitempty"`
	Secrets        map[string]string `json:"secrets,omitempty"`
	AuthorizedKey  string            `json:"authorizedKey,omitempty"`
	PrivateKeyPath string            `json:"privateKeyPath,omitempty"`
}

type RuntimeUpdateRequest struct {
	VCPU     float64 `json:"vcpu"`
	MemoryMB int64   `json:"memoryMb"`
}

type RuntimeSecretsRequest struct {
	Secrets map[string]string `json:"secrets"`
}

type ExecRequest struct {
	Command string `json:"command"`
	// Label is safe customer-visible metadata used to group build and test
	// output. Command text remains intentionally absent from persisted logs.
	Label          string `json:"label,omitempty"`
	TimeoutSeconds int64  `json:"timeoutSeconds,omitempty"`
}

type ExecResult struct {
	ExitCode   int           `json:"exitCode"`
	Stdout     string        `json:"stdout"`
	Stderr     string        `json:"stderr"`
	DurationMS int64         `json:"durationMs"`
	StartedAt  time.Time     `json:"startedAt"`
	FinishedAt time.Time     `json:"finishedAt"`
	Status     SandboxStatus `json:"status,omitempty"`
}

// SandboxLogEntry is a bounded customer-visible record produced by a real
// runtime operation. Command text is intentionally not persisted because it
// may contain credentials; stdout/stderr are redacted against the agent's
// write-only secret values before storage.
type SandboxLogEntry struct {
	ID         string    `json:"id"`
	SandboxID  string    `json:"sandboxId"`
	RunID      string    `json:"runId,omitempty"`
	Label      string    `json:"label,omitempty"`
	Source     string    `json:"source"`
	Stream     string    `json:"stream"`
	Message    string    `json:"message"`
	ExitCode   *int      `json:"exitCode,omitempty"`
	DurationMS int64     `json:"durationMs,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type SandboxMetrics struct {
	CPULoad        float64   `json:"cpuLoad"`
	CPUPercent     float64   `json:"cpuPercent"`
	MemoryUsedMB   float64   `json:"memoryUsedMb"`
	MemoryTotalMB  float64   `json:"memoryTotalMb"`
	DiskUsedMB     float64   `json:"diskUsedMb"`
	DiskTotalMB    float64   `json:"diskTotalMb"`
	NetworkRxBytes float64   `json:"networkRxBytes"`
	NetworkTxBytes float64   `json:"networkTxBytes"`
	ProcessCount   int       `json:"processCount"`
	SampledAt      time.Time `json:"sampledAt"`
}

type HostCapacity struct {
	CPUCores       int     `json:"cpuCores"`
	MemoryMB       int64   `json:"memoryMb"`
	DiskGB         int64   `json:"diskGb"`
	AllocatedVCPU  float64 `json:"allocatedVcpu"`
	AllocatedMemMB int64   `json:"allocatedMemoryMb"`
	Sandboxes      int     `json:"sandboxes"`
}

type HostInfo struct {
	ID                 string       `json:"id"`
	Name               string       `json:"name"`
	Region             string       `json:"region"`
	Driver             string       `json:"driver"`
	OS                 string       `json:"os"`
	Architecture       string       `json:"architecture"`
	Healthy            bool         `json:"healthy"`
	KVMAvailable       bool         `json:"kvmAvailable"`
	FirecrackerVersion string       `json:"firecrackerVersion,omitempty"`
	Message            string       `json:"message,omitempty"`
	SSHCommand         string       `json:"sshCommand,omitempty"`
	Capacity           HostCapacity `json:"capacity"`
	UpdatedAt          time.Time    `json:"updatedAt"`
}

type ControlPlaneStatus struct {
	Name          string     `json:"name"`
	Version       string     `json:"version"`
	Mode          string     `json:"mode"`
	API           string     `json:"api"`
	StateStore    string     `json:"stateStore"`
	HostAgentURL  string     `json:"hostAgentUrl"`
	Healthy       bool       `json:"healthy"`
	SandboxCount  int        `json:"sandboxCount"`
	RunningCount  int        `json:"runningCount"`
	DataPlaneHost []HostInfo `json:"dataPlaneHosts"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type OperatorState struct {
	DrainingHosts map[string]bool `json:"drainingHosts,omitempty"`
	LastReconcile time.Time       `json:"lastReconcile,omitempty"`
}

type AuditEvent struct {
	ID         string         `json:"id"`
	Action     string         `json:"action"`
	Actor      string         `json:"actor"`
	Resource   string         `json:"resource"`
	ResourceID string         `json:"resourceId"`
	Result     string         `json:"result"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	CreatedAt  time.Time      `json:"createdAt"`
}

type Agent struct {
	ID                       string    `json:"id"`
	Name                     string    `json:"name"`
	Status                   string    `json:"status"`
	SandboxID                string    `json:"sandboxId"`
	Template                 string    `json:"template"`
	Model                    string    `json:"model"`
	Connectors               []string  `json:"connectors,omitempty"`
	SecretNames              []string  `json:"secretNames,omitempty"`
	SecretsGeneration        int64     `json:"secretsGeneration,omitempty"`
	AppliedSecretsGeneration int64     `json:"appliedSecretsGeneration,omitempty"`
	SecretsUpdatedAt         time.Time `json:"secretsUpdatedAt,omitempty"`
	CreatedAt                time.Time `json:"createdAt"`
	UpdatedAt                time.Time `json:"updatedAt"`
	LastMessage              string    `json:"lastMessage,omitempty"`
}

type CreateAgentRequest struct {
	Name        string            `json:"name"`
	Template    string            `json:"template,omitempty"`
	Model       string            `json:"model,omitempty"`
	Connectors  []string          `json:"connectors,omitempty"`
	VCPU        float64           `json:"vcpu,omitempty"`
	MemoryMB    int64             `json:"memoryMb,omitempty"`
	DiskGB      int64             `json:"diskGb,omitempty"`
	Environment map[string]string `json:"environment,omitempty"`
	Secrets     map[string]string `json:"secrets,omitempty"`
}

type UpdateAgentSecretsRequest struct {
	Secrets map[string]string `json:"secrets"`
	Replace bool              `json:"replace,omitempty"`
}

// EvalRunner describes how a test case reaches an agent. The command runs
// inside the agent's own sandbox, receives the case input as JSON on stdin, and
// may return either plain text or an Open AgentOps-compatible JSON result.
type EvalRunner struct {
	Type           string `json:"type"`
	Command        string `json:"command"`
	TimeoutSeconds int64  `json:"timeoutSeconds,omitempty"`
	JudgeProvider  string `json:"judgeProvider,omitempty"`
	JudgeModel     string `json:"judgeModel,omitempty"`
}

type EvalGate struct {
	MinScore float64 `json:"minScore"`
}

type EvalFinalAnswerAssertions struct {
	Contains       []string `json:"contains,omitempty"`
	MustNotContain []string `json:"must_not_contain,omitempty"`
}

type EvalMetricAssertions struct {
	Min map[string]float64 `json:"min,omitempty"`
	Max map[string]float64 `json:"max,omitempty"`
}

type EvalPrivacyAssertions struct {
	ForbiddenPII []string `json:"forbidden_pii,omitempty"`
	Forbidden    any      `json:"forbidden,omitempty"`
	AllowedPII   []string `json:"allowed_pii,omitempty"`
	Inspect      []string `json:"inspect,omitempty"`
}

type EvalSecretAssertions struct {
	Forbidden      any      `json:"forbidden,omitempty"`
	ForbiddenTypes []string `json:"forbidden_types,omitempty"`
	Inspect        []string `json:"inspect,omitempty"`
}

type EvalAssertions struct {
	ToolsCalled         []string                  `json:"tools_called,omitempty"`
	ToolsNotCalled      []string                  `json:"tools_not_called,omitempty"`
	ApprovalRequiredFor []string                  `json:"approval_required_for,omitempty"`
	ToolModes           map[string]string         `json:"tool_modes,omitempty"`
	SimulatorContains   []map[string]any          `json:"simulator_contains,omitempty"`
	Limits              map[string]float64        `json:"limits,omitempty"`
	Metrics             EvalMetricAssertions      `json:"metrics,omitempty"`
	BusinessMetrics     map[string]any            `json:"business_metrics,omitempty"`
	Privacy             EvalPrivacyAssertions     `json:"privacy,omitempty"`
	Secrets             EvalSecretAssertions      `json:"secrets,omitempty"`
	FinalAnswer         EvalFinalAnswerAssertions `json:"final_answer,omitempty"`
}

type EvalJudge struct {
	Type      string  `json:"type"`
	CheckType string  `json:"check_type,omitempty"`
	Rubric    string  `json:"rubric,omitempty"`
	MinScore  float64 `json:"min_score,omitempty"`
	Model     string  `json:"model,omitempty"`
}

type EvalCase struct {
	ID      string         `json:"id"`
	Input   map[string]any `json:"input"`
	Assert  EvalAssertions `json:"assert"`
	Judges  []EvalJudge    `json:"judges,omitempty"`
	Tags    []string       `json:"tags,omitempty"`
	Enabled *bool          `json:"enabled,omitempty"`
}

// EvalSuite intentionally keeps the Open AgentOps field names (scenario,
// tests, assert, judges) so the same reviewable files can be used locally, in
// CI, and through AgentPop's hosted API without translation.
type EvalSuite struct {
	ID             string         `json:"id"`
	Version        int            `json:"version"`
	Scenario       string         `json:"scenario"`
	Description    string         `json:"description,omitempty"`
	AgentID        string         `json:"agentId"`
	AgentName      string         `json:"agent"`
	Runner         EvalRunner     `json:"runner"`
	Gate           EvalGate       `json:"gate"`
	Tests          []EvalCase     `json:"tests"`
	Source         string         `json:"source,omitempty"`
	Generated      bool           `json:"generated,omitempty"`
	ReviewRequired bool           `json:"review_required,omitempty"`
	Generation     map[string]any `json:"generation,omitempty"`
	CheckProfile   map[string]any `json:"check_profile,omitempty"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
}

type CreateEvalSuiteRequest struct {
	Version        int            `json:"version,omitempty"`
	Scenario       string         `json:"scenario"`
	Description    string         `json:"description,omitempty"`
	Runner         EvalRunner     `json:"runner"`
	Gate           EvalGate       `json:"gate,omitempty"`
	Tests          []EvalCase     `json:"tests"`
	Source         string         `json:"source,omitempty"`
	Generated      bool           `json:"generated,omitempty"`
	ReviewRequired bool           `json:"review_required,omitempty"`
	Generation     map[string]any `json:"generation,omitempty"`
	CheckProfile   map[string]any `json:"check_profile,omitempty"`
}

type EvalCheck struct {
	Name      string `json:"name"`
	CheckType string `json:"checkType"`
	Passed    bool   `json:"passed"`
	Skipped   bool   `json:"skipped,omitempty"`
	Expected  any    `json:"expected,omitempty"`
	Actual    any    `json:"actual,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

type EvalCaseResult struct {
	ID         string         `json:"id"`
	Passed     bool           `json:"passed"`
	Score      float64        `json:"score"`
	Output     string         `json:"output"`
	Error      string         `json:"error,omitempty"`
	ExitCode   int            `json:"exitCode"`
	DurationMS int64          `json:"durationMs"`
	Checks     []EvalCheck    `json:"checks"`
	Blocking   []string       `json:"blocking,omitempty"`
	Metrics    map[string]any `json:"metrics,omitempty"`
}

type EvalRun struct {
	ID          string           `json:"id"`
	SuiteID     string           `json:"suiteId"`
	Scenario    string           `json:"scenario"`
	AgentID     string           `json:"agentId"`
	AgentName   string           `json:"agent"`
	Status      string           `json:"status"`
	Environment string           `json:"environment"`
	Score       float64          `json:"score"`
	MinScore    float64          `json:"minScore"`
	Passed      bool             `json:"passed"`
	Blocking    []string         `json:"blocking,omitempty"`
	Cases       []EvalCaseResult `json:"cases"`
	Metrics     map[string]any   `json:"metrics"`
	StartedAt   time.Time        `json:"startedAt"`
	CompletedAt time.Time        `json:"completedAt,omitempty"`
}

type CreateEvalRunRequest struct {
	Environment string `json:"environment,omitempty"`
}

type Connector struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Category         string   `json:"category"`
	Description      string   `json:"description"`
	LogoURL          string   `json:"logoUrl,omitempty"`
	ToolsCount       int      `json:"toolsCount,omitempty"`
	Configured       bool     `json:"configured"`
	Connected        bool     `json:"connected"`
	Status           string   `json:"status,omitempty"`
	Account          string   `json:"account,omitempty"`
	Actions          []string `json:"actions"`
	AvailableActions []string `json:"availableActions,omitempty"`
}

type ConnectorTool struct {
	Slug        string         `json:"slug"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Toolkit     string         `json:"toolkit,omitempty"`
	InputSchema map[string]any `json:"inputSchema,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
	Scopes      []string       `json:"scopes,omitempty"`
	Version     string         `json:"version,omitempty"`
}

// CustomerUser is a customer identity established through a real OAuth
// provider (AUTH-001 phase 1). Organization/project membership arrives with
// the tenancy milestone.
type CustomerUser struct {
	ID            string    `json:"id"`
	Provider      string    `json:"provider"`
	ProviderLogin string    `json:"providerLogin"`
	Email         string    `json:"email,omitempty"`
	Name          string    `json:"name,omitempty"`
	AvatarURL     string    `json:"avatarUrl,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	LastLoginAt   time.Time `json:"lastLoginAt"`
}

type TemplateStatus string

const (
	TemplateStatusDraft    TemplateStatus = "draft"
	TemplateStatusBuilding TemplateStatus = "building"
	TemplateStatusReady    TemplateStatus = "ready"
	TemplateStatusFailed   TemplateStatus = "failed"
)

type Template struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	Description   string         `json:"description,omitempty"`
	Source        string         `json:"source"`
	Status        TemplateStatus `json:"status"`
	Version       int            `json:"version"`
	Architecture  string         `json:"architecture,omitempty"`
	BaseImage     string         `json:"baseImage"`
	Steps         []string       `json:"steps,omitempty"`
	Definition    string         `json:"definition,omitempty"`
	ImageRef      string         `json:"imageRef,omitempty"`
	SizeMB        int64          `json:"sizeMb,omitempty"`
	LatestBuildID string         `json:"latestBuildId,omitempty"`
	Deprecated    bool           `json:"deprecated"`
	DeprecatedAt  time.Time      `json:"deprecatedAt,omitempty"`
	Error         string         `json:"error,omitempty"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

type CreateTemplateRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Definition  string `json:"definition"`
}

type TemplateBuildStatus string

const (
	TemplateBuildQueued    TemplateBuildStatus = "queued"
	TemplateBuildRunning   TemplateBuildStatus = "building"
	TemplateBuildSucceeded TemplateBuildStatus = "succeeded"
	TemplateBuildFailed    TemplateBuildStatus = "failed"
)

type TemplateBuildLogEntry struct {
	At     time.Time `json:"at"`
	Stream string    `json:"stream"`
	Line   string    `json:"line"`
}

type TemplateBuild struct {
	ID           string                  `json:"id"`
	TemplateID   string                  `json:"templateId"`
	TemplateName string                  `json:"templateName"`
	Version      int                     `json:"version"`
	Status       TemplateBuildStatus     `json:"status"`
	BaseImage    string                  `json:"baseImage"`
	Steps        []string                `json:"steps,omitempty"`
	ImageRef     string                  `json:"imageRef,omitempty"`
	SizeMB       int64                   `json:"sizeMb,omitempty"`
	SandboxID    string                  `json:"sandboxId,omitempty"`
	Error        string                  `json:"error,omitempty"`
	Logs         []TemplateBuildLogEntry `json:"logs"`
	CreatedAt    time.Time               `json:"createdAt"`
	StartedAt    time.Time               `json:"startedAt,omitempty"`
	FinishedAt   time.Time               `json:"finishedAt,omitempty"`
}

type RuntimeCommitRequest struct {
	Reference string `json:"reference"`
	Comment   string `json:"comment,omitempty"`
}

type RuntimeImage struct {
	Reference string    `json:"reference"`
	Digest    string    `json:"digest,omitempty"`
	SizeMB    int64     `json:"sizeMb"`
	Driver    string    `json:"driver"`
	CreatedAt time.Time `json:"createdAt"`
}

type Network struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	CIDR               string    `json:"cidr"`
	Region             string    `json:"region"`
	AttachedSandboxIDs []string  `json:"attachedSandboxIds,omitempty"`
	Members            int       `json:"members"`
	Updated            string    `json:"updated"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type Storage struct {
	ID                   string    `json:"id"`
	Name                 string    `json:"name"`
	Endpoint             string    `json:"endpoint"`
	Bucket               string    `json:"bucket"`
	Region               string    `json:"region,omitempty"`
	PathStyle            bool      `json:"pathStyle"`
	EncryptedCredentials string    `json:"encryptedCredentials,omitempty"`
	AttachedSandboxIDs   []string  `json:"attachedSandboxIds,omitempty"`
	Attached             int       `json:"attached"`
	Health               string    `json:"health"`
	Checked              string    `json:"checked"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type Webhook struct {
	ID              string    `json:"id"`
	URL             string    `json:"url"`
	Events          []string  `json:"events"`
	Status          string    `json:"status"`
	Last            string    `json:"last"`
	EncryptedSecret string    `json:"encryptedSecret,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type Member struct {
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	MFA       bool      `json:"mfa"`
	Pending   bool      `json:"pending,omitempty"`
	Joined    string    `json:"joined"`
	CreatedAt time.Time `json:"createdAt"`
}

type APIKey struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Scopes     []string  `json:"scopes"`
	SecretHash string    `json:"secretHash,omitempty"`
	Prefix     string    `json:"prefix"`
	Created    string    `json:"created"`
	Expires    string    `json:"expires"`
	CreatedAt  time.Time `json:"createdAt"`
	ExpiresAt  time.Time `json:"expiresAt"`
}

type ConnectorConnection struct {
	ConnectorID string    `json:"connectorId"`
	Account     string    `json:"account"`
	Actions     []string  `json:"actions"`
	Status      string    `json:"status,omitempty"`
	ConnectedAt time.Time `json:"connectedAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ProjectSettings struct {
	Name               string    `json:"name"`
	Region             string    `json:"region"`
	DefaultIdleSeconds int64     `json:"defaultIdleSeconds"`
	DefaultTTLSeconds  int64     `json:"defaultTtlSeconds"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type QuotaRequest struct {
	ID        string    `json:"id"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}
