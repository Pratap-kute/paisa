package mutualfund

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"

	"github.com/ananthakumaran/paisa/pkg/model/mutualfund/scheme"
	log "github.com/sirupsen/logrus"
)

func GetSchemes() ([]*scheme.Scheme, error) {
	log.Info("Fetching Mutual Fund Scheme list from AMFI Website")
	resp, err := httpClient.Get("https://portal.amfiindia.com/DownloadSchemeData_Po.aspx?mf=0")
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	reader := csv.NewReader(io.LimitReader(resp.Body, 10*1024*1024))
	reader.LazyQuotes = true
	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	var schemes []*scheme.Scheme
	for _, record := range records[1:] {
		scheme := scheme.Scheme{AMC: record[0], Code: record[1], Name: record[2], Type: record[3], Category: record[4], NAVName: record[5]}
		schemes = append(schemes, &scheme)

	}
	return schemes, nil
}
