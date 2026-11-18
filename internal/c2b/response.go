package c2b

import "github.com/knnedy/daraja-local/internal/daraja"

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
		OriginatorConversationID: daraja.NewOriginatorConversationID(),
		ConversationID:           daraja.NewConversationID(),
		ResponseCode:             "0",
		ResponseDescription:      description,
	}
}
