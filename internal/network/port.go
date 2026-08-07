package network

import (
	"fmt"
	"net"
)

const maxScanAttempts = 50

// daraja-local defaults to 7060 and scans upward so that
// running multiple projects, or restarting while an old instance is still
// shutting down, doesn't require the user to free the port by hand.
func FindAvailablePort(start int) (int, error) {
	for port := start; port < start+maxScanAttempts; port++ {
		ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
		if err != nil {
			continue
		}

		_ = ln.Close()
		return port, nil
	}
	return 0, fmt.Errorf("network: no available port found in range %d-%d", start, start+maxScanAttempts-1)
}
