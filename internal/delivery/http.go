package delivery

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"time"
)

const maxReplyBytes = 1 << 20

type httpPoster struct {
	client *http.Client
}

// NewHTTPPoster is the production adapter, with a 10s timeout per POST.
func NewHTTPPoster() Poster {
	return &httpPoster{client: &http.Client{Timeout: 10 * time.Second}}
}

func (p *httpPoster) Post(ctx context.Context, url string, body []byte) (Reply, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return Reply{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return Reply{}, err
	}
	defer resp.Body.Close()

	// A body that fails to read is left for the caller to find unparseable.
	replyBody, _ := io.ReadAll(io.LimitReader(resp.Body, maxReplyBytes))
	return Reply{StatusCode: resp.StatusCode, Body: replyBody}, nil
}
