#!/bin/sh
# Rebuild the student workbook and its answer edition with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# MathJax is fetched from a CDN, so the build needs a network connection.
# Headless Chrome may not exit after printing, so each job is stopped once its PDF is written.
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit02/workbook}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="${OUT:-..}"

pdf() { # output, url, attempt
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=20000 --print-to-pdf="$tmp" "$2" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 120 ]; do sleep 1; i=$((i + 1)); done
  sleep 2
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  # A print taken before MathJax arrives is tiny; try again (up to three times).
  if [ "$(wc -c < "$tmp" 2>/dev/null || echo 0)" -gt 200000 ]; then mv "$tmp" "$1"; echo "Wrote $1"; rm -rf "$profile"
  elif [ "${3:-1}" -lt 3 ]; then rm -rf "$profile"; pdf "$1" "$2" $(( ${3:-1} + 1 ))
  else echo "FAILED: $1"; rm -rf "$profile"; fi
}

[ -z "$ONLY_ANSWERS" ] && pdf "$OUT/Energy - Year 9 Student Workbook.pdf" "$BASE/workbook.html"
pdf "$OUT/Energy - Year 9 Student Workbook (Answers).pdf" "$BASE/workbook.html?answers"
