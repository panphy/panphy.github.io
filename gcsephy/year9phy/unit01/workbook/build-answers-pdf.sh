#!/bin/sh
# Rebuild the Year 9 workbook answers PDF from answers.html with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-answers-pdf.sh
# Optional: OUT=/some/other.pdf sh build-answers-pdf.sh
BASE="${BASE:-http://localhost:8000/gcsephy/year9phy/unit01/workbook}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="${OUT:-../Work Like a Physicist - Year 9 Student Workbook (Answers).pdf}"

profile="$(mktemp -d)"
tmp="$profile/out.pdf"
"$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
  --virtual-time-budget=8000 --print-to-pdf="$tmp" "$BASE/answers.html" >/dev/null 2>&1 &
pid=$!
i=0
while [ ! -s "$tmp" ] && [ $i -lt 90 ]; do sleep 1; i=$((i + 1)); done
sleep 2
kill "$pid" 2>/dev/null
wait "$pid" 2>/dev/null
if [ ! -s "$tmp" ]; then echo "FAILED: no PDF written"; rm -rf "$profile"; exit 1; fi

pages=$(gs -q -dNODISPLAY -dNOSAFER -c "($tmp) (r) file runpdfbegin pdfpagecount = quit" 2>/dev/null || echo "?")
echo "Pages: $pages"
mv "$tmp" "$OUT" && echo "Wrote $OUT"
rm -rf "$profile"
