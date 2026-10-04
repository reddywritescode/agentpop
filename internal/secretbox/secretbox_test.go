package secretbox

import "testing"

func TestRoundTripAndTamper(t *testing.T) {
	box, err := New("test-secret")
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := box.Seal([]byte("access:secret"))
	if err != nil {
		t.Fatal(err)
	}
	plain, err := box.Open(encoded)
	if err != nil {
		t.Fatal(err)
	}
	if string(plain) != "access:secret" {
		t.Fatalf("got %q", plain)
	}
	tampered := encoded[:len(encoded)-1] + "A"
	if _, err := box.Open(tampered); err == nil {
		t.Fatal("expected tamper detection")
	}
}
