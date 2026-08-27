//go:build !windows

package utils

import (
	"bytes"
	"context"
	"os/exec"
)

//nolint:contextcheck // fallback to Background when ctx is nil
func Exec(ctx context.Context, name string, stdout *bytes.Buffer, stderr *bytes.Buffer, args ...string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	command := exec.CommandContext(ctx, name, args...)
	command.Stdout = stdout
	command.Stderr = stderr

	return command.Run()
}
