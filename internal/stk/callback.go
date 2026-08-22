package stk

// CallbackBody matches real Daraja's confirmed callback envelope shape exactly
type CallbackBody struct {
	Body struct {
		STKCallback struct {
			MerchantRequestID string        `json:"MerchantRequestID"`
			CheckoutRequestID string        `json:"CheckoutRequestID"`
			ResultCode        int           `json:"ResultCode"`
			ResultDesc        string        `json:"ResultDesc"`
			CallbackMetadata  *CallbackMeta `json:"CallbackMetadata,omitempty"`
		} `json:"stkCallback"`
	} `json:"Body"`
}

// CallbackMeta is only present on a successful (ResultCode 0) callback
type CallbackMeta struct {
	Item []CallbackMetaItem `json:"Item"`
}

type CallbackMetaItem struct {
	Name  string `json:"Name"`
	Value any    `json:"Value"`
}

// BuildCallback constructs the callback body for a resolved session,
// including CallbackMetadata only on success, matching real Daraja,
// which omits it entirely for any non-zero ResultCode.
func BuildCallback(session Session, mpesaReceiptNumber string, transactionDate int64) CallbackBody {
	var body CallbackBody
	body.Body.STKCallback.MerchantRequestID = session.MerchantRequestID
	body.Body.STKCallback.CheckoutRequestID = session.CheckoutRequestID
	body.Body.STKCallback.ResultCode = session.ResultCode
	body.Body.STKCallback.ResultDesc = session.ResultDesc

	if session.ResultCode == ResultCodeSuccess {
		body.Body.STKCallback.CallbackMetadata = &CallbackMeta{
			Item: []CallbackMetaItem{
				{Name: "Amount", Value: session.Amount},
				{Name: "MpesaReceiptNumber", Value: mpesaReceiptNumber},
				{Name: "TransactionDate", Value: transactionDate},
				{Name: "PhoneNumber", Value: session.PhoneNumber},
			},
		}
	}

	return body
}
