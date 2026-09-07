package dto

type IssueEntity struct {
	Type  string `json:"type"`
	ID    string `json:"id"`
	Label string `json:"label"`
}

type IssueAction struct {
	Label string `json:"label"`
	Href  string `json:"href"`
}

type IssueResponse struct {
	Level            string            `json:"level"`
	Summary          string            `json:"summary"`
	Description      string            `json:"description"`
	Details          string            `json:"details"`
	Code             string            `json:"code,omitempty"`
	Category         string            `json:"category,omitempty"`
	Entity           *IssueEntity      `json:"entity,omitempty"`
	AffectedFeatures []string          `json:"affectedFeatures,omitempty"`
	Action           *IssueAction      `json:"action,omitempty"`
	Metadata         map[string]string `json:"metadata,omitempty"`
}

type DiagnosticCheckResponse struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Status      string  `json:"status"` // "passed" | "issues" | "failed"
	MaxSeverity *string `json:"maxSeverity,omitempty"`
	IssueCount  int     `json:"issueCount"`
}

type DiagnosisSummaryResponse struct {
	Total        int `json:"total"`
	Danger       int `json:"danger"`
	Warning      int `json:"warning"`
	Info         int `json:"info"`
	PassedChecks int `json:"passedChecks"`
	FailedChecks int `json:"failedChecks"`
	TotalChecks  int `json:"totalChecks"`
}

type DiagnosisResponse struct {
	Summary DiagnosisSummaryResponse  `json:"summary"`
	Issues  []IssueResponse           `json:"issues"`
	Checks  []DiagnosticCheckResponse `json:"checks"`
}
