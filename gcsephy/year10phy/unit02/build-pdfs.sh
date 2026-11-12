#!/bin/sh
# Rebuild the workbook PDFs (three part booklets for Lessons 1-3 and 5-7, one booklet for each
# required practical, the Unit review, their answer editions and
# the teacher guide) from workbook.html and teacher-guide.html with headless Chrome.
# Serve the repository root first:  python3 -m http.server 8000
# Then run from this folder:        sh build-pdfs.sh
# To rebuild only some booklets, name them: sh build-pdfs.sh p1 4 review guide (p1-p3 are the parts)
# MathJax is fetched from a CDN, so the build needs a network connection.
# Headless Chrome may not exit after printing, so each job is stopped once its PDF is written.
BASE="${BASE:-http://localhost:8000/gcsephy/year10phy/unit02}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="pdf"
NAME="Particle Model of Matter - Year 10"
mkdir -p "$OUT"

pdf() { # output, url, text the PDF title must contain; retries when Chrome prints before MathJax
  # has arrived (a small file) or prints the wrong booklet
  for attempt in 1 2 3; do
    print_once "$1" "$2"
    if [ -s "$1" ] && [ "$(wc -c < "$1")" -gt 150000 ] && strings "$1" | grep "/Title" | grep -q "$3"; then return 0; fi
    echo "Retrying $1"; sleep 3
  done
  echo "FAILED: $1"
}

print_once() { # output, url
  profile="$(mktemp -d)"
  tmp="$profile/out.pdf"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --user-data-dir="$profile" \
    --virtual-time-budget=20000 --print-to-pdf="$tmp" "$2" >/dev/null 2>&1 &
  pid=$!
  i=0
  while [ ! -s "$tmp" ] && [ $i -lt 120 ]; do sleep 1; i=$((i + 1)); done
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
  booklet "$1" "$NAME Workbook - Lesson $(printf %02d "$1") - $2" "lesson=$1" "Lesson $(printf %02d "$1")"
}

part() { # number, lessons for the file name (as PARTS in assets/workbook.js)
  booklet "p$1" "$NAME Workbook - Part $1 - $2" "part=$1" "Part $1"
}

ONLY="$*"
part 1 "Lessons 1-2"
part 2 "Lessons 3 and 5"
part 3 "Lessons 6-7"
lesson 4 "Measuring density (RP)"
lesson 8 "Measuring specific heat capacity (RP)"
booklet review "$NAME Workbook - Unit review" "review" "Unit review"
wanted guide && pdf "$OUT/$NAME Teacher Guide.pdf" "$BASE/teacher-guide.html" "Teacher Guide"
exit 0
