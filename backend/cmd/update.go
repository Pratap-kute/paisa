package cmd

import (
	"fmt"

	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/ananthakumaran/paisa/pkg/model"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	updateJournal     bool
	updateCommodities bool
	updatePortfolios  bool
)

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Sync journal data",
	RunE: func(cmd *cobra.Command, args []string) error {
		db, err := database.Initialize()
		if err != nil {
			return err
		}

		syncAll := !updateJournal && !updateCommodities && !updatePortfolios

		if syncAll || updateJournal {
			message, err := model.SyncJournal(db)
			if err != nil {
				return fmt.Errorf("sync journal: %s", message)
			}
		}

		if syncAll || updateCommodities {
			if err := model.SyncCommodities(db); err != nil {
				log.Warn("Failed to sync commodities: ", err)
			}
		}

		if syncAll || updatePortfolios {
			if err := model.SyncPortfolios(db); err != nil {
				log.Warn("Failed to sync portfolios: ", err)
			}
		}

		if syncAll {
			if err := model.SyncCII(db); err != nil {
				log.Warn("Failed to sync CII: ", err)
			}
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(updateCmd)
	updateCmd.Flags().BoolVarP(&updateJournal, "journal", "j", false, "update journal")
	updateCmd.Flags().BoolVarP(&updateCommodities, "commodity", "c", false, "update commodities")
	updateCmd.Flags().BoolVarP(&updatePortfolios, "portfolio", "p", false, "update mutualfund portfolios")
}
