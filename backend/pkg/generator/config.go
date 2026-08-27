package generator

import (
	"fmt"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	"slices"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/scraper/mutualfund"
	"github.com/ananthakumaran/paisa/pkg/scraper/nps"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
)

const StartYear = 2014

type GeneratorState struct {
	Balance       float64
	CreditBalance float64
	EPFBalance    float64
	Ledger        *os.File
	YearlySalary  float64
	Rent          float64
	LoanBalance   float64
	NiftyBalance  float64
}

var pricesTree map[string][]price.Price

func MinimalConfig(cwd string) error {
	configFilePath := filepath.Join(cwd, "paisa.yaml")
	config := `
journal_path: '%s'
db_path: '%s'
`
	log.Info("Generating config file: ", configFilePath)
	journalFilePath := filepath.Join(cwd, "main.ledger")
	dbFilePath := filepath.Join(cwd, "paisa.db")
	err := os.WriteFile(configFilePath, fmt.Appendf(nil, config, filepath.Base(journalFilePath), filepath.Base(dbFilePath)), 0o600)
	if err != nil {
		return err
	}

	log.Info("Generating journal file: ", journalFilePath)
	//nolint:gosec // generating sample journal in current working directory
	f, err := os.OpenFile(journalFilePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	_ = f.Close()
	return nil
}

func Demo(cwd string) error {
	if err := generateConfigFile(cwd); err != nil {
		return err
	}
	if err := generateJournalFile(cwd); err != nil {
		return err
	}
	return generateSheetFile(cwd)
}

func generateConfigFile(cwd string) error {
	configFilePath := filepath.Join(cwd, "paisa.yaml")
	config := `
journal_path: '%s'
db_path: '%s'
ledger_cli: ledger
default_currency: INR
goals:
  retirement:
    - name: Early Retirement
      icon: mdi:palm-tree
      swr: 3
      savings:
        - Assets:Debt:*
        - Assets:Equity:*
      expenses:
        - Expenses:Rent
        - Expenses:Utilities
        - Expenses:Shopping
        - Expenses:Restaurants
        - Expenses:Food
        - Expenses:Interest:*
  savings:
    - name: Millionaire
      icon: mdi:car-sports
      target: 80000000
      target_date: "2036-01-01"
      rate: 10
      accounts:
        - '!Assets:Checking:SBI'
allocation_targets:
  - name: Debt
    target: 40
    accounts:
      - Assets:Debt:*
      - Assets:Checking:*
      - Assets:House
  - name: Equity
    target: 60
    accounts:
      - Assets:Equity:*
accounts:
  - name: Liabilities:CreditCard:Freedom
    icon: arcticons:chase
schedule_al:
  - code: bank
    accounts:
      - Assets:Checking:SBI
  - code: share
    accounts:
      - Assets:Equity:*
      - Assets:Debt:*
  - code: liability
    accounts:
      - Liabilities:Homeloan
  - code: immovable
    accounts:
      - Assets:House
commodities:
  - name: NIFTY
    type: mutualfund
    price:
      provider: in-mfapi
      code: 120716
    harvest: 365
    tax_category: equity65
  - name: PPFAS
    type: mutualfund
    price:
      provider: in-mfapi
      code: 122639
    harvest: 365
    tax_category: equity65
  - name: ABCBF
    type: mutualfund
    price:
      provider: in-mfapi
      code: 119533
    harvest: 1095
    tax_category: debt
  - name: NPS_HDFC_E
    type: nps
    price:
      provider: com-purifiedbytes-nps
      code: SM008001
  - name: NPS_HDFC_C
    type: nps
    price:
      provider: com-purifiedbytes-nps
      code: SM008002
  - name: NPS_HDFC_G
    type: nps
    price:
      provider: com-purifiedbytes-nps
      code: SM008003
credit_cards:
    - account: Liabilities:CreditCard:Freedom
      credit_limit: 150000
      statement_end_day: 8
      due_day: 20
      network: visa
      number: "0007"
      expiration_date: "2029-05-01"
`
	log.Info("Generating config file: ", configFilePath)
	journalFilePath := filepath.Join(cwd, "main.ledger")
	dbFilePath := filepath.Join(cwd, "paisa.db")
	err := os.WriteFile(configFilePath, fmt.Appendf(nil, config, filepath.Base(journalFilePath), filepath.Base(dbFilePath)), 0o600)
	if err != nil {
		return err
	}
	return nil
}

func emitTransaction(file *os.File, date time.Time, payee string, from string, to string, amount any) {
	amountString := ""
	switch amount := amount.(type) {
	case string:
		amountString = amount
	case float64:
		amountString = formatFloat(amount)
	}

	_, _ = fmt.Fprintf(file, `
%s %s
    %s                                %s INR
    %s
`, date.Format("2006/01/02"), payee, to, amountString, from)
}

func emitCommodityBuy(file *os.File, date time.Time, commodity string, from string, to string, amount float64) float64 {
	pc, _ := utils.FindLatestLessOrEqual(pricesTree[commodity], date.UnixNano(), func(p price.Price) int64 {
		return p.Date.UnixNano()
	})
	priceVal := pc.Value.InexactFloat64()
	if priceVal <= 0 {
		priceVal = 10.0
	}
	units := amount / priceVal
	_, _ = fmt.Fprintf(file, `
%s Investment
    %s                      %s %s @    %s INR
    %s
`, date.Format("2006/01/02"), to, formatFloat(units), commodity, formatFloat(priceVal), from)
	return units
}

func emitCommoditySell(file *os.File, date time.Time, commodity string, from string, to string, amount float64, availableUnits float64) (float64, float64) {
	pc, _ := utils.FindLatestLessOrEqual(pricesTree[commodity], date.UnixNano(), func(p price.Price) int64 {
		return p.Date.UnixNano()
	})
	priceVal := pc.Value.InexactFloat64()
	if priceVal <= 0 {
		priceVal = 10.0
	}
	requiredUnits := amount / priceVal
	units := math.Min(availableUnits, requiredUnits)
	return emitCommodityBuy(file, date, commodity, from, to, -units*priceVal), units * priceVal
}

func generateFallbackPrices(schemeCode string, commodityType config.CommodityType, commodityName string) []*price.Price {
	basePrice := 20.0
	annualGrowth := 0.10

	switch commodityName {
	case "NIFTY":
		basePrice = 35.0
		annualGrowth = 0.12
	case "PPFAS":
		basePrice = 12.0
		annualGrowth = 0.15
	case "ABCBF":
		basePrice = 40.0
		annualGrowth = 0.08
	case "NPS_HDFC_E":
		basePrice = 12.0
		annualGrowth = 0.11
	case "NPS_HDFC_C":
		basePrice = 12.0
		annualGrowth = 0.08
	case "NPS_HDFC_G":
		basePrice = 12.0
		annualGrowth = 0.08
	}

	startDate, _ := time.ParseInLocation("02-01-2006", fmt.Sprintf("01-01-%d", StartYear), config.TimeZone())
	endDate := utils.EndOfToday().AddDate(0, 1, 0)

	var prices []*price.Price
	currentDate := startDate
	currentPrice := basePrice

	monthlyGrowth := math.Pow(1.0+annualGrowth, 1.0/12.0)

	for !currentDate.After(endDate) {
		monthIndex := (currentDate.Year()-StartYear)*12 + int(currentDate.Month())
		fuzz := 1.0 + 0.02*math.Sin(float64(monthIndex)*0.5)
		val := decimal.NewFromFloat(math.Round(currentPrice*fuzz*100) / 100)

		prices = append(prices, &price.Price{
			Date:          currentDate,
			CommodityType: commodityType,
			CommodityID:   schemeCode,
			CommodityName: commodityName,
			Value:         val,
		})

		currentPrice *= monthlyGrowth
		currentDate = currentDate.AddDate(0, 1, 0)
	}

	return prices
}

func loadPrices(schemeCode string, commodityType config.CommodityType, commodityName string, pricesTree map[string][]price.Price) {
	var prices []*price.Price
	var err error

	switch commodityType {
	case config.MutualFund:
		prices, err = mutualfund.GetNav(schemeCode, commodityName)
	case config.NPS:
		prices, err = nps.GetNav(schemeCode, commodityName)
	default:
		// Other commodity types not supported in mock generator
	}

	if err != nil || len(prices) == 0 {
		if err != nil {
			log.Warnf("Failed to fetch prices for %s (%s): %v. Using fallback demo prices.", commodityName, schemeCode, err)
		}
		prices = generateFallbackPrices(schemeCode, commodityType, commodityName)
	}

	pricesList := make([]price.Price, 0, len(prices))
	for _, p := range prices {
		pricesList = append(pricesList, *p)
	}
	slices.SortFunc(pricesList, func(a, b price.Price) int {
		return a.Date.Compare(b.Date)
	})
	pricesTree[commodityName] = pricesList
}

func formatFloat(num float64) string {
	s := fmt.Sprintf("%.4f", num)
	return strings.TrimRight(strings.TrimRight(s, "0"), ".")
}

func roundToK(amount float64) float64 {
	if amount < 20000 {
		return float64(int(amount/100) * 100)
	}
	return float64(int(amount/1000) * 1000)
}

func incrementByPercentRange(amount float64, min int, max int) float64 {
	return roundToK(amount + amount*percentRange(min, max))
}

func percentRange(min int, max int) float64 {
	if min == max {
		return float64(min) * 0.01
	}
	return float64(randRange(min, max)) * 0.01
}

func randRange(min int, max int) int {
	//nolint:gosec // weak random is sufficient for mock data generation
	return rand.Intn(max-min) + min
}

func taxRate(amount float64) float64 {
	switch {
	case amount < 500000:
		return 0
	case amount < 750000:
		return 0.10
	case amount < 1000000:
		return 0.15
	case amount < 1250000:
		return 0.20
	case amount < 1500000:
		return 0.25
	default:
		return 0.30
	}
}

func emitChitFund(state *GeneratorState, start time.Time) {
	if start.Year() != 2016 || start.Month() >= time.November {
		return
	}

	price := 10000 - ((time.November - start.Month()) * 100)
	amount := fmt.Sprintf("1 CHIT @ %d", price)
	account := "Assets:Debt:Chit"
	if start.Month() >= time.June {
		account = "Liabilities:Chit"
	}
	emitTransaction(state.Ledger, start, "Chit installment", "Assets:Checking:SBI", account, amount)
	state.Balance -= float64(price)

	if start.Month() == time.June {
		amount = fmt.Sprintf("-5 CHIT @ %d", price)
		emitTransaction(state.Ledger, start, "Chit withdraw", "Assets:Checking:SBI", "Assets:Debt:Chit", amount)
		emitTransaction(state.Ledger, start, "Chit withdraw", "Assets:Checking:SBI", "Liabilities:Chit", amount)
		state.Balance += float64(10 * price)
	}
}

func emitSalary(state *GeneratorState, start time.Time) {
	if start.Month() == time.April {
		state.YearlySalary = incrementByPercentRange(state.YearlySalary, 10, 15)
	}

	salary := state.YearlySalary / 12
	var company string
	if start.Year() > 2017 {
		company = "Globex"
	} else {
		company = "Acme"
	}

	tax := salary * taxRate(state.YearlySalary)
	epf := salary * 0.12
	nps := salary * 0.10
	state.EPFBalance += epf
	netSalary := salary - tax - epf - nps
	state.Balance += netSalary

	salaryAccount := fmt.Sprintf("Income:Salary:%s", company)
	emitTransaction(state.Ledger, start, "Salary", salaryAccount, "Assets:Checking:SBI", netSalary)
	emitTransaction(state.Ledger, start, "Salary EPF", salaryAccount, "Assets:Debt:EPF", epf)
	emitTransaction(state.Ledger, start, "Salary Tax", salaryAccount, "Expenses:Tax", tax)
	emitCommodityBuy(state.Ledger, start, "NPS_HDFC_E", salaryAccount, "Assets:Debt:NPS:HDFC:E", nps*0.75)
	emitCommodityBuy(state.Ledger, start, "NPS_HDFC_C", salaryAccount, "Assets:Equity:NPS:HDFC:C", nps*0.15)
	emitCommodityBuy(state.Ledger, start, "NPS_HDFC_G", salaryAccount, "Assets:Equity:NPS:HDFC:G", nps*0.10)
}

func emitExpense(state *GeneratorState, start time.Time) {
	if start.Month() == time.April {
		state.Rent = incrementByPercentRange(state.Rent, 5, 10)
	}

	emit := func(payee string, account string, amount float64, fuzz float64) {
		var actualAmount float64
		if fuzz == 1 {
			actualAmount = amount
		} else {
			actualAmount = roundToK(percentRange(int(fuzz*100), 100) * amount)
		}
		start = start.AddDate(0, 0, 1)
		emitTransaction(state.Ledger, start, payee, "Assets:Checking:SBI", account, actualAmount)
		state.Balance -= actualAmount
	}

	emitExpense := func(payee string, account string, amount float64, fuzz float64) {
		actualAmount := roundToK(percentRange(int(fuzz*100), 100) * amount)
		start = start.AddDate(0, 0, 1)
		emitTransaction(state.Ledger, start, payee, "Liabilities:CreditCard:Freedom", account, actualAmount)
		state.CreditBalance -= actualAmount
	}

	emitExpense("Rent", "Expenses:Rent", state.Rent, 1.0)
	emitExpense("Internet", "Expenses:Utilities", 1500, 1.0)
	emitExpense("Mobile", "Expenses:Utilities", 430, 1.0)
	emitExpense("Shopping", "Expenses:Shopping", 3000, 0.5)
	emitExpense("Eat out", "Expenses:Restaurants", 2500, 0.5)
	emitExpense("Groceries", "Expenses:Food", 5000, 0.9)

	creditCardDue := -state.CreditBalance
	availableAfterCardPayment := state.Balance - creditCardDue - 10000
	monthlyInterest := state.LoanBalance * 0.08 / 12
	if state.LoanBalance > 0 && availableAfterCardPayment >= monthlyInterest {
		emi := math.Min(availableAfterCardPayment, 30000.0)
		interest := (state.LoanBalance * 0.08 / 12)
		principal := emi - interest
		state.LoanBalance -= principal
		emit("EMI", "Expenses:Interest:Homeloan", interest, 1.0)
		emit("EMI", "Liabilities:Homeloan", principal, 1.0)
	}

	if lo.Contains([]time.Month{time.January, time.April, time.November, time.December}, start.Month()) {
		clothingBudget := math.Max(state.Balance-creditCardDue-10000, 0)
		if clothingBudget > 0 {
			emit("Dress", "Expenses:Clothing", math.Min(5000, clothingBudget), 0.5)
		}
	}

	cardPayment := math.Min(-state.CreditBalance, math.Max(state.Balance-10000, 0))
	if cardPayment > 0 {
		emit("Pay Credit Card Bill", "Liabilities:CreditCard:Freedom", cardPayment, 1.0)
		state.CreditBalance += cardPayment
	}
}

func emitInvestment(state *GeneratorState, start time.Time) {
	if start.Month() == time.April {
		epfInterest := state.EPFBalance * 0.08
		emitTransaction(state.Ledger, start, "EPF Interest", "Income:Interest:EPF", "Assets:Debt:EPF", epfInterest)
		state.EPFBalance += epfInterest
	}

	if state.Balance < 10000 {
		return
	}

	equity1 := roundToK(state.Balance * 0.5)
	equity2 := roundToK(state.Balance * 0.2)
	debt := roundToK(state.Balance * 0.3)

	state.Balance -= equity1
	state.NiftyBalance += emitCommodityBuy(state.Ledger, start, "NIFTY", "Assets:Checking:SBI", "Assets:Equity:NIFTY", equity1)

	state.Balance -= equity2
	emitCommodityBuy(state.Ledger, start, "PPFAS", "Assets:Checking:SBI", "Assets:Equity:PPFAS", equity2)

	state.Balance -= debt
	emitCommodityBuy(state.Ledger, start, "ABCBF", "Assets:Checking:SBI", "Assets:Debt:ABCBF", debt)

	if start.Month() == time.March {
		units, amount := emitCommoditySell(state.Ledger, start.AddDate(0, 0, 15), "NIFTY", "Assets:Checking:SBI", "Assets:Equity:NIFTY", 75000, state.NiftyBalance)
		state.NiftyBalance += units
		state.Balance += amount
	}
}

func generateJournalFile(cwd string) error {
	journalFilePath := filepath.Join(cwd, "main.ledger")
	log.Info("Generating journal file: ", journalFilePath)
	//nolint:gosec // generating sample journal in current working directory
	ledgerFile, err := os.OpenFile(journalFilePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer func() { _ = ledgerFile.Close() }()

	startMonth := utils.BeginningOfMonth(utils.EndOfToday())
	endMonth := startMonth.AddDate(0, 2, 0)

	_, err = fmt.Fprintf(ledgerFile, `
= Expenses:Rent
    ; Recurring: Rent
    ; Period: 1 * ?

= expr payee=~/Internet/
    ; Recurring: Internet
    ; Period: 1 * ?

= expr payee=~/EPF/
    ; Recurring: EPF

= Liabilities:Homeloan
    ; Recurring: EMI Principal

= Expenses:Interest:Homeloan
    ; Recurring: EMI Interest

~ Monthly from %s to %s
    Expenses:Rent                              15000 INR
    Expenses:Interest:Homeloan                  6000 INR
    Expenses:Food                               5000 INR
    Expenses:Utilities                          2000 INR
    Expenses:Shopping                           3000 INR
    Expenses:Clothing                           1000 INR
    Assets:Checking:SBI

`, startMonth.Format("2006-01-02"), endMonth.Format("2006-01-02"))
	if err != nil {
		return err
	}

	end := utils.EndOfToday()
	start, err := time.Parse("02-01-2006", fmt.Sprintf("01-01-%d", StartYear))
	if err != nil {
		return err
	}

	pricesTree = make(map[string][]price.Price)
	loadPrices("120716", config.MutualFund, "NIFTY", pricesTree)
	loadPrices("122639", config.MutualFund, "PPFAS", pricesTree)
	loadPrices("119533", config.MutualFund, "ABCBF", pricesTree)
	loadPrices("SM008001", config.NPS, "NPS_HDFC_E", pricesTree)
	loadPrices("SM008002", config.NPS, "NPS_HDFC_C", pricesTree)
	loadPrices("SM008003", config.NPS, "NPS_HDFC_G", pricesTree)

	state := GeneratorState{Balance: 0, Ledger: ledgerFile, YearlySalary: 1000000, Rent: 10000, LoanBalance: 2500000}

	emitTransaction(state.Ledger, start, "Home purchase", "Liabilities:Homeloan", "Assets:House", "1 APT @ 2500000")

	for ; start.Before(end); start = start.AddDate(0, 1, 0) {
		emitSalary(&state, start)
		emitChitFund(&state, start)
		emitExpense(&state, start)
		emitInvestment(&state, start)
	}
	return nil
}

func generateSheetFile(cwd string) error {
	sheetFilePath := filepath.Join(cwd, "Schedule AL.paisa")
	sheet := `
date_query = {date <= [2023-03-31]}
cost_basis(x) = cost(fifo(x AND date_query))
cost_basis_negative(x) = cost(fifo(negate(x AND date_query)))

# Immovable
immovable = cost_basis({account = Assets:House})

# Movable
metal = 0
art = 0
vehicle = 0
bank = cost_basis({account =~ /^Assets:Checking:SBI/})
share = cost_basis({account =~ /^Assets:Equity:.*/ OR
                    account =~ /^Assets:Debt:.*/})
insurance = 0
loan = 0
cash = 0

# Liability
liability = cost_basis_negative({account =~ /^Liabilities:Homeloan/})

# Total
total = immovable + metal + art + vehicle + bank + share + insurance + loan + cash - liability
`
	log.Info("Generating sheet file: ", sheetFilePath)
	err := os.WriteFile(sheetFilePath, []byte(sheet), 0o600)
	if err != nil {
		return err
	}
	return nil
}
