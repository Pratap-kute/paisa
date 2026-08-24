package service

import (
	"slices"
	"sync"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type priceCache struct {
	mu                sync.RWMutex
	initialized       bool
	pricesTree        map[string][]price.Price
	postingPricesTree map[string][]price.Price
}

var pcache priceCache

func (c *priceCache) getTrees(db *gorm.DB, commodity string) ([]price.Price, []price.Price) {
	c.mu.RLock()
	if c.initialized {
		pt := c.pricesTree[commodity]
		ppt := c.postingPricesTree[commodity]
		c.mu.RUnlock()
		return pt, ppt
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.initialized {
		var prices []price.Price
		result := db.Where("commodity_type != ?", config.Unknown).Order("date asc").Find(&prices)
		if result.Error != nil {
			log.Warn(result.Error)
		}
		pricesTree := make(map[string][]price.Price)
		postingPricesTree := make(map[string][]price.Price)

		for _, p := range prices {
			pricesTree[p.CommodityName] = append(pricesTree[p.CommodityName], p)
		}
		for name := range pricesTree {
			slices.SortFunc(pricesTree[name], func(a, b price.Price) int {
				return a.Date.Compare(b.Date)
			})
		}

		var unknownPrices []price.Price
		result = db.Where("commodity_type = ?", config.Unknown).Order("date asc").Find(&unknownPrices)
		if result.Error != nil {
			log.Warn(result.Error)
		}

		var commodities []string
		result = db.Model(&posting.Posting{}).Distinct().Pluck("Commodity", &commodities)
		if result.Error != nil {
			log.Warn(result.Error)
		}

		unknownByCommodity := lo.GroupBy(unknownPrices, func(p price.Price) string { return p.CommodityName })

		for _, commodityName := range commodities {
			if !utils.IsCurrency(commodityName) {
				if pricesList, ok := unknownByCommodity[commodityName]; ok {
					slices.SortFunc(pricesList, func(a, b price.Price) int {
						return a.Date.Compare(b.Date)
					})
					postingPricesTree[commodityName] = pricesList

					if len(pricesTree[commodityName]) == 0 {
						pricesTree[commodityName] = pricesList
					}
				}
			}
		}

		c.pricesTree = pricesTree
		c.postingPricesTree = postingPricesTree
		c.initialized = true
	}
	return c.pricesTree[commodity], c.postingPricesTree[commodity]
}

func (c *priceCache) clear() {
	c.mu.Lock()
	c.pricesTree = nil
	c.postingPricesTree = nil
	c.initialized = false
	c.mu.Unlock()
}

func ClearPriceCache() {
	pcache.clear()
}

func findPriceOnOrBefore(prices []price.Price, date time.Time) price.Price {
	p, _ := utils.FindLatestLessOrEqual(prices, date.UnixNano(), func(p price.Price) int64 {
		return p.Date.UnixNano()
	})
	return p
}

func GetUnitPrice(db *gorm.DB, commodity string, date time.Time) price.Price {
	pt, ppt := pcache.getTrees(db, commodity)

	var pc price.Price
	if len(pt) > 0 {
		pc = findPriceOnOrBefore(pt, date)
	}
	if !pc.Value.Equal(decimal.Zero) {
		return pc
	}

	if len(ppt) > 0 {
		pc = findPriceOnOrBefore(ppt, date)
	}

	if len(pt) == 0 && len(ppt) == 0 {
		log.Warn("Price not found ", commodity)
		return pc
	}

	return pc
}

func GetAllPrices(db *gorm.DB, commodity string) []price.Price {
	pricesPt, pt := pcache.getTrees(db, commodity)

	if len(pt) == 0 && len(pricesPt) == 0 {
		log.Warn("Price not found ", commodity)
		return []price.Price{}
	}

	pmap := make(map[string]price.Price)

	for _, p := range pt {
		pmap[p.Date.String()] = p
	}

	for _, p := range pricesPt {
		pmap[p.Date.String()] = p
	}

	keys := lo.Keys(pmap)
	slices.Sort(keys)
	slices.Reverse(keys)
	prices := make([]price.Price, 0, len(keys))
	for _, key := range keys {
		prices = append(prices, pmap[key])
	}

	return prices
}

func GetMarketPrice(db *gorm.DB, p posting.Posting, date time.Time) decimal.Decimal {
	if utils.IsCurrency(p.Commodity) {
		return p.Amount
	}

	pc := GetUnitPrice(db, p.Commodity, date)
	if !pc.Value.Equal(decimal.Zero) {
		return p.Quantity.Mul(pc.Value)
	}

	return p.Amount
}

func GetPrice(db *gorm.DB, commodity string, quantity decimal.Decimal, date time.Time) decimal.Decimal {
	if utils.IsCurrency(commodity) {
		return quantity
	}

	pc := GetUnitPrice(db, commodity, date)
	if !pc.Value.Equal(decimal.Zero) {
		return quantity.Mul(pc.Value)
	}

	return quantity
}

func PopulateMarketPrice(db *gorm.DB, ps []posting.Posting) []posting.Posting {
	date := utils.EndOfToday()
	return lo.Map(ps, func(p posting.Posting, _ int) posting.Posting {
		p.MarketAmount = GetMarketPrice(db, p, date)
		return p
	})
}
