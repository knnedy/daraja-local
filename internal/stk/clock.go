package stk

import "time"

// Clock is the seam for time: the system clock in production, a
// hand-advanced one in tests.
type Clock interface {
	Now() time.Time
	// AfterFunc runs f once d has passed, unless stop is called first.
	AfterFunc(d time.Duration, f func()) (stop func())
}

type systemClock struct{}

func SystemClock() Clock { return systemClock{} }

func (systemClock) Now() time.Time { return time.Now() }

func (systemClock) AfterFunc(d time.Duration, f func()) func() {
	timer := time.AfterFunc(d, f)
	return func() { timer.Stop() }
}
