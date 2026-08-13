package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildSubPath(t *testing.T) {
	base := "/usr/home/john/paisa"
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "file", input: "main.ledger", want: base + "/main.ledger"},
		{name: "nested file", input: "subfolder/main.ledger", want: base + "/subfolder/main.ledger"},
		{name: "safe double dots in filename", input: "reports/budget..draft.ledger", want: base + "/reports/budget..draft.ledger"},
		{name: "escape multiple parents", input: "../../../subfolder/travel.ledger", wantErr: true},
		{name: "parent", input: "..", wantErr: true},
		{name: "cleaned parent", input: "./..", wantErr: true},
		{name: "parent file", input: "./../test.ledger", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path, err := BuildSubPath(base, tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want, path)
		})
	}
}
