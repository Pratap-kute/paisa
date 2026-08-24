package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func NodeToDTO(n service.Node) dto.NodeResponse {
	return dto.NodeResponse{
		ID:   n.ID,
		Name: n.Name,
	}
}

func NodesToDTO(nodes []service.Node) []dto.NodeResponse {
	if len(nodes) == 0 {
		return []dto.NodeResponse{}
	}
	result := make([]dto.NodeResponse, len(nodes))
	for i := range nodes {
		result[i] = NodeToDTO(nodes[i])
	}
	return result
}

func LinkToDTO(l service.Link) dto.LinkResponse {
	return dto.LinkResponse{
		Source: l.Source,
		Target: l.Target,
		Value:  l.Value,
	}
}

func LinksToDTO(links []service.Link) []dto.LinkResponse {
	if len(links) == 0 {
		return []dto.LinkResponse{}
	}
	result := make([]dto.LinkResponse, len(links))
	for i := range links {
		result[i] = LinkToDTO(links[i])
	}
	return result
}

func GraphToDTO(g service.Graph) dto.GraphResponse {
	return dto.GraphResponse{
		Nodes: NodesToDTO(g.Nodes),
		Links: LinksToDTO(g.Links),
	}
}

func GraphsToDTO(graphs map[string]service.Graph) map[string]dto.GraphResponse {
	result := make(map[string]dto.GraphResponse, len(graphs))
	for k, v := range graphs {
		result[k] = GraphToDTO(v)
	}
	return result
}

func GroupedPostingsMapToDTO(m map[string][]posting.Posting) map[string][]dto.PostingResponse {
	result := make(map[string][]dto.PostingResponse, len(m))
	for k, v := range m {
		result[k] = PostingsToDTO(v)
	}
	return result
}

func PeriodicPostingsSummaryToDTO(s service.PeriodicPostingsSummary) dto.PeriodicPostingsSummaryResponse {
	return dto.PeriodicPostingsSummaryResponse{
		Expenses:    GroupedPostingsMapToDTO(s.Expenses),
		Incomes:     GroupedPostingsMapToDTO(s.Incomes),
		Investments: GroupedPostingsMapToDTO(s.Investments),
		Taxes:       GroupedPostingsMapToDTO(s.Taxes),
	}
}

func ExpenseResultToDTO(r service.ExpenseResult) dto.ExpenseResponse {
	return dto.ExpenseResponse{
		Expenses:  PostingsToDTO(r.Expenses),
		MonthWise: PeriodicPostingsSummaryToDTO(r.MonthWise),
		YearWise:  PeriodicPostingsSummaryToDTO(r.YearWise),
		Graph:     GraphsToDTO(r.Graph),
	}
}
