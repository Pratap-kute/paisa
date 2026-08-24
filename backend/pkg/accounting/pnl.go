package accounting

import (
	"slices"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
)

type BalancedPosting struct {
	From posting.Posting `json:"from"`
	To   posting.Posting `json:"to"`
}

type PostingPair struct {
	Posting        posting.Posting
	CounterPosting posting.Posting
}

func balancePostings(postings []posting.Posting) []PostingPair {
	epsilon := decimal.NewFromFloat(0.01)

	var pairs []PostingPair
	pending := slices.Clone(postings)
	for len(pending) > 0 {
		var pair PostingPair
		pair.Posting = pending[0]
		pending = pending[1:]
		found := false
		for i := range pending {
			p := &pending[i]
			if pair.Posting.Commodity == p.Commodity && pair.Posting.Quantity.Neg().Equal(p.Quantity) {
				pair.CounterPosting = *p
				pending = slices.Delete(pending, i, i+1)
				pairs = append(pairs, pair)
				found = true
				break
			}
		}

		if !found {
			for i := range pending {
				p := &pending[i]
				if pair.Posting.Amount.Neg().Equal(p.Amount) {
					pair.CounterPosting = *p
					pending = slices.Delete(pending, i, i+1)
					pairs = append(pairs, pair)
					found = true
					break
				}
			}
		}

		if !found {
		RESTART:
			for i := range pending {
				p := &pending[i]
				if (pair.Posting.Amount.Sign() == 1 && p.Amount.Sign() == -1) ||
					(pair.Posting.Amount.Sign() == -1 && p.Amount.Sign() == 1) {

					switch {
					case pair.Posting.Amount.Abs().Equal(p.Amount.Abs()):
						pair.CounterPosting = *p
						pending = slices.Delete(pending, i, i+1)
						pairs = append(pairs, pair)
						found = true
					case pair.Posting.Amount.Abs().LessThan(p.Amount.Abs()):
						counter, remaining := p.Split(pair.Posting.Amount.Neg())
						pair.CounterPosting = counter
						pending[i] = remaining
						pairs = append(pairs, pair)
						found = true
					default:
						current, remaining := pair.Posting.Split(p.Amount.Neg())
						pair.Posting = current
						pair.CounterPosting = *p
						pending = slices.Delete(pending, i, i+1)
						pairs = append(pairs, pair)

						if remaining.Amount.Abs().GreaterThan(epsilon) {
							pair = PostingPair{Posting: remaining}
							goto RESTART
						}
					}
				}
			}
		}

		if !found && pair.Posting.Amount.Abs().GreaterThan(epsilon) {
			log.Infof("No counter posting found for %v \npending: %v \npairs: %v e: %v", pair.Posting, pending, pairs, epsilon)
			break
		}
	}
	return pairs
}

func BuildBalancedPostings(transactions []transaction.Transaction) []BalancedPosting {
	balancedPostings := make([]BalancedPosting, 0, len(transactions))
	for i := range transactions {
		postings := transactions[i].Postings
		pairs := balancePostings(postings)
		for j := range pairs {
			pair := &pairs[j]
			var from, to posting.Posting
			if pair.Posting.Quantity.IsPositive() {
				to = pair.Posting
				from = pair.CounterPosting
			} else {
				to = pair.CounterPosting
				from = pair.Posting
			}

			balancedPostings = append(balancedPostings, BalancedPosting{
				From: from,
				To:   to,
			})
		}
	}
	return balancedPostings
}
