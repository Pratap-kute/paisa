package dto

type LedgerFileResponse struct {
	Name      string   `json:"name"`
	Content   string   `json:"content"`
	Versions  []string `json:"versions"`
	Operation string   `json:"operation"`
}

type EditorFilesResponse struct {
	Files       []*LedgerFileResponse `json:"files"`
	Accounts    []string              `json:"accounts"`
	Payees      []string              `json:"payees"`
	Commodities []string              `json:"commodities"`
}

type EditorSaveRequest struct {
	Files []*LedgerFileResponse `json:"files"`
}

type SheetFileResponse struct {
	Name      string   `json:"name"`
	Content   string   `json:"content"`
	Versions  []string `json:"versions"`
	Operation string   `json:"operation"`
}

type SheetsResponse struct {
	Files    []*SheetFileResponse `json:"files"`
	Postings []PostingResponse    `json:"postings"`
}

type SheetExecuteRequest struct {
	Query string `json:"query"`
}

type SheetResultResponse struct {
	Result interface{} `json:"result"`
}
