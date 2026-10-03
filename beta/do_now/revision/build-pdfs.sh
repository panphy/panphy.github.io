#!/bin/sh
# Rebuild the revision sheets (one PDF per topic) with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# To rebuild only some topics, give words from their names:  sh build-pdfs.sh density "half-lives"
# Needs Node (to list the topics from ../questions.csv) and Chrome.
# Headless Chrome may not exit after printing, so each job is stopped once its PDF is written.
BASE="${BASE:-http://localhost:8000/beta/do_now/revision}"
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

# One line per topic: file name, a tab, then the encoded topic name for the address.
topics() {
  node -e '
    require("./assets/shared.js");
    const { parseCsv, topicsFrom } = globalThis.DoNowRevision;
    const words = process.argv.slice(1).map((word) => word.toLowerCase());
    for (const topic of topicsFrom(parseCsv(require("fs").readFileSync("../questions.csv", "utf8")))) {
      if (words.length && !words.some((word) => topic.title.toLowerCase().includes(word))) continue;
      console.log(topic.file + "\t" + encodeURIComponent(topic.title));
    }' "$@"
}

if [ $# -eq 0 ]; then rm -f "$OUT"/*.pdf; fi   # a full rebuild also clears sheets of renamed topics
topics "$@" | while IFS="$(printf '\t')" read -r file query; do
  pdf "$OUT/$file" "$BASE/sheet.html?topic=$query"
done
