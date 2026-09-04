package server

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/ananthakumaran/paisa/docs"
	"github.com/ananthakumaran/paisa/pkg/auth"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/ananthakumaran/paisa/web"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"github.com/throttled/throttled/v2"
	"github.com/throttled/throttled/v2/store/memstore"
	"gorm.io/gorm"
)

const (
	DefaultJSONLimit         int64 = 2 * 1024 * 1024  // 2MB for config, templates, sync, autocomplete
	DefaultEditorLimit       int64 = 10 * 1024 * 1024 // 10MB for journal files and sheet files
	DefaultGlobalAPILimit    int64 = 25 * 1024 * 1024 // 25MB global fallback
	DefaultReadHeaderTimeout       = 5 * time.Second
	DefaultReadTimeout             = 60 * time.Second
	DefaultWriteTimeout            = 120 * time.Second
	DefaultIdleTimeout             = 120 * time.Second
	DefaultShutdownTimeout         = 10 * time.Second
)

func MaxBodySize(limitBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limitBytes)
		}
		c.Next()
	}
}

func SafeRecovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		log.Errorf("HTTP panic recovered: %v", recovered)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "An unexpected internal error occurred",
		})
	})
}

func Build(db *gorm.DB, enableCompression bool) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	if enableCompression {
		router.Use(gzip.Gzip(gzip.DefaultCompression))
	}

	router.Use(Logger(log.StandardLogger()), SafeRecovery())
	router.Use(TokenAuthMiddleware())

	registerStaticAndMetaRoutes(router)
	registerConfigAndInitRoutes(router, db)
	registerSyncAndPriceRoutes(router, db)
	registerFinancialRoutes(router, db)
	registerEditorAndSheetRoutes(router, db)
	registerTemplateAndGoalRoutes(router, db)

	return router
}

func registerStaticAndMetaRoutes(router *gin.Engine) {
	router.GET("/robots.txt", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte("User-agent: *\nDisallow: /"))
	})

	router.GET("/_app/*filepath", func(c *gin.Context) {
		c.FileFromFS("/static"+c.Request.URL.Path, http.FS(web.Static))
	})

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.GET("/api/ping", PingHandler)

	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") || c.Request.URL.Path == "/api" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "API endpoint not found",
			})
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(web.Index))
	})
}

func registerConfigAndInitRoutes(router *gin.Engine, db *gorm.DB) {
	router.GET("/api/config", GetConfigHandler(db))
	router.POST("/api/config", MaxBodySize(DefaultJSONLimit), SaveConfigHandler)
	router.POST("/api/init", MaxBodySize(DefaultJSONLimit), InitDemoDataHandler(db))
}

func registerSyncAndPriceRoutes(router *gin.Engine, db *gorm.DB) {
	router.POST("/api/sync", MaxBodySize(DefaultJSONLimit), SyncDataHandler(db))
	router.POST("/api/price/delete", ClearPriceCacheHandler(db))
	router.GET("/api/price", GetPricesHandler(db))
	router.GET("/api/price/providers", GetPriceProvidersHandler(db))
	router.POST("/api/price/providers/delete/:provider", ClearPriceProviderCacheHandler(db))
	router.POST("/api/price/autocomplete", MaxBodySize(DefaultJSONLimit), GetPriceAutoCompletionsHandler(db))
}

func registerFinancialRoutes(router *gin.Engine, db *gorm.DB) {
	router.GET("/api/dashboard", GetDashboardHandler(db))
	router.GET("/api/insights", GetInsightsHandler(db))
	router.GET("/api/networth", GetNetworthHandler(db))
	router.GET("/api/assets/balance", GetAssetsBalanceHandler(db))
	router.GET("/api/investment", GetInvestmentHandler(db))
	router.GET("/api/gain", GetGainHandler(db))
	router.GET("/api/gain/:account", GetAccountGainHandler(db))
	router.GET("/api/income", GetIncomeHandler(db))
	router.GET("/api/expense", GetExpenseHandler(db))
	router.GET("/api/budget", GetBudgetHandler(db))
	router.GET("/api/cash_flow", GetCashFlowHandler(db))
	router.GET("/api/income_statement", GetIncomeStatementHandler(db))
	router.GET("/api/recurring", GetRecurringTransactionsHandler(db))
	router.GET("/api/allocation", GetAllocationHandler(db))
	router.GET("/api/portfolio_allocation", GetPortfolioAllocationHandler(db))
	router.GET("/api/ledger", GetLedgerHandler(db))
	router.GET("/api/transaction/balanced", GetBalancedPostingsHandler(db))
	router.GET("/api/transaction", GetTransactionsHandler(db))
	router.GET("/api/harvest", GetHarvestHandler(db))
	router.GET("/api/capital_gains", GetCapitalGainsHandler(db))
	router.GET("/api/schedule_al", GetScheduleALHandler(db))
	router.GET("/api/diagnosis", GetDiagnosisHandler(db))
	router.GET("/api/liabilities/interest", GetLiabilitiesInterestHandler(db))
	router.GET("/api/liabilities/balance", GetLiabilitiesBalanceHandler(db))
	router.GET("/api/liabilities/repayment", GetLiabilitiesRepaymentHandler(db))
	router.GET("/api/logs", GetLogsHandler)
	router.GET("/api/account/tf_idf", GetTfIdfHandler(db))
	router.GET("/api/prediction/history", GetPredictionHistoryHandler(db))
	router.POST("/api/prediction/merchant-rule", MaxBodySize(DefaultJSONLimit), UpsertMerchantRuleHandler)
	router.GET("/api/credit_cards", GetCreditCardsHandler(db))
	router.GET("/api/credit_cards/:account", GetCreditCardHandler(db))
}

func registerEditorAndSheetRoutes(router *gin.Engine, db *gorm.DB) {
	router.GET("/api/editor/files", GetEditorFilesHandler(db))
	router.POST("/api/editor/file", MaxBodySize(DefaultEditorLimit), GetEditorFileHandler)
	router.POST("/api/editor/file/delete_backups", MaxBodySize(DefaultEditorLimit), DeleteEditorBackupsHandler)
	router.POST("/api/editor/validate", MaxBodySize(DefaultEditorLimit), ValidateEditorFileHandler)
	router.POST("/api/editor/save", MaxBodySize(DefaultEditorLimit), SaveEditorFileHandler(db))

	router.GET("/api/sheets/files", GetSheetFilesHandler(db))
	router.POST("/api/sheets/file", MaxBodySize(DefaultEditorLimit), GetSheetFileHandler)
	router.POST("/api/sheets/file/delete_backups", MaxBodySize(DefaultEditorLimit), DeleteSheetBackupsHandler)
	router.POST("/api/sheets/save", MaxBodySize(DefaultEditorLimit), SaveSheetFileHandler(db))
}

func registerTemplateAndGoalRoutes(router *gin.Engine, db *gorm.DB) {
	router.GET("/api/templates", GetTemplatesHandler)
	router.POST("/api/templates/upsert", MaxBodySize(DefaultJSONLimit), UpsertTemplateHandler)
	router.POST("/api/templates/delete", MaxBodySize(DefaultJSONLimit), DeleteTemplateHandler)
	router.GET("/api/goals", GetGoalsHandler(db))
	router.GET("/api/goals/:type/:name", GetGoalDetailsHandler(db))
}

func Listen(db *gorm.DB, host string, port int) {
	router := Build(db, true)
	addr := fmt.Sprintf("%s:%d", host, port)
	srv := NewServer(router, addr)
	if err := Serve(srv); err != nil {
		log.Fatal(err)
	}
}

func NewServer(handler http.Handler, addr string) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: DefaultReadHeaderTimeout,
		ReadTimeout:       DefaultReadTimeout,
		WriteTimeout:      DefaultWriteTimeout,
		IdleTimeout:       DefaultIdleTimeout,
	}
}

func Serve(server *http.Server) error {
	serverErrors := make(chan error, 1)

	go func() {
		log.Infof("Starting server on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		return fmt.Errorf("server error: %w", err)

	case sig := <-shutdown:
		log.Infof("Shutdown signal received: %v, starting graceful shutdown", sig)

		ctx, cancel := context.WithTimeout(context.Background(), DefaultShutdownTimeout)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.Errorf("Graceful shutdown failed, forcing close: %v", err)
			_ = server.Close()
			return fmt.Errorf("could not stop server gracefully: %w", err)
		}
		log.Info("Server stopped cleanly")
	}

	return nil
}

func TokenAuthMiddleware() gin.HandlerFunc {
	quota := throttled.RateQuota{
		MaxRate:  throttled.PerMin(6),
		MaxBurst: 3,
	}

	var rateLimiter *throttled.GCRARateLimiterCtx
	store, err := memstore.NewCtx(65536)
	if err != nil {
		log.Errorf("Failed to initialize auth rate limiter store: %v", err)
	} else {
		rateLimiter, err = throttled.NewGCRARateLimiterCtx(store, quota)
		if err != nil {
			log.Errorf("Failed to initialize GCRA rate limiter: %v", err)
		}
	}

	return func(c *gin.Context) {
		userAccounts := config.GetConfig().UserAccounts
		if len(userAccounts) == 0 || !strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.Next()
			return
		}

		authHeader := c.Request.Header.Get("X-Auth")
		tokens := strings.SplitN(authHeader, ":", 2)
		username := ""
		if len(tokens) > 0 {
			username = tokens[0]
		}
		limiterKey := fmt.Sprintf("auth:%s:%s", c.ClientIP(), username)

		_, detail, _ := rateLimiter.RateLimitCtx(c.Request.Context(), limiterKey, 0)
		if detail.Remaining <= 0 {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too_many_requests", "message": "Too many failed login attempts, please try again later"})
			return
		}

		if len(tokens) != 2 {
			_, _, _ = rateLimiter.RateLimitCtx(c.Request.Context(), limiterKey, 1)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "Invalid username or password"})
			return
		}

		suppliedToken := tokens[1]
		for _, userAccount := range userAccounts {
			if subtle.ConstantTimeCompare([]byte(userAccount.Username), []byte(username)) == 1 {
				valid, needsRehash, _ := auth.VerifyPassword(userAccount.Password, suppliedToken)
				if valid {
					if needsRehash {
						go func(uname, token string) {
							_ = config.UpgradeUserPassword(uname, token)
						}(username, suppliedToken)
					}
					c.Next()
					return
				}
			}
		}

		_, _, _ = rateLimiter.RateLimitCtx(c.Request.Context(), limiterKey, 1)
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "Invalid username or password"})
	}
}

func mapBindingOrFileError(err error) (int, gin.H) {
	var maxBytesErr *http.MaxBytesError
	if errors.As(err, &maxBytesErr) || strings.Contains(err.Error(), "request body too large") {
		return http.StatusRequestEntityTooLarge, gin.H{"error": "Request body exceeds maximum allowed size"}
	}
	if errors.Is(err, utils.ErrInvalidPath) {
		return http.StatusBadRequest, gin.H{"error": "Invalid file path"}
	}
	if errors.Is(err, os.ErrNotExist) {
		return http.StatusNotFound, gin.H{"error": "File not found"}
	}
	return http.StatusBadRequest, gin.H{"error": err.Error()}
}

func mapFileError(err error) (int, gin.H) {
	if errors.Is(err, utils.ErrInvalidPath) {
		return http.StatusBadRequest, gin.H{"error": "Invalid file path"}
	}
	if errors.Is(err, os.ErrNotExist) {
		return http.StatusNotFound, gin.H{"error": "File not found"}
	}
	return http.StatusInternalServerError, gin.H{"error": err.Error()}
}
