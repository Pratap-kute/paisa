package query

import (
	"errors"
	"strings"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Query struct {
	context         *gorm.DB
	order           string
	includeForecast bool
}

func Init(db *gorm.DB) *Query {
	return &Query{context: db, order: "ASC", includeForecast: false}
}

func (q *Query) Desc() *Query {
	q.order = "DESC"
	return q
}

func (q *Query) Forecast() *Query {
	q.includeForecast = true
	return q
}

func (q *Query) Limit(n int) *Query {
	q.context = q.context.Limit(n)
	return q
}

func (q *Query) Clone() *Query {
	return &Query{context: q.context.Session(&gorm.Session{}), order: q.order, includeForecast: q.includeForecast}
}

func (q *Query) BeforeNMonths(n int) *Query {
	monthStart := utils.BeginningOfMonth(utils.Now())
	start := monthStart.AddDate(0, -(n - 1), 0)
	q.context = q.context.Where("date < ?", start)
	return q
}

func (q *Query) UntilToday() *Query {
	q.context = q.context.Where("date < ?", utils.EndOfToday())
	return q
}

func (q *Query) UntilThisMonthEnd() *Query {
	q.context = q.context.Where("date <= ?", utils.EndOfMonth(utils.Now()))
	return q
}

func (q *Query) LastNMonths(n int) *Query {
	monthStart := utils.BeginningOfMonth(utils.Now())
	start := monthStart.AddDate(0, -(n - 1), 0)
	end := monthStart.AddDate(0, 1, 0)
	q.context = q.context.Where("date >= ? and date < ?", start, end)
	return q
}

func (q *Query) Commodities(commodities []config.Commodity) *Query {
	q.context = q.context.Where("commodity in ?", lo.Map(commodities, func(c config.Commodity, _ int) string { return c.Name }))
	return q
}

func (q *Query) Status(status string) *Query {
	if status == "cleared" || status == "pending" {
		q.context = q.context.Where("status = ?", status)
	}
	return q
}

func (q *Query) Credit() *Query {
	q.context = q.context.Where("amount > 0")
	return q
}

func (q *Query) AccountPrefix(account ...string) *Query {
	var builder strings.Builder
	builder.WriteString("account like ? or account = ?")
	if len(account) > 0 {
		for range account[1:] {
			builder.WriteString(" or account like ? or account = ?")
		}
	}
	query := builder.String()

	args := make([]any, len(account)*2)
	for i, a := range account {
		args[i*2] = a + ":%"
		args[i*2+1] = a
	}
	q.context = q.context.Where(query, args...)
	return q
}

func (q *Query) NotAccountPrefix(account string) *Query {
	q.context = q.context.Where("account not like ? and account != ?", account+":%", account)
	return q
}

func (q *Query) Like(accounts ...string) *Query {
	var builder strings.Builder
	builder.WriteString("account like ?")
	if len(accounts) > 0 {
		for range accounts[1:] {
			builder.WriteString(" or account like ?")
		}
	}
	query := builder.String()

	args := make([]any, len(accounts))
	for i, a := range accounts {
		args[i] = a
	}
	q.context = q.context.Where(query, args...)
	return q
}

func (q *Query) NotLike(account string) *Query {
	q.context = q.context.Where("account not like ?", account)
	return q
}

func (q *Query) Where(query any, args ...any) *Query {
	q.context = q.context.Where(query, args...)
	return q
}

func (q *Query) All() []posting.Posting {
	var postings []posting.Posting

	q.context = q.context.Where("forecast = ?", q.includeForecast)
	result := q.context.Order("date " + q.order + ", amount desc, account asc").Find(&postings)
	if result.Error != nil {
		log.Fatal(result.Error)
	}
	return postings
}

func (q *Query) First() *posting.Posting {
	var posting posting.Posting
	q.context = q.context.Where("forecast = ?", q.includeForecast)
	result := q.context.Order("date " + q.order + ", amount desc, account asc").First(&posting)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil
		}
		log.Fatal(result.Error)
	}
	return &posting
}
