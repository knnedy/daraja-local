package c2b

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/knnedy/daraja-local/internal/repository"
)

var (
	blockedURLWords = []string{"mpesa", "m-pesa", "safaricom"}
	msisdnPattern   = regexp.MustCompile(`^254[17]\d{8}$`)
)

func ValidateRegisterURL(req RegisterURLRequest, project repository.Project) *ValidationError {
	if req.ShortCode != project.ShortCode {
		return &ValidationError{
			HTTPStatus:   http.StatusInternalServerError,
			ErrorCode:    "500.001.1001",
			ErrorMessage: "Merchant does not exist",
		}
	}
	if req.ResponseType != "Completed" && req.ResponseType != "Cancelled" {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid ResponseType",
		}
	}
	if err := validateNoMpesaInURL(req.ConfirmationURL, "ConfirmationURL"); err != nil {
		return err
	}
	if req.ValidationURL != "" {
		if err := validateNoMpesaInURL(req.ValidationURL, "ValidationURL"); err != nil {
			return err
		}
	}
	return nil
}

// Daraja rejects callback URLs containing these words, in any case.
func validateNoMpesaInURL(url, field string) *ValidationError {
	lower := strings.ToLower(url)
	for _, word := range blockedURLWords {
		if strings.Contains(lower, word) {
			return &ValidationError{
				HTTPStatus:   http.StatusBadRequest,
				ErrorCode:    "400.002.02",
				ErrorMessage: "Bad Request - Invalid " + field + " - URL has the word " + strings.ToUpper(word),
			}
		}
	}
	return nil
}

// ValidateSimulate checks a simulate call. Rejecting it before registerurl
// is emulator-only; real Daraja would silently have nowhere to deliver.
func ValidateSimulate(req SimulateRequest, project repository.Project, settings repository.ProjectSetting) *ValidationError {
	if req.ShortCode != project.ShortCode {
		return &ValidationError{
			HTTPStatus:   http.StatusInternalServerError,
			ErrorCode:    "500.001.1001",
			ErrorMessage: "Merchant does not exist",
		}
	}
	if settings.CallbackUrl == "" {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - No ConfirmationURL registered for this shortcode. Call registerurl first.",
		}
	}
	if req.CommandID != "CustomerPayBillOnline" && req.CommandID != "CustomerBuyGoodsOnline" {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid CommandID",
		}
	}
	value, err := strconv.ParseInt(req.Amount, 10, 64)
	if err != nil || value <= 0 {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid Amount",
		}
	}
	if !msisdnPattern.MatchString(req.Msisdn) {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid Msisdn",
		}
	}
	return nil
}
