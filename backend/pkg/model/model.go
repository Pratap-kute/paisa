package model

import (
	"fmt"
	"math/rand"
	"slices"
	"strings"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/ledger"
	"github.com/ananthakumaran/paisa/pkg/model/cache"
	"github.com/ananthakumaran/paisa/pkg/model/cii"
	"github.com/ananthakumaran/paisa/pkg/model/commodity"
	mutualfundModel "github.com/ananthakumaran/paisa/pkg/model/mutualfund/scheme"
	npsModel "github.com/ananthakumaran/paisa/pkg/model/nps/scheme"
	"github.com/ananthakumaran/paisa/pkg/model/portfolio"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/scraper"
	"github.com/ananthakumaran/paisa/pkg/scraper/india"
	"github.com/ananthakumaran/paisa/pkg/scraper/mutualfund"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&npsModel.Scheme{},
		&mutualfundModel.Scheme{},
		&posting.Posting{},
		&price.Price{},
		&portfolio.Portfolio{},
		&cii.CII{},
		&cache.Cache{},
	)
	if err != nil {
		log.Fatal(err)
	}
}

func SyncJournal(db *gorm.DB) (string, error) {
	AutoMigrate(db)
	log.Info("Syncing transactions from journal")

	errors, _, err := ledger.Cli().ValidateFile(config.GetJournalPath())
	if err != nil {

		if len(errors) == 0 {
			return err.Error(), err
		}

		var message strings.Builder
		for _, error := range errors {
			message.WriteString(error.Message)
			message.WriteString("\n\n")
		}
		return strings.TrimRight(message.String(), "\n"), err
	}

	prices, err := ledger.Cli().Prices(config.GetJournalPath())
	if err != nil {
		return err.Error(), err
	}

	price.UpsertAllByType(db, config.Unknown, prices)

	postings, err := ledger.Cli().Parse(config.GetJournalPath(), prices)
	if err != nil {
		return err.Error(), err
	}
	posting.UpsertAll(db, postings)

	return "", nil
}

func SyncCommodities(db *gorm.DB) error {
	AutoMigrate(db)
	log.Info("Fetching commodities price history")
	commodities := slices.Clone(commodity.All())
	rand.Shuffle(len(commodities), func(i, j int) {
		commodities[i], commodities[j] = commodities[j], commodities[i]
	})

	var errors []error
	for _, commodity := range commodities {
		name := commodity.Name
		log.Info("Fetching commodity ", name)
		code := commodity.Price.Code
		var prices []*price.Price
		var err error

		provider := scraper.GetProviderByCode(commodity.Price.Provider)
		prices, err = provider.GetPrices(code, name)
		if err != nil {
			log.Error(err)
			errors = append(errors, fmt.Errorf("failed to fetch price for %s: %w", name, err))
			continue
		}

		price.UpsertAllByTypeNameAndID(db, commodity.Type, name, code, prices)
	}

	if len(errors) > 0 {
		var message strings.Builder
		for _, error := range errors {
			message.WriteString(error.Error())
			message.WriteString("\n")
		}
		return fmt.Errorf("%s", strings.Trim(message.String(), "\n"))
	}
	return nil
}

func SyncCII(db *gorm.DB) error {
	AutoMigrate(db)
	log.Info("Fetching taxation related info")
	ciis, err := india.GetCostInflationIndex()
	if err != nil {
		log.Error(err)
		return fmt.Errorf("failed to fetch CII: %w", err)
	}
	cii.UpsertAll(db, ciis)
	return nil
}

func SyncPortfolios(db *gorm.DB) error {
	if err := db.AutoMigrate(&portfolio.Portfolio{}); err != nil {
		return err
	}
	log.Info("Fetching commodities portfolio")
	commodities := commodity.FindByType(config.MutualFund)
	for _, commodity := range commodities {
		if commodity.Price.Provider != "in-mfapi" {
			continue
		}

		name := commodity.Name
		log.Info("Fetching portfolio for ", name)
		portfolios, err := mutualfund.GetPortfolio(commodity.Price.Code, commodity.Name)
		if err != nil {
			log.Error(err)
			return fmt.Errorf("failed to fetch portfolio for %s: %w", name, err)
		}

		portfolio.UpsertAll(db, commodity.Type, commodity.Price.Code, portfolios)
	}
	return nil
}
