package metal

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

func TestMetalPriceScaling(t *testing.T) {
	p := &PriceProvider{}
	assert.Equal(t, "com-purifiedbytes-metal", p.Code())
	assert.Equal(t, "Purified Bytes Metals India", p.Label())
	assert.NotEmpty(t, p.AutoComplete(nil, "", nil))

	goldClose := decimal.NewFromInt(75000)
	silverClose := decimal.NewFromInt(85000)

	goldPerGram := goldClose.Div(decimal.NewFromInt(10))
	silverPerGram := silverClose.Div(decimal.NewFromInt(1000))

	assert.Equal(t, "7500", goldPerGram.String())
	assert.Equal(t, "85", silverPerGram.String())
}
