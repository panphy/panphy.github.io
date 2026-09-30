#!/bin/sh
# Rebuild the seven Year 9 teaching-guide PDFs from the Markdown in source/ with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdf.sh
# Optional: OUT=/some/folder sh build-pdf.sh   (default: this folder)
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit01/teaching-guides}"
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

build 1 "Lesson 1 - reliability of data.pdf"
build 2 "Lesson 2 - variables, data types, graph choice.pdf"
build 3 "Lesson 3 - bar chart - shock absorber.pdf"
build 4 "Lesson 4 - line graph - ramp.pdf"
build 5 "Lesson 5 - best fit lines, outliers.pdf"
build 6 "Lesson 6 - independent challenge - paper helicopter.pdf"
build 7 "Lessons 7-8 - student research project.pdf"
