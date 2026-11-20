// Package b2b owns B2B payments: one business paying another's PayBill or
// Till from its working account, with the result posted to a ResultURL.
package b2b

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/ledger"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

// PaymentRequest mirrors Daraja's B2B payment request. Safaricom's samples
// spell "Command ID" with a space and "RecieverIdentifierType" misspelled;
// both are read, along with the usual spellings.
type PaymentRequest struct {
	Initiator                     string          `json:"Initiator"`
	SecurityCredential            string          `json:"SecurityCredential"`
	CommandID                     string          `json:"CommandID"`
	CommandIDSpaced               string          `json:"Command ID"`
	SenderIdentifierType          daraja.Flexible `json:"SenderIdentifierType"`
	RecieverIdentifierType        daraja.Flexible `json:"RecieverIdentifierType"`
	ReceiverIdentifierTypeCorrect daraja.Flexible `json:"ReceiverIdentifierType"`
	Amount                        daraja.Flexible `json:"Amount"`
	PartyA                        daraja.Flexible `json:"PartyA"`
	PartyB                        daraja.Flexible `json:"PartyB"`
	AccountReference              string          `json:"AccountReference"`
	Requester                     daraja.Flexible `json:"Requester"`
	Remarks                       string          `json:"Remarks"`
	QueueTimeOutURL               string          `json:"QueueTimeOutURL"`
	ResultURL                     string          `json:"ResultURL"`
	Occassion                     string          `json:"Occassion"`
}

func (r PaymentRequest) commandID() string {
	if r.CommandID != "" {
		return r.CommandID
	}
	return r.CommandIDSpaced
}

func (r PaymentRequest) receiverType() string {
	if r.RecieverIdentifierType != "" {
		return string(r.RecieverIdentifierType)
	}
	return string(r.ReceiverIdentifierTypeCorrect)
}

// AcceptResponse is Daraja's synchronous answer to an accepted request.
type AcceptResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// Outcomes of a B2B payment, as logged.
const (
	OutcomeCompleted           = "completed"
	OutcomeInsufficientBalance = "insufficient_balance"
	OutcomeInvalidInitiator    = "invalid_initiator"
)

var (
	commandIDs     = map[string]string{"BusinessPayBill": "Business Pay Bill", "BusinessBuyGoods": "Business Buy Goods"}
	amountPattern  = regexp.MustCompile(`^[1-9]\d*(\.0{1,2})?$`)
	shortCode      = regexp.MustCompile(`^\d{5,9}$`)
	requesterPhone = regexp.MustCompile(`^254[17]\d{8}$`)
)

// Verifier checks a SecurityCredential against a project's Initiator.
type Verifier interface {
	Verify(ctx context.Context, projectID int64, name, securityCredential string) (bool, error)
}

// Recorder keeps a completed transaction for Transaction Status.
type Recorder interface {
	Record(ctx context.Context, e ledger.Entry) error
}

type Payments struct {
	db        *repository.DB
	log       *requestlog.Log
	deliverer *delivery.Deliverer
	verifier  Verifier
	ledger    Recorder
	// delay stands in for the seconds Safaricom takes before posting a result.
	delay    time.Duration
	inFlight sync.WaitGroup
}

func New(db *repository.DB, log *requestlog.Log, deliverer *delivery.Deliverer, verifier Verifier, recorder Recorder, delay time.Duration) *Payments {
	return &Payments{db: db, log: log, deliverer: deliverer, verifier: verifier, ledger: recorder, delay: delay}
}

func invalid(field string) *daraja.ValidationError {
	return &daraja.ValidationError{HTTPStatus: http.StatusBadRequest, ErrorCode: "400.002.02", ErrorMessage: "Bad Request - Invalid " + field}
}

func validate(req PaymentRequest, project repository.Project) *daraja.ValidationError {
	_, b64Err := base64.StdEncoding.DecodeString(req.SecurityCredential)
	switch {
	case req.Initiator == "":
		return invalid("Initiator")
	case req.SecurityCredential == "" || b64Err != nil:
		return invalid("SecurityCredential")
	case commandIDs[req.commandID()] == "":
		return invalid("CommandID")
	case string(req.SenderIdentifierType) != "4":
		return invalid("SenderIdentifierType")
	case req.receiverType() != "4":
		return invalid("RecieverIdentifierType")
	case !amountPattern.MatchString(string(req.Amount)):
		return invalid("Amount")
	case string(req.PartyA) != project.ShortCode:
		return invalid("PartyA")
	case !shortCode.MatchString(string(req.PartyB)) || string(req.PartyB) == project.ShortCode:
		return invalid("PartyB")
	case utf8.RuneCountInString(req.AccountReference) > 13:
		return invalid("AccountReference")
	case req.Requester != "" && !requesterPhone.MatchString(string(req.Requester)):
		return invalid("Requester")
	case utf8.RuneCountInString(req.Remarks) > 100 || utf8.RuneCountInString(req.Occassion) > 100:
		return invalid("Remarks")
	case !daraja.IsCallbackURL(req.ResultURL):
		return invalid("ResultURL")
	case !daraja.IsCallbackURL(req.QueueTimeOutURL):
		return invalid("QueueTimeOutURL")
	}
	return nil
}

// Request accepts a B2B payment and, once processed, moves the money out of
// the project's working account and posts the result to the ResultURL.
func (p *Payments) Request(ctx context.Context, project repository.Project, req PaymentRequest) (AcceptResponse, *daraja.ValidationError) {
	if vErr := validate(req, project); vErr != nil {
		p.log.Rejected(ctx, project.ID, requestlog.B2BPayment, "", req, vErr)
		return AcceptResponse{}, vErr
	}
	accept := AcceptResponse{
		OriginatorConversationID: daraja.NewOriginatorConversationID(),
		ConversationID:           daraja.NewConversationID(),
		ResponseCode:             "0",
		ResponseDescription:      "Accept the service request successfully.",
	}
	p.log.Accepted(ctx, project.ID, requestlog.B2BPayment, accept.ConversationID, req, accept)

	initiated := time.Now()
	p.inFlight.Add(1)
	go func() {
		defer p.inFlight.Done()
		time.Sleep(p.delay)
		ctx := context.Background()
		outcome, body := p.process(ctx, project, req, accept, initiated)
		result := p.deliverer.Deliver(ctx, req.ResultURL, body)
		p.log.Delivery(ctx, project.ID, requestlog.B2BPayment, accept.ConversationID, outcome, body, result)
	}()
	return accept, nil
}

// Wait blocks until every payment in flight has posted its result.
func (p *Payments) Wait() {
	p.inFlight.Wait()
}

func (p *Payments) process(ctx context.Context, project repository.Project, req PaymentRequest, accept AcceptResponse, initiated time.Time) (string, daraja.ResultBody) {
	now := time.Now()
	r := daraja.Result{
		ResultType:               0,
		OriginatorConversationID: accept.OriginatorConversationID,
		ConversationID:           accept.ConversationID,
		TransactionID:            daraja.NewTransactionID(),
	}
	r.ReferenceData.ReferenceItem = referenceItems(req)
	fail := func(outcome string, code int, desc string) (string, daraja.ResultBody) {
		r.ResultCode, r.ResultDesc = code, desc
		// Safaricom's failure sample sends a single parameter, not a list.
		r.ResultParameters = &daraja.ResultParameters{ResultParameter: daraja.Param("BOCompletedTime", mustInt(now.Format("20060102150405")))}
		return outcome, daraja.ResultBody{Result: r}
	}

	if ok, err := p.verifier.Verify(ctx, project.ID, req.Initiator, req.SecurityCredential); err != nil || !ok {
		return fail(OutcomeInvalidInitiator, 2001, "The initiator information is invalid.")
	}

	whole, _, _ := strings.Cut(string(req.Amount), ".")
	amount, _ := strconv.ParseInt(whole, 10, 64)
	if err := p.db.Queries().EnsureAccount(ctx, project.ID); err != nil {
		return fail(OutcomeInsufficientBalance, 1, "The balance is insufficient for the transaction.")
	}
	account, err := p.db.Queries().DebitWorkingAccount(ctx, repository.DebitWorkingAccountParams{Cents: amount * 100, ProjectID: project.ID})
	if err != nil {
		return fail(OutcomeInsufficientBalance, 1, "The balance is insufficient for the transaction.")
	}

	receipt := daraja.NewTransactionID()
	_ = p.ledger.Record(ctx, ledger.Entry{
		ProjectID:                project.ID,
		Receipt:                  receipt,
		Kind:                     ledger.KindB2B,
		OriginatorConversationID: accept.OriginatorConversationID,
		ConversationID:           accept.ConversationID,
		Amount:                   amount,
		DebitParty:               project.ShortCode,
		CreditParty:              string(req.PartyB),
		ReasonType:               commandIDs[req.commandID()],
		InitiatedAt:              initiated,
		FinalisedAt:              now,
	})

	balance := braced(account.WorkingCents)
	working := fmt.Sprintf("%.2f", float64(account.WorkingCents)/100)
	r.TransactionID = receipt
	r.ResultCode, r.ResultDesc = 0, "The service request is processed successfully."
	r.ResultParameters = &daraja.ResultParameters{ResultParameter: []daraja.KeyValue{
		daraja.Param("DebitAccountBalance", balance),
		daraja.Param("Amount", fmt.Sprintf("%d.00", amount)),
		daraja.Param("DebitPartyAffectedAccountBalance", "Working Account|KES|"+working+"|"+working+"|0.00|0.00"),
		daraja.Param("TransCompletedTime", now.Format("20060102150405")),
		daraja.Param("DebitPartyCharges", ""),
		daraja.Param("ReceiverPartyPublicName", string(req.PartyB)+" - Test Business"),
		daraja.Param("Currency", "KES"),
		daraja.Param("InitiatorAccountCurrentBalance", balance),
	}}
	return OutcomeCompleted, daraja.ResultBody{Result: r}
}

// sandboxQueueTimeoutURL is what the sandbox reports, whatever QueueTimeOutURL was sent.
const sandboxQueueTimeoutURL = "https://internalsandbox.safaricom.co.ke/mpesa/b2bresults/v1/submit"

// referenceItems mirrors the sandbox: an all-digit reference is sent as a number.
func referenceItems(req PaymentRequest) []daraja.KeyValue {
	var ref any = req.AccountReference
	if n, err := strconv.ParseInt(req.AccountReference, 10, 64); err == nil && strconv.FormatInt(n, 10) == req.AccountReference {
		ref = n
	}
	return []daraja.KeyValue{
		daraja.Param("BillReferenceNumber", ref),
		daraja.Param("QueueTimeoutURL", sandboxQueueTimeoutURL),
		daraja.Param("Occassion", optional(req.Occassion)),
	}
}

// braced is Daraja's B2B balance format; MinimumAmount is in cents.
func braced(cents int64) string {
	return fmt.Sprintf("{Amount={CurrencyCode=KES, MinimumAmount=%d, BasicAmount=%.2f}}", cents, float64(cents)/100)
}

func mustInt(s string) int64 {
	n, _ := strconv.ParseInt(s, 10, 64)
	return n
}

// optional omits an empty Value, as Daraja does.
func optional(s string) any {
	if s == "" {
		return nil
	}
	return s
}
