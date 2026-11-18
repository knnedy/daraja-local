// Package b2c owns B2C payouts: a business paying a customer's phone, from
// the synchronous acceptance to the result posted to the developer's ResultURL.
package b2c

import "github.com/knnedy/daraja-local/internal/daraja"

// APIVersion is the B2C path version a request came through. v3 requires
// OriginatorConversationID; v1 predates it.
type APIVersion string

const (
	V1 APIVersion = "v1"
	V3 APIVersion = "v3"
)

// Flexible accepts a JSON number or string.
type Flexible = daraja.Flexible

// PaymentRequest mirrors Daraja's B2C payment request body.
type PaymentRequest struct {
	OriginatorConversationID string   `json:"OriginatorConversationID"`
	InitiatorName            string   `json:"InitiatorName"`
	SecurityCredential       string   `json:"SecurityCredential"`
	CommandID                string   `json:"CommandID"`
	Amount                   Flexible `json:"Amount"`
	PartyA                   Flexible `json:"PartyA"`
	PartyB                   Flexible `json:"PartyB"`
	Remarks                  string   `json:"Remarks"`
	QueueTimeOutURL          string   `json:"QueueTimeOutURL"`
	ResultURL                string   `json:"ResultURL"`
	// Safaricom's v3 docs spell it "Occassion"; older samples use "Occasion".
	Occassion string `json:"Occassion"`
	Occasion  string `json:"Occasion"`
}

func (r PaymentRequest) occasion() string {
	if r.Occassion != "" {
		return r.Occassion
	}
	return r.Occasion
}

// AcceptResponse is Daraja's synchronous answer to an accepted payment request.
type AcceptResponse struct {
	ConversationID           string `json:"ConversationID"`
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}
