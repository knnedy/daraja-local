package c2b

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
)

type Payload struct {
	TransactionType   string `json:"TransactionType"`
	TransID           string `json:"TransID"`
	TransTime         string `json:"TransTime"`
	TransAmount       string `json:"TransAmount"`
	BusinessShortCode string `json:"BusinessShortCode"`
	BillRefNumber     string `json:"BillRefNumber"`
	InvoiceNumber     string `json:"InvoiceNumber"`
	OrgAccountBalance string `json:"OrgAccountBalance"`
	ThirdPartyTransID string `json:"ThirdPartyTransID"`
	MSISDN            string `json:"MSISDN"`
	FirstName         string `json:"FirstName"`
	MiddleName        string `json:"MiddleName"`
	LastName          string `json:"LastName"`
}

// BuildPayload builds the body POSTed to both ValidationURL and ConfirmationURL.
// Name, invoice and balance fields stay empty: there is no subscriber data.
func BuildPayload(req SimulateRequest, shortCode string, version APIVersion) Payload {
	transactionType := "Pay Bill"
	if req.CommandID == "CustomerBuyGoodsOnline" {
		transactionType = "Buy Goods"
	}
	return Payload{
		TransactionType:   transactionType,
		TransID:           daraja.NewTransactionID(),
		TransTime:         time.Now().Format("20060102150405"),
		TransAmount:       req.Amount,
		BusinessShortCode: shortCode,
		BillRefNumber:     req.BillRefNumber,
		MSISDN:            customerNumber(req.Msisdn, version),
	}
}

// customerNumber hides the customer's number as Daraja does: hashed for v1
// registrations, masked for v2, per Safaricom's C2B documentation.
func customerNumber(msisdn string, version APIVersion) string {
	if version == V1 {
		return hashMSISDN(msisdn)
	}
	return maskMSISDN(msisdn)
}

// maskMSISDN keeps the first four and last three digits. Most sources show
// "2547*****126"; Safaricom's own sample adds spaces. Unconfirmed either way.
func maskMSISDN(msisdn string) string {
	if len(msisdn) < 8 {
		return msisdn
	}
	return msisdn[:4] + strings.Repeat("*", len(msisdn)-7) + msisdn[len(msisdn)-3:]
}

func hashMSISDN(msisdn string) string {
	sum := sha256.Sum256([]byte(msisdn))
	return hex.EncodeToString(sum[:])
}
