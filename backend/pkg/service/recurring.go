package service

import (
	"sort"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type TransactionSequence struct {
	Transactions []transaction.Transaction
	Key          string
	Period       string
	Interval     int
}

func GetRecurringTransactions(db *gorm.DB) []TransactionSequence {
	return ComputeRecurringTransactions(query.Init(db).All())
}

func ComputeRecurringTransactions(postings []posting.Posting) []TransactionSequence {
	now := utils.EndOfToday()

	postings = lo.Filter(postings, func(p posting.Posting, _ int) bool {
		return p.Date.Before(now)
	})

	transactions := transaction.Build(postings)
	transactions = lo.Filter(transactions, func(t transaction.Transaction, _ int) bool {
		return t.TagRecurring != ""
	})
	transactionsGrouped := lo.GroupBy(transactions, func(t transaction.Transaction) string {
		return t.TagRecurring
	})

	transactionSequences := lo.MapToSlice(transactionsGrouped, func(key string, ts []transaction.Transaction) TransactionSequence {
		sort.SliceStable(ts, func(i, j int) bool {
			return ts[i].Date.After(ts[j].Date)
		})

		interval := 0
		var period string
		if ts[0].TagPeriod != "" {
			period = ts[0].TagPeriod
		}

		if len(ts) > 1 {
			for l := 0; l < len(ts)-1; l++ {
				interval = int(ts[l].Date.Sub(ts[l+1].Date).Hours() / 24)
				if interval > 0 {
					break
				}
			}
		}

		return TransactionSequence{
			Transactions: ts,
			Key:          key,
			Period:       period,
			Interval:     interval,
		}
	})

	return transactionSequences
}
