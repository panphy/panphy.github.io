#!/bin/sh
# Rebuild the student workbook (three parts), the Unit review and their answer editions with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# Headless Chrome may not exit after printing, so each job is stopped once its PDF is written.
# Ghostscript, if installed, checks that each answer edition has as many pages as its student edition.
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit01/workbook}"
PARTS="1:1-2 2:3-5 3:6-8" # part:lessons, as PARTS in assets/workbook.js
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="${OUT:-..}"
NAME="Work Like a Physicist - Year 9"

pages() { gs -q -dNODISPLAY -dNOSAFER -c "($1) (r) file runpdfbegin pdfpagecount = quit" 2>/dev/null || echo "?"; }

pdf() { # output, url, attempt
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=10000 --print-to-pdf="$tmp" "$2" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 120 ]; do sleep 1; i=$((i + 1)); done
  sleep 2
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  # Now and then Chrome prints before the page is built, giving a one-page PDF: try again (up to three times).
  if [ -s "$tmp" ] && [ "$(pages "$tmp")" != "1" ]; then mv "$tmp" "$1"; echo "Wrote $1 ($(pages "$1") pages)"; rm -rf "$profile"
  elif [ "${3:-1}" -lt 3 ]; then rm -rf "$profile"; pdf "$1" "$2" $(( ${3:-1} + 1 ))
  else echo "FAILED: $1"; rm -rf "$profile"; fi
}

same() { # student, answers
  [ "$(pages "$1")" = "$(pages "$2")" ] || echo "WARNING: $2 has a different page count from its student edition."
}

# ONLY_REVIEW=1 builds just the Unit review and its answers; ONLY_PART=2 builds just that part of the workbook.
if [ -z "$ONLY_REVIEW" ]; then
  for p in $PARTS; do
    n="${p%%:*}"; name="$OUT/$NAME Student Workbook - Part $n - Lessons ${p#*:}"
    [ -n "$ONLY_PART" ] && [ "$ONLY_PART" != "$n" ] && continue
    pdf "$name.pdf" "$BASE/workbook.html?part=$n"
    pdf "$name (Answers).pdf" "$BASE/workbook.html?part=$n&answers"
    same "$name.pdf" "$name (Answers).pdf"
  done
fi
[ -n "$ONLY_PART" ] && exit 0
pdf "$OUT/$NAME Unit Review.pdf" "$BASE/workbook.html?review"
pdf "$OUT/$NAME Unit Review (Answers).pdf" "$BASE/workbook.html?review&answers"
same "$OUT/$NAME Unit Review.pdf" "$OUT/$NAME Unit Review (Answers).pdf"
