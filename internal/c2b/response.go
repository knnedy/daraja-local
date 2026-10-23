package c2b

// AcceptResponse is the synchronous reply to registerurl and simulate.
// The OriginatorConversationID tag is misspelled on purpose: Safaricom's
// wire field is "OriginatorCoversationID". Do not fix it.
type AcceptResponse struct {
	OriginatorConversationID string `json:"OriginatorCoversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

func NewAcceptResponse(description string) AcceptResponse {
	return AcceptResponse{
		OriginatorConversationID: GenerateOriginatorConversationID(),
		ConversationID:           GenerateConversationID(),
		ResponseCode:             "0",
		ResponseDescription:      description,
	}
}
