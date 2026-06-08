#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while IFS= read -r -d '' file; do
  node --check "$file"
done < <(find "$ROOT/app/src/main/assets" -name '*.js' -print0)

grep -Fq 'ev.source !== window' "$ROOT/app/src/main/assets/erinome/loader.js"
grep -Fq 'ev.origin !== window.location.origin' "$ROOT/app/src/main/assets/erinome/loader.js"
grep -Fq 'GUIp.common.escapeHTML(cell)' "$ROOT/app/src/main/assets/erinome/log.js"
grep -Fq "staticProperty === 'constructor'" "$ROOT/app/src/main/assets/erinome/common.js"
grep -Fq 'property = String(property)' "$ROOT/app/src/main/assets/erinome/superhero.js"
grep -Fq 'methodName = String(methodName)' "$ROOT/app/src/main/assets/erinome/superhero.js"
grep -Fq 'GUIp.common.escapeHTML(ui_improver.informTown)' "$ROOT/app/src/main/assets/erinome/superhero.js"
grep -Fq 'worker.__godvillePlusAndroid' "$ROOT/app/src/main/assets/erinome/options.js"

for file in superhero.js phrases_ru.js phrases_en.js options.js forum.js log.js; do
  grep -Fq 'ev.source !== worker || ev.origin !== worker.location.origin' \
    "$ROOT/app/src/main/assets/erinome/$file"
done

printf 'Bundled JavaScript syntax and bridge-origin guards verified.\n'
