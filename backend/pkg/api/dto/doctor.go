package dto

type IssueResponse struct {
	Level       string `json:"level"`
	Summary     string `json:"summary"`
	Description string `json:"description"`
	Details     string `json:"details"`
}

type DiagnosisResponse struct {
	Issues []IssueResponse `json:"issues"`
}
