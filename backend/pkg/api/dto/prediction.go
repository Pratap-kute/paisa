package dto

type IndexResponse struct {
	Docs   map[string]map[string]int64 `json:"docs"`
	Tokens map[string]map[string]int64 `json:"tokens"`
}

type TfIdfResponse struct {
	TfIdf map[string]map[string]float64 `json:"tf_idf"`
	Index IndexResponse                 `json:"index"`
}

type PredictionHistoryEntryResponse struct {
	TransactionID   string  `json:"transactionId"`
	Date            string  `json:"date"`
	Payee           string  `json:"payee"`
	SourceAccount   *string `json:"sourceAccount,omitempty"`
	CategoryAccount string  `json:"categoryAccount"`
	Amount          float64 `json:"amount"`
	AbsoluteAmount  float64 `json:"absoluteAmount"`
	Direction       *string `json:"direction,omitempty"`
	Commodity       string  `json:"commodity"`
}

type PredictionHistoryResponse struct {
	History []PredictionHistoryEntryResponse `json:"history"`
}

type MerchantRuleUpsertRequest struct {
	Merchant string `json:"merchant"`
	Account  string `json:"account"`
	Prefix   string `json:"prefix,omitempty"`
}

type MerchantRuleResponse struct {
	Account   string   `json:"account"`
	Merchant  string   `json:"merchant,omitempty"`
	Merchants []string `json:"merchants,omitempty"`
}

type MerchantRuleSaveResponse struct {
	Rule    MerchantRuleResponse `json:"rule"`
	Saved   bool                 `json:"saved"`
	Message string               `json:"message,omitempty"`
}
