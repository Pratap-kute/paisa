package accounting

import (
	"slices"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/samber/lo"
)

func PostingWithBehaviours(postings []posting.Posting, behaviours []string) []posting.Posting {
	return lo.Filter(postings, func(p posting.Posting, _ int) bool {
		return slices.ContainsFunc(behaviours, p.HasBehaviour)
	})
}
