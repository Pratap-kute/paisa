package dto

type LedgerFileRequest struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
	Content string `json:"content,omitempty"`
}

type SheetFileRequest struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
	Content string `json:"content,omitempty"`
}

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

type LedgerErrorResponse struct {
	Message  string `json:"message"`
	Line     int    `json:"line,omitempty"`
	LineFrom int    `json:"line_from,omitempty"`
	LineTo   int    `json:"line_to,omitempty"`
	File     string `json:"file,omitempty"`
}

type EditorValidateResponse struct {
	Errors []LedgerErrorResponse `json:"errors"`
	Output string                `json:"output,omitempty"`
}

type EditorSaveResponse struct {
	Errors  []LedgerErrorResponse `json:"errors"`
	Saved   bool                  `json:"saved"`
	Synced  bool                  `json:"synced"`
	File    *LedgerFileResponse   `json:"file,omitempty"`
	Message string                `json:"message,omitempty"`
}

type SheetSaveResponse struct {
	Saved   bool   `json:"saved"`
	Message string `json:"message,omitempty"`
}
