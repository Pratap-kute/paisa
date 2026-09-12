package ledger

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
)

func TestHLedgerCostFormats(t *testing.T) {
	require.NoError(t, config.LoadConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\ndefault_currency: INR\ntime_zone: UTC\n"), ""))
	date := time.Date(2022, 1, 8, 0, 0, 0, 0, time.UTC)
	prices := buildPricesTree([]price.Price{{CommodityName: "USD", Date: date, Value: decimal.RequireFromString("80.442048")}})
	annotation := func(tag, currency, value string) string {
		return fmt.Sprintf(`{"tag":%q,"contents":{"acommodity":%q,"aquantity":{"floatingPoint":%s}}}`, tag, currency, value)
	}
	for _, format := range []struct{ field, unit, total string }{{"aprice", "UnitPrice", "TotalPrice"}, {"acost", "UnitCost", "TotalCost"}} {
		for _, tc := range []struct{ name, quantity, tag, currency, value, expected string }{
			{"unit foreign currency", "0.76", format.unit, "USD", "131.27", "8025.3170071296"},
			{"total foreign currency", "0.76", format.total, "USD", "99.7652", "8025.3170071296"},
			{"negative unit", "-0.76", format.unit, "USD", "131.27", "-8025.3170071296"},
			{"negative total", "-0.76", format.total, "USD", "-99.7652", "-8025.3170071296"},
			{"unit default currency", "2", format.unit, "INR", "100", "200"},
			{"total default currency", "2", format.total, "INR", "100", "100"},
		} {
			t.Run(format.field+"/"+tc.name, func(t *testing.T) {
				raw := fmt.Sprintf(`{"paccount":"Assets:Equity:ABNB","pamount":[{"acommodity":"ABNB","aquantity":{"floatingPoint":%s},%q:%s}]}`, tc.quantity, format.field, annotation(tc.tag, tc.currency, tc.value))
				assertHLedgerCost(t, raw, prices, date, tc.expected, tc.quantity)
			})
		}
	}
	for _, tc := range []struct{ name, fields, commodity, expected string }{
		{"missing cost", "", "ABNB", "2"},
		{"null costs", `,"acost":null,"aprice":null`, "ABNB", "2"},
		{"market price fallback", "", "USD", "160.884096"},
		{"modern precedence", `,"acost":` + annotation("TotalCost", "INR", "300") + `,"aprice":` + annotation("UnitPrice", "INR", "100"), "ABNB", "300"},
		{"null modern fallback", `,"acost":null,"aprice":` + annotation("UnitPrice", "INR", "100"), "ABNB", "200"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw := fmt.Sprintf(`{"pamount":[{"acommodity":%q,"aquantity":{"floatingPoint":2}%s}]}`, tc.commodity, tc.fields)
			assertHLedgerCost(t, raw, prices, date, tc.expected, "2")
		})
	}
}

func assertHLedgerCost(t *testing.T, raw string, prices map[string][]price.Price, date time.Time, amount, quantity string) {
	t.Helper()
	var p HLedgerPosting
	require.NoError(t, json.Unmarshal([]byte(raw), &p))
	var transaction HLedgerTransaction
	require.NoError(t, json.Unmarshal([]byte(`{"tindex":1,"tstatus":"Unmarked","tsourcepos":[{"sourceName":"main.ledger","sourceLine":1},{"sourceName":"main.ledger","sourceLine":4}]}`), &transaction))
	postings, err := buildHLedgerPostings(p, transaction, prices, date)
	require.NoError(t, err)
	require.Len(t, postings, 1)
	require.True(t, decimal.RequireFromString(amount).Equal(postings[0].Amount), "amount: got %s, want %s", postings[0].Amount, amount)
	require.True(t, decimal.RequireFromString(quantity).Equal(postings[0].Quantity), "quantity: got %s, want %s", postings[0].Quantity, quantity)
}
