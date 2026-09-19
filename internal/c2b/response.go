package c2b

// AcceptResponse is the synchronous envelope returned by both
// registerurl and simulate on success.
// OriginatorConversationID's JSON tag is deliberately misspelled to
// match real Daraja's actual wire response exactly — Safaricom's own
// API ships this field as "OriginatorCoversationID" (missing the "n").
// Confirmed, long-standing Daraja quirk — do not "fix" the tag.
type AcceptResponse struct {
	OriginatorConversationID string `json:"OriginatorCoversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseDescription      string `json:"ResponseDescription"`
}

func NewAcceptResponse(description string) AcceptResponse {
	return AcceptResponse{
		OriginatorConversationID: GenerateOriginatorConversationID(),
		ConversationID:           GenerateConversationID(),
		ResponseDescription:      description,
	}
}
