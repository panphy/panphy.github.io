#!/bin/sh
# Rebuild the nine Year 9 Energy teaching-guide PDFs from the Markdown in source/ with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdf.sh
# Optional: OUT=/some/folder sh build-pdf.sh   (default: this folder)
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit02/teaching-guides}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="${OUT:-.}"

build() { # lesson-number pdf-name
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=5000 --print-to-pdf="$tmp" "$BASE/guide.html?lesson=$1" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 60 ]; do sleep 1; i=$((i + 1)); done
  sleep 1
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  if [ ! -s "$tmp" ]; then echo "FAILED: $2"; rm -rf "$profile"; return 1; fi
  mv "$tmp" "$OUT/$2" && echo "Wrote $OUT/$2"
  rm -rf "$profile"
}

build 1 "Lesson 1 - energy stores and systems.pdf"
build 2 "Lesson 2 - kinetic store.pdf"
build 3 "Lesson 3 - gravitational store.pdf"
build 4 "Lesson 4 - stretching springs.pdf"
build 5 "Lesson 5 - elastic store.pdf"
build 6 "Lesson 6 - conservation of energy.pdf"
build 7 "Lesson 7 - power.pdf"
build 8 "Lesson 8 - wasted energy.pdf"
build 9 "Lesson 9 - efficiency.pdf"
