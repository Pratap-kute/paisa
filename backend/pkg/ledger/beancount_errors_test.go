package ledger

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseBeancountErrors_EmptyStderrDoesNotPanic(t *testing.T) {
	require.NotPanics(t, func() {
		assert.Empty(t, parseBeancountErrors(""))
	})
}

func TestParseBeancountErrors_UnmatchedFirstLineDoesNotPanic(t *testing.T) {
	require.NotPanics(t, func() {
		errs := parseBeancountErrors("Traceback (most recent call last):\n")
		require.Len(t, errs, 1)
		assert.Contains(t, errs[0].Message, "Traceback")
	})
}

func TestParseBeancountErrors_ContinuationLinesAreAppended(t *testing.T) {
	errs := parseBeancountErrors("main.beancount:3:   Invalid account\n   extra context\n")
	require.Len(t, errs, 1)
	assert.Equal(t, uint64(3), errs[0].LineFrom)
	assert.Contains(t, errs[0].Message, "Invalid account")
	assert.Contains(t, errs[0].Message, "extra context")
}
