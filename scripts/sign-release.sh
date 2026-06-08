#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/android-sdk}}"
BUILD_TOOLS="${BUILD_TOOLS:-34.0.0}"
KEYSTORE="${GODVILLE_PLUS_KEYSTORE:-$HOME/.config/godville-plus/release.jks}"
ALIAS="${GODVILLE_PLUS_KEY_ALIAS:-godville-plus}"
UNSIGNED="${1:-$ROOT/app/build/outputs/apk/release/app-release-unsigned.apk}"
OUTPUT_DIR="$ROOT/app/build/outputs/apk/release"
ALIGNED="$OUTPUT_DIR/app-release-aligned.apk"
SIGNED="$OUTPUT_DIR/godville-plus-release.apk"

test -f "$UNSIGNED"
if [[ ! -f "$KEYSTORE" ]]; then
  printf 'Release keystore not found: %s\n' "$KEYSTORE" >&2
  exit 2
fi
if [[ "$OSTYPE" == linux* ]]; then
  KEYSTORE_MODE="$(stat -c '%a' "$KEYSTORE")"
  if (( 8#$KEYSTORE_MODE & 077 )); then
    printf 'Release keystore must not be group/world accessible: %s (%s)\n' \
      "$KEYSTORE" "$KEYSTORE_MODE" >&2
    exit 2
  fi
fi
: "${GODVILLE_PLUS_STOREPASS:?Set GODVILLE_PLUS_STOREPASS}"
GODVILLE_PLUS_KEYPASS="${GODVILLE_PLUS_KEYPASS:-$GODVILLE_PLUS_STOREPASS}"
export GODVILLE_PLUS_KEYPASS

mkdir -p "$OUTPUT_DIR"
"$SDK_ROOT/build-tools/$BUILD_TOOLS/zipalign" -f 4 "$UNSIGNED" "$ALIGNED"
"$SDK_ROOT/build-tools/$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$ALIAS" \
  --ks-pass env:GODVILLE_PLUS_STOREPASS \
  --key-pass env:GODVILLE_PLUS_KEYPASS \
  --out "$SIGNED" \
  "$ALIGNED"
"$ROOT/scripts/verify-apk.sh" "$SIGNED"

printf 'Signed APK: %s\n' "$SIGNED"
