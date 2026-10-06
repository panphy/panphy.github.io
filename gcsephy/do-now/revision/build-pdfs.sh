#!/bin/sh
# Rebuild the revision sheets (one PDF per topic) and the required-practical method sheets with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# To rebuild only some sheets, give words from the topic or practical names, or a practical's number:  sh build-pdfs.sh density "half-lives" m3
# Needs Node (to list the sheets from ../questions.csv and ../methods.csv) and Chrome.
# Headless Chrome may not exit after printing, so each job is stopped once its PDF is written.
BASE="${BASE:-http://localhost:8000/gcsephy/do-now/revision}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="pdf"
mkdir -p "$OUT"

pdf() { # output, url
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=6000 --print-to-pdf="$tmp" "$2" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 60 ]; do sleep 1; i=$((i + 1)); done
  sleep 1
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  if [ -s "$tmp" ]; then mv "$tmp" "$1"; echo "Wrote $1"; else echo "FAILED: $1"; fi
  rm -rf "$profile"
}

# One line per sheet: file name, a tab, then the page and query for the address.
topics() {
  node -e '
    require("./assets/shared.js");
    const { parseCsv, topicsFrom, practicalsFrom } = globalThis.DoNowRevision;
    const words = process.argv.slice(1).map((word) => word.toLowerCase());
    const fs = require("fs");
    const wanted = (title) => !words.length || words.some((word) => title.toLowerCase().includes(word));
    for (const topic of topicsFrom(parseCsv(fs.readFileSync("../questions.csv", "utf8")))) {
      if (wanted(topic.title)) console.log(topic.file + "\tsheet.html?topic=" + encodeURIComponent(topic.title));
    }
    for (const practical of practicalsFrom(parseCsv(fs.readFileSync("../methods.csv", "utf8")))) {
      if (wanted(practical.title) || words.includes(practical.number.toLowerCase())) console.log(practical.file + "\tpractical.html?practical=" + practical.number);
    }' "$@"
}

if [ $# -eq 0 ]; then rm -f "$OUT"/*.pdf; fi   # a full rebuild also clears sheets of renamed topics and practicals
topics "$@" | while IFS="$(printf '\t')" read -r file query; do
  pdf "$OUT/$file" "$BASE/$query"
done
