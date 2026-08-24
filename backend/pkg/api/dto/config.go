package dto

import "time"

type PublicConfigResponse struct {
	Config   interface{}            `json:"config"`
	Accounts []string               `json:"accounts"`
	Now      *time.Time             `json:"now,omitempty"`
	Schema   map[string]interface{} `json:"schema,omitempty"`
}
