package cache

import (
	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/prediction"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func Clear() {
	service.ClearInterestCache()
	service.ClearPriceCache()
	accounting.ClearCache()
	prediction.ClearCache()
	transaction.ClearCache()
}
