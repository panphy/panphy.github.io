# PanPhyMD

A Markdown and LaTeX editor with a live preview, for physics notes, worksheets and equations. Entry point: `tools/panphymd.html`, listed on the homepage. Plain HTML, CSS and ES modules; no build step. It works offline: runtime files and CDN libraries are listed in `ASSETS_TO_CACHE` in `sw.js` and `OFFLINE_CARD_REQUIREMENTS` in `index.html`. Add new runtime files to both and bump `BUILD_ID`. Choosing a preview font other than the default needs a connection.

The editor and preview sit side by side with a draggable divider. At 900px and below, Edit and Preview tabs show one pane at a time.

## Structure

| File | Role |
| --- | --- |
| `js/main.js` | Start-up, rendering, scroll sync, toolbar actions, Present mode, HTML export, autosave |
| `js/rendering.js` | The `marked` math extension and Markdown source preparation |
| `js/utils.js` | Shared helpers, including telling currency amounts from `$...$` math |
| `js/state.js` | Browser storage: draft, snapshots, preferences and unsaved-change tracking |
| `js/ui.js` | Theme, text size and dialogs; image link normalization and local image reading |
| `js/copy.js` | Copying equations and tables from the preview |
| `js/embedded-images.js` | Folding embedded image data in the editor; `#import=` links |
| `js/page-preview.js` | Page Preview and print layout with Paged.js |
| `css/panphymd.css` | App, preview, print and Present styles |
| `sample_doc.md` | The document opened by Guide |
| `templates/` | Snippets for Insert → Math and Insert → Table (`math-table.md`) |

CDN libraries are pinned in `tools/panphymd.html`: MathJax 3.2.2, marked 4.3.0 (the highlight callback requires 4.x), DOMPurify, html2canvas and highlight.js. `js/page-preview.js` pins Paged.js 0.4.3 and loads it on first use.

## Rendering

Math is tokenized by a `marked` extension rather than escaped beforehand, so Markdown syntax inside `$...$` and `$$...$$` stays literal. The tokens become `.math-inline` and `.math-display` elements, and MathJax typesets only those, under the app's control, so a stray dollar sign never pairs up as math. Output passes through DOMPurify before it reaches the page.

## Printing

Print / PDF opens Page Preview, where Paged.js lays the document out on A4 or Letter pages with optional page numbers, and prints exactly those pages. Printing with Ctrl+P instead uses the same paper, margins and numbers through an injected `@page` rule; Chrome and Edge draw the numbers, other browsers may not. Insert → Page Break adds `<div class="page-break"></div>`.

## Images

An image can come from a URL or a local file. Dropbox and Google Drive share links are rewritten to direct image links. Local files are embedded as data URLs. The editor folds that data into short placeholders, while saved documents, copies and exports keep the full bytes; Show image data reveals it.

PanPhyMech and PanPhyCircuits send images through `panphymd.html#import=<JSON>`. The data travels in the link, so it also reaches a tab with separate storage. `parseLinkedImageImport` accepts only one Markdown image of SVG, PNG or JPEG data, which is appended to the current draft after a snapshot.

## Storage

The draft, preferences and snapshots live in `localStorage` under the `markdown*` keys in `js/state.js`. Keep those names, or existing drafts are lost. The draft is also written when the page is hidden or closed. History snapshots are taken every 5 minutes and on leaving the page, skipping unchanged content and keeping at most 20 snapshots within about 2 MB.

## Tests

```bash
node --test tools/panphymd/tests/*.test.cjs
```

`images.test.cjs` covers share-link rewriting, image checks and local image reading. `embedded-images.test.cjs` covers folding, caret positions, copy and cut, and `#import=` validation.
