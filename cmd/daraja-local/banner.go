package main

import (
	"fmt"

	"charm.land/lipgloss/v2"
)

// Version is set at build time via -ldflags "-X main.Version=...".
// Defaults to "dev" for local builds.
var Version = "dev"

// wordmark is DARAJA in block letters. "-local" is appended as its own
// styled line in printBanner, not baked in here, so it can carry a
// different color than the block art.
const wordmark = `
██████╗  █████╗ ██████╗  █████╗      ██╗ █████╗ 
██╔══██╗██╔══██╗██╔══██╗██╔══██╗     ██║██╔══██╗
██║  ██║███████║██████╔╝███████║     ██║███████║
██║  ██║██╔══██║██╔══██╗██╔══██║██   ██║██╔══██║
██████╔╝██║  ██║██║  ██║██║  ██║╚█████╔╝██║  ██║
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝`

// wordmarkWidth is the fixed column width of each line in wordmark (48
// chars), used to right-align "-local" under the block art.
const wordmarkWidth = 48

func printBanner(addr, dbPath string) {
	// M-Pesa brand palette, matching the frontend's established design
	// system: green + amber + blue.
	mpesaGreen := lipgloss.Color("#00A651")
	mpesaGreenDim := lipgloss.Color("#00875A")
	amber := lipgloss.Color("#F5A623")
	blue := lipgloss.Color("#2F80ED")
	textPrimary := lipgloss.Color("#F0EFEA")
	textSecondary := lipgloss.Color("#8A8A86")
	textTertiary := lipgloss.Color("#606060")

	logo := lipgloss.NewStyle().Foreground(mpesaGreen).Render(wordmark)

	// "-local" is the app's actual name suffix (daraja-local), rendered
	// on its own line in blue so it reads as distinct from the DARAJA
	// block, right-aligned to sit directly under the block's right edge.
	suffix := lipgloss.NewStyle().Bold(true).Foreground(blue).
		Render(fmt.Sprintf("%*s", wordmarkWidth, "-local"))

	version := lipgloss.NewStyle().Foreground(textTertiary).Render("v" + Version)

	tagline := lipgloss.NewStyle().Foreground(textSecondary).
		Render("local M-Pesa Daraja API emulator")

	url := lipgloss.NewStyle().Bold(true).Foreground(textPrimary).
		Render("http://" + addr)

	dbStyled := lipgloss.NewStyle().Foreground(amber).Render(dbPath)

	label := lipgloss.NewStyle().Foreground(mpesaGreenDim)

	fmt.Println(logo)
	fmt.Println(suffix)
	fmt.Println()
	fmt.Printf("  %s   %s\n", version, tagline)
	fmt.Printf("  %s  %s\n", label.Render("running at"), url)
	fmt.Printf("  %s        %s\n", label.Render("database"), dbStyled)
	fmt.Println()
}
