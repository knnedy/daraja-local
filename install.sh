#!/usr/bin/env sh
set -e

REPO="knnedy/daraja-local"
BIN_NAME="daraja-local"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

GREEN='\033[38;2;0;166;81m'
AMBER='\033[38;2;245;158;11m'
RED='\033[38;2;239;68;68m'
DIM='\033[2m'
RESET='\033[0m'

info()    { printf "${GREEN}  ➜${RESET}  %b\n" "$1"; }
success() { printf "${GREEN}  ✓${RESET}  %b\n" "$1"; }
warn()    { printf "${AMBER}  ⚠${RESET}  %b\n" "$1"; }
error()   { printf "${RED}  ✗${RESET}  %b\n" "$1"; exit 1; }

printf "\n  ${GREEN}Daraja Local${RESET} installer\n\n"

for cmd in curl tar; do
  command -v "$cmd" >/dev/null 2>&1 || error "missing required dependency: $cmd"
done

OS="$(uname -s)"
case "$OS" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
  *)      error "unsupported OS: $OS. Use the Windows .zip release asset instead." ;;
esac

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)        ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)             error "unsupported architecture: $ARCH" ;;
esac

info "detected platform: ${OS}/${ARCH}"

is_tag() { case "$1" in v[0-9]*) return 0 ;; *) return 1 ;; esac; }

info "fetching latest release..."
VERSION="$(curl -sI "https://github.com/${REPO}/releases/latest" | grep -Fi 'location:' | tr -d '\r' | awk -F/ '{print $NF}')"
is_tag "$VERSION" || VERSION=""

if [ -z "$VERSION" ]; then
  VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/')"
  is_tag "$VERSION" || VERSION=""
fi

[ -n "$VERSION" ] || error "could not determine latest version. check your internet connection."

info "latest version: ${VERSION}"

VERSION_NUM="${VERSION#v}"
FILENAME="${BIN_NAME}_${VERSION_NUM}_${OS}_${ARCH}.tar.gz"
BASE_URL="https://github.com/${REPO}/releases/download/${VERSION}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

info "downloading ${FILENAME}..."
curl -fsSL "${BASE_URL}/${FILENAME}" -o "${TMP_DIR}/${FILENAME}" \
  || error "download failed: ${BASE_URL}/${FILENAME}"

info "verifying checksum..."
curl -fsSL "${BASE_URL}/checksums.txt" -o "${TMP_DIR}/checksums.txt" \
  || error "failed to download checksums.txt"

EXPECTED="$(awk -v f="$FILENAME" '$2 == f {print $1}' "${TMP_DIR}/checksums.txt")"
[ -n "$EXPECTED" ] || error "no checksum listed for ${FILENAME}"

if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL="$(sha256sum "${TMP_DIR}/${FILENAME}" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL="$(shasum -a 256 "${TMP_DIR}/${FILENAME}" | awk '{print $1}')"
else
  error "no sha256 tool found (need sha256sum or shasum)"
fi

[ "$EXPECTED" = "$ACTUAL" ] || error "checksum mismatch — download may be corrupted"

info "extracting..."
tar -xzf "${TMP_DIR}/${FILENAME}" -C "$TMP_DIR"

if [ ! -d "$INSTALL_DIR" ]; then
  info "creating ${INSTALL_DIR}..."
  mkdir -p "$INSTALL_DIR" 2>/dev/null || sudo mkdir -p "$INSTALL_DIR"
fi

SUDO=""
if [ ! -w "$INSTALL_DIR" ]; then
  command -v sudo >/dev/null 2>&1 \
    || error "cannot write to ${INSTALL_DIR} and sudo is unavailable. Set INSTALL_DIR to a writable directory."
  info "requesting sudo to install to ${INSTALL_DIR}..."
  SUDO="sudo"
fi

$SUDO mv "${TMP_DIR}/${BIN_NAME}" "${INSTALL_DIR}/${BIN_NAME}"
$SUDO chmod +x "${INSTALL_DIR}/${BIN_NAME}"

[ -x "${INSTALL_DIR}/${BIN_NAME}" ] || error "installation failed — could not find executable."

success "installed ${BIN_NAME} ${VERSION}"
success "run ${GREEN}${BIN_NAME}${RESET} to start"
printf "\n  ${DIM}to uninstall:${RESET} %s\n" "${SUDO:+sudo }rm ${INSTALL_DIR}/${BIN_NAME}"
printf "  ${DIM}your data lives in ~/.daraja-local — delete it to wipe projects and logs${RESET}\n\n"

case ":$PATH:" in
  *:"$INSTALL_DIR":*) ;;
  *) warn "${INSTALL_DIR} is not in your PATH. Add it to your shell profile." ;;
esac