package daraja

import (
	"crypto/rand"
	"fmt"
	"time"
)

// NewOriginatorConversationID mimics real Daraja's format "5118-111210482-1".
func NewOriginatorConversationID() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	a := int(buf[0])<<8 | int(buf[1])
	b := int(buf[2])<<16 | int(buf[3])<<8 | int(buf[0])
	return fmt.Sprintf("%d-%d-1", a, b)
}

// NewConversationID mimics real Daraja's format "AG_20230420_2010759fd5662ef6d054".
func NewConversationID() string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	return fmt.Sprintf("AG_%s_%x", time.Now().Format("20060102"), buf)
}

// NewTransactionID mimics M-Pesa's transaction IDs, such as "RKTQDM7W6S":
// 10 uppercase letters and digits. C2B calls it TransID.
func NewTransactionID() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	buf := make([]byte, 10)
	_, _ = rand.Read(buf)
	out := make([]byte, 10)
	for i, b := range buf {
		out[i] = charset[int(b)%len(charset)]
	}
	return string(out)
}
