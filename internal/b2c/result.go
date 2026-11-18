package b2c

import (
	"strconv"
	"time"

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

// sandboxQueueTimeoutURL is the ReferenceData value in Safaricom's samples.
const sandboxQueueTimeoutURL = "https://internalsandbox.safaricom.co.ke/mpesa/b2cresults/v1/submit"

// money encodes cents as a JSON number with two decimals, like 10116.00.
type money int64

func (m money) MarshalJSON() ([]byte, error) {
	return []byte(strconv.FormatFloat(float64(m)/100, 'f', 2, 64)), nil
}

type keyValue struct {
	Key   string `json:"Key"`
	Value any    `json:"Value"`
}

type resultBody struct {
	Result result `json:"Result"`
}

type result struct {
	ResultType               int    `json:"ResultType"`
	ResultCode               int    `json:"ResultCode"`
	ResultDesc               string `json:"ResultDesc"`
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	TransactionID            string `json:"TransactionID"`
	ResultParameters         *struct {
		ResultParameter []keyValue `json:"ResultParameter"`
	} `json:"ResultParameters,omitempty"`
	ReferenceData struct {
		ReferenceItem keyValue `json:"ReferenceItem"`
	} `json:"ReferenceData"`
}

// balances are the accounts after a completed payment.
type balances struct {
	utility, working, chargesPaid int64
}

// buildResult builds the body posted to ResultURL, or to QueueTimeOutURL for a
// timeout. Only a completed payment carries ResultParameters.
func buildResult(payment repository.B2cPayment, outcome Outcome, after balances, completedAt time.Time) resultBody {
	code := resultCodes[outcome]
	r := result{
		ResultCode:               code.code,
		ResultDesc:               code.desc,
		OriginatorConversationID: payment.OriginatorConversationID,
		ConversationID:           payment.ConversationID,
		TransactionID:            payment.TransactionID,
	}
	if outcome == OutcomeQueueTimeout {
		r.ResultType = 1
	}
	r.ReferenceData.ReferenceItem = keyValue{Key: "QueueTimeoutURL", Value: sandboxQueueTimeoutURL}

	if outcome == OutcomeCompleted {
		r.ResultParameters = &struct {
			ResultParameter []keyValue `json:"ResultParameter"`
		}{[]keyValue{
			{"TransactionAmount", payment.Amount},
			{"TransactionReceipt", payment.TransactionID},
			{"B2CRecipientIsRegisteredCustomer", "Y"},
			{"B2CChargesPaidAccountAvailableFunds", money(after.chargesPaid)},
			{"ReceiverPartyPublicName", payment.PartyB + " - John Doe"},
			{"TransactionCompletedDateTime", completedAt.Format("02.01.2006 15:04:05")},
			{"B2CUtilityAccountAvailableFunds", money(after.utility)},
			{"B2CWorkingAccountAvailableFunds", money(after.working)},
		}}
	}
	return resultBody{Result: r}
}
