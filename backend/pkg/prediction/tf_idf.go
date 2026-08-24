package prediction

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"sync"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type Index struct {
	Docs   map[string]map[string]int64 `json:"docs"`
	Tokens map[string]map[string]int64 `json:"tokens"`
}

type tfidfCache struct {
	mu          sync.RWMutex
	initialized bool
	vector      map[string]map[string]float64
	index       Index
}

var cache tfidfCache

func (c *tfidfCache) get(db *gorm.DB) (map[string]map[string]float64, Index) {
	c.mu.RLock()
	if c.initialized {
		v := c.vector
		idx := c.index
		c.mu.RUnlock()
		return v, idx
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.initialized {
		postings := query.Init(db).All()
		idx := buldIndex(postings)
		vector := make(map[string]map[string]float64, len(idx.Docs))
		for account := range idx.Docs {
			vector[account] = tfidf(account, idx)
		}
		c.index = idx
		c.vector = vector
		c.initialized = true
	}
	return c.vector, c.index
}

func (c *tfidfCache) clear() {
	c.mu.Lock()
	c.vector = nil
	c.index = Index{}
	c.initialized = false
	c.mu.Unlock()
}

func ClearCache() {
	cache.clear()
}

func buldIndex(postings []posting.Posting) Index {
	idx := Index{
		Docs:   make(map[string]map[string]int64),
		Tokens: make(map[string]map[string]int64),
	}
	for i := range postings {
		p := &postings[i]
		if idx.Docs[p.Account] == nil {
			idx.Docs[p.Account] = make(map[string]int64)
		}
		for _, token := range tokenize(strings.Join([]string{strings.TrimRight(strings.TrimRight(fmt.Sprintf("%f", p.Amount.InexactFloat64()), "0"), "."), p.Payee}, " ")) {
			if idx.Tokens[token] == nil {
				idx.Tokens[token] = make(map[string]int64)
			}
			idx.Tokens[token][p.Account]++
			idx.Docs[p.Account][token]++
		}
	}
	return idx
}

func tfidf(account string, idx Index) map[string]float64 {
	tfidf := make(map[string]float64)
	for token, freq := range idx.Docs[account] {
		tf := float64(freq) / float64(len(idx.Docs[account]))
		idf := math.Log(float64(len(idx.Docs))/(1+float64(len(idx.Tokens[token])))) + 1
		tfidf[token] = tf * idf
	}
	return tfidf
}

func tokenize(s string) []string {
	tokens := regexp.MustCompile("[ .()/:]+").Split(s, -1)
	tokens = lo.Map(tokens, func(s string, _ int) string {
		return strings.ToLower(s)
	})
	return lo.Filter(tokens, func(s string, _ int) bool {
		return strings.TrimSpace(s) != ""
	})
}

func GetTfIdf(db *gorm.DB) map[string]interface{} {
	vector, idx := cache.get(db)
	return map[string]interface{}{"tf_idf": vector, "index": idx}
}
