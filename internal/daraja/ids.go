package daraja

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"time"
)

// Formats below were captured from the Daraja sandbox on 2026-11-19.

var counter = func() int64 {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return n.Int64() + 100000
}()

// NewRequestID mimics Daraja's requestId and generated request IDs, such as
// "104b-4235-9328-5de584002ffd785653": a UUID-like prefix and a counter.
func NewRequestID() string {
	buf := make([]byte, 12)
	_, _ = rand.Read(buf)
	h := hex.EncodeToString(buf)
	counter++
	return fmt.Sprintf("%s-%s-%s-%s%d", h[0:4], h[4:8], h[8:12], h[12:24], counter)
}

// NewOriginatorConversationID is the ID Daraja assigns when the caller sends none.
func NewOriginatorConversationID() string {
	return NewRequestID()
}

// NewConversationID mimics "AG_20261119_01001003029wy0rrvtpn": the date in
// Kenya time and 20 lowercase letters and digits.
func NewConversationID() string {
	return "AG_" + KenyaTime(time.Now()).Format("20060102") + "_0100" + randomFrom("0123456789", 6) + randomFrom("0123456789abcdefghijklmnopqrstuvwxyz", 10)
}

// NewTransactionID mimics M-Pesa's transaction IDs, such as "RKTQDM7W6S":
// 10 uppercase letters and digits. C2B calls it TransID.
func NewTransactionID() string {
	return randomFrom("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 10)
}

// KenyaTime is in East Africa Time (UTC+3), the zone Daraja's IDs and timestamps use.
func KenyaTime(t time.Time) time.Time {
	return t.In(time.FixedZone("EAT", 3*60*60))
}

func randomFrom(charset string, n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	out := make([]byte, n)
	for i, b := range buf {
		out[i] = charset[int(b)%len(charset)]
	}
	return string(out)
}
