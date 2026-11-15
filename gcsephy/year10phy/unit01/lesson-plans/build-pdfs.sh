#!/bin/sh
# Rebuild the lesson-plan PDFs, one per lesson, from plan.html?lesson=N with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# To rebuild only some lessons, name them: sh build-pdfs.sh 3 7
BASE="${BASE:-http://localhost:8000/gcsephy/year10phy/unit01/lesson-plans}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
COMPRESS="$(dirname "$0")/../../../assets/compress-pdfs.sh"
OUT="pdf"
NAME="Y10 - Unit 01 - Electric Circuits"
LESSONS=12
mkdir -p "$OUT"

pdf() { # output, url, text the PDF title must contain; retries when Chrome prints too early
  for attempt in 1 2 3; do
    print_once "$1" "$2"
    if [ -s "$1" ] && strings "$1" | grep "/Title" | grep -q "$3"; then sh "$COMPRESS" "$1"; return 0; fi
    echo "Retrying $1"; sleep 3
  done
  echo "FAILED: $1"
}

print_once() { # output, url
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=10000 --print-to-pdf="$tmp" "$2" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 90 ]; do sleep 1; i=$((i + 1)); done
  # Chrome writes the file in pieces: wait until its size stops changing.
  last=-1
  size=$(wc -c < "$tmp" 2>/dev/null || echo 0)
  while [ "$size" != "$last" ]; do last=$size; sleep 2; size=$(wc -c < "$tmp" 2>/dev/null || echo 0); done
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  if [ -s "$tmp" ]; then mv "$tmp" "$1"; echo "Wrote $1"; fi
  rm -rf "$profile"
}

wanted() { [ -z "$ONLY" ] || case " $ONLY " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

ONLY="$*"
n=1
while [ "$n" -le "$LESSONS" ]; do
  nn=$(printf %02d "$n")
  wanted "$n" && pdf "$OUT/$NAME - Lesson Plan $nn.pdf" "$BASE/plan.html?lesson=$n" "Lesson Plan $nn"
  n=$((n + 1))
done
exit 0
