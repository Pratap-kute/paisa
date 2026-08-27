package prediction

import (
	"math"
	"strings"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

const (
	DirectionDebit  = "DEBIT"
	DirectionCredit = "CREDIT"
)

type HistoryEntry = dto.PredictionHistoryEntryResponse

func isUnknownAccount(account string) bool {
	return account == "Unknown" || strings.HasSuffix(account, ":Unknown")
}

func isSourceKind(account string) bool {
	return utils.IsSameOrParent(account, "Assets") || utils.IsSameOrParent(account, "Liabilities")
}

func isCategoryKind(account string) bool {
	return utils.IsSameOrParent(account, "Expenses") || utils.IsSameOrParent(account, "Income")
}

func strPtr(value string) *string {
	if value == "" {
		return nil
	}
	copy := value
	return &copy
}

func uniqueAccounts(postings []posting.Posting, keep func(string) bool) []string {
	seen := map[string]bool{}
	var accounts []string
	for i := range postings {
		p := &postings[i]
		account := strings.TrimSpace(p.Account)
		if account == "" || !keep(account) || seen[account] {
			continue
		}
		seen[account] = true
		accounts = append(accounts, account)
	}
	return accounts
}

func sourceAmount(postings []posting.Posting, source string) float64 {
	total := 0.0
	for i := range postings {
		p := &postings[i]
		if strings.TrimSpace(p.Account) == source {
			total += p.Amount.InexactFloat64()
		}
	}
	return total
}

func directionForSource(amount float64) *string {
	if amount < 0 {
		return strPtr(DirectionDebit)
	}
	if amount > 0 {
		return strPtr(DirectionCredit)
	}
	return nil
}

func usablePosting(p posting.Posting) bool {
	payee := strings.TrimSpace(p.Payee)
	account := strings.TrimSpace(p.Account)
	return payee != "" && account != "" && !isUnknownAccount(account)
}

func entryFromPosting(p posting.Posting, source *string, direction *string) HistoryEntry {
	amount := p.Amount.InexactFloat64()
	return HistoryEntry{
		TransactionID:   p.TransactionID,
		Date:            p.Date.Format("2006-01-02"),
		Payee:           strings.TrimSpace(p.Payee),
		SourceAccount:   source,
		CategoryAccount: strings.TrimSpace(p.Account),
		Amount:          amount,
		AbsoluteAmount:  math.Abs(amount),
		Direction:       direction,
		Commodity:       p.Commodity,
	}
}

func HistoryFromPostings(db *gorm.DB) []HistoryEntry {
	postings := query.Init(db).All()
	grouped := lo.GroupBy(postings, func(p posting.Posting) string { return p.TransactionID })
	entries := make([]HistoryEntry, 0, len(postings))

	for _, txnPostings := range grouped {
		var usable []posting.Posting
		for i := range txnPostings {
			p := txnPostings[i]
			if usablePosting(p) {
				usable = append(usable, p)
			}
		}
		if len(usable) == 0 {
			continue
		}

		sourceAccounts := uniqueAccounts(usable, isSourceKind)
		var source *string
		var direction *string
		if len(sourceAccounts) == 1 {
			source = strPtr(sourceAccounts[0])
			direction = directionForSource(sourceAmount(usable, sourceAccounts[0]))
		}

		var category []posting.Posting
		for i := range usable {
			p := usable[i]
			if isCategoryKind(p.Account) {
				category = append(category, p)
			}
		}
		emit := category
		if len(emit) == 0 {
			emit = usable
			source = nil
			direction = nil
		}

		for i := range emit {
			entries = append(entries, entryFromPosting(emit[i], source, direction))
		}
	}

	return entries
}

func GetHistory(db *gorm.DB) dto.PredictionHistoryResponse {
	return dto.PredictionHistoryResponse{History: HistoryFromPostings(db)}
}
