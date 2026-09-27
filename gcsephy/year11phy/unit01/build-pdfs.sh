#!/bin/sh
# Rebuild the workbook PDFs from workbook.html with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# To rebuild only some booklets, name them: sh build-pdfs.sh 3 7 review
# Headless Chrome may not exit after printing, so each job is stopped once its PDF is written.
BASE="${BASE:-http://localhost:8000/gcsephy/year11phy/unit01}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="pdf"
mkdir -p "$OUT"

pdf() { # output, url, text the PDF title must contain; retries when Chrome prints before the
  # scripts or fonts are ready, or prints the wrong booklet
  for attempt in 1 2 3; do
    print_once "$1" "$2"
    # A good print embeds the deck's display font; a fallback to Georgia means the fonts had not loaded.
    if [ -s "$1" ] && [ "$(wc -c < "$1")" -gt 50000 ] && strings "$1" | grep -q DMSerifDisplay && ! strings "$1" | grep -q "+Georgia" \
      && strings "$1" | grep "/Title" | grep -q "$3"; then return 0; fi
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

booklet() { # key (lesson number or "review"), file name, query, expected title text
  wanted "$1" || return 0
  pdf "$OUT/$2.pdf" "$BASE/workbook.html?$3" "$4"
  pdf "$OUT/$2 (Answers).pdf" "$BASE/workbook.html?$3&answers" "$4.*Answers"
}

lesson() { # number, title for the file name
  booklet "$1" "Atoms and Nuclear Radiation - Year 11 Workbook - Lesson $(printf %02d "$1") - $2" "lesson=$1" "Lesson $(printf %02d "$1")"
}

ONLY="$*"
lesson 1 "Inside the atom"
lesson 2 "Isotopes and ions"
lesson 3 "From plum pudding to the nucleus"
lesson 4 "Energy levels and the nucleus"
lesson 5 "Radioactive decay"
lesson 6 "Nuclear equations"
lesson 7 "Properties and uses of radiation"
lesson 8 "Half-life and random decay"
lesson 9 "Half-life calculations"
lesson 10 "Contamination and irradiation"
booklet review "Atoms and Nuclear Radiation - Year 11 Workbook - Unit review" "review" "Unit review"
