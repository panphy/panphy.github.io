# Editable source archive

This folder preserves the original student companion-site source and Git history. Rebuildable dependency folders, virtual environments, rendered previews and caches are intentionally excluded.

## Student companion website

`student-companion-site/` is the original Sites/React source at commit `e76297a` ("Remove answer box guide lines"). Its seven lessons and 28 questions are the source from which the lightweight GitHub Pages edition was made.

The deployed GitHub Pages site is maintained directly in `../index.html`, `../lesson/` and `../assets/`. For ordinary question, text and styling changes, edit that static edition.

To run the original Sites edition locally:

```sh
cd student-companion-site
npm install
npm run dev
```

Node 22.13 or newer is required by the archived project's `package.json`. `.openai/hosting.json` retains the original Sites project identifier; it is project metadata, not a credential.

The archived source has pinned dependencies. Its two original `npm test` checks belong to the starter scaffold and expect preview-only files that were not part of the finished project, so use `npm run build` as the source-build check. The live GitHub Pages edition is maintained separately.

`student-companion-site-history.bundle` is a portable backup of the original four-commit Git history. It can be restored with:

```sh
git clone student-companion-site-history.bundle restored-student-companion-site
```

## Intentionally excluded

- `.venv/`, `node_modules/` and package caches
- `.next/`, `.vinext/`, `.wrangler/`, `dist/` and other build output
- rendered slide previews, inspection output and layout dumps
- operating-system files such as `.DS_Store`

These generated files are not needed to maintain the published static site.
