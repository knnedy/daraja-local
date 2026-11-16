package c2b

import (
	"errors"
	"testing"

	"github.com/knnedy/daraja-local/internal/delivery"
)

func TestDecideValidation(t *testing.T) {
	ok := func(body string) delivery.Reply { return delivery.Reply{StatusCode: 200, Body: []byte(body)} }
	unreachable := errors.New("connection refused")

	tests := []struct {
		name         string
		reply        delivery.Reply
		postErr      error
		responseType string
		wantAccepted bool
		wantFallback bool
	}{
		{"developer accepts", ok(`{"ResultCode":"0","ResultDesc":"Accepted"}`), nil, "Cancelled", true, false},
		{"developer rejects", ok(`{"ResultCode":"C2B00011","ResultDesc":"Rejected"}`), nil, "Completed", false, false},
		{"numeric ResultCode is unparseable, Completed", ok(`{"ResultCode":0}`), nil, "Completed", true, true},
		{"numeric ResultCode is unparseable, Cancelled", ok(`{"ResultCode":0}`), nil, "Cancelled", false, true},
		{"missing ResultCode rejects", ok(`{}`), nil, "Completed", false, false},
		{"unreachable, Completed", delivery.Reply{}, unreachable, "Completed", true, true},
		{"unreachable, Cancelled", delivery.Reply{}, unreachable, "Cancelled", false, true},
		{"non-200, Completed", delivery.Reply{StatusCode: 500}, nil, "Completed", true, true},
		{"non-200, Cancelled", delivery.Reply{StatusCode: 500}, nil, "Cancelled", false, true},
		{"not JSON, Completed", ok(`<html>`), nil, "Completed", true, true},
		{"not JSON, Cancelled", ok(`<html>`), nil, "Cancelled", false, true},
		{"empty body, Cancelled", ok(``), nil, "Cancelled", false, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DecideValidation(tt.reply, tt.postErr, tt.responseType)
			if got.Accepted != tt.wantAccepted || got.Fallback != tt.wantFallback {
				t.Errorf("Accepted=%v Fallback=%v, want Accepted=%v Fallback=%v", got.Accepted, got.Fallback, tt.wantAccepted, tt.wantFallback)
			}
			if got.Fallback && got.ResultCode != "" {
				t.Errorf("fallback ResultCode = %q, want empty", got.ResultCode)
			}
		})
	}
}

func TestDecideValidationKeepsWhatTheDeveloperSaid(t *testing.T) {
	reply := delivery.Reply{StatusCode: 200, Body: []byte(`{"ResultCode":"C2B00012","ResultDesc":"Invalid Account Number"}`)}
	got := DecideValidation(reply, nil, "Completed")

	if got.ResultCode != "C2B00012" || got.ResultDesc != "Invalid Account Number" || got.HTTPStatus != 200 {
		t.Errorf("got %+v", got)
	}

	failed := DecideValidation(delivery.Reply{StatusCode: 502}, nil, "Completed")
	if failed.HTTPStatus != 502 || failed.Err != "" {
		t.Errorf("got %+v", failed)
	}
}
