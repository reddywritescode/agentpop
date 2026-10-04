package apiutil

import (
	"crypto/rand"
	"encoding/hex"
	"sync/atomic"
)

var idCounter atomic.Uint64

func RandomID(prefix string) string {
	var raw [12]byte
	if _, err := rand.Read(raw[:]); err == nil {
		return prefix + "-" + hex.EncodeToString(raw[:])
	}
	return NewID(prefix)
}
