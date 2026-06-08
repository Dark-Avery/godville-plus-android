#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"
env \
  -u GODVILLE_PLUS_STOREPASS \
  -u GODVILLE_PLUS_KEYPASS \
  -u GODVILLE_PLUS_KEYSTORE \
  "$ROOT/scripts/build-unsigned-release.sh"
"$ROOT/scripts/sign-release.sh"
