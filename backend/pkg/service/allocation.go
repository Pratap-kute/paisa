package service

import (
	"strings"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type TargetAllocation struct {
	Name    string          `json:"name"`
	Target  decimal.Decimal `json:"target"`
	Current decimal.Decimal `json:"current"`
}

type AllocationSummary struct {
	TotalMarketAmount decimal.Decimal
	Targets           []TargetAllocation
	ByTopLevel        map[string]decimal.Decimal
}

func GetAllocationSummary(db *gorm.DB) AllocationSummary {
	postings := query.Init(db).Like("Assets:%").All()
	now := utils.EndOfToday()
	postings = lo.Map(postings, func(p posting.Posting, _ int) posting.Posting {
		p.MarketAmount = GetMarketPrice(db, p, now)
		return p
	})
	return ComputeAllocationSummary(db, postings)
}

func ComputeAllocationSummary(db *gorm.DB, postings []posting.Posting) AllocationSummary {
	if len(postings) == 0 {
		return AllocationSummary{
			TotalMarketAmount: decimal.Zero,
			Targets:           []TargetAllocation{},
			ByTopLevel:        make(map[string]decimal.Decimal),
		}
	}

	totalMarketAmount := accounting.CurrentBalance(postings)

	targets := make([]TargetAllocation, 0)
	for _, targetCfg := range config.GetConfig().AllocationTargets {
		filtered := accounting.FilterByGlob(postings, targetCfg.Accounts)
		currentTotal := accounting.CurrentBalance(filtered)
		currentPercent := decimal.Zero
		if !totalMarketAmount.Equal(decimal.Zero) {
			currentPercent = currentTotal.Div(totalMarketAmount).Mul(decimal.NewFromInt(100))
		}
		targets = append(targets, TargetAllocation{
			Name:    targetCfg.Name,
			Target:  decimal.NewFromFloat(targetCfg.Target),
			Current: currentPercent,
		})
	}

	byTopLevel := make(map[string]decimal.Decimal)
	for i := range postings {
		p := &postings[i]
		parts := strings.Split(p.Account, ":")
		var topAccount string
		if len(parts) >= 2 {
			topAccount = parts[0] + ":" + parts[1]
		} else {
			topAccount = p.Account
		}
		amount := p.MarketAmount
		if amount.Equal(decimal.Zero) && !p.Amount.Equal(decimal.Zero) {
			amount = p.Amount
		}
		byTopLevel[topAccount] = byTopLevel[topAccount].Add(amount)
	}

	return AllocationSummary{
		TotalMarketAmount: totalMarketAmount,
		Targets:           targets,
		ByTopLevel:        byTopLevel,
	}
}
