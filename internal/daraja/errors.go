// Package daraja holds mechanics shared across every Daraja-mirroring
// endpoint family (STK, C2B and more)
package daraja

// ValidationError carries the exact HTTP status and Daraja error
// envelope fields, shared by every endpoint's synchronous validation.
type ValidationError struct {
	HTTPStatus   int
	ErrorCode    string
	ErrorMessage string
}

func (e *ValidationError) Error() string {
	return e.ErrorMessage
}
