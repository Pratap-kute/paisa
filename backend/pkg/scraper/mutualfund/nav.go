package mutualfund

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
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
	log.Info("Fetching Mutual Fund nav from mfapi.in")
	url := fmt.Sprintf("https://api.mfapi.in/mf/%s", schemeCode)
	resp, err := httpClient.Get(url)
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

	type Data struct {
		Date string
		Nav  string
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
		date, err := time.ParseInLocation("02-01-2006", data.Date, config.TimeZone())
		if err != nil {
			return nil, err
		}
		value, err := strconv.ParseFloat(data.Nav, 64)
		if err != nil {
			return nil, err
		}

		price := price.Price{Date: date, CommodityType: config.MutualFund, CommodityID: schemeCode, CommodityName: commodityName, Value: decimal.NewFromFloat(value)}
		prices = append(prices, &price)
	}
	return prices, nil
}
