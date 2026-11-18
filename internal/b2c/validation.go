package b2c

import (
	"encoding/base64"
	"net/http"
	"regexp"
	"strconv"
	"unicode/utf8"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
)

var (
	commandIDs    = map[string]bool{"SalaryPayment": true, "BusinessPayment": true, "PromotionPayment": true}
	msisdnPattern = regexp.MustCompile(`^254[17]\d{8}$`)
)

// invalid follows Daraja's "Bad Request - Invalid XXXX" template. The exact
// wording per field is unconfirmed beyond SecurityCredential.
func invalid(field string) *daraja.ValidationError {
	return &daraja.ValidationError{
		HTTPStatus:   http.StatusBadRequest,
		ErrorCode:    "400.002.02",
		ErrorMessage: "Bad Request - Invalid " + field,
	}
}

// validate is the synchronous check. Problems Daraja only finds while
// processing, such as a wrong initiator password, become results instead.
func validate(req PaymentRequest, version APIVersion, project repository.Project) *daraja.ValidationError {
	if version == V3 && req.OriginatorConversationID == "" {
		return invalid("OriginatorConversationID")
	}
	if req.InitiatorName == "" {
		return invalid("InitiatorName")
	}
	if _, err := base64.StdEncoding.DecodeString(req.SecurityCredential); err != nil || req.SecurityCredential == "" {
		return invalid("SecurityCredential")
	}
	if !commandIDs[req.CommandID] {
		return invalid("CommandID")
	}
	if amount, err := strconv.ParseInt(string(req.Amount), 10, 64); err != nil || amount <= 0 {
		return invalid("Amount")
	}
	if string(req.PartyA) != project.ShortCode {
		return invalid("PartyA")
	}
	if !msisdnPattern.MatchString(string(req.PartyB)) {
		return invalid("PartyB")
	}
	if n := utf8.RuneCountInString(req.Remarks); n < 2 || n > 100 {
		return invalid("Remarks")
	}
	if utf8.RuneCountInString(req.occasion()) > 100 {
		return invalid("Occassion")
	}
	if !daraja.IsCallbackURL(req.QueueTimeOutURL) {
		return invalid("QueueTimeOutURL")
	}
	if !daraja.IsCallbackURL(req.ResultURL) {
		return invalid("ResultURL")
	}
	return nil
}
