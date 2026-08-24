package service

import (
	"sort"
	"sync"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/google/btree"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type priceCache struct {
	mu                sync.RWMutex
	initialized       bool
	pricesTree        map[string]*btree.BTree
	postingPricesTree map[string]*btree.BTree
}

var pcache priceCache

func (c *priceCache) getTrees(db *gorm.DB, commodity string) (*btree.BTree, *btree.BTree) {
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
		result := db.Where("commodity_type != ?", config.Unknown).Find(&prices)
		if result.Error != nil {
			log.Warn(result.Error)
		}
		pricesTree := make(map[string]*btree.BTree)
		postingPricesTree := make(map[string]*btree.BTree)

		for _, p := range prices {
			if pricesTree[p.CommodityName] == nil {
				pricesTree[p.CommodityName] = btree.New(2)
			}
			pricesTree[p.CommodityName].ReplaceOrInsert(p)
		}

		var unknownPrices []price.Price
		result = db.Where("commodity_type = ?", config.Unknown).Find(&unknownPrices)
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
					ppt := btree.New(2)
					for _, p := range pricesList {
						ppt.ReplaceOrInsert(p)
					}
					postingPricesTree[commodityName] = ppt

					if pricesTree[commodityName] == nil {
						pricesTree[commodityName] = ppt
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

func GetUnitPrice(db *gorm.DB, commodity string, date time.Time) price.Price {
	pt, ppt := pcache.getTrees(db, commodity)

	var pc price.Price
	if pt != nil {
		pc = utils.BTreeDescendFirstLessOrEqual(pt, price.Price{Date: date})
	}
	if !pc.Value.Equal(decimal.Zero) {
		return pc
	}

	if ppt != nil {
		pc = utils.BTreeDescendFirstLessOrEqual(ppt, price.Price{Date: date})
	}

	if pt == nil && ppt == nil {
		log.Warn("Price not found ", commodity)
		return pc
	}

	return pc
}

func GetAllPrices(db *gorm.DB, commodity string) []price.Price {
	pricesPt, pt := pcache.getTrees(db, commodity)

	if pt == nil && pricesPt == nil {
		log.Warn("Price not found ", commodity)
		return []price.Price{}
	}

	pmap := make(map[string]price.Price)

	if pt != nil {
		for _, p := range utils.BTreeToSlice[price.Price](pt) {
			pmap[p.Date.String()] = p
		}
	}

	if pricesPt != nil {
		for _, p := range utils.BTreeToSlice[price.Price](pricesPt) {
			pmap[p.Date.String()] = p
		}
	}

	keys := lo.Keys(pmap)
	sort.Sort(sort.Reverse(sort.StringSlice(keys)))
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
