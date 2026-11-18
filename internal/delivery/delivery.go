// Package delivery gets a Callback, Validation or Confirmation to the
// developer's server. Poster is the seam: HTTP in production, a fake in tests.
package delivery

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const maxAttempts = 3

// Reply is what the developer's server answered to one POST.
type Reply struct {
	StatusCode int
	Body       []byte
}

// Poster makes a single JSON POST to a developer URL.
type Poster interface {
	Post(ctx context.Context, url string, body []byte) (Reply, error)
}

// replyExcerptBytes caps how much of a reply is kept for inspection.
const replyExcerptBytes = 2048

// Attempt is one try within a Delivery. Field names are read by the dashboard.
type Attempt struct {
	At         time.Time
	StatusCode int
	Err        string
	DurationMs int64
	// Reply is the start of what the developer's server answered.
	Reply string
}

type Result struct {
	URL       string
	Delivered bool
	Attempts  []Attempt
}

// Backoff is the wait before the next Attempt, given how many have failed.
type Backoff func(failed int) time.Duration

func LinearBackoff(failed int) time.Duration { return time.Duration(failed) * time.Second }

func NoBackoff(int) time.Duration { return 0 }

type Deliverer struct {
	poster  Poster
	backoff Backoff
}

func New(poster Poster, backoff Backoff) *Deliverer {
	return &Deliverer{poster: poster, backoff: backoff}
}

// Deliver POSTs body as JSON, retrying until a 200 or 3 Attempts, as
// Daraja retries failed callbacks before giving up.
func (d *Deliverer) Deliver(ctx context.Context, url string, body any) Result {
	payload, err := json.Marshal(body)
	if err != nil {
		return Result{URL: url, Attempts: []Attempt{{At: time.Now(), Err: fmt.Sprintf("marshal body: %v", err)}}}
	}

	var attempts []Attempt
	for i := 1; i <= maxAttempts; i++ {
		started := time.Now()
		reply, err := d.poster.Post(ctx, url, payload)
		attempt := Attempt{At: started, StatusCode: reply.StatusCode, DurationMs: time.Since(started).Milliseconds(), Reply: ReplyExcerpt(reply.Body)}
		if err != nil {
			attempt = Attempt{At: started, Err: err.Error(), DurationMs: time.Since(started).Milliseconds()}
		}
		attempts = append(attempts, attempt)

		if attempt.StatusCode == http.StatusOK {
			return Result{URL: url, Delivered: true, Attempts: attempts}
		}
		if i < maxAttempts && !wait(ctx, d.backoff(i)) {
			break
		}
	}
	return Result{URL: url, Attempts: attempts}
}

// ReplyExcerpt is the start of a reply body, as text, for the Request Log.
func ReplyExcerpt(body []byte) string {
	if len(body) <= replyExcerptBytes {
		return string(body)
	}
	return string(body[:replyExcerptBytes]) + "…"
}

// PostOnce POSTs body as JSON a single time and returns the reply for the caller to judge.
func (d *Deliverer) PostOnce(ctx context.Context, url string, body any) (Reply, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return Reply{}, err
	}
	return d.poster.Post(ctx, url, payload)
}

func wait(ctx context.Context, d time.Duration) bool {
	if d <= 0 {
		return ctx.Err() == nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
