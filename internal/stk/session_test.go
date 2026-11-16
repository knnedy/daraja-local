package stk

import "testing"

func TestStoreResolveIsScopedToProject(t *testing.T) {
	store := NewStore()
	store.Create(Session{CheckoutRequestID: "ws_CO_1", ProjectID: "1"})

	if _, ok := store.Resolve(2, "ws_CO_1", ResultCodeSuccess, "ok"); ok {
		t.Fatal("another project resolved the session")
	}
	if got := store.ListPending(1); len(got) != 1 {
		t.Fatalf("pending sessions for owner = %d, want 1", len(got))
	}

	if _, ok := store.Resolve(1, "ws_CO_1", ResultCodeSuccess, "ok"); !ok {
		t.Fatal("owning project could not resolve its session")
	}
	if _, ok := store.Resolve(1, "ws_CO_1", ResultCodeSuccess, "ok"); ok {
		t.Fatal("session resolved twice")
	}
}
