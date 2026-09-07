package service

type QualityLevel string

const (
	LevelDanger  QualityLevel = "danger"
	LevelWarning QualityLevel = "warning"
	LevelInfo    QualityLevel = "info"
)

type QualityCategory string

const (
	CategoryLedger        QualityCategory = "ledger"
	CategoryValuation     QualityCategory = "valuation"
	CategoryInvestments   QualityCategory = "investments"
	CategoryAllocation    QualityCategory = "allocation"
	CategoryConfiguration QualityCategory = "configuration"
	CategoryHistory       QualityCategory = "history"
	CategoryTransactions  QualityCategory = "transactions"
)

type CheckStatus string

const (
	CheckStatusPassed CheckStatus = "passed"
	CheckStatusIssues CheckStatus = "issues"
	CheckStatusFailed CheckStatus = "failed"
)

type IssueEntity struct {
	Type  string `json:"type"` // "account" | "commodity" | "transaction"
	ID    string `json:"id"`
	Label string `json:"label"`
}

type IssueAction struct {
	Label string `json:"label"`
	Href  string `json:"href"`
}

type QualityIssue struct {
	Code             string            `json:"code"`
	Level            QualityLevel      `json:"level"`
	Category         QualityCategory   `json:"category"`
	Summary          string            `json:"summary"`
	Description      string            `json:"description"`
	Details          string            `json:"details"`
	Entity           *IssueEntity      `json:"entity,omitempty"`
	AffectedFeatures []string          `json:"affectedFeatures,omitempty"`
	Action           *IssueAction      `json:"action,omitempty"`
	Metadata         map[string]string `json:"metadata,omitempty"`
}

type DiagnosticCheck struct {
	Code        string          `json:"code"`
	Name        string          `json:"name"`
	Category    QualityCategory `json:"category"`
	Status      CheckStatus     `json:"status"` // "passed" | "issues" | "failed"
	MaxSeverity *QualityLevel   `json:"maxSeverity,omitempty"`
	IssueCount  int             `json:"issueCount"`
}

type DiagnosisSummary struct {
	Total        int `json:"total"`
	Danger       int `json:"danger"`
	Warning      int `json:"warning"`
	Info         int `json:"info"`
	PassedChecks int `json:"passedChecks"`
	FailedChecks int `json:"failedChecks"`
	TotalChecks  int `json:"totalChecks"`
}

type DiagnosisResult struct {
	Summary DiagnosisSummary  `json:"summary"`
	Issues  []QualityIssue    `json:"issues"`
	Checks  []DiagnosticCheck `json:"checks"`
}
