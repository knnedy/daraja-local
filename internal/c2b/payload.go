package c2b

import (
	"crypto/sha256"
	"encoding/hex"
	"time"
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
func BuildPayload(req SimulateRequest, shortCode string) Payload {
	transactionType := "Pay Bill"
	if req.CommandID == "CustomerBuyGoodsOnline" {
		transactionType = "Buy Goods"
	}
	return Payload{
		TransactionType:   transactionType,
		TransID:           GenerateTransID(),
		TransTime:         time.Now().Format("20060102150405"),
		TransAmount:       req.Amount,
		BusinessShortCode: shortCode,
		BillRefNumber:     req.BillRefNumber,
		MSISDN:            hashMSISDN(req.Msisdn),
	}
}

// Daraja v2 sends the customer's number as a lowercase hex SHA-256 hash.
func hashMSISDN(msisdn string) string {
	sum := sha256.Sum256([]byte(msisdn))
	return hex.EncodeToString(sum[:])
}
