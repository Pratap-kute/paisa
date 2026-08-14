package nps

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/price"
)

var httpClient = &http.Client{
	Timeout: 15 * time.Second,
}

func GetNav(schemeCode string, commodityName string) ([]*price.Price, error) {
	log.Info("Fetching NPS Fund nav from Purified Bytes")
	url := fmt.Sprintf("https://nps.finbodhi.com/api/schemes/%s/nav.json", schemeCode)
	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	type Data struct {
		Date string
		Nav  decimal.Decimal
	}
	type Result struct {
		Data []Data
	}

	var result Result
	err = json.Unmarshal(respBytes, &result)
	if err != nil {
		return nil, err
	}

	var prices []*price.Price
	for _, data := range result.Data {
		date, err := time.ParseInLocation("2006-01-02", data.Date, config.TimeZone())
		if err != nil {
			return nil, err
		}

		price := price.Price{Date: date, CommodityType: config.NPS, CommodityID: schemeCode, CommodityName: commodityName, Value: data.Nav}
		prices = append(prices, &price)
	}
	return prices, nil
}
