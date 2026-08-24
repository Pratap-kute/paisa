package server

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
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

func verifyGraphConservationInvariants(t *testing.T, postings []posting.Posting, g Graph) {
	t.Helper()

	// Map node ID to account name and vice versa
	nodeMap := make(map[uint]string)
	for _, n := range g.Nodes {
		nodeMap[n.ID] = n.Name
	}

	// 1. All link values must be strictly positive
	for _, link := range g.Links {
		assert.True(t, link.Value.IsPositive(), "Link %s (%d) -> %s (%d) value %s must be positive",
			nodeMap[link.Source], link.Source, nodeMap[link.Target], link.Target, link.Value)
	}

	// Calculate expected amounts per account
	totalPositive := decimal.Zero
	totalNegativeAbs := decimal.Zero
	targetExpected := make(map[string]decimal.Decimal)
	sourceExpected := make(map[string]decimal.Decimal)

	for _, p := range postings {
		if p.Amount.IsPositive() {
			totalPositive = totalPositive.Add(p.Amount)
			targetExpected[p.Account] = targetExpected[p.Account].Add(p.Amount)
		} else if p.Amount.IsNegative() {
			totalNegativeAbs = totalNegativeAbs.Add(p.Amount.Abs())
			sourceExpected[p.Account] = sourceExpected[p.Account].Add(p.Amount.Abs())
		}
	}

	// In computeHierarchyGraph:
	// Outflow from each source account is represented by links originating from source:
	sourceOutflows := make(map[string]decimal.Decimal)
	// Inflow to leaf target accounts is represented by links ending at target:
	targetInflows := make(map[string]decimal.Decimal)

	for _, link := range g.Links {
		src := nodeMap[link.Source]
		tgt := nodeMap[link.Target]

		if _, ok := sourceExpected[src]; ok {
			sourceOutflows[src] = sourceOutflows[src].Add(link.Value)
		}
		if _, ok := targetExpected[tgt]; ok {
			targetInflows[tgt] = targetInflows[tgt].Add(link.Value)
		}
	}

	// Verify each source account emitted exactly its posting amount
	for src, exp := range sourceExpected {
		assert.Equal(t, exp.String(), sourceOutflows[src].String(), "Source account %s must emit exactly its posting amount", src)
	}

	// Verify each destination account received exactly its posting amount
	for tgt, exp := range targetExpected {
		assert.Equal(t, exp.String(), targetInflows[tgt].String(), "Target account %s must receive exactly its posting amount", tgt)
	}
}

func TestExpenseHierarchyGraph_Case1_OneToOne(t *testing.T) {
	postings := []posting.Posting{
		graphPosting("Assets:Checking", "-100"),
		graphPosting("Expenses:Food", "100"),
	}

	g := computeHierarchyGraph(postings)
	verifyGraphConservationInvariants(t, postings, g)
	require.NotEmpty(t, g.Links)
}

func TestExpenseHierarchyGraph_Case2_OneToMany(t *testing.T) {
	postings := []posting.Posting{
		graphPosting("Assets:Checking", "-100"),
		graphPosting("Expenses:Food", "60"),
		graphPosting("Expenses:Rent", "40"),
	}

	g := computeHierarchyGraph(postings)
	verifyGraphConservationInvariants(t, postings, g)
}

func TestExpenseHierarchyGraph_Case3_ManyToOne(t *testing.T) {
	postings := []posting.Posting{
		graphPosting("Assets:Checking", "-60"),
		graphPosting("Assets:Cash", "-40"),
		graphPosting("Expenses:Rent", "100"),
	}

	g := computeHierarchyGraph(postings)
	verifyGraphConservationInvariants(t, postings, g)
}

func TestExpenseHierarchyGraph_Case4_ManyToMany(t *testing.T) {
	// Two sources (-40 Checking, -80 Cash = -120 total)
	// Two destinations (+100 Rent, +20 Food = +120 total)
	// Checking (40) should be fully consumed by Rent (100 -> 60 remaining)
	// Cash (80) should provide 60 to Rent and 20 to Food.
	postings := []posting.Posting{
		graphPosting("Assets:Checking", "-40"),
		graphPosting("Assets:Cash", "-80"),
		graphPosting("Expenses:Rent", "100"),
		graphPosting("Expenses:Food", "20"),
	}

	g := computeHierarchyGraph(postings)
	verifyGraphConservationInvariants(t, postings, g)
}
