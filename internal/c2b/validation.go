package c2b

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/knnedy/daraja-local/internal/repository"
)

// ValidateRegisterURL runs the synchronous checks real Daraja performs
// before accepting a RegisterURL call.
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

// validateNoMpesaInURL replicates a confirmed real Daraja quirk: any
// registered callback URL containing the literal substring "mpesa" is
// rejected outright.
func validateNoMpesaInURL(url, field string) *ValidationError {
	if strings.Contains(strings.ToLower(url), "mpesa") {
		return &ValidationError{
			HTTPStatus:   http.StatusBadRequest,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid " + field + " - URL has the word MPESA",
		}
	}
	return nil
}

// ValidateSimulate runs the synchronous checks before accepting a
// Simulate call. The registration check (settings.CallbackUrl == "")
// is a deliberate Daraja Local behavior, not a captured real Daraja
// error — flagged so it's never mistaken for verified wire fidelity.
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
	return nil
}
