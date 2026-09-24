# Editable source archive

This folder preserves the important authoring material from the original local project. Rebuildable dependency folders, virtual environments, rendered previews and caches are intentionally excluded.

## Student companion website

`student-companion-site/` is the original Sites/React source at commit `e76297a` ("Remove answer box guide lines"). Its seven lessons and 28 questions are the source from which the lightweight GitHub Pages edition was made.

The deployed GitHub Pages site is maintained directly in `../index.html`, `../lesson/` and `../assets/`. For ordinary question, text and styling changes, edit that static edition.

To run the original Sites edition locally:

```sh
cd student-companion-site
npm install
npm run dev
```

Node 22 or newer is required. `.openai/hosting.json` retains the original Sites project identifier; it is project metadata, not a credential.

The archived source still builds successfully with its pinned dependencies. Its two original `npm test` checks belong to the starter scaffold and expect preview-only files that were not part of the finished project, so use `npm run build` as the source-build check. The live GitHub Pages edition has been checked separately.

`student-companion-site-history.bundle` is a portable backup of the original four-commit Git history. It can be restored with:

```sh
git clone student-companion-site-history.bundle restored-student-companion-site
```

## Teaching deck

`teaching-deck/` contains the original pre-image PowerPoint template, the seven case-study image assets, image source and prompt records, and the scripts used to assemble and credit the final teaching deck.

The finished PowerPoint remains at `../Work Like a Physicist - Year 9 Teaching Deck.pptx`. Keep the on-slide credits when redistributing it. The scripts use OpenAI's presentation-authoring runtime and are preserved primarily for provenance and future editing.

## Original project documentation

`original-project-readme.md` is the detailed README from the local project before it was converted into the hosted GitHub Pages layout.

## Intentionally excluded

- `.venv/`, `node_modules/` and package caches
- `.next/`, `.vinext/`, `.wrangler/`, `dist/` and other build output
- rendered slide previews, inspection output and layout dumps
- operating-system files such as `.DS_Store`

All of these can be regenerated from the preserved source and final teaching files.
