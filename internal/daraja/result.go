package daraja

import (
	"bytes"
	"encoding/json"
	"net/url"
	"strconv"
	"strings"
)

// ResultBody is the envelope Daraja POSTs to a ResultURL or QueueTimeOutURL
// for every initiator API: B2C, Transaction Status, Reversal and more.
type ResultBody struct {
	Result Result `json:"Result"`
}

// Result's types vary by API because Safaricom's samples do: ResultCode is a
// number, a string ("R000002") or a numeric string, per API.
type Result struct {
	ResultType               any           `json:"ResultType"`
	ResultCode               any           `json:"ResultCode"`
	ResultDesc               string        `json:"ResultDesc"`
	OriginatorConversationID string        `json:"OriginatorConversationID"`
	ConversationID           string        `json:"ConversationID"`
	TransactionID            string        `json:"TransactionID"`
	ResultParameters         any           `json:"ResultParameters,omitempty"`
	ReferenceData            ReferenceData `json:"ReferenceData"`
}

// ResultParameter is a list, or a single KeyValue in some failure samples.
type ResultParameters struct {
	ResultParameter any `json:"ResultParameter"`
}

// ReferenceItem is one KeyValue, or a list of them for B2B.
type ReferenceData struct {
	ReferenceItem any `json:"ReferenceItem"`
}

type KeyValue struct {
	Key string `json:"Key"`
	// nil omits Value, as Daraja does for empty parameters.
	Value any `json:"Value,omitempty"`
}

// Money encodes cents as a JSON number with two decimals, like 10116.00.
type Money int64

func (m Money) MarshalJSON() ([]byte, error) {
	return []byte(strconv.FormatFloat(float64(m)/100, 'f', 2, 64)), nil
}

// Flexible accepts a JSON number or string: Safaricom documents amounts,
// shortcodes and phones as numeric, while many clients send strings.
type Flexible string

func (f *Flexible) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte("null")) {
		*f = ""
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		*f = Flexible(strings.TrimSpace(s))
		return nil
	}
	var n json.Number
	if err := json.Unmarshal(data, &n); err != nil {
		return err
	}
	*f = Flexible(n.String())
	return nil
}

// IsCallbackURL reports whether raw is an absolute http(s) URL.
func IsCallbackURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != ""
}

// Param is one ResultParameter entry.
func Param(key string, value any) KeyValue {
	return KeyValue{Key: key, Value: value}
}
