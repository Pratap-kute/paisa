package service

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Point struct {
	Date  time.Time       `json:"date"`
	Value decimal.Decimal `json:"value"`
}

func CurrentBalanceOn(db *gorm.DB, postings []posting.Posting, date time.Time) decimal.Decimal {
	return utils.SumBy(postings, func(p posting.Posting) decimal.Decimal {
		return GetMarketPrice(db, p, date)
	})
}

func RunningBalance(db *gorm.DB, postings []posting.Posting) []Point {
	var series []Point

	if len(postings) == 0 {
		return series
	}

	var p posting.Posting
	accumulator := make(map[string]decimal.Decimal)

	end := utils.EndOfToday()
	for start := postings[0].Date; start.Before(end); start = start.AddDate(0, 0, 1) {
		for len(postings) > 0 && (postings[0].Date.Before(start) || postings[0].Date.Equal(start)) {
			p, postings = postings[0], postings[1:]
			accumulator[p.Commodity] = accumulator[p.Commodity].Add(p.Quantity)
		}

		balance := decimal.Zero

		for commodity, quantity := range accumulator {
			if utils.IsCurrency(commodity) {
				balance = balance.Add(quantity)
			} else {
				price := GetUnitPrice(db, commodity, start)
				if !price.Value.Equal(decimal.Zero) {
					balance = balance.Add(quantity.Mul(price.Value))
				} else {
					balance = balance.Add(quantity)
				}
			}
		}
		series = append(series, Point{Date: start, Value: balance})
	}
	return series
}
