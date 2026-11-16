// Package stk holds daraja-local's STK Push simulation. Sessions are in-memory and are
// lost on restart but request_log captures the durable history
package stk

import "time"

// Session tracks one STK Push attempt from acceptance to resolution
type Session struct {
	MerchantRequestID string
	CheckoutRequestID string
	ProjectID         int64

	BusinessShortCode string
	PartyA            string
	PartyB            string
	PhoneNumber       string
	Amount            int64
	AccountReference  string
	TransactionDesc   string
	CallbackURL       string

	CreatedAt time.Time
	TimeoutAt time.Time

	Resolved   bool
	ResultCode int
	ResultDesc string
}

// AcceptResponse is Daraja's immediate reply to an accepted STK Push,
// sent before any outcome exists.
type AcceptResponse struct {
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CustomerMessage     string `json:"CustomerMessage"`
}

func (s Session) AcceptResponse() AcceptResponse {
	return AcceptResponse{
		MerchantRequestID:   s.MerchantRequestID,
		CheckoutRequestID:   s.CheckoutRequestID,
		ResponseCode:        "0",
		ResponseDescription: "Success. Request accepted for processing",
		CustomerMessage:     "Success. Request accepted for processing",
	}
}
