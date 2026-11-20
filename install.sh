#!/usr/bin/env sh
# Daraja Local installer.
#
#   curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh                 # install
#   curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh -s -- update    # update
#   curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh -s -- uninstall # remove
#
# Environment: INSTALL_DIR (default /usr/local/bin), VERSION (e.g. v0.2.0; default latest).
set -e

REPO="knnedy/daraja-local"
BIN_NAME="daraja-local"
COMMAND="${1:-install}"

GREEN='\033[38;2;0;166;81m'
AMBER='\033[38;2;245;158;11m'
RED='\033[38;2;239;68;68m'
DIM='\033[2m'
RESET='\033[0m'

info()    { printf "${GREEN}  ➜${RESET}  %b\n" "$1"; }
success() { printf "${GREEN}  ✓${RESET}  %b\n" "$1"; }
warn()    { printf "${AMBER}  ⚠${RESET}  %b\n" "$1"; }
error()   { printf "${RED}  ✗${RESET}  %b\n" "$1"; exit 1; }

usage() {
  cat <<EOF

  Daraja Local installer

  Usage: install.sh [install | update | uninstall | help]

    install     Install the latest release (the default). Updates an older install.
    update      Update an existing install to the latest release.
    uninstall   Remove the binary. Your projects in ~/.daraja-local are kept.

  Environment:
    INSTALL_DIR   Where to put the binary (default /usr/local/bin, or wherever it already is)
    VERSION       A release tag to install instead of the latest, e.g. v0.1.0

EOF
}

case "$COMMAND" in
  install|update|uninstall) ;;
  help|-h|--help) usage; exit 0 ;;
  *) usage; error "unknown command: $COMMAND" ;;
esac

# An existing install decides the directory, so update and uninstall act on the right binary.
EXISTING="$(command -v "$BIN_NAME" 2>/dev/null || true)"
if [ -z "${INSTALL_DIR:-}" ]; then
  if [ -n "$EXISTING" ]; then INSTALL_DIR="$(dirname "$EXISTING")"; else INSTALL_DIR="/usr/local/bin"; fi
fi
TARGET="${INSTALL_DIR}/${BIN_NAME}"

SUDO=""
need_sudo() {
  if [ ! -w "$INSTALL_DIR" ]; then
    command -v sudo >/dev/null 2>&1 \
      || error "cannot write to ${INSTALL_DIR} and sudo is unavailable. Set INSTALL_DIR to a writable directory."
    info "requesting sudo to write to ${INSTALL_DIR}..."
    SUDO="sudo"
  fi
}

# Prints the installed version, "unknown" for releases older than --version (v0.1.0), or nothing.
installed_version() {
  [ -x "$TARGET" ] || return 0
  # Only run the binary if it understands --version; older ones would start the server instead.
  if grep -aq 'daraja-local version ' "$TARGET" 2>/dev/null; then
    "$TARGET" --version 2>/dev/null | awk '{print $3}'
  else
    echo "unknown"
  fi
}

printf "\n  ${GREEN}Daraja Local${RESET} ${DIM}${COMMAND}${RESET}\n\n"

if [ "$COMMAND" = "uninstall" ]; then
  [ -e "$TARGET" ] || error "${BIN_NAME} is not installed in ${INSTALL_DIR}."
  need_sudo
  $SUDO rm -f "$TARGET"
  success "removed ${TARGET}"
  printf "\n  ${DIM}your projects and logs are still in ~/.daraja-local — delete that folder to wipe them${RESET}\n\n"
  exit 0
fi

CURRENT="$(installed_version)"
if [ "$COMMAND" = "update" ] && [ -z "$CURRENT" ]; then
  error "${BIN_NAME} is not installed in ${INSTALL_DIR}. Run the installer without 'update' first."
fi

for cmd in curl tar; do
  command -v "$cmd" >/dev/null 2>&1 || error "missing required dependency: $cmd"
done

OS="$(uname -s)"
case "$OS" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
  *)      error "unsupported OS: $OS. Use the Windows .zip from the Releases page instead." ;;
esac

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)        ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)             error "unsupported architecture: $ARCH" ;;
esac

info "detected platform: ${OS}/${ARCH}"

is_tag() { case "$1" in v[0-9]*) return 0 ;; *) return 1 ;; esac; }

if [ -n "${VERSION:-}" ]; then
  is_tag "$VERSION" || error "VERSION must be a release tag such as v0.1.0"
else
  info "fetching latest release..."
  VERSION="$(curl -sI "https://github.com/${REPO}/releases/latest" | grep -Fi 'location:' | tr -d '\r' | awk -F/ '{print $NF}')"
  is_tag "$VERSION" || VERSION=""
  if [ -z "$VERSION" ]; then
    VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/')"
    is_tag "$VERSION" || VERSION=""
  fi
  [ -n "$VERSION" ] || error "could not determine the latest version. Check your internet connection."
fi

VERSION_NUM="${VERSION#v}"
if [ "$CURRENT" = "$VERSION_NUM" ]; then
  success "${BIN_NAME} ${VERSION} is already installed and up to date"
  printf "\n"
  exit 0
fi

case "$CURRENT" in
  "")      info "installing ${VERSION}" ;;
  unknown) info "updating to ${VERSION}" ;;
  *)       info "updating v${CURRENT} → ${VERSION}" ;;
esac

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

[ "$EXPECTED" = "$ACTUAL" ] || error "checksum mismatch — the download may be corrupted"

info "extracting..."
tar -xzf "${TMP_DIR}/${FILENAME}" -C "$TMP_DIR"

if [ ! -d "$INSTALL_DIR" ]; then
  info "creating ${INSTALL_DIR}..."
  mkdir -p "$INSTALL_DIR" 2>/dev/null || sudo mkdir -p "$INSTALL_DIR"
fi
need_sudo

# mv replaces the file rather than writing into it, so a running copy keeps working until restarted.
$SUDO mv "${TMP_DIR}/${BIN_NAME}" "$TARGET"
$SUDO chmod +x "$TARGET"
[ -x "$TARGET" ] || error "installation failed — could not find the executable."

if [ -n "$CURRENT" ]; then
  success "updated ${BIN_NAME} to ${VERSION}"
  if command -v pgrep >/dev/null 2>&1 && pgrep -x "$BIN_NAME" >/dev/null 2>&1; then
    warn "${BIN_NAME} is running. Restart it to use ${VERSION}."
  fi
else
  success "installed ${BIN_NAME} ${VERSION}"
  success "run ${GREEN}${BIN_NAME}${RESET} to start"
fi
printf "\n  ${DIM}to update later:${RESET}    curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | sh -s -- update\n"
printf "  ${DIM}to uninstall:${RESET}       curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | sh -s -- uninstall\n\n"

case ":$PATH:" in
  *:"$INSTALL_DIR":*) ;;
  *) warn "${INSTALL_DIR} is not in your PATH. Add it to your shell profile." ;;
esac
