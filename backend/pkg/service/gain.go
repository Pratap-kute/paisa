package service

import (
	"strings"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Gain struct {
	Account  string
	Networth Networth
	XIRR     decimal.Decimal
	Postings []posting.Posting
}

type AccountGain struct {
	Account          string
	NetworthTimeline []Networth
	XIRR             decimal.Decimal
	Postings         []posting.Posting
}

func GetGain(db *gorm.DB) []Gain {
	postings := query.Init(db).Like("Assets:%", "Income:CapitalGains:%").NotAccountPrefix("Assets:Checking").All()
	postings = PopulateMarketPrice(db, postings)
	byAccount := lo.GroupBy(postings, func(p posting.Posting) string {
		if IsCapitalGains(p) {
			return CapitalGainsSourceAccount(p.Account)
		}
		return p.Account
	})
	keys := utils.SortedKeys(byAccount)
	gains := make([]Gain, 0, len(keys))
	for _, account := range keys {
		ps := byAccount[account]
		gains = append(gains, Gain{Account: account, XIRR: XIRR(db, ps), Networth: ComputeNetworth(db, ps), Postings: ps})
	}

	return gains
}

func GetAccountGainData(db *gorm.DB, account string) (AccountGain, []posting.Posting) {
	capitalGainsAccount := strings.Replace(account, "Assets", "Income:CapitalGains", 1)
	postings := query.Init(db).AccountPrefix(account, capitalGainsAccount).All()
	postings = PopulateMarketPrice(db, postings)
	gain := AccountGain{
		Account:          account,
		XIRR:             XIRR(db, postings),
		NetworthTimeline: ComputeNetworthTimeline(db, postings, accounting.IsLeafAccount(db, account)),
		Postings:         postings,
	}
	return gain, postings
}
