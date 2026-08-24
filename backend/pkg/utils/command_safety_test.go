package utils

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// HelperProcess pattern for subprocess testing without external binary dependencies
func TestHelperProcess(t *testing.T) {
	if os.Getenv("GO_WANT_HELPER_PROCESS") != "1" {
		return
	}
	defer os.Exit(0)

	args := os.Args
	for len(args) > 0 {
		if args[0] == "--" {
			args = args[1:]
			break
		}
		args = args[1:]
	}
	if len(args) == 0 {
		return
	}

	switch args[0] {
	case "sleep":
		time.Sleep(5 * time.Second)
	case "echo":
		for i, a := range args[1:] {
			if i > 0 {
				os.Stdout.WriteString(" ")
			}
			os.Stdout.WriteString(a)
		}
		os.Stdout.WriteString("\n")
	case "exit-non-zero":
		os.Stderr.WriteString("something went wrong\n")
		os.Exit(2)
	}
}

func helperCommand(ctx context.Context, t *testing.T, args ...string) (string, []string) {
	t.Helper()
	cs := []string{"-test.run=TestHelperProcess", "--"}
	cs = append(cs, args...)
	return os.Args[0], cs
}

func TestExec_Success(t *testing.T) {
	ctx := context.Background()
	bin, args := helperCommand(ctx, t, "echo", "hello", "paisa")

	var stdout, stderr bytes.Buffer
	// Set environment for helper process
	t.Setenv("GO_WANT_HELPER_PROCESS", "1")

	err := Exec(ctx, bin, &stdout, &stderr, args...)
	require.NoError(t, err)
	assert.Contains(t, stdout.String(), "hello paisa")
	assert.Empty(t, stderr.String())
}

func TestExec_NonZeroExit(t *testing.T) {
	ctx := context.Background()
	bin, args := helperCommand(ctx, t, "exit-non-zero")

	var stdout, stderr bytes.Buffer
	t.Setenv("GO_WANT_HELPER_PROCESS", "1")

	err := Exec(ctx, bin, &stdout, &stderr, args...)
	require.Error(t, err)

	var exitErr *exec.ExitError
	assert.ErrorAs(t, err, &exitErr)
	assert.Equal(t, 2, exitErr.ExitCode())
	assert.Contains(t, stderr.String(), "something went wrong")
}

func TestExec_Timeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	bin, args := helperCommand(ctx, t, "sleep")
	t.Setenv("GO_WANT_HELPER_PROCESS", "1")

	start := time.Now()
	var stdout, stderr bytes.Buffer
	err := Exec(ctx, bin, &stdout, &stderr, args...)
	elapsed := time.Since(start)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "killed")
	assert.Less(t, elapsed, 2*time.Second, "Process should be killed promptly on timeout")
}

func TestExec_ContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	bin, args := helperCommand(ctx, t, "sleep")
	t.Setenv("GO_WANT_HELPER_PROCESS", "1")

	go func() {
		time.Sleep(30 * time.Millisecond)
		cancel()
	}()

	start := time.Now()
	var stdout, stderr bytes.Buffer
	err := Exec(ctx, bin, &stdout, &stderr, args...)
	elapsed := time.Since(start)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "killed")
	assert.Less(t, elapsed, 2*time.Second, "Process should be killed promptly on cancellation")
}

func TestExec_MissingExecutable(t *testing.T) {
	ctx := context.Background()
	var stdout, stderr bytes.Buffer
	err := Exec(ctx, "non_existent_binary_12345", &stdout, &stderr, "arg")
	require.Error(t, err)
}
