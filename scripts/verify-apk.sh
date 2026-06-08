#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK="${1:-$ROOT/app/build/outputs/apk/release/godville-plus-release.apk}"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/android-sdk}}"
BUILD_TOOLS="${BUILD_TOOLS:-34.0.0}"
APKSIGNER="$SDK_ROOT/build-tools/$BUILD_TOOLS/apksigner"
EXPECTED_CERT="$(tr -d '[:space:]:' < "$ROOT/release-certificate.sha256" | tr '[:lower:]' '[:upper:]')"

"$APKSIGNER" verify --verbose "$APK"
ACTUAL_CERT="$(
  "$APKSIGNER" verify --print-certs "$APK" |
    sed -n 's/^Signer #1 certificate SHA-256 digest: //p' |
    tr -d '[:space:]:' |
    tr '[:lower:]' '[:upper:]'
)"
if [[ "$ACTUAL_CERT" != "$EXPECTED_CERT" ]]; then
  printf 'Unexpected signing certificate. Expected %s, got %s\n' "$EXPECTED_CERT" "$ACTUAL_CERT" >&2
  exit 1
fi

LISTING="$(mktemp)"
EXTRACTED="$(mktemp -d)"
trap 'rm -f "$LISTING"; rm -rf "$EXTRACTED"' EXIT
unzip -Z1 "$APK" > "$LISTING"

verify_asset() {
  local relative="$1"
  grep -Fxq "assets/$relative" "$LISTING"
  mkdir -p "$EXTRACTED/$(dirname "$relative")"
  unzip -p "$APK" "assets/$relative" > "$EXTRACTED/$relative"
  cmp "$ROOT/app/src/main/assets/$relative" "$EXTRACTED/$relative"
}

verify_asset "erinome/loader.js"
verify_asset "erinome/common.js"
verify_asset "erinome/superhero.js"
verify_asset "erinome/log.js"
verify_asset "erinome/forum.js"
verify_asset "erinome/options.js"
verify_asset "licenses/PROJECT_LICENSE.txt"
verify_asset "licenses/ERINOME_LICENSE.txt"
verify_asset "licenses/THIRD_PARTY_NOTICES.txt"
verify_asset "licenses/base64-js-LICENSE.txt"
verify_asset "licenses/jsep-LICENSE.txt"
verify_asset "licenses/pako-LICENSE.txt"

printf 'APK signature identity, bundled UI+ and license assets verified: %s\n' "$APK"
