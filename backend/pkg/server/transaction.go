package server

import (
	"sort"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/query"
	"gorm.io/gorm"
)

func GetTransactions(db *gorm.DB) dto.TransactionsResponse {
	postings := query.Init(db).Desc().All()
	transactions := transaction.Build(postings)

	sort.Slice(transactions, func(i, j int) bool { return transactions[i].ID > transactions[j].ID })
	sort.SliceStable(transactions, func(i, j int) bool { return transactions[i].Date.After(transactions[j].Date) })

	return dto.TransactionsResponse{Transactions: mapper.TransactionsToDTO(transactions)}
}

func GetBalancedPostings(db *gorm.DB) dto.BalancedPostingsResponse {
	postings := query.Init(db).Desc().All()
	transactions := transaction.Build(postings)
	balancePostings := accounting.BuildBalancedPostings(transactions)

	return dto.BalancedPostingsResponse{BalancedPostings: mapper.BalancedPostingsToDTO(balancePostings)}
}

func GetLatestTransactions(db *gorm.DB) []dto.TransactionResponse {
	postings := query.Init(db).Desc().Limit(200).All()
	transactions := transaction.Build(postings)

	sort.Slice(transactions, func(i, j int) bool { return transactions[i].ID > transactions[j].ID })
	sort.SliceStable(transactions, func(i, j int) bool { return transactions[i].Date.After(transactions[j].Date) })

	return mapper.TransactionsToDTO(transactions)
}
