package dto

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

type SaveResponse struct {
	Saved   bool   `json:"saved"`
	Message string `json:"message,omitempty"`
}
