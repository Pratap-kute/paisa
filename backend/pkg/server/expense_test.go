package server

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func graphPosting(account string, amount string) posting.Posting {
	return posting.Posting{
		TransactionID: "txn-graph-1",
		Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC),
		Account:       account,
		Commodity:     "INR",
		Amount:        decimal.RequireFromString(amount),
		Quantity:      decimal.RequireFromString(amount),
	}
}

func verifyGraphConservationInvariants(t *testing.T, postings []posting.Posting, g service.Graph) {
	t.Helper()

	nodeMap := make(map[uint]string)
	for _, n := range g.Nodes {
		nodeMap[n.ID] = n.Name
	}

	for _, link := range g.Links {
		assert.True(t, link.Value.IsPositive(), "Link %s (%d) -> %s (%d) value %s must be positive",
			nodeMap[link.Source], link.Source, nodeMap[link.Target], link.Target, link.Value)
	}

	totalPositive := decimal.Zero
	for _, p := range postings {
		if p.Amount.IsPositive() {
			totalPositive = totalPositive.Add(p.Amount)
		}
	}

	totalExpenseDirectLinks := decimal.Zero
	for _, link := range g.Links {
		if nodeMap[link.Target] == "Expenses" {
			totalExpenseDirectLinks = totalExpenseDirectLinks.Add(link.Value)
		}
	}
	assert.True(t, totalExpenseDirectLinks.Equal(totalPositive), "Total incoming to Expenses (%s) must equal total positive allocations (%s)", totalExpenseDirectLinks, totalPositive)
}

func TestExpenseHierarchyGraph_ConservationSimple(t *testing.T) {
	postings := []posting.Posting{
		graphPosting("Income:Salary", "-50000"),
		graphPosting("Expenses:Rent", "50000"),
	}

	g := service.ComputeHierarchyGraph(postings)
	require.NotEmpty(t, g.Nodes)
	require.NotEmpty(t, g.Links)

	verifyGraphConservationInvariants(t, postings, g)
}

func TestExpenseHierarchyGraph_ConservationMultiExpense(t *testing.T) {
	postings := []posting.Posting{
		graphPosting("Income:Salary", "-60000"),
		graphPosting("Expenses:Rent:Apartment", "30000"),
		graphPosting("Expenses:Food:Groceries", "20000"),
		graphPosting("Expenses:Utilities:Electricity", "10000"),
	}

	g := service.ComputeHierarchyGraph(postings)
	verifyGraphConservationInvariants(t, postings, g)
}

func TestExpenseHierarchyGraph_ConservationPartialAllocation(t *testing.T) {
	postings := []posting.Posting{
		graphPosting("Income:Salary", "-35000"),
		graphPosting("Income:Bonus", "-15000"),
		graphPosting("Expenses:Rent", "40000"),
		graphPosting("Expenses:Food", "10000"),
	}

	g := service.ComputeHierarchyGraph(postings)
	verifyGraphConservationInvariants(t, postings, g)
}

func TestExpenseHierarchyGraph_NoNegativeOrCycleLinks(t *testing.T) {
	postings := []posting.Posting{
		graphPosting("Income:Job1", "-25000"),
		graphPosting("Income:Job2", "-25000"),
		graphPosting("Expenses:A:B:C", "20000"),
		graphPosting("Expenses:A:B:D", "30000"),
	}

	g := service.ComputeHierarchyGraph(postings)
	for _, link := range g.Links {
		assert.False(t, link.Source == link.Target, "Self-link detected on node %d", link.Source)
		assert.True(t, link.Value.IsPositive(), "Non-positive link value %s", link.Value)
	}
	verifyGraphConservationInvariants(t, postings, g)
}
