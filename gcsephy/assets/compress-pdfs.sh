#!/bin/sh
# Shrink printed PDFs with Ghostscript, keeping images at print resolution (300 dpi).
# Usage: sh compress-pdfs.sh <file.pdf or folder> ...
# A file is replaced only when the result is at least 10% smaller, so running it again is harmless.
# Ghostscript drops the tags Chrome adds for screen readers; titles, fonts and text are kept.
# Draw page backgrounds as vector SVG, not translucent CSS gradients: Chrome prints those as a
# low-resolution bitmap pattern, which Preview shows blurred and Ghostscript rescales wrongly.
command -v gs >/dev/null 2>&1 || { echo "compress-pdfs: Ghostscript (gs) not found; PDFs left as printed."; exit 0; }

compress() {
  tmp="$(mktemp "${TMPDIR:-/tmp}/compress-pdf.XXXXXX")"
  if gs -q -sDEVICE=pdfwrite -dPDFSETTINGS=/printer -dDetectDuplicateImages=true \
      -dNOPAUSE -dBATCH -dSAFER -sOutputFile="$tmp" "$1" 2>/dev/null && [ -s "$tmp" ]; then
    before=$(wc -c < "$1"); after=$(wc -c < "$tmp")
    if [ $((after * 10)) -lt $((before * 9)) ]; then
      cat "$tmp" > "$1"
      echo "Compressed $1 ($((before / 1024)) KB -> $((after / 1024)) KB)"
    fi
  else
    echo "compress-pdfs: could not compress $1; left as it was."
  fi
  rm -f "$tmp"
}

for target in "$@"; do
  if [ -d "$target" ]; then
    find "$target" -name '*.pdf' -type f | while IFS= read -r f; do compress "$f"; done
  elif [ -f "$target" ]; then
    compress "$target"
  fi
done
