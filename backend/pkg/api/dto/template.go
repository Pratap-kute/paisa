package dto

type TemplateResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Content      string `json:"content"`
	TemplateType string `json:"template_type"`
}

type TemplatesResponse struct {
	Templates []TemplateResponse `json:"templates"`
}

type TemplateUpsertRequest struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type TemplateDeleteRequest struct {
	Name string `json:"name"`
}

type TemplateSaveResponse struct {
	Template TemplateResponse `json:"template"`
	Saved    bool             `json:"saved"`
	Message  string           `json:"message,omitempty"`
}
