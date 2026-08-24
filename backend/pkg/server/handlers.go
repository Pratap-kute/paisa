package server

import (
	"io"
	"net/http"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/generator"
	"github.com/ananthakumaran/paisa/pkg/ledger"
	"github.com/ananthakumaran/paisa/pkg/model/template"
	"github.com/ananthakumaran/paisa/pkg/prediction"
	"github.com/ananthakumaran/paisa/pkg/server/assets"
	"github.com/ananthakumaran/paisa/pkg/server/goal"
	"github.com/ananthakumaran/paisa/pkg/server/liabilities"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// PingHandler godoc
//
// @Summary Health check / ping
// @Description Returns success indicator when service is healthy
// @Tags System
// @Produce json
// @Success 200 {object} dto.SuccessResponse
// @Router /ping [get]
func PingHandler(c *gin.Context) {
	c.JSON(200, gin.H{"success": true})
}

// GetConfigHandler godoc
//
// @Summary Get application configuration and metadata
// @Description Returns public configuration, account list, current time override, and JSON validation schema
// @Tags Configuration
// @Produce json
// @Success 200 {object} dto.PublicConfigResponse
// @Security PaisaAuth
// @Router /config [get]
func GetConfigHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var now *time.Time
		if utils.IsNowDefined() {
			n := utils.Now()
			now = &n
		}
		c.JSON(200, gin.H{"config": config.GetPublicConfig(), "accounts": accounting.AllAccounts(db), "now": now, "schema": config.GetSchema()})
	}
}

// SaveConfigHandler godoc
//
// @Summary Save configuration YAML
// @Description Overwrites the paisa.yaml configuration file. No-op in readonly mode.
// @Tags Configuration
// @Accept json,plain
// @Produce json
// @Param config body string true "Configuration YAML text"
// @Success 200 {object} dto.SuccessResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /config [post]
func SaveConfigHandler(c *gin.Context) {
	if config.GetConfig().Readonly {
		c.JSON(200, gin.H{"success": true})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		status, res := mapBindingOrFileError(err)
		c.JSON(status, res)
		return
	}

	err = config.SaveConfig(body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"success": true})
}

// InitDemoDataHandler godoc
//
// @Summary Initialize demo data
// @Description Generates demo ledger data and configuration. No-op in readonly mode.
// @Tags Initialization
// @Produce json
// @Success 200 {object} dto.SuccessResponse
// @Failure 500 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /init [post]
func InitDemoDataHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.GetConfig().Readonly {
			c.JSON(200, gin.H{"success": true})
			return
		}

		if err := generator.Demo(config.GetConfigDir()); err != nil {
			log.Errorf("Failed to generate demo data: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		config.LoadConfigFile(config.GetConfigPath())
		Sync(db, SyncRequest{Journal: true, Prices: true, Portfolios: true})
		c.JSON(200, gin.H{"success": true})
	}
}

// SyncDataHandler godoc
//
// @Summary Synchronize journal, prices, and portfolios into SQLite
// @Description Parses journal files, scrapes external commodity prices, and synchronizes portfolio data into SQLite
// @Tags Sync
// @Accept json
// @Produce json
// @Param request body SyncRequest true "Sync options"
// @Success 200 {object} dto.SuccessResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /sync [post]
func SyncDataHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.GetConfig().Readonly {
			c.JSON(200, gin.H{"success": true})
			return
		}

		var syncRequest SyncRequest
		if err := c.ShouldBindJSON(&syncRequest); err != nil {
			status, res := mapBindingOrFileError(err)
			c.JSON(status, res)
			return
		}

		c.JSON(200, Sync(db, syncRequest))
	}
}

// ClearPriceCacheHandler godoc
//
// @Summary Clear cached market prices
// @Description Clears in-memory and database cached commodity prices. No-op in readonly mode.
// @Tags Prices
// @Produce json
// @Success 200 {object} dto.SuccessResponse
// @Security PaisaAuth
// @Router /price/delete [post]
func ClearPriceCacheHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.GetConfig().Readonly {
			c.JSON(200, gin.H{"success": true})
			return
		}
		c.JSON(200, ClearPriceCache(db))
	}
}

// GetPricesHandler godoc
//
// @Summary Get all cached commodity prices
// @Description Returns price histories grouped by commodity
// @Tags Prices
// @Produce json
// @Success 200 {object} dto.PricesResponse
// @Security PaisaAuth
// @Router /price [get]
func GetPricesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetPrices(db))
	}
}

// GetPriceProvidersHandler godoc
//
// @Summary Get configured price providers
// @Description Returns registered price scraping providers and their sync status
// @Tags Prices
// @Produce json
// @Success 200 {object} dto.PriceProvidersResponse
// @Security PaisaAuth
// @Router /price/providers [get]
func GetPriceProvidersHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetPriceProviders(db))
	}
}

// ClearPriceProviderCacheHandler godoc
//
// @Summary Clear price cache for a specific provider
// @Description Clears cached commodity prices for a specific provider. No-op in readonly mode.
// @Tags Prices
// @Produce json
// @Param provider path string true "Provider code (e.g. yahoo)"
// @Success 200 {object} dto.SuccessResponse
// @Security PaisaAuth
// @Router /price/providers/delete/{provider} [post]
func ClearPriceProviderCacheHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.GetConfig().Readonly {
			c.JSON(200, gin.H{"success": true})
			return
		}
		provider := c.Param("provider")
		c.JSON(200, ClearPriceProviderCache(db, provider))
	}
}

// GetPriceAutoCompletionsHandler godoc
//
// @Summary Autocomplete commodity or ticker symbols
// @Description Searches ticker symbols from configured scrapers
// @Tags Prices
// @Accept json
// @Produce json
// @Param request body AutoCompleteRequest true "Autocomplete query"
// @Success 200 {object} dto.AutoCompleteResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /price/autocomplete [post]
func GetPriceAutoCompletionsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var autoCompleteRequest AutoCompleteRequest
		if err := c.ShouldBindJSON(&autoCompleteRequest); err != nil {
			status, res := mapBindingOrFileError(err)
			c.JSON(status, res)
			return
		}
		c.JSON(200, GetPriceAutoCompletions(db, autoCompleteRequest))
	}
}

// GetDashboardHandler godoc
//
// @Summary Get dashboard financial summary
// @Description Returns consolidated KPI summaries across net worth, expenses, budgets, and investments
// @Tags Dashboard
// @Produce json
// @Success 200 {object} dto.DashboardResponse
// @Security PaisaAuth
// @Router /dashboard [get]
func GetDashboardHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetDashboard(db))
	}
}

// GetNetworthHandler godoc
//
// @Summary Get net worth
// @Description Returns the current net-worth analysis and historical timeline
// @Tags Net Worth
// @Produce json
// @Success 200 {object} dto.NetworthResponse
// @Security PaisaAuth
// @Router /networth [get]
func GetNetworthHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetNetworth(db))
	}
}

// GetAssetsBalanceHandler godoc
//
// @Summary Get current asset balances and breakdowns
// @Description Returns balance breakdown for asset accounts
// @Tags Assets
// @Produce json
// @Success 200 {object} dto.AssetsBalanceResponse
// @Security PaisaAuth
// @Router /assets/balance [get]
func GetAssetsBalanceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, assets.GetBalance(db))
	}
}

// GetInvestmentHandler godoc
//
// @Summary Get investment summary and savings rate
// @Description Returns yearly investment cards and savings rate metrics
// @Tags Investments
// @Produce json
// @Success 200 {object} dto.InvestmentResponse
// @Security PaisaAuth
// @Router /investment [get]
func GetInvestmentHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetInvestment(db))
	}
}

// GetGainHandler godoc
//
// @Summary Get investment gains and XIRR performance
// @Description Computes realized, unrealized gains and annualized XIRR returns across accounts
// @Tags Gains
// @Produce json
// @Success 200 {object} dto.GainsResponse
// @Security PaisaAuth
// @Router /gain [get]
func GetGainHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetGain(db))
	}
}

// GetAccountGainHandler godoc
//
// @Summary Get investment gain for a specific account
// @Description Computes realized and unrealized gain for a single investment account
// @Tags Gains
// @Produce json
// @Param account path string true "Account name (e.g. Assets:Equity:Nifty)"
// @Success 200 {object} dto.AccountGainResponse
// @Security PaisaAuth
// @Router /gain/{account} [get]
func GetAccountGainHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		account := c.Param("account")
		c.JSON(200, GetAccountGain(db, account))
	}
}

// GetIncomeHandler godoc
//
// @Summary Get income timeline and yearly summary
// @Description Returns gross income, taxes, net income, and periodic income timelines
// @Tags Income
// @Produce json
// @Success 200 {object} dto.IncomeResponse
// @Security PaisaAuth
// @Router /income [get]
func GetIncomeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetIncome(db))
	}
}

// GetExpenseHandler godoc
//
// @Summary Get expense hierarchy graph and breakdown
// @Description Computes hierarchical flow graph and periodic expense summaries
// @Tags Expenses
// @Produce json
// @Success 200 {object} dto.ExpenseResponse
// @Security PaisaAuth
// @Router /expense [get]
func GetExpenseHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetExpense(db))
	}
}

// GetBudgetHandler godoc
//
// @Summary Get budget forecasts and actuals
// @Description Returns monthly budget allocations, spending actuals, variances, and rollover balances
// @Tags Budget
// @Produce json
// @Success 200 {object} dto.BudgetsSummaryResponse
// @Security PaisaAuth
// @Router /budget [get]
func GetBudgetHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetBudget(db))
	}
}

// GetCashFlowHandler godoc
//
// @Summary Get monthly cash flow statement
// @Description Returns monthly cash flow breakdown including inflows, outflows, and net changes
// @Tags Cash Flow
// @Produce json
// @Success 200 {object} dto.CashFlowsResponse
// @Security PaisaAuth
// @Router /cash_flow [get]
func GetCashFlowHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetCashFlow(db))
	}
}

// GetIncomeStatementHandler godoc
//
// @Summary Get financial-year income statements
// @Description Returns yearly income statements with income, expenses, interest, and taxes
// @Tags Income Statement
// @Produce json
// @Success 200 {object} dto.IncomeStatementResponse
// @Security PaisaAuth
// @Router /income_statement [get]
func GetIncomeStatementHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetIncomeStatement(db))
	}
}

// GetRecurringTransactionsHandler godoc
//
// @Summary Get recurring transaction sequences
// @Description Returns recurring monthly or periodic transaction sequences
// @Tags Recurring
// @Produce json
// @Success 200 {object} dto.RecurringTransactionsResponse
// @Security PaisaAuth
// @Router /recurring [get]
func GetRecurringTransactionsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetRecurringTransactions(db))
	}
}

// GetAllocationHandler godoc
//
// @Summary Get asset class allocations
// @Description Returns asset allocation targets and current asset distribution
// @Tags Allocation
// @Produce json
// @Success 200 {object} dto.AllocationResponse
// @Security PaisaAuth
// @Router /allocation [get]
func GetAllocationHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetAllocation(db))
	}
}

// GetPortfolioAllocationHandler godoc
//
// @Summary Get portfolio-grouped allocations
// @Description Returns asset allocations grouped by portfolio
// @Tags Allocation
// @Produce json
// @Success 200 {object} dto.PortfolioAllocationResponse
// @Security PaisaAuth
// @Router /portfolio_allocation [get]
func GetPortfolioAllocationHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetPortfolioAllocation(db))
	}
}

// GetLedgerHandler godoc
//
// @Summary Get all ledger postings with market valuation
// @Description Returns flat array of all journal postings with computed balances and market values
// @Tags Ledger
// @Produce json
// @Success 200 {array} dto.PostingResponse
// @Security PaisaAuth
// @Router /ledger [get]
func GetLedgerHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetLedger(db))
	}
}

// GetBalancedPostingsHandler godoc
//
// @Summary Get balanced posting pairs
// @Description Returns balanced from/to posting pairs
// @Tags Transactions
// @Produce json
// @Success 200 {array} dto.BalancedPostingResponse
// @Security PaisaAuth
// @Router /transaction/balanced [get]
func GetBalancedPostingsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetBalancedPostings(db))
	}
}

// GetTransactionsHandler godoc
//
// @Summary Get all journal transactions
// @Description Returns transactions with embedded postings
// @Tags Transactions
// @Produce json
// @Success 200 {object} dto.TransactionsResponse
// @Security PaisaAuth
// @Router /transaction [get]
func GetTransactionsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetTransactions(db))
	}
}

// GetHarvestHandler godoc
//
// @Summary Get tax harvesting opportunities
// @Description Returns tax harvesting opportunities and current gains
// @Tags Tax
// @Produce json
// @Success 200 {object} dto.HarvestResponse
// @Security PaisaAuth
// @Router /harvest [get]
func GetHarvestHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetHarvest(db))
	}
}

// GetCapitalGainsHandler godoc
//
// @Summary Get FIFO realized capital gains
// @Description Computes FIFO realized capital gains grouped by financial year
// @Tags Tax
// @Produce json
// @Success 200 {object} dto.CapitalGainsResponse
// @Security PaisaAuth
// @Router /capital_gains [get]
func GetCapitalGainsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetCapitalGains(db))
	}
}

// GetScheduleALHandler godoc
//
// @Summary Get Schedule AL assets and liabilities report
// @Description Computes Schedule AL assets and liabilities report
// @Tags Tax
// @Produce json
// @Success 200 {object} dto.ScheduleALMapResponse
// @Security PaisaAuth
// @Router /schedule_al [get]
func GetScheduleALHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetScheduleAL(db))
	}
}

// GetDiagnosisHandler godoc
//
// @Summary Run system diagnostic health checks
// @Description Runs system diagnostics and returns detected issues
// @Tags Diagnosis
// @Produce json
// @Success 200 {object} dto.DiagnosisResponse
// @Security PaisaAuth
// @Router /diagnosis [get]
func GetDiagnosisHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetDiagnosis(db))
	}
}

// GetLiabilitiesInterestHandler godoc
//
// @Summary Get loan interest and APR calculations
// @Description Computes interest payments and effective APR across loans
// @Tags Liabilities
// @Produce json
// @Success 200 {object} dto.LiabilitiesInterestResponse
// @Security PaisaAuth
// @Router /liabilities/interest [get]
func GetLiabilitiesInterestHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, liabilities.GetInterest(db))
	}
}

// GetLiabilitiesBalanceHandler godoc
//
// @Summary Get loan balances and breakdowns
// @Description Computes outstanding loan balances
// @Tags Liabilities
// @Produce json
// @Success 200 {object} dto.LiabilitiesBalanceResponse
// @Security PaisaAuth
// @Router /liabilities/balance [get]
func GetLiabilitiesBalanceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, liabilities.GetBalance(db))
	}
}

// GetLiabilitiesRepaymentHandler godoc
//
// @Summary Get loan repayment history
// @Description Returns loan repayment postings
// @Tags Liabilities
// @Produce json
// @Success 200 {object} dto.LiabilitiesRepaymentResponse
// @Security PaisaAuth
// @Router /liabilities/repayment [get]
func GetLiabilitiesRepaymentHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, liabilities.GetRepayment(db))
	}
}

// GetLogsHandler godoc
//
// @Summary Get application log entries
// @Description Returns recent application log lines
// @Tags Logs
// @Produce json
// @Success 200 {array} string
// @Security PaisaAuth
// @Router /logs [get]
func GetLogsHandler(c *gin.Context) {
	c.JSON(200, GetLogs())
}

// GetTfIdfHandler godoc
//
// @Summary Get TF-IDF machine learning model for payee-account prediction
// @Description Returns TF-IDF prediction model data
// @Tags Predictions
// @Produce json
// @Success 200 {object} dto.TfIdfResponse
// @Security PaisaAuth
// @Router /account/tf_idf [get]
func GetTfIdfHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, prediction.GetTfIdf(db))
	}
}

// GetPredictionHistoryHandler godoc
//
// @Summary Get prediction history
// @Description Returns prediction history records
// @Tags Predictions
// @Produce json
// @Success 200 {array} dto.PredictionHistoryEntryResponse
// @Security PaisaAuth
// @Router /prediction/history [get]
func GetPredictionHistoryHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, prediction.GetHistory(db))
	}
}

// GetCreditCardsHandler godoc
//
// @Summary Get all credit cards summaries and billing cycles
// @Description Returns credit card balances, due dates, and statements
// @Tags Credit Cards
// @Produce json
// @Success 200 {object} dto.CreditCardsResponse
// @Security PaisaAuth
// @Router /credit_cards [get]
func GetCreditCardsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetCreditCards(db))
	}
}

// GetCreditCardHandler godoc
//
// @Summary Get credit card summary for a specific account
// @Description Returns credit card details for a single account
// @Tags Credit Cards
// @Produce json
// @Param account path string true "Credit card account name (e.g. Liabilities:CreditCard:AmazonPay)"
// @Success 200 {object} dto.CreditCardSummaryResponse
// @Security PaisaAuth
// @Router /credit_cards/{account} [get]
func GetCreditCardHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetCreditCard(db, c.Param("account")))
	}
}

// GetEditorFilesHandler godoc
//
// @Summary List all ledger files in journal directory
// @Description Returns all ledger files and their current postings
// @Tags Editor
// @Produce json
// @Success 200 {object} dto.EditorFilesResponse
// @Security PaisaAuth
// @Router /editor/files [get]
func GetEditorFilesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetFiles(db))
	}
}

// GetEditorFileHandler godoc
//
// @Summary Read a specific ledger file and its backup versions
// @Description Returns contents and version history of a ledger file
// @Tags Editor
// @Accept json
// @Produce json
// @Param file body dto.LedgerFileRequest true "Ledger file query"
// @Success 200 {object} dto.LedgerFileResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /editor/file [post]
func GetEditorFileHandler(c *gin.Context) {
	var ledgerFile LedgerFile
	if err := c.ShouldBindJSON(&ledgerFile); err != nil {
		status, body := mapBindingOrFileError(err)
		c.JSON(status, body)
		return
	}

	res, err := GetFile(ledgerFile)
	if err != nil {
		status, body := mapFileError(err)
		c.JSON(status, body)
		return
	}

	c.JSON(200, res)
}

// DeleteEditorBackupsHandler godoc
//
// @Summary Delete backup versions for a ledger file
// @Description Deletes all timestamped backup files for a ledger file
// @Tags Editor
// @Accept json
// @Produce json
// @Param file body dto.LedgerFileRequest true "Ledger file"
// @Success 200 {object} dto.LedgerFileResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /editor/file/delete_backups [post]
func DeleteEditorBackupsHandler(c *gin.Context) {
	var ledgerFile LedgerFile
	if err := c.ShouldBindJSON(&ledgerFile); err != nil {
		status, body := mapBindingOrFileError(err)
		c.JSON(status, body)
		return
	}

	res, err := DeleteBackups(ledgerFile)
	if err != nil {
		status, body := mapFileError(err)
		c.JSON(status, body)
		return
	}

	c.JSON(200, res)
}

// ValidateEditorFileHandler godoc
//
// @Summary Validate ledger file syntax
// @Description Parses and validates ledger file syntax without saving
// @Tags Editor
// @Accept json
// @Produce json
// @Param file body dto.LedgerFileRequest true "Ledger file to validate"
// @Success 200 {object} dto.EditorValidateResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /editor/validate [post]
func ValidateEditorFileHandler(c *gin.Context) {
	var ledgerFile LedgerFile
	if err := c.ShouldBindJSON(&ledgerFile); err != nil {
		status, body := mapBindingOrFileError(err)
		c.JSON(status, body)
		return
	}

	c.JSON(200, ValidateFile(ledgerFile))
}

// SaveEditorFileHandler godoc
//
// @Summary Save ledger file and trigger database synchronization
// @Description Atomically writes ledger file with automatic timestamped backup. No-op in readonly mode.
// @Tags Editor
// @Accept json
// @Produce json
// @Param file body dto.LedgerFileRequest true "Ledger file content"
// @Success 200 {object} dto.EditorSaveResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /editor/save [post]
func SaveEditorFileHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.GetConfig().Readonly {
			c.JSON(200, gin.H{"errors": []ledger.LedgerFileError{}, "saved": false, "message": "Readonly mode"})
			return
		}

		var ledgerFile LedgerFile
		if err := c.ShouldBindJSON(&ledgerFile); err != nil {
			status, body := mapBindingOrFileError(err)
			c.JSON(status, body)
			return
		}

		c.JSON(200, SaveFile(db, ledgerFile))
	}
}

// GetSheetFilesHandler godoc
//
// @Summary List all .paisa sheet query files
// @Description Returns list of .paisa sheet files
// @Tags Sheets
// @Produce json
// @Success 200 {object} dto.SheetsResponse
// @Security PaisaAuth
// @Router /sheets/files [get]
func GetSheetFilesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, GetSheets(db))
	}
}

// GetSheetFileHandler godoc
//
// @Summary Read a specific .paisa sheet file
// @Description Returns contents and version history of a sheet file
// @Tags Sheets
// @Accept json
// @Produce json
// @Param file body dto.SheetFileRequest true "Sheet file query"
// @Success 200 {object} dto.SheetFileResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /sheets/file [post]
func GetSheetFileHandler(c *gin.Context) {
	var sheetFile SheetFile
	if err := c.ShouldBindJSON(&sheetFile); err != nil {
		status, body := mapBindingOrFileError(err)
		c.JSON(status, body)
		return
	}

	res, err := GetSheet(sheetFile)
	if err != nil {
		status, body := mapFileError(err)
		c.JSON(status, body)
		return
	}

	c.JSON(200, res)
}

// DeleteSheetBackupsHandler godoc
//
// @Summary Delete backup versions for a sheet file
// @Description Deletes all timestamped backup files for a sheet file
// @Tags Sheets
// @Accept json
// @Produce json
// @Param file body dto.SheetFileRequest true "Sheet file"
// @Success 200 {object} dto.SheetFileResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /sheets/file/delete_backups [post]
func DeleteSheetBackupsHandler(c *gin.Context) {
	var sheetFile SheetFile
	if err := c.ShouldBindJSON(&sheetFile); err != nil {
		status, body := mapBindingOrFileError(err)
		c.JSON(status, body)
		return
	}

	res, err := DeleteSheetBackups(sheetFile)
	if err != nil {
		status, body := mapFileError(err)
		c.JSON(status, body)
		return
	}

	c.JSON(200, res)
}

// SaveSheetFileHandler godoc
//
// @Summary Save a .paisa sheet file
// @Description Atomically writes .paisa sheet file with timestamped backup. No-op in readonly mode.
// @Tags Sheets
// @Accept json
// @Produce json
// @Param file body dto.SheetFileRequest true "Sheet file content"
// @Success 200 {object} dto.SheetSaveResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /sheets/save [post]
func SaveSheetFileHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.GetConfig().Readonly {
			c.JSON(200, gin.H{"saved": false, "message": "Readonly mode"})
			return
		}

		var sheetFile SheetFile
		if err := c.ShouldBindJSON(&sheetFile); err != nil {
			status, body := mapBindingOrFileError(err)
			c.JSON(status, body)
			return
		}

		c.JSON(200, SaveSheetFile(db, sheetFile))
	}
}

// GetTemplatesHandler godoc
//
// @Summary List all transaction templates
// @Description Returns builtin and custom transaction templates
// @Tags Templates
// @Produce json
// @Success 200 {object} dto.TemplatesResponse
// @Security PaisaAuth
// @Router /templates [get]
func GetTemplatesHandler(c *gin.Context) {
	c.JSON(200, dto.TemplatesResponse{Templates: mapper.TemplatesToDTO(template.All())})
}

// UpsertTemplateHandler godoc
//
// @Summary Create or update a transaction template
// @Description Saves a custom transaction template in paisa.yaml. No-op in readonly mode.
// @Tags Templates
// @Accept json
// @Produce json
// @Param request body dto.TemplateUpsertRequest true "Template data"
// @Success 200 {object} dto.TemplateSaveResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Failure 500 {object} dto.TemplateSaveResponse
// @Security PaisaAuth
// @Router /templates/upsert [post]
func UpsertTemplateHandler(c *gin.Context) {
	if config.GetConfig().Readonly {
		c.JSON(200, dto.TemplateSaveResponse{Saved: false, Message: "Readonly mode"})
		return
	}

	var req dto.TemplateUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		status, body := mapBindingOrFileError(err)
		c.JSON(status, body)
		return
	}

	tpl, err := template.Upsert(req.Name, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.TemplateSaveResponse{Saved: false, Message: err.Error()})
		return
	}

	c.JSON(200, dto.TemplateSaveResponse{Template: mapper.TemplateToDTO(tpl), Saved: true})
}

// DeleteTemplateHandler godoc
//
// @Summary Delete a transaction template
// @Description Deletes a custom transaction template from paisa.yaml. No-op in readonly mode.
// @Tags Templates
// @Accept json
// @Produce json
// @Param request body dto.TemplateDeleteRequest true "Template name"
// @Success 200 {object} dto.SuccessResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Failure 500 {object} dto.SuccessResponse
// @Security PaisaAuth
// @Router /templates/delete [post]
func DeleteTemplateHandler(c *gin.Context) {
	if config.GetConfig().Readonly {
		c.JSON(200, dto.SuccessResponse{Success: false, Message: "Readonly mode"})
		return
	}

	var req dto.TemplateDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		status, body := mapBindingOrFileError(err)
		c.JSON(status, body)
		return
	}

	if err := template.Delete(req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, dto.SuccessResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(200, dto.SuccessResponse{Success: true})
}

// GetGoalsHandler godoc
//
// @Summary List savings and retirement goals summaries
// @Description Returns summary and progress percentage for all configured goals
// @Tags Goals
// @Produce json
// @Success 200 {object} dto.GoalSummariesResponse
// @Security PaisaAuth
// @Router /goals [get]
func GetGoalsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{"goals": goal.GetGoalSummaries(db)})
	}
}

// GetGoalDetailsHandler godoc
//
// @Summary Get details for a specific goal
// @Description Returns progress, projections, and monthly timeline for a single goal
// @Tags Goals
// @Produce json
// @Param type path string true "Goal type (savings or retirement)"
// @Param name path string true "Goal name"
// @Success 200 {object} dto.GoalDetailResponse
// @Security PaisaAuth
// @Router /goals/{type}/{name} [get]
func GetGoalDetailsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, goal.GetGoalDetails(db, c.Param("type"), c.Param("name")))
	}
}
