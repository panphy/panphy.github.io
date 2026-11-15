#!/bin/sh
# Print the one-page Prep sheets and their answer editions to PDF with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then, from the repository root:   sh gcsephy/assets/prep/build-pdfs.sh gcsephy/year9phy/unit01 [more unit folders]
# Each unit folder has prep/content.js and prep/prep.html; the PDFs go to prep/pdf/.
# Optional: CHROME=/path/to/chrome HOST=http://localhost:8000 ONLY=2 (one prep number)
HOST="${HOST:-http://localhost:8000}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

pdf() { # output, url
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-sandbox --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=15000 --print-to-pdf="$tmp" "$2" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 90 ]; do sleep 1; i=$((i + 1)); done
  sleep 2
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  if [ -s "$tmp" ]; then mv "$tmp" "$1" && echo "Wrote $1"; else echo "FAILED: $1"; fi
  rm -rf "$profile"
}

for unit in "$@"; do
  unit="${unit%/}"
  mkdir -p "$unit/prep/pdf"
  # One line per prep: number|file name (without .pdf), read from content.js.
  node -e '
    // Helpers such as window.PrepGraph are stubbed: only the titles are needed here.
    const stub = new Proxy(function () {}, { get: () => stub, apply: () => "" });
    global.window = new Proxy({}, { get: (t, k) => (k in t ? t[k] : stub) }); require(require("path").resolve(process.argv[1]));
    const U = window.PREP;
    U.preps.forEach((p, i) => console.log(`${i + 1}|${U.file} Prep ${i + 1} - Lesson${p.lessons.includes("–") ? "s" : ""} ${p.lessons.replace("–", "-")}`));
  ' "$unit/prep/content.js" | while IFS='|' read -r n name; do
    [ -n "$ONLY" ] && [ "$ONLY" != "$n" ] && continue
    pdf "$unit/prep/pdf/$name.pdf" "$HOST/$unit/prep/prep.html?n=$n"
    pdf "$unit/prep/pdf/$name (Answers).pdf" "$HOST/$unit/prep/prep.html?n=$n&answers"
  done
done
