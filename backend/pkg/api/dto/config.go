package dto

import "time"

type PublicConfigResponse struct {
	Config   any            `json:"config"`
	Accounts []string       `json:"accounts"`
	Now      *time.Time     `json:"now,omitempty"`
	Schema   map[string]any `json:"schema,omitempty"`
}
