package price

import (
	"time"

	"gorm.io/gorm"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/google/btree"
	"github.com/shopspring/decimal"
)

type Price struct {
	ID            uint                 `gorm:"primaryKey" json:"id"`
	Date          time.Time            `gorm:"index:idx_prices_date" json:"date"`
	CommodityType config.CommodityType `gorm:"index:idx_prices_type_name_id,priority:1" json:"commodity_type"`
	CommodityID   string               `gorm:"index:idx_prices_type_name_id,priority:3" json:"commodity_id"`
	CommodityName string               `gorm:"index:idx_prices_type_name_id,priority:2" json:"commodity_name"`
	Value         decimal.Decimal      `json:"value"`
}

func (p Price) Less(o btree.Item) bool {
	return p.Date.Before(o.(Price).Date)
}

func DeleteAll(db *gorm.DB) error {
	err := db.Exec("DELETE FROM prices").Error
	if err != nil {
		return err
	}
	return nil
}

func UpsertAllByTypeNameAndID(db *gorm.DB, commodityType config.CommodityType, commodityName string, commodityID string, prices []*Price) error {
	return db.Transaction(func(tx *gorm.DB) error {
		err := tx.Delete(&Price{}, "commodity_type = ? and (commodity_id = ? or commodity_name = ?)", commodityType, commodityID, commodityName).Error
		if err != nil {
			return err
		}
		if len(prices) == 0 {
			return nil
		}
		return tx.CreateInBatches(prices, 500).Error
	})
}

func UpsertAllByType(db *gorm.DB, commodityType config.CommodityType, prices []Price) error {
	return db.Transaction(func(tx *gorm.DB) error {
		err := tx.Delete(&Price{}, "commodity_type = ?", commodityType).Error
		if err != nil {
			return err
		}
		if len(prices) == 0 {
			return nil
		}
		return tx.CreateInBatches(prices, 500).Error
	})
}
