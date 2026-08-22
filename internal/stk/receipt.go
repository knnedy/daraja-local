package stk

import (
	"crypto/rand"
)

// GenerateMpesaReceiptNumber mimics real Daraja's Transaction code
func GenerateMpesaReceiptNumber() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	buf := make([]byte, 10)
	_, _ = rand.Read(buf)
	out := make([]byte, 10)
	for i, b := range buf {
		out[i] = chars[int(b)%len(chars)]
	}
	return string(out)
}
