package stk

import (
	"crypto/rand"
	"fmt"
	"time"
)

// GenerateMerchantRequestID mimics real Daraja's format
// "29115-34620561-1" — two digit groups and a trailing counter segment,
// same style as response.GenerateRequestID but kept separate since this
// is STK-specific
func GenerateMerchantRequestID() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	a := int(buf[0])<<8 | int(buf[1])
	b := int(buf[2])<<8 | int(buf[3])
	return fmt.Sprintf("%d-%d-1", a, b)
}

// GenerateCheckoutRequestID mimics real Daraja's format
// "ws_CO_191220191020363925" — "ws_CO_" prefix, a timestamp component,
// and trailing random digits.
func GenerateCheckoutRequestID() string {
	buf := make([]byte, 2)
	_, _ = rand.Read(buf)
	suffix := (int(buf[0])<<8 | int(buf[1])) % 10000
	return fmt.Sprintf("ws_CO_%s%04d", time.Now().Format("021504052006"), suffix)
}
