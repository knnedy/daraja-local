package c2b

import "time"

// Payload mirrors real Daraja's C2B validation/confirmation request
// body field-for-field — same shape is POSTed to both ValidationURL
// and ConfirmationURL.
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

// BuildPayload constructs the payload sent to a project's registered
// C2B URLs for a simulated payment.
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
		MSISDN:            req.Msisdn,
	}
}
