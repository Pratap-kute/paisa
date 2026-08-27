//go:build windows

package utils

import (
	"bytes"
	"context"
	"os/exec"
	"syscall"
)

func Exec(ctx context.Context, name string, stdout *bytes.Buffer, stderr *bytes.Buffer, args ...string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	command := exec.CommandContext(ctx, name, args...)
	command.Stdout = stdout
	command.Stderr = stderr

	command.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000,
	}

	return command.Run()
}
