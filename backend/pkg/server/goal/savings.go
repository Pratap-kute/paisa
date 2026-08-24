package goal

import (
	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/server/assets"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func getSavingsSummary(ps []posting.Posting, conf config.SavingsGoal) GoalSummary {
	savings := accounting.FilterByGlob(ps, conf.Accounts)
	savingsTotal := accounting.CurrentBalance(savings)

	return GoalSummary{
		Type:       "savings",
		ID:         "savings-" + conf.Name,
		Name:       conf.Name,
		Current:    savingsTotal,
		Target:     decimal.NewFromFloat(conf.Target),
		TargetDate: conf.TargetDate,
		Icon:       conf.Icon,
		Priority:   conf.Priority,
	}
}

func getSavingsDetail(db *gorm.DB, conf config.SavingsGoal) gin.H {
	savings := accounting.FilterByGlob(query.Init(db).Like("Assets:%").All(), conf.Accounts)
	savings = service.PopulateMarketPrice(db, savings)
	savingsTotal := accounting.CurrentBalance(savings)
	investmentTotal := accounting.CostBalance(savings)

	savingsWithCapitalGains := accounting.FilterByGlob(query.Init(db).Like("Assets:%", "Income:CapitalGains:%").All(), conf.Accounts)
	savingsWithCapitalGains = service.PopulateMarketPrice(db, savingsWithCapitalGains)

	balances := assets.ComputeBreakdowns(db, savingsWithCapitalGains, false)

	return gin.H{
		"type":             "savings",
		"name":             conf.Name,
		"icon":             conf.Icon,
		"investmentTotal":  investmentTotal,
		"savingsTotal":     savingsTotal,
		"gainTotal":        savingsTotal.Sub(investmentTotal),
		"savingsTimeline":  service.RunningBalance(db, savings),
		"target":           decimal.NewFromFloat(conf.Target),
		"targetDate":       conf.TargetDate,
		"rate":             conf.Rate,
		"paymentPerPeriod": conf.PaymentPerPeriod,
		"xirr":             service.XIRR(db, savingsWithCapitalGains),
		"postings":         savingsWithCapitalGains,
		"balances":         balances,
	}
}
