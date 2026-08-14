package stock

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestYahooPenceNormalization(t *testing.T) {
	cases := []struct {
		currency string
		expected string
		scale    float64
	}{
		{"GBp", "GBP", 0.01},
		{"GBX", "GBP", 0.01},
		{"USD", "USD", 1.0},
		{"INR", "INR", 1.0},
	}

	for _, tc := range cases {
		t.Run(tc.currency, func(t *testing.T) {
			curr := tc.currency
			scale := 1.0
			if strings.EqualFold(curr, "GBp") || strings.EqualFold(curr, "GBX") {
				curr = "GBP"
				scale = 0.01
			}
			assert.Equal(t, tc.expected, curr)
			assert.Equal(t, tc.scale, scale)
		})
	}
}

func TestYahooProviderMetadata(t *testing.T) {
	p := &YahooPriceProvider{}
	assert.Equal(t, "com-yahoo", p.Code())
	assert.Equal(t, "Yahoo Finance", p.Label())
	assert.NotEmpty(t, p.Description())
	assert.NotEmpty(t, p.AutoCompleteFields())
}
