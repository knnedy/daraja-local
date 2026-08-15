package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/knnedy/daraja-local/internal/network"
)

// DefaultPort is daraja-local's preferred port.
const DefaultPort = 7060

// Config holds everything main.go needs to boot the server
type Config struct {
	Port    int
	DataDir string
	DBPath  string
	IsDev   bool
}

func Load() (*Config, error) {
	dataDir, err := resolveDataDir()
	if err != nil {
		return nil, fmt.Errorf("config: resolve data dir: %w", err)
	}
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("config: create data dir %s: %w", dataDir, err)
	}

	port, err := resolvePort()
	if err != nil {
		return nil, fmt.Errorf("config: resolve port: %w", err)
	}

	isDev := os.Getenv("DARAJA_LOCAL_ENV") == "development"

	return &Config{
		Port:    port,
		DataDir: dataDir,
		DBPath:  filepath.Join(dataDir, "daraja.db"),
		IsDev:   isDev,
	}, nil
}

// DARAJA_LOCAL_DATA_DIR overrides the default ~/.daraja-local directory,
// mainly useful for tests and CI.
func resolveDataDir() (string, error) {
	if dir := os.Getenv("DARAJA_LOCAL_DATA_DIR"); dir != "" {
		return dir, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".daraja-local"), nil
}

// DARAJA_LOCAL_PORT, if set and free, pins the port instead of
// auto-detecting. If set but already in use, Load returns an error
// rather than silently picking a different port out from under the user.
func resolvePort() (int, error) {
	if raw := os.Getenv("DARAJA_LOCAL_PORT"); raw != "" {
		pinned, err := strconv.Atoi(raw)
		if err != nil {
			return 0, fmt.Errorf("DARAJA_LOCAL_PORT %q is not a valid port number", raw)
		}

		if !portFree(pinned) {
			return 0, fmt.Errorf("DARAJA_LOCAL_PORT %d is already in use", pinned)
		}
		return pinned, nil
	}
	return network.FindAvailablePort(DefaultPort)
}

func portFree(port int) bool {
	found, err := network.FindAvailablePort(port)
	return err == nil && found == port
}
