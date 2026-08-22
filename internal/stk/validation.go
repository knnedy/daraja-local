package stk

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/knnedy/daraja-local/internal/repository"
)

// ValidationError carries the exact HTTP status and Daraja error
// envelope fields
type ValidationError struct {
	HTTPStatus   int
	ErrorCode    string
	ErrorMessage string
}

func (e *ValidationError) Error() string {
	return e.ErrorMessage
}

var phoneNumberPattern = regexp.MustCompile(`^254[17]\d{8}$`)

// Validate runs all synchronous checks real Daraja performs before ever
// accepting an STK Push request, returns nil if the request is valid
func Validate(req Request, project repository.Project) *ValidationError {
	if err := validatePassword(req, project); err != nil {
		return err
	}
	if err := validatePhoneNumber(req.PhoneNumber); err != nil {
		return err
	}
	if err := validateAmount(req.Amount); err != nil {
		return err
	}
	if err := validateTransactionDesc(req.TransactionDesc); err != nil {
		return err
	}
	return nil
}

// validatePassword replicates real Daraja's Password check
func validatePassword(req Request, project repository.Project) *ValidationError {
	decoded, err := base64.StdEncoding.DecodeString(req.Password)
	if err != nil {
		return wrongCredentials()
	}

	if req.BusinessShortCode != project.ShortCode {
		return merchantDoesNotExist()
	}

	expected := project.ShortCode + project.Passkey + req.Timestamp
	if string(decoded) != expected {
		return wrongCredentials()
	}

	if _, err := time.Parse("20060102150405", req.Timestamp); err != nil {
		return wrongCredentials()
	}

	return nil
}

func wrongCredentials() *ValidationError {
	return &ValidationError{
		HTTPStatus:   http.StatusInternalServerError,
		ErrorCode:    "500.001.1001",
		ErrorMessage: "[MerchantValidate] - Wrong credentials",
	}
}

func merchantDoesNotExist() *ValidationError {
	return &ValidationError{
		HTTPStatus:   http.StatusInternalServerError,
		ErrorCode:    "500.001.1001",
		ErrorMessage: "Merchant does not exist",
	}
}

func validatePhoneNumber(phone string) *ValidationError {
	if !phoneNumberPattern.MatchString(phone) {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid PhoneNumber",
		}
	}
	return nil
}

func validateAmount(amount string) *ValidationError {
	value, err := strconv.ParseInt(amount, 10, 64)
	if err != nil || value <= 0 {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid Amount",
		}
	}
	return nil
}

// validateTransactionDesc enforces the 182-character limit
func validateTransactionDesc(desc string) *ValidationError {
	if len(desc) > 182 {
		return &ValidationError{
			HTTPStatus:   http.StatusInternalServerError,
			ErrorCode:    "1025",
			ErrorMessage: fmt.Sprintf("Unable to lock subscriber, a transaction is already in process for the current subscriber. TransactionDesc exceeds 182 characters (%d)", len(desc)),
		}
	}
	return nil
}
