package scheme

import (
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/samber/lo"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Scheme struct {
	ID         uint `gorm:"primaryKey" json:"id"`
	PFMName    string
	SchemeID   string
	SchemeName string
}

func (Scheme) TableName() string {
	return "nps_schemes"
}

func Count(db *gorm.DB) int64 {
	var count int64
	db.Model(&Scheme{}).Count(&count)
	return count
}

func UpsertAll(db *gorm.DB, schemes []*Scheme) {
	err := db.Transaction(func(tx *gorm.DB) error {
		err := tx.Exec("DELETE FROM nps_schemes").Error
		if err != nil {
			return err
		}
		if len(schemes) == 0 {
			return nil
		}
		return tx.CreateInBatches(schemes, 500).Error
	})
	if err != nil {
		log.Error("Failed to upsert nps schemes: ", err)
	}
}

func GetPFMCompletions(db *gorm.DB) []price.AutoCompleteItem {
	var pfms []string
	db.Model(&Scheme{}).Distinct().Pluck("PFMName", &pfms)
	return lo.Map(pfms, func(pfm string, _ int) price.AutoCompleteItem {
		return price.AutoCompleteItem{Label: pfm, ID: pfm}
	})
}

func GetSchemeNameCompletions(db *gorm.DB, pfm string) []price.AutoCompleteItem {
	var schemes []Scheme
	db.Model(&Scheme{}).Where("pfm_name = ?", pfm).Find(&schemes)
	return lo.Map(schemes, func(scheme Scheme, _ int) price.AutoCompleteItem {
		return price.AutoCompleteItem{Label: scheme.SchemeName, ID: scheme.SchemeID}
	})
}
