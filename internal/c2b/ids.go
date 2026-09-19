package c2b

import (
	"crypto/rand"
	"fmt"
	"time"
)

// GenerateOriginatorConversationID mimics real Daraja's format
// "5118-111210482-1".
func GenerateOriginatorConversationID() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	a := int(buf[0])<<8 | int(buf[1])
	b := int(buf[2])<<16 | int(buf[3])<<8 | int(buf[0])
	return fmt.Sprintf("%d-%d-1", a, b)
}

// GenerateConversationID mimics real Daraja's format
// "AG_20230420_2010759fd5662ef6d054".
func GenerateConversationID() string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	return fmt.Sprintf("AG_%s_%x", time.Now().Format("20060102"), buf)
}

// GenerateTransID mimics real Daraja's C2B transaction ID format
// "RKTQDM7W6S" — 10 uppercase alphanumeric characters
func GenerateTransID() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	buf := make([]byte, 10)
	_, _ = rand.Read(buf)
	out := make([]byte, 10)
	for i, b := range buf {
		out[i] = charset[int(b)%len(charset)]
	}
	return string(out)
}
