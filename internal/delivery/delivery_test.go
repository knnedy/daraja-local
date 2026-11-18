package delivery

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// scriptedPoster answers each Post from a script, repeating the last step.
type scriptedPoster struct {
	steps []step
	calls int
	sent  [][]byte
}

type step struct {
	status int
	err    error
}

func (p *scriptedPoster) Post(_ context.Context, _ string, body []byte) (Reply, error) {
	s := p.steps[min(p.calls, len(p.steps)-1)]
	p.calls++
	p.sent = append(p.sent, body)
	return Reply{StatusCode: s.status}, s.err
}

func TestDeliver(t *testing.T) {
	tests := []struct {
		name          string
		steps         []step
		wantDelivered bool
		wantAttempts  int
	}{
		{"delivered first time", []step{{status: 200}}, true, 1},
		{"delivered after two failures", []step{{status: 500}, {err: errors.New("connection refused")}, {status: 200}}, true, 3},
		{"gives up after three attempts", []step{{status: 500}}, false, 3},
		{"non-200 success codes are not delivered", []step{{status: 201}}, false, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			poster := &scriptedPoster{steps: tt.steps}
			result := New(poster, NoBackoff).Deliver(context.Background(), "http://app/callback", map[string]string{"k": "v"})

			if result.Delivered != tt.wantDelivered {
				t.Errorf("Delivered = %v, want %v", result.Delivered, tt.wantDelivered)
			}
			if len(result.Attempts) != tt.wantAttempts || poster.calls != tt.wantAttempts {
				t.Errorf("attempts = %d (posts %d), want %d", len(result.Attempts), poster.calls, tt.wantAttempts)
			}
			if string(poster.sent[0]) != `{"k":"v"}` {
				t.Errorf("body = %s", poster.sent[0])
			}
		})
	}
}

func TestDeliverRecordsEachAttempt(t *testing.T) {
	poster := &scriptedPoster{steps: []step{{err: errors.New("connection refused")}, {status: 503}, {status: 200}}}
	attempts := New(poster, NoBackoff).Deliver(context.Background(), "http://app", struct{}{}).Attempts

	if attempts[0].Err != "connection refused" || attempts[0].StatusCode != 0 {
		t.Errorf("attempt 1 = %+v", attempts[0])
	}
	if attempts[1].StatusCode != 503 || attempts[2].StatusCode != 200 {
		t.Errorf("attempts 2,3 = %+v, %+v", attempts[1], attempts[2])
	}
}

func TestDeliverUnmarshalableBodyIsOneFailedAttempt(t *testing.T) {
	poster := &scriptedPoster{steps: []step{{status: 200}}}
	result := New(poster, NoBackoff).Deliver(context.Background(), "http://app", make(chan int))

	if result.Delivered || len(result.Attempts) != 1 || poster.calls != 0 {
		t.Errorf("result = %+v, posts = %d", result, poster.calls)
	}
}

func TestDeliverStopsWhenContextCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	poster := &scriptedPoster{steps: []step{{status: 500}}}

	if got := len(New(poster, LinearBackoff).Deliver(ctx, "http://app", struct{}{}).Attempts); got != 1 {
		t.Errorf("attempts = %d, want 1", got)
	}
}

func TestHTTPPoster(t *testing.T) {
	var gotBody, gotType string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		gotBody, gotType = string(b), r.Header.Get("Content-Type")
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{"ResultCode":"0"}`))
	}))
	defer srv.Close()

	reply, err := NewHTTPPoster().Post(context.Background(), srv.URL, []byte(`{"a":1}`))
	if err != nil {
		t.Fatal(err)
	}
	if reply.StatusCode != http.StatusAccepted || string(reply.Body) != `{"ResultCode":"0"}` {
		t.Errorf("reply = %d %s", reply.StatusCode, reply.Body)
	}
	if gotBody != `{"a":1}` || gotType != "application/json" {
		t.Errorf("server got %q with Content-Type %q", gotBody, gotType)
	}

	srv.Close()
	if _, err := NewHTTPPoster().Post(context.Background(), srv.URL, nil); err == nil {
		t.Error("want error posting to a closed server")
	}
}

func TestReplyExcerptCapsLongReplies(t *testing.T) {
	if got := ReplyExcerpt([]byte("ok")); got != "ok" {
		t.Errorf("short reply = %q", got)
	}
	long := make([]byte, replyExcerptBytes+10)
	for i := range long {
		long[i] = 'a'
	}
	if got := ReplyExcerpt(long); len(got) != replyExcerptBytes+len("…") {
		t.Errorf("long reply kept %d bytes", len(got))
	}
}
