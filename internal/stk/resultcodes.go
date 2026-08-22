package stk

const (
	ResultCodeSuccess             = 0
	ResultCodeInsufficientBalance = 1
	ResultCodeWrongPIN            = 2001
	ResultCodeCancelledByUser     = 1032
	ResultCodeTimeout             = 1037
)

var resultDescriptions = map[int]string{
	ResultCodeSuccess:             "The service request is processed successfully.",
	ResultCodeInsufficientBalance: "The balance is insufficient for the transaction.",
	ResultCodeWrongPIN:            "The initiator information is invalid.",
	ResultCodeCancelledByUser:     "Request cancelled by user",
	ResultCodeTimeout:             "DS timeout user cannot be reached",
}

// Outcome is what the Virtual Phone UI sends when a developer resolves
// a pending session which is a small, deliberately UI-facing vocabulary,
// separate from the raw numeric ResultCode a real callback carries.
type Outcome string

const (
	OutcomeApproved            Outcome = "approved"
	OutcomeWrongPIN            Outcome = "wrong_pin"
	OutcomeCancelled           Outcome = "cancelled"
	OutcomeInsufficientBalance Outcome = "insufficient_balance"
	OutcomeTimeout             Outcome = "timeout"
)

// Result returns the numeric ResultCode and its description for this
// outcome, and false if the outcome is unrecognized.
func (o Outcome) Result() (code int, description string, ok bool) {
	switch o {
	case OutcomeApproved:
		return ResultCodeSuccess, resultDescriptions[ResultCodeSuccess], true
	case OutcomeWrongPIN:
		return ResultCodeWrongPIN, resultDescriptions[ResultCodeWrongPIN], true
	case OutcomeCancelled:
		return ResultCodeCancelledByUser, resultDescriptions[ResultCodeCancelledByUser], true
	case OutcomeInsufficientBalance:
		return ResultCodeInsufficientBalance, resultDescriptions[ResultCodeInsufficientBalance], true
	case OutcomeTimeout:
		return ResultCodeTimeout, resultDescriptions[ResultCodeTimeout], true
	default:
		return 0, "", false
	}
}
