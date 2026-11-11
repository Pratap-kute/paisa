package stock

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestYahoo_ValidResponse(t *testing.T) {
	validJSON := `{
		"chart": {
			"result": [
				{
					"meta": {
						"currency": "USD",
						"symbol": "AAPL",
						"exchangeTimezoneName": "America/New_York"
					},
					"timestamp": [1704067200],
					"indicators": {
						"quote": [
							{
								"close": [185.5]
							}
						]
					}
				}
			],
			"error": null
		}
	}`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(validJSON))
	}))
	defer server.Close()

	origBase := YahooBaseURL
	YahooBaseURL = server.URL
	t.Cleanup(func() { YahooBaseURL = origBase })

	resp, err := getTicker("AAPL")
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Len(t, resp.Chart.Result, 1)
	assert.Equal(t, "USD", resp.Chart.Result[0].Meta.Currency)
	require.NotNil(t, resp.Chart.Result[0].Indicators.Quote[0].Close[0])
	assert.Equal(t, 185.5, *resp.Chart.Result[0].Indicators.Quote[0].Close[0])
}

func TestYahoo_ServerError500(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("Internal Server Error"))
	}))
	defer server.Close()

	origBase := YahooBaseURL
	YahooBaseURL = server.URL
	t.Cleanup(func() { YahooBaseURL = origBase })

	resp, err := getTicker("FAIL")
	require.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "unexpected status code 500")
}

func TestYahoo_MalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<html><body>Error Page</body></html>"))
	}))
	defer server.Close()

	origBase := YahooBaseURL
	YahooBaseURL = server.URL
	t.Cleanup(func() { YahooBaseURL = origBase })

	resp, err := getTicker("BAD_JSON")
	require.Error(t, err)
	assert.Nil(t, resp)
}

func TestYahoo_OversizedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		// Send a payload larger than 10MB
		hugeData := bytes.Repeat([]byte("A"), 11*1024*1024)
		_, _ = w.Write(hugeData)
	}))
	defer server.Close()

	origBase := YahooBaseURL
	YahooBaseURL = server.URL
	t.Cleanup(func() { YahooBaseURL = origBase })

	resp, err := getTicker("HUGE")
	require.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "response exceeded maximum allowed size")
}

func TestYahoo_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Intentionally block longer than the client timeout
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	origBase := YahooBaseURL
	origClient := httpClient

	YahooBaseURL = server.URL
	httpClient = &http.Client{Timeout: 50 * time.Millisecond}

	t.Cleanup(func() {
		YahooBaseURL = origBase
		httpClient = origClient
	})

	resp, err := getTicker("SLOW")
	require.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "Client.Timeout exceeded")
}

func TestYahoo_NullClosesAreSkipped(t *testing.T) {
	body := `{"chart":{"result":[{"meta":{"currency":"INR"},"timestamp":[1704067200,1704153600,1704240000],"indicators":{"quote":[{"close":[100.5,null,102.5]}]}}]}}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(body))
	}))
	defer server.Close()

	origBase := YahooBaseURL
	YahooBaseURL = server.URL
	t.Cleanup(func() { YahooBaseURL = origBase })

	prices, err := GetHistory("TEST.NS", "TEST")
	require.NoError(t, err)
	require.Len(t, prices, 2)
	for _, p := range prices {
		assert.True(t, p.Value.IsPositive(), "a null close must not be stored as a zero price")
	}
}

func TestYahoo_NegativeClosesAreKept(t *testing.T) {
	body := `{"chart":{"result":[{"meta":{"currency":"INR"},"timestamp":[1704067200],"indicators":{"quote":[{"close":[-37.6]}]}}]}}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(body))
	}))
	defer server.Close()

	origBase := YahooBaseURL
	YahooBaseURL = server.URL
	t.Cleanup(func() { YahooBaseURL = origBase })

	prices, err := GetHistory("CL=F", "OIL")
	require.NoError(t, err)
	require.Len(t, prices, 1)
	assert.True(t, prices[0].Value.IsNegative())
}
