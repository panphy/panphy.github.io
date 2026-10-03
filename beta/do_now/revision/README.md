# AO1 revision sheets

Every Do Now question with its answer, as one printable PDF per topic, for students to revise from. `index.html` lists the topics by unit and links each PDF.

| File | Use |
|---|---|
| `index.html`, `assets/revision.js` | The student page. It reads `../questions.csv`, so its topic list is always current |
| `pdf/` | One PDF per topic: `AO1 revision - <topic>.pdf` |
| `sheet.html`, `assets/sheet.js`, `assets/sheet.css` | PDF source: `sheet.html?topic=<topic name>` |
| `assets/shared.js` | CSV parser, topic list and PDF file names, shared by the page, the sheet and the build |
| `build-pdfs.sh` | Rebuilds the PDFs with headless Chrome |

Each sheet has the questions on the left, the answers on the right and a tick box per question; diagrams come from `../images/`.

## Rebuild

The PDFs do not update by themselves. After editing `../questions.csv`, serve the repository root (`python3 -m http.server 8000`) and run `sh build-pdfs.sh` here (needs Node and Chrome). It rebuilds all the sheets one at a time; to rebuild a few, give words from their names: `sh build-pdfs.sh density "half-lives"`. A full rebuild clears `pdf/` first, so sheets of renamed topics do not linger.

A PDF's name comes from its topic name (`fileName` in `assets/shared.js`), so renaming a topic renames its PDF.
