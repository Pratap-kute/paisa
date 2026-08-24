package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/template"
)

func TemplateToDTO(t template.Template) dto.TemplateResponse {
	return dto.TemplateResponse{
		ID:           t.ID,
		Name:         t.Name,
		Content:      t.Content,
		TemplateType: string(t.TemplateType),
	}
}

func TemplatesToDTO(templates []template.Template) []dto.TemplateResponse {
	if len(templates) == 0 {
		return []dto.TemplateResponse{}
	}
	result := make([]dto.TemplateResponse, len(templates))
	for i := range templates {
		result[i] = TemplateToDTO(templates[i])
	}
	return result
}
