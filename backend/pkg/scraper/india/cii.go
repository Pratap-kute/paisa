package india

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/cii"
	log "github.com/sirupsen/logrus"
)

var httpClient = &http.Client{
	Timeout: 30 * time.Second,
}

func GetCostInflationIndex() ([]*cii.CII, error) {
	log.Info("Fetching Cost Inflation Index from Purified Bytes")
	resp, err := httpClient.Get("https://india.finbodhi.com/api/cii/v2.json")
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	respBytes, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024+1))
	if err != nil {
		return nil, err
	}
	if len(respBytes) > 10*1024*1024 {
		return nil, fmt.Errorf("response exceeded maximum allowed size of 10MB")
	}

	type CII struct {
		FinancialYear      string `json:"financial_year"`
		CostInflationIndex uint   `json:"cost_inflation_index"`
	}
	type Result struct {
		Data []CII
	}

	var result Result
	err = json.Unmarshal(respBytes, &result)
	if err != nil {
		return nil, err
	}

	var ciis []*cii.CII
	for _, s := range result.Data {
		c := cii.CII{FinancialYear: s.FinancialYear, CostInflationIndex: s.CostInflationIndex}
		ciis = append(ciis, &c)

	}
	return ciis, nil
}
