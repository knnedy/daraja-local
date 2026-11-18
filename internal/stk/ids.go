package stk

import (
	"crypto/rand"
	"fmt"
	"strings"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
)

// GenerateMerchantRequestID has the same shape as Daraja's requestId.
func GenerateMerchantRequestID() string {
	return daraja.NewRequestID()
}

// GenerateCheckoutRequestID mimics "ws_CO_191120260104173708374149", captured
// from the sandbox: Kenya date and time, one digit, and the phone without 254.
func GenerateCheckoutRequestID(phone string) string {
	buf := make([]byte, 1)
	_, _ = rand.Read(buf)
	return fmt.Sprintf("ws_CO_%s%d%s", daraja.KenyaTime(time.Now()).Format("02012006150405"), int(buf[0])%10, strings.TrimPrefix(phone, "254"))
}
