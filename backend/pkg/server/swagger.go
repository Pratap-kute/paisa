package server

//go:generate go run github.com/swaggo/swag/cmd/swag init -g pkg/server/swagger.go -o ../../docs --parseDependency --parseInternal

// @title Paisa API
// @version 0.1.0
// @description Paisa is a local-first personal finance application. This API powers the Paisa frontend and exposes financial analysis, journal editing, configuration, price data, goals, transactions, and related application operations.
// @BasePath /api
//
// @securityDefinitions.apikey PaisaAuth
// @in header
// @name X-Auth
// @description Credentials formatted as 'username:password'. Required for all /api endpoints when user accounts are configured in paisa.yaml.
