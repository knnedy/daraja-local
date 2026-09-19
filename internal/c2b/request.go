package c2b

// RegisterURLRequest mirrors real Daraja's C2B RegisterURL request body
// field-for-field.
type RegisterURLRequest struct {
	ShortCode       string `json:"ShortCode"`
	ResponseType    string `json:"ResponseType"`
	ConfirmationURL string `json:"ConfirmationURL"`
	ValidationURL   string `json:"ValidationURL"`
}

// SimulateRequest mirrors real Daraja's C2B Simulate request body
// field-for-field. Amount is a string, matching real Daraja's C2B
// Simulate wire format.
type SimulateRequest struct {
	ShortCode     string `json:"ShortCode"`
	CommandID     string `json:"CommandID"`
	Amount        string `json:"Amount"`
	Msisdn        string `json:"Msisdn"`
	BillRefNumber string `json:"BillRefNumber"`
}
