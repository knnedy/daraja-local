package stk

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
)

var (
	phoneNumberPattern = regexp.MustCompile(`^254[17]\d{8}$`)
	// The sandbox accepts "1.5"; how it rounds in the callback is unverified.
	amountPattern = regexp.MustCompile(`^\d+(\.\d+)?$`)
)

// Validate runs all synchronous checks real Daraja performs before ever
// accepting an STK Push request, returns nil if the request is valid
func Validate(req Request, project repository.Project) *daraja.ValidationError {
	if _, err := time.Parse("20060102150405", req.Timestamp); err != nil {
		return invalid("Timestamp")
	}
	if err := validatePassword(req.BusinessShortCode, req.Password, req.Timestamp, project); err != nil {
		return err
	}
	if err := validatePhoneNumber(req.PhoneNumber); err != nil {
		return err
	}
	if err := validateAmount(req.Amount); err != nil {
		return err
	}
	if !daraja.IsCallbackURL(req.CallbackURL) {
		return invalid("CallBackURL")
	}
	if err := validateTransactionDesc(req.TransactionDesc); err != nil {
		return err
	}
	return nil
}

func invalid(field string) *daraja.ValidationError {
	return &daraja.ValidationError{HTTPStatus: http.StatusBadRequest, ErrorCode: "400.002.02", ErrorMessage: "Bad Request - Invalid " + field}
}

// WholeAmount is a validated Amount in whole shillings; decimals are dropped.
func WholeAmount(amount string) int64 {
	whole, _, _ := strings.Cut(amount, ".")
	n, _ := strconv.ParseInt(whole, 10, 64)
	return n
}

// validatePassword replicates real Daraja's Password check
func validatePassword(shortCode, password, timestamp string, project repository.Project) *daraja.ValidationError {
	decoded, err := base64.StdEncoding.DecodeString(password)
	if err != nil {
		return wrongCredentials()
	}

	if shortCode != project.ShortCode {
		return merchantDoesNotExist()
	}

	expected := project.ShortCode + project.Passkey + timestamp
	if string(decoded) != expected {
		return wrongCredentials()
	}

	if _, err := time.Parse("20060102150405", timestamp); err != nil {
		return wrongCredentials()
	}

	return nil
}

func wrongCredentials() *daraja.ValidationError {
	return &daraja.ValidationError{
		HTTPStatus:   http.StatusInternalServerError,
		ErrorCode:    "500.001.1001",
		ErrorMessage: "Wrong credentials",
	}
}

func merchantDoesNotExist() *daraja.ValidationError {
	return &daraja.ValidationError{
		HTTPStatus:   http.StatusInternalServerError,
		ErrorCode:    "500.001.1001",
		ErrorMessage: "Merchant does not exist",
	}
}

func validatePhoneNumber(phone string) *daraja.ValidationError {
	if !phoneNumberPattern.MatchString(phone) {
		return &daraja.ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid PhoneNumber",
		}
	}
	return nil
}

func validateAmount(amount string) *daraja.ValidationError {
	if !amountPattern.MatchString(amount) || WholeAmount(amount) <= 0 {
		return &daraja.ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid Amount",
		}
	}
	return nil
}

// validateTransactionDesc enforces the 182-character limit
func validateTransactionDesc(desc string) *daraja.ValidationError {
	if len(desc) > 182 {
		return &daraja.ValidationError{
			HTTPStatus:   http.StatusInternalServerError,
			ErrorCode:    "1025",
			ErrorMessage: fmt.Sprintf("Unable to lock subscriber, a transaction is already in process for the current subscriber. TransactionDesc exceeds 182 characters (%d)", len(desc)),
		}
	}
	return nil
}
