#!/usr/bin/env bash
set -euo pipefail

KEYSTORE="${GODVILLE_PLUS_KEYSTORE:-$HOME/.config/godville-plus/release.jks}"
ALIAS="${GODVILLE_PLUS_KEY_ALIAS:-godville-plus}"

: "${GODVILLE_PLUS_STOREPASS:?Set GODVILLE_PLUS_STOREPASS}"
GODVILLE_PLUS_KEYPASS="${GODVILLE_PLUS_KEYPASS:-$GODVILLE_PLUS_STOREPASS}"
export GODVILLE_PLUS_KEYPASS

if [[ -e "$KEYSTORE" ]]; then
  printf 'Refusing to replace existing keystore: %s\n' "$KEYSTORE" >&2
  exit 2
fi

mkdir -p "$(dirname "$KEYSTORE")"
keytool -genkeypair \
  -keystore "$KEYSTORE" \
  -storepass:env GODVILLE_PLUS_STOREPASS \
  -keypass:env GODVILLE_PLUS_KEYPASS \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 3072 \
  -validity 10000 \
  -dname "CN=Godville Plus Release"

printf 'Created release keystore: %s\n' "$KEYSTORE"
printf 'Record its SHA-256 certificate fingerprint in release-certificate.sha256 before publishing.\n'
