package cmd

import (
	"os"

	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/ananthakumaran/paisa/pkg/server"
	"github.com/spf13/cobra"
)

var (
	host string
	port int
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "serve the WEB UI",
	RunE: func(cmd *cobra.Command, args []string) error {
		db, err := database.Initialize()
		if err != nil {
			return err
		}

		if os.Getenv("PAISA_DEBUG") == "true" {
			db = db.Debug()
		}
		server.Listen(db, host, port)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
	serveCmd.Flags().StringVarP(&host, "host", "H", "127.0.0.1", "host to listen on")
	serveCmd.Flags().IntVarP(&port, "port", "p", 7500, "port to listen on")
}
