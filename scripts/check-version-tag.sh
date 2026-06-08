#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAG="${1:?Usage: scripts/check-version-tag.sh vX.Y.Z}"
VERSION="$(
  sed -n 's/^[[:space:]]*versionName = "\(.*\)"/\1/p' "$ROOT/app/build.gradle.kts"
)"
VERSION_CODE="$(
  sed -n 's/^[[:space:]]*versionCode = \([0-9][0-9]*\)/\1/p' "$ROOT/app/build.gradle.kts"
)"

if [[ -z "$VERSION" || -z "$VERSION_CODE" || "$VERSION_CODE" -lt 1 || "$TAG" != "v$VERSION" ]]; then
  printf 'Tag %s does not match app version v%s\n' "$TAG" "$VERSION" >&2
  exit 1
fi
grep -Fqx "## $VERSION" "$ROOT/CHANGELOG.md"

printf 'Release tag matches app version and changelog: %s (versionCode %s)\n' \
  "$TAG" "$VERSION_CODE"
