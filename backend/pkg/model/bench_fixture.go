package model

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/shopspring/decimal"
)

const currencyINR = "INR"

// GenerateSyntheticPostings deterministically generates N postings with realistic accounts, dates, and amounts
func GenerateSyntheticPostings(n int) []*posting.Posting {
	//nolint:gosec // benchmark fixture deterministic seed
	rng := rand.New(rand.NewSource(42))

	expenseCategories := []string{
		"Expenses:Food:Groceries",
		"Expenses:Food:Dining",
		"Expenses:Housing:Rent",
		"Expenses:Housing:Utilities",
		"Expenses:Transport:Fuel",
		"Expenses:Transport:Metro",
		"Expenses:Shopping:Electronics",
		"Expenses:Shopping:Clothing",
		"Expenses:Entertainment:Movies",
		"Expenses:Tax:IncomeTax",
		"Expenses:Interest:HomeLoan",
	}

	assetAccounts := []string{
		"Assets:Checking:HDFC",
		"Assets:Checking:SBI",
		"Assets:Equity:NIFTY50",
		"Assets:Equity:GOLD",
		"Assets:Debt:FD",
	}

	incomeAccounts := []string{
		"Income:Salary:Company",
		"Income:Interest:Savings",
		"Income:CapitalGains:Equity",
		"Income:Dividend:Stocks",
	}

	liabilityAccounts := []string{
		"Liabilities:CreditCard:HDFC",
		"Liabilities:Loan:Home",
	}

	commodities := []string{currencyINR, "USD", "NIFTY50", "GOLD"}

	baseDate := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	postings := make([]*posting.Posting, n)

	for i := 0; i < n; i++ {
		daysOffset := rng.Intn(1800) // ~5 years
		date := baseDate.AddDate(0, 0, daysOffset)
		txID := fmt.Sprintf("tx-%08d", i/2)

		var account, commodity string
		var amount decimal.Decimal
		isForecast := (i%50 == 0) // occasional forecast
		switch i % 4 {
		case 0:
			account = expenseCategories[rng.Intn(len(expenseCategories))]
			commodity = currencyINR
			amount = decimal.NewFromFloat(float64(rng.Intn(5000) + 100))
		case 1:
			account = assetAccounts[rng.Intn(len(assetAccounts))]
			commodity = commodities[rng.Intn(len(commodities))]
			amount = decimal.NewFromFloat(float64(rng.Intn(50000) - 25000))
		case 2:
			account = incomeAccounts[rng.Intn(len(incomeAccounts))]
			commodity = currencyINR
			amount = decimal.NewFromFloat(float64(-1 * (rng.Intn(100000) + 5000)))
		default:
			account = liabilityAccounts[rng.Intn(len(liabilityAccounts))]
			commodity = currencyINR
			amount = decimal.NewFromFloat(float64(rng.Intn(20000) - 10000))
		}

		qty := amount
		if commodity != currencyINR {
			qty = decimal.NewFromFloat(float64(rng.Intn(100) + 1))
		}

		postings[i] = &posting.Posting{
			TransactionID: txID,
			Date:          date,
			Payee:         fmt.Sprintf("Payee-%d", rng.Intn(100)),
			Account:       account,
			Commodity:     commodity,
			Quantity:      qty,
			Amount:        amount,
			Status:        "cleared",
			Forecast:      isForecast,
			FileName:      "main.ledger",
		}
	}

	return postings
}

// GenerateSyntheticPrices deterministically generates N prices for commodities
func GenerateSyntheticPrices(n int) []price.Price {
	//nolint:gosec // benchmark fixture deterministic seed
	rng := rand.New(rand.NewSource(99))
	commodities := []string{"NIFTY50", "GOLD", "USD", "EUR"}
	baseDate := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)

	prices := make([]price.Price, n)
	for i := 0; i < n; i++ {
		comm := commodities[i%len(commodities)]
		date := baseDate.AddDate(0, 0, i/len(commodities))
		prices[i] = price.Price{
			Date:          date,
			CommodityType: config.Stock,
			CommodityID:   comm,
			CommodityName: comm,
			Value:         decimal.NewFromFloat(float64(rng.Intn(20000) + 1000)),
		}
	}
	return prices
}

// GenerateSyntheticJournal deterministically creates a valid Ledger journal string with N postings
func GenerateSyntheticJournal(n int) string {
	var sb strings.Builder
	postings := GenerateSyntheticPostings(n)

	for i := 0; i < len(postings)-1; i += 2 {
		p1 := postings[i]
		p2 := postings[i+1]
		// Balanced transaction
		fmt.Fprintf(&sb, "%s %s\n", p1.Date.Format("2006/01/02"), p1.Payee)
		fmt.Fprintf(&sb, "    %-40s %12s INR\n", p1.Account, p1.Amount.StringFixed(2))
		fmt.Fprintf(&sb, "    %-40s %12s INR\n\n", p2.Account, p1.Amount.Neg().StringFixed(2))
	}
	return sb.String()
}
