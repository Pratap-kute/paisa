package nps

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/ananthakumaran/paisa/pkg/model/nps/scheme"
	log "github.com/sirupsen/logrus"
)

func GetSchemes() ([]*scheme.Scheme, error) {
	log.Info("Fetching NPS scheme list from Purified Bytes")
	resp, err := httpClient.Get("https://nps.finbodhi.com/api/schemes.json")
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

	type Scheme struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		PFMName string `json:"pfm_name"`
	}
	type Result struct {
		Data []Scheme
	}

	var result Result
	err = json.Unmarshal(respBytes, &result)
	if err != nil {
		return nil, err
	}

	var schemes []*scheme.Scheme
	for _, s := range result.Data {
		scheme := scheme.Scheme{PFMName: s.PFMName, SchemeID: s.ID, SchemeName: s.Name}
		schemes = append(schemes, &scheme)

	}
	return schemes, nil
}
