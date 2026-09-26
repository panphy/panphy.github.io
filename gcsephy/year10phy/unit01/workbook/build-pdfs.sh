#!/bin/sh
# Rebuild the review PDFs from the HTML sources with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# Headless Chrome may not exit after printing, so each job is stopped once its PDF is written.
BASE="${BASE:-http://localhost:8000/gcsephy/year10phy/unit01/workbook}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="pdf"
mkdir -p "$OUT"

pdf() { # output, url
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=8000 --print-to-pdf="$tmp" "$2" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 90 ]; do sleep 1; i=$((i + 1)); done
  sleep 2
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  if [ -s "$tmp" ]; then mv "$tmp" "$1"; echo "Wrote $1"; else echo "FAILED: $1"; fi
  rm -rf "$profile"
}

part() { # number, title
  name="Electric Circuits - Year 10 Workbook Part $1 - $2"
  pdf "$OUT/$name.pdf" "$BASE/workbook.html?part=$1"
  pdf "$OUT/$name (Answers).pdf" "$BASE/workbook.html?part=$1&answers"
}

part 1 "Charge, energy and resistance"
part 2 "Measuring and combining"
part 3 "Component behaviour"
part 4 "Power, mains and the grid"
pdf "$OUT/Electric Circuits - Year 10 Teacher Guide.pdf" "$BASE/teacher-guide.html"
