#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"
./gradlew clean test lintRelease assembleRelease

UNSIGNED="app/build/outputs/apk/release/app-release-unsigned.apk"
test -f "$UNSIGNED"
printf 'Built unsigned APK: %s\n' "$UNSIGNED"
