#!/bin/sh
# Print the Lesson 5 worksheet (2 pages) and its answers (1 page) to PDF with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdf.sh
# Optional: CHROME=/path/to/chrome BASE=http://localhost:8000/gcsephy/year9phy/unit01/worksheet
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit01/worksheet}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

build() { # page-file output-name
  out="$2"
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-sandbox --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=8000 --print-to-pdf="$tmp" "$BASE/$1" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 90 ]; do sleep 1; i=$((i + 1)); done
  sleep 2
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  if [ ! -s "$tmp" ]; then echo "FAILED: no PDF for $1"; rm -rf "$profile"; exit 1; fi
  mv "$tmp" "$out" && echo "Wrote $out"
  rm -rf "$profile"
}

build worksheet.html "Lesson 5 - best-fit lines worksheet.pdf"
build answers.html "Lesson 5 - best-fit lines worksheet (Answers).pdf"
