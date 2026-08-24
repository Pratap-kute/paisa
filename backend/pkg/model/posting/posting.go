package posting

import (
	"slices"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	Assets             = "assets"
	AssetsCash         = "assets:cash"
	Income             = "income"
	IncomeInterest     = "income:interest"
	IncomeDividend     = "income:dividend"
	IncomeCapitalGains = "income:capital_gains"
	Expenses           = "expenses"
	ExpensesCharges    = "expenses:charges"
	ExpensesTaxes      = "expenses:taxes"
	Liabilities        = "liabilities"
)

type Posting struct {
	ID                   uint            `gorm:"primaryKey" json:"id"`
	TransactionID        string          `json:"transaction_id"`
	Date                 time.Time       `json:"date"`
	Payee                string          `json:"payee"`
	Account              string          `json:"account"`
	Commodity            string          `json:"commodity"`
	Quantity             decimal.Decimal `json:"quantity"`
	Amount               decimal.Decimal `json:"amount"`
	Status               string          `json:"status"`
	TagRecurring         string          `json:"tag_recurring"`
	TagPeriod            string          `json:"tag_period"`
	TransactionBeginLine uint64          `json:"transaction_begin_line"`
	TransactionEndLine   uint64          `json:"transaction_end_line"`
	FileName             string          `json:"file_name"`
	Forecast             bool            `json:"forecast"`
	Note                 string          `json:"note"`
	TransactionNote      string          `json:"transaction_note"`

	MarketAmount decimal.Decimal `gorm:"-:all" json:"market_amount"`
	Balance      decimal.Decimal `gorm:"-:all" json:"balance"`

	behaviours []string `gorm:"-:all"`
}

func (p Posting) GroupDate() time.Time {
	return p.Date
}

func (p *Posting) RestName(level int) string {
	return strings.Join(strings.Split(p.Account, ":")[level:], ":")
}

func (p Posting) Negate() Posting {
	clone := p
	clone.Quantity = p.Quantity.Neg()
	clone.Amount = p.Amount.Neg()
	return clone
}

func (p *Posting) Price() decimal.Decimal {
	if p.Quantity.IsZero() {
		return decimal.Zero
	}
	return p.Amount.Div(p.Quantity)
}

func (p *Posting) AddAmount(amount decimal.Decimal) {
	p.Amount = p.Amount.Add(amount)
}

func (p *Posting) AddQuantity(quantity decimal.Decimal) {
	price := p.Price()
	p.Quantity = p.Quantity.Add(quantity)
	p.Amount = p.Quantity.Mul(price)
}

func (p Posting) WithQuantity(quantity decimal.Decimal) Posting {
	clone := p
	clone.Quantity = quantity
	clone.Amount = quantity.Mul(p.Price())
	return clone
}

func (p Posting) WithAmount(amount decimal.Decimal) Posting {
	clone := p
	clone.Amount = amount
	clone.Quantity = amount.Div(p.Price())
	return clone
}

func (p Posting) Split(amount decimal.Decimal) (Posting, Posting) {
	return p.WithAmount(amount), p.WithAmount(p.Amount.Sub(amount))
}

func (p Posting) Behaviours() []string {
	if p.behaviours == nil {
		p.behaviours = Behaviours(p.Account)
	}
	return p.behaviours
}

func (p Posting) HasBehaviour(behaviour string) bool {
	return slices.Contains(p.Behaviours(), behaviour)
}

func UpsertAll(db *gorm.DB, postings []*Posting) error {
	return db.Transaction(func(tx *gorm.DB) error {
		err := tx.Exec("DELETE FROM postings").Error
		if err != nil {
			return err
		}
		for _, posting := range postings {
			err := tx.Create(posting).Error
			if err != nil {
				return err
			}
		}

		return nil
	})
}

func Behaviours(account string) []string {
	var behaviours []string
	if utils.IsParent(account, "Assets") {
		behaviours = append(behaviours, Assets)
	}

	if utils.IsSameOrParent(account, "Assets:Checking") {
		behaviours = append(behaviours, AssetsCash)
	}

	if utils.IsParent(account, "Income") {
		behaviours = append(behaviours, Income)
	}

	if utils.IsSameOrParent(account, "Income:Interest") {
		behaviours = append(behaviours, IncomeInterest)
	}

	if utils.IsSameOrParent(account, "Income:Dividend") {
		behaviours = append(behaviours, IncomeDividend)
	}

	if utils.IsSameOrParent(account, "Income:Capital Gains") {
		behaviours = append(behaviours, IncomeCapitalGains)
	}

	if utils.IsParent(account, "Expenses") {
		behaviours = append(behaviours, Expenses)
	}

	if utils.IsSameOrParent(account, "Expenses:Charges") {
		behaviours = append(behaviours, ExpensesCharges)
	}

	if utils.IsSameOrParent(account, "Expenses:Tax") {
		behaviours = append(behaviours, ExpensesTaxes)
	}

	if utils.IsParent(account, "Liabilities") {
		behaviours = append(behaviours, Liabilities)
	}
	return behaviours
}
