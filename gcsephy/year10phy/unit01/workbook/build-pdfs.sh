#!/bin/sh
# Rebuild the workbook PDFs from the HTML sources with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# To rebuild only some booklets, name them: sh build-pdfs.sh 3 7 review guide
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

wanted() { [ -z "$ONLY" ] || case " $ONLY " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

booklet() { # key (lesson number or "review"), file name, query
  wanted "$1" || return 0
  pdf "$OUT/$2.pdf" "$BASE/workbook.html?$3"
  pdf "$OUT/$2 (Answers).pdf" "$BASE/workbook.html?$3&answers"
}

lesson() { # number, title for the file name
  booklet "$1" "Electric Circuits - Year 10 Workbook - Lesson $(printf %02d "$1") - $2" "lesson=$1"
}

ONLY="$*"
lesson 1 "Complete circuits and symbols"
lesson 2 "Current and charge"
lesson 3 "Potential difference"
lesson 4 "Resistance and V = IR"
lesson 5 "Resistance of a wire (RP)"
lesson 6 "Series and parallel circuits"
lesson 7 "Resistors in series and parallel (RP)"
lesson 8 "I-V graphs"
lesson 9 "Investigating I-V characteristics (RP)"
lesson 10 "Thermistors, LDRs and sensors"
lesson 11 "Power and energy transfer"
lesson 12 "Mains, safety and the National Grid"
booklet review "Electric Circuits - Year 10 Workbook - Unit review" "review"
wanted guide && pdf "$OUT/Electric Circuits - Year 10 Teacher Guide.pdf" "$BASE/teacher-guide.html"
