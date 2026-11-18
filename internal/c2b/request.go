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

// APIVersion is the C2B path version a Registration was made through. It
// decides how the customer's number appears in Validation and Confirmation.
type APIVersion string

const (
	V1 APIVersion = "v1"
	V2 APIVersion = "v2"
)

// Registration is a project's current ConfirmationURL, optional ValidationURL
// and ResponseType, as last set through registerurl.
type Registration struct {
	ConfirmationURL string
	ValidationURL   string
	ResponseType    string
	Version         APIVersion
}
