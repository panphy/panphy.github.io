#!/bin/sh
# Print the Unit review and its answer edition (review.html) to PDF with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-review-pdf.sh
# Needs Ghostscript only for the page-count check.
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit01/workbook}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
EXPECTED_PAGES=7

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
  if [ ! -s "$tmp" ]; then echo "FAILED: no PDF for $1"; rm -rf "$profile"; return 1; fi
  pages=$(gs -q -dNODISPLAY -dNOSAFER -c "($tmp) (r) file runpdfbegin pdfpagecount = quit" 2>/dev/null || echo "?")
  mv "$tmp" "$1" && echo "Wrote $1 ($pages pages)"
  rm -rf "$profile"
  [ "$pages" = "$EXPECTED_PAGES" ] || echo "WARNING: expected $EXPECTED_PAGES pages. Open review.html and look for red-outlined pages."
}

pdf "../Work Like a Physicist - Year 9 Unit Review.pdf" "$BASE/review.html"
pdf "../Work Like a Physicist - Year 9 Unit Review (Answers).pdf" "$BASE/review.html?answers"
