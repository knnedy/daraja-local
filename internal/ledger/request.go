package ledger

import (
	"encoding/base64"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
)

// StatusRequest mirrors Daraja's Transaction Status query. Safaricom's own
// sample spells two keys with a space, so both spellings are read.
type StatusRequest struct {
	Initiator              string          `json:"Initiator"`
	SecurityCredential     string          `json:"SecurityCredential"`
	CommandID              string          `json:"CommandID"`
	CommandIDSpaced        string          `json:"Command ID"`
	TransactionID          string          `json:"TransactionID"`
	TransactionIDSpaced    string          `json:"Transaction ID"`
	OriginalConversationID string          `json:"OriginalConversationID"`
	PartyA                 daraja.Flexible `json:"PartyA"`
	IdentifierType         daraja.Flexible `json:"IdentifierType"`
	ResultURL              string          `json:"ResultURL"`
	QueueTimeOutURL        string          `json:"QueueTimeOutURL"`
	Remarks                string          `json:"Remarks"`
	Occasion               string          `json:"Occasion"`
}

func (r StatusRequest) commandID() string     { return firstOf(r.CommandID, r.CommandIDSpaced) }
func (r StatusRequest) transactionID() string { return firstOf(r.TransactionID, r.TransactionIDSpaced) }

// ReversalRequest mirrors Daraja's Reversal request, including Safaricom's
// "RecieverIdentifierType" spelling; the correct spelling is read too.
type ReversalRequest struct {
	Initiator                     string          `json:"Initiator"`
	SecurityCredential            string          `json:"SecurityCredential"`
	CommandID                     string          `json:"CommandID"`
	TransactionID                 string          `json:"TransactionID"`
	Amount                        daraja.Flexible `json:"Amount"`
	ReceiverParty                 daraja.Flexible `json:"ReceiverParty"`
	RecieverIdentifierType        daraja.Flexible `json:"RecieverIdentifierType"`
	ReceiverIdentifierTypeCorrect daraja.Flexible `json:"ReceiverIdentifierType"`
	ResultURL                     string          `json:"ResultURL"`
	QueueTimeOutURL               string          `json:"QueueTimeOutURL"`
	Remarks                       string          `json:"Remarks"`
	Occasion                      string          `json:"Occasion"`
}

func (r ReversalRequest) identifierType() string {
	return firstOf(string(r.RecieverIdentifierType), string(r.ReceiverIdentifierTypeCorrect))
}

// AcceptResponse is the synchronous answer both APIs give an accepted request.
type AcceptResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

func newAccept() AcceptResponse {
	return AcceptResponse{
		OriginatorConversationID: daraja.NewOriginatorConversationID(),
		ConversationID:           daraja.NewConversationID(),
		ResponseCode:             "0",
		ResponseDescription:      "Accept the service request successfully.",
	}
}

func firstOf(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// Safaricom documents 400.003.02 for Transaction Status and 400.002.02
// "Bad Request - Invalid XXXX" for Reversal; field wording is unverified.
func invalidStatus(field string) *daraja.ValidationError {
	return &daraja.ValidationError{HTTPStatus: http.StatusBadRequest, ErrorCode: "400.003.02", ErrorMessage: "Bad Request - Invalid " + field}
}

func invalidReversal(field string) *daraja.ValidationError {
	return &daraja.ValidationError{HTTPStatus: http.StatusBadRequest, ErrorCode: "400.002.02", ErrorMessage: "Bad Request - Invalid " + field}
}

var identifierTypes = map[string]bool{"1": true, "2": true, "4": true}

func validateStatus(req StatusRequest, project repository.Project) *daraja.ValidationError {
	switch {
	case req.Initiator == "":
		return invalidStatus("Initiator")
	case !isBase64(req.SecurityCredential):
		return invalidStatus("SecurityCredential")
	case req.commandID() != "TransactionStatusQuery":
		return invalidStatus("CommandID")
	case req.transactionID() == "" && req.OriginalConversationID == "":
		return invalidStatus("TransactionID")
	case string(req.PartyA) != project.ShortCode:
		return invalidStatus("PartyA")
	case !identifierTypes[string(req.IdentifierType)]:
		return invalidStatus("IdentifierType")
	case !daraja.IsCallbackURL(req.ResultURL):
		return invalidStatus("ResultURL")
	case !daraja.IsCallbackURL(req.QueueTimeOutURL):
		return invalidStatus("QueueTimeOutURL")
	case utf8.RuneCountInString(req.Remarks) > 100:
		return invalidStatus("Remarks")
	case utf8.RuneCountInString(req.Occasion) > 100:
		return invalidStatus("Occasion")
	}
	return nil
}

var amountPattern = regexp.MustCompile(`^\d+(\.0{1,2})?$`)

func validateReversal(req ReversalRequest, project repository.Project) *daraja.ValidationError {
	switch {
	case req.Initiator == "":
		return invalidReversal("Initiator")
	case !isBase64(req.SecurityCredential):
		return invalidReversal("SecurityCredential")
	case req.CommandID != "TransactionReversal":
		return invalidReversal("CommandID")
	case req.TransactionID == "":
		return invalidReversal("TransactionID")
	case wholeShillings(req.Amount) <= 0:
		return invalidReversal("Amount")
	case string(req.ReceiverParty) != project.ShortCode:
		return invalidReversal("ReceiverParty")
	case req.identifierType() != "11":
		return invalidReversal("RecieverIdentifierType")
	case !daraja.IsCallbackURL(req.ResultURL):
		return invalidReversal("ResultURL")
	case !daraja.IsCallbackURL(req.QueueTimeOutURL):
		return invalidReversal("QueueTimeOutURL")
	case utf8.RuneCountInString(req.Remarks) < 2 || utf8.RuneCountInString(req.Remarks) > 100:
		return invalidReversal("Remarks")
	}
	return nil
}

// wholeShillings parses "200", "200.00" or 200; anything else is 0.
func wholeShillings(amount daraja.Flexible) int64 {
	s := string(amount)
	if !amountPattern.MatchString(s) {
		return 0
	}
	whole, _, _ := strings.Cut(s, ".")
	n, _ := strconv.ParseInt(whole, 10, 64)
	return n
}

func isBase64(s string) bool {
	_, err := base64.StdEncoding.DecodeString(s)
	return s != "" && err == nil
}
