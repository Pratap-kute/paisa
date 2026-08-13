package service

import (
	"slices"
	"strings"
	"sync"

	"github.com/ananthakumaran/paisa/internal/model/posting"
	"github.com/ananthakumaran/paisa/internal/model/transaction"
	"github.com/ananthakumaran/paisa/internal/query"
	"github.com/ananthakumaran/paisa/internal/utils"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type interestCache struct {
	sync.Once
	postings map[int64][]posting.Posting
}

var icache interestCache

func loadInterestCache(db *gorm.DB) {
	postings := query.Init(db).Like("Income:Interest:%").All()
	icache.postings = lo.GroupBy(postings, func(p posting.Posting) int64 { return p.Date.Unix() })
}

type interestRepaymentCache struct {
	sync.Once
	postings map[int64][]posting.Posting
}

var irepaymentCache interestRepaymentCache

func loadInterestRepaymentCache(db *gorm.DB) {
	postings := query.Init(db).Like("Expenses:Interest:%").All()
	irepaymentCache.postings = lo.GroupBy(postings, func(p posting.Posting) int64 { return p.Date.Unix() })
}

func ClearInterestCache() {
	icache = interestCache{}
	irepaymentCache = interestRepaymentCache{}
}

func CapitalGainsSourceAccount(account string) string {
	parts := strings.Split(account, ":")
	return "Assets:" + strings.Join(parts[2:], ":")
}

func CapitalGainsAccount(account string) string {
	parts := strings.Split(account, ":")
	return "Income:CapitalGains:" + strings.Join(parts[1:], ":")
}

func IsCapitalGains(p posting.Posting) bool {
	return utils.IsParent(p.Account, "Income:CapitalGains")
}

func IsRefund(p posting.Posting) bool {
	return utils.IsParent(p.Account, "Income:Refund")
}

func IsStockSplit(db *gorm.DB, p posting.Posting) bool {
	if utils.IsCurrency(p.Commodity) {
		return false
	}

	t, found := transaction.GetByID(db, p.TransactionID)
	if !found {
		return false
	}

	for i := range t.Postings {
		tp := &t.Postings[i]
		if utils.IsCurrency(tp.Commodity) || tp.Account != p.Account {
			return false
		}
	}
	return true
}

func IsSellWithCapitalGains(db *gorm.DB, p posting.Posting) bool {
	if utils.IsCurrency(p.Commodity) {
		return false
	}

	t, found := transaction.GetByID(db, p.TransactionID)
	if !found {
		return false
	}

	return slices.ContainsFunc(t.Postings, IsCapitalGains)
}

func IsContraPostingRefund(db *gorm.DB, p posting.Posting) bool {
	t, found := transaction.GetByID(db, p.TransactionID)
	if !found {
		return false
	}

	return slices.ContainsFunc(t.Postings, IsRefund)
}

func IsInterestRepayment(db *gorm.DB, p posting.Posting) bool {
	irepaymentCache.Do(func() { loadInterestRepaymentCache(db) })

	if !utils.IsCurrency(p.Commodity) {
		return false
	}

	if strings.HasPrefix(p.Account, "Expenses:Interest:") {
		return true
	}

	repPostings := irepaymentCache.postings[p.Date.Unix()]
	for i := range repPostings {
		ip := &repPostings[i]
		if ip.Date.Equal(p.Date) &&
			ip.Amount.Neg().Equal(p.Amount) &&
			ip.Payee == p.Payee {
			return true
		}
	}

	return false
}

func IsInterest(db *gorm.DB, p posting.Posting) bool {
	icache.Do(func() { loadInterestCache(db) })

	if !utils.IsCurrency(p.Commodity) {
		return false
	}

	intPostings := icache.postings[p.Date.Unix()]
	for i := range intPostings {
		ip := &intPostings[i]
		if ip.Date.Equal(p.Date) &&
			ip.Amount.Neg().Equal(p.Amount) &&
			ip.Payee == p.Payee {
			return true
		}
	}

	return false
}
