package b2c

import (
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
)

// Outcome is how a B2C payment ends. All but OutcomeCompleted are failures.
type Outcome string

const (
	OutcomeCompleted            Outcome = "completed"
	OutcomeInsufficientBalance  Outcome = "insufficient_balance"
	OutcomeOverTransactionLimit Outcome = "over_transaction_limit"
	OutcomeDailyLimit           Outcome = "daily_limit"
	OutcomeInvalidInitiator     Outcome = "invalid_initiator"
	OutcomeUnregisteredCustomer Outcome = "unregistered_customer"
	OutcomeQueueTimeout         Outcome = "queue_timeout"
)

// ForcibleOutcomes can be set as the next payment's result from the dashboard.
var ForcibleOutcomes = []Outcome{
	OutcomeInsufficientBalance, OutcomeDailyLimit, OutcomeInvalidInitiator,
	OutcomeUnregisteredCustomer, OutcomeQueueTimeout,
}

// resultCodes are Safaricom's documented B2C ResultCodes and descriptions.
var resultCodes = map[Outcome]struct {
	code int
	desc string
}{
	OutcomeCompleted:            {0, "The service request is processed successfully."},
	OutcomeInsufficientBalance:  {1, "The balance is insufficient for the transaction."},
	OutcomeOverTransactionLimit: {3, "Declined due to limit rule: greater than the maximum transaction amount."},
	OutcomeDailyLimit:           {4, "Declined due to limit rule: would exceed daily transfer limit"},
	OutcomeInvalidInitiator:     {2001, "The initiator information is invalid."},
	OutcomeUnregisteredCustomer: {2040, "Credit Party customer type (Unregistered or Registered Customer) can't be supported by the service."},
	// Undocumented: Safaricom publishes no QueueTimeOutURL body. This is our guess.
	OutcomeQueueTimeout: {1037, "The request timed out while awaiting processing."},
}

// reasonTypes name each CommandID as Transaction Status reports it. Only
// BusinessPayment's wording appears in Safaricom's sample.
var reasonTypes = map[string]string{
	"BusinessPayment":  "Business Payment to Customer via API",
	"SalaryPayment":    "Salary Payment via API",
	"PromotionPayment": "Promotion Payment via API",
}

// sandboxQueueTimeoutURL is the ReferenceData value in Safaricom's samples.
const sandboxQueueTimeoutURL = "https://internalsandbox.safaricom.co.ke/mpesa/b2cresults/v1/submit"

// balances are the accounts after a completed payment.
type balances struct {
	utility, working, chargesPaid int64
}

// buildResult builds the body posted to ResultURL, or to QueueTimeOutURL for a
// timeout. Only a completed payment carries ResultParameters.
func buildResult(payment repository.B2cPayment, outcome Outcome, after balances, completedAt time.Time) daraja.ResultBody {
	code := resultCodes[outcome]
	r := daraja.Result{
		ResultCode:               code.code,
		ResultDesc:               code.desc,
		OriginatorConversationID: payment.OriginatorConversationID,
		ConversationID:           payment.ConversationID,
		TransactionID:            payment.TransactionID,
	}
	if outcome == OutcomeQueueTimeout {
		r.ResultType = 1
	}
	r.ReferenceData.ReferenceItem = daraja.Param("QueueTimeoutURL", sandboxQueueTimeoutURL)

	if outcome == OutcomeCompleted {
		r.ResultParameters = &daraja.ResultParameters{ResultParameter: []daraja.KeyValue{
			daraja.Param("TransactionAmount", payment.Amount),
			daraja.Param("TransactionReceipt", payment.TransactionID),
			daraja.Param("B2CRecipientIsRegisteredCustomer", "Y"),
			daraja.Param("B2CChargesPaidAccountAvailableFunds", daraja.Money(after.chargesPaid)),
			daraja.Param("ReceiverPartyPublicName", payment.PartyB+" - John Doe"),
			daraja.Param("TransactionCompletedDateTime", completedAt.Format("02.01.2006 15:04:05")),
			daraja.Param("B2CUtilityAccountAvailableFunds", daraja.Money(after.utility)),
			daraja.Param("B2CWorkingAccountAvailableFunds", daraja.Money(after.working)),
		}}
	}
	return daraja.ResultBody{Result: r}
}
