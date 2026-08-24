package accounting

import (
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
)

type Balance struct {
	Date      time.Time
	Commodity string
	Quantity  decimal.Decimal
}

func Register(postings []posting.Posting) []Balance {
	balances := make([]Balance, 0)
	current := Balance{Quantity: decimal.Zero}
	for i := range postings {
		p := &postings[i]
		sameDay := p.Date.Equal(current.Date)
		current = Balance{Date: p.Date, Quantity: p.Quantity.Add(current.Quantity), Commodity: p.Commodity}
		if sameDay {
			balances[len(balances)-1] = current
		} else {
			balances = append(balances, current)
		}
	}
	return balances
}

func FilterByGlob(postings []posting.Posting, accounts []string) []posting.Posting {
	if len(accounts) == 0 {
		return postings
	}

	negatePresent := lo.SomeBy(accounts, func(accountGlob string) bool {
		return accountGlob != "" && accountGlob[0] == '!'
	})
	var combine func(collection []string, predicate func(item string) bool) bool
	if negatePresent {
		combine = lo.EveryBy[string]
	} else {
		combine = lo.SomeBy[string]
	}

	return lo.Filter(postings, func(p posting.Posting, _ int) bool {
		return combine(accounts, func(accountGlob string) bool {
			negative := false

			if accountGlob[0] == '!' {
				negative = true
				accountGlob = accountGlob[1:]
			}

			account := p.Account
			if utils.IsParent(p.Account, "Income:CapitalGains") {
				account = strings.Replace(p.Account, "Income:CapitalGains", "Assets", 1)
			}
			match, err := filepath.Match(accountGlob, account)
			if err != nil {
				log.Warn("Invalid account glob used for filtering ", accountGlob, ": ", err)
				return false
			}

			if negative {
				return !match
			}
			return match
		})
	})
}

func FIFO(postings []posting.Posting) []posting.Posting {
	var available []posting.Posting
	for i := range postings {
		p := &postings[i]
		if utils.IsCurrency(p.Commodity) {
			if p.Amount.GreaterThan(decimal.Zero) {
				available = append(available, *p)
			} else {
				amount := p.Amount.Neg()
				for amount.GreaterThan(decimal.Zero) && len(available) > 0 {
					first := available[0]
					if first.Amount.GreaterThan(amount) {
						first.AddAmount(amount.Neg())
						available[0] = first
						amount = decimal.Zero
					} else {
						amount = amount.Sub(first.Amount)
						available = available[1:]
					}
				}
			}
		} else {
			if p.Quantity.GreaterThan(decimal.Zero) {
				available = append(available, *p)
			} else {
				quantity := p.Quantity.Neg()
				for quantity.GreaterThan(decimal.Zero) && len(available) > 0 {
					first := available[0]
					if first.Quantity.GreaterThan(quantity) {
						first.AddQuantity(quantity.Neg())
						available[0] = first
						quantity = decimal.Zero
					} else {
						quantity = quantity.Sub(first.Quantity)
						available = available[1:]
					}
				}
			}
		}
	}

	return available
}

func CostBalance(postings []posting.Posting) decimal.Decimal {
	byAccount := lo.GroupBy(postings, func(p posting.Posting) string { return p.Account })
	return utils.SumBy(lo.Values(byAccount), func(ps []posting.Posting) decimal.Decimal {
		return utils.SumBy(FIFO(ps), func(p posting.Posting) decimal.Decimal {
			return p.Amount
		})
	})
}

func CurrentBalance(postings []posting.Posting) decimal.Decimal {
	return utils.SumBy(postings, func(p posting.Posting) decimal.Decimal {
		return p.MarketAmount
	})
}

func CostSum(postings []posting.Posting) decimal.Decimal {
	return utils.SumBy(postings, func(p posting.Posting) decimal.Decimal {
		return p.Amount
	})
}

func SortTransactionAsc(transactions []transaction.Transaction) []transaction.Transaction {
	sort.Slice(transactions, func(i, j int) bool { return transactions[i].Date.Before(transactions[j].Date) })
	return transactions
}

func SortAsc(postings []posting.Posting) []posting.Posting {
	sort.Slice(postings, func(i, j int) bool { return postings[i].Date.Before(postings[j].Date) })
	return postings
}

func SortDesc(postings []posting.Posting) []posting.Posting {
	sort.Slice(postings, func(i, j int) bool { return postings[i].Date.After(postings[j].Date) })
	return postings
}

func PopulateBalance(postings []posting.Posting) []posting.Posting {
	SortAsc(postings)
	accumulator := make(map[string]decimal.Decimal)

	for i := range postings {
		accumulator[postings[i].Account] = accumulator[postings[i].Account].Add(postings[i].Quantity)
		postings[i].Balance = accumulator[postings[i].Account]
	}
	return postings
}

func GroupByAccount(posts []posting.Posting) map[string][]posting.Posting {
	return lo.GroupBy(posts, func(post posting.Posting) string {
		return post.Account
	})
}

func GroupByMonthlyBillingCycle(postsings []posting.Posting, billDate int) map[string][]posting.Posting {
	return lo.GroupBy(postsings, func(p posting.Posting) string {
		if p.Date.Day() > billDate {
			return utils.BeginningOfMonth(p.Date).AddDate(0, 1, 0).Format("2006-01")
		} else {
			return p.Date.Format("2006-01")
		}
	})
}
