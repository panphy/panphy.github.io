#!/bin/sh
# Rebuild the seven Year 9 lesson-plan PDFs from the Markdown in source/ with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# Optional: OUT=/some/folder sh build-pdfs.sh   (default: pdf)
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit01/lesson-plans}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
COMPRESS="$(dirname "$0")/../../../assets/compress-pdfs.sh"
OUT="${OUT:-pdf}"
mkdir -p "$OUT"

build() { # lesson-number pdf-name
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=5000 --print-to-pdf="$tmp" "$BASE/plan.html?lesson=$1" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 60 ]; do sleep 1; i=$((i + 1)); done
  sleep 1
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  if [ ! -s "$tmp" ]; then echo "FAILED: $2"; rm -rf "$profile"; return 1; fi
  mv "$tmp" "$OUT/$2" && echo "Wrote $OUT/$2" && sh "$COMPRESS" "$OUT/$2"
  rm -rf "$profile"
}

build 1 "Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 01.pdf"
build 2 "Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 02.pdf"
build 3 "Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 03.pdf"
build 4 "Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 04.pdf"
build 5 "Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 05.pdf"
build 6 "Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 06.pdf"
build 7 "Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 07-08.pdf"
