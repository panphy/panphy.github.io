#!/usr/bin/env node
/* Chooses the app tests and accessibility pages a pull request needs, run by .github/workflows/checks.yml.

     node .github/scripts/affected.mjs --base origin/main     what this branch changed since it left main
     node .github/scripts/affected.mjs --files a.html b.js    as if only these files changed
     node .github/scripts/affected.mjs --all                  everything

   An app is a page and its folder in tools/, sandboxes/, simulations/, for_teachers/, fun/ or misc/,
   such as tools/panphyplot.html with tools/panphyplot/. A changed app runs:
     - its own tests, found as <app>/tests/*.test.{js,cjs,mjs};
     - the hand-off tests (test files that mention #import=) of apps it exports to and of apps
       that export to it. Exports are links to /<section>/<app>.html#import=… in the app's code;
     - the tests of any suite that reads one of the changed files from outside its own app
       (a '../' path in the test, such as sw.js, index.html or assets/graph-range.js, or a
       repository path such as 'misc/panphyplotog/js/fit-core.js');
     - the accessibility check on its pages that are in sitemap.xml.
   A changed check script runs only the checks that use it (CHECK_FILES). For app tests and pages,
   changes to assets/, the rest of .github/, manifest.json or any file not covered below run everything.
   Teaching decks (gcsephy/decks/, ibdpphy/decks/) get the deck check when their page or a file it
   loads changes, directly or through a stylesheet or script, in assets/ too. A baseline change
   checks the decks whose entries changed. deck-check.mjs, headless.mjs, this file and checks.yml
   check every deck, as do manual runs and the Monday run.

   No dependencies. In GitHub Actions it writes `tests`, `a11y` (all, pages or none), `pages`,
   and `decks` (all, none or a list) outputs. */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = "https://panphy.app/";
const APP_SECTIONS = ["tools", "sandboxes", "simulations", "for_teachers", "fun", "misc"];
// Shared by every page or by the checks themselves.
const RUN_ALL = [/^assets\//, /^\.github\//, /^manifest\.json$/];
// Files in .github/ that only some checks use; check.mjs runs on every pull request anyway.
// affected.mjs and checks.yml are not here: a change to them runs everything.
const CHECK_FILES = {
  ".github/scripts/check.mjs": [],
  ".github/scripts/headless.mjs": ["a11y", "decks"],
  ".github/scripts/a11y-smoke.mjs": ["a11y"],
  ".github/scripts/deck-check.mjs": ["decks"],
  ".github/scripts/deck-text-baseline.json": [],
  ".github/scripts/deck-contrast-baseline.json": [],
  ".github/workflows/deploy.yml": [],
  ".github/workflows/supabase-keepalive.yml": []
};
const DECK_BASELINES = [".github/scripts/deck-text-baseline.json", ".github/scripts/deck-contrast-baseline.json"];
const isShared = (file) => !(file in CHECK_FILES) && RUN_ALL.some((pattern) => pattern.test(file));
const checkScriptsNeed = (files, check) => files.some((file) => CHECK_FILES[file]?.includes(check));
// Root files handled below: tests that read them run, and changed or newly listed pages are checked.
const ROOT_FILES = ["sw.js", "index.html", "sitemap.xml"];
// Never served to an app page or read by a test.
const NO_EFFECT = [
  /^(gcsephy|ibdpphy|beta)\//, /^misc\/index\.html$/, /\.md$/,
  /^(llms\.txt|robots\.txt|CNAME|LICENSE|\.gitignore|google[0-9a-f]+\.html)$/
];

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const read = (file) => readFileSync(path.join(ROOT, file), "utf8");
const lines = (text) => text.split("\n").filter(Boolean);
const covers = (input, file) => file === input || file.startsWith(`${input}/`);
const HANDOFF = /#import=/;

// tools/panphyplot.html and tools/panphyplot/js/ui.js both belong to tools/panphyplot.
function appOf(file) {
  const [section, name] = file.split("/");
  if (!APP_SECTIONS.includes(section) || !name || file === `${section}/${name}` && !name.endsWith(".html")) return null;
  if (section === "misc" && name === "index.html") return null;
  return `${section}/${name.replace(/\.html$/, "")}`;
}

const sitemapPages = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)]
  .map(([, loc]) => loc.startsWith(SITE) ? loc.slice(SITE.length) || "index.html" : null).filter(Boolean);

// Every test suite: its app, its test files and the files it reads from outside its own app.
function findSuites() {
  const suites = new Map();
  for (const file of lines(git("ls-files", "*.test.js", "*.test.cjs", "*.test.mjs"))) {
    const app = path.posix.dirname(path.posix.dirname(file));
    if (!suites.has(app)) suites.set(app, { app, tests: [], reads: new Set() });
    const suite = suites.get(app);
    suite.tests.push(file);
  }
  for (const suite of suites.values()) {
    const helpers = lines(git("ls-files", `${suite.app}/tests`)).filter((file) => /\.(c|m)?js$/.test(file));
    for (const file of helpers) {
      const source = read(file);
      const targets = [
        ...[...source.matchAll(/['"`](\.\.\/[^'"`$]+)['"`]/g)].map(([, relative]) => path.posix.join(path.posix.dirname(file), relative)),
        ...[...source.matchAll(/['"`]((?:tools|sandboxes|simulations|for_teachers|fun|misc|assets)\/[^'"`$\s]+)['"`]/g)].map(([, repoPath]) => repoPath)
      ];
      for (const raw of targets) {
        const target = path.posix.normalize(raw).replace(/\/$/, "");
        if (target !== "." && !covers(suite.app, target) && !target.startsWith(`${suite.app}.`)) suite.reads.add(target);
      }
    }
  }
  return suites;
}

// Which apps send data to which, from links such as /tools/panphyplot.html#import= in app code.
function findExportLinks() {
  const links = [];
  const files = lines(git("ls-files", ...APP_SECTIONS.map((section) => `${section}/`)))
    .filter((file) => /\.(html|js|mjs)$/.test(file) && !file.includes("/tests/"));
  for (const file of files) {
    const from = appOf(file);
    for (const [, target] of read(file).matchAll(/\/((?:tools|sandboxes|simulations|for_teachers|fun|misc)\/[\w-]+)\.html#import=/g)) {
      if (from && target !== from && !links.some((link) => link.from === from && link.to === target)) links.push({ from, to: target });
    }
  }
  return links;
}

function changedFiles(base) {
  const fork = git("merge-base", base, "HEAD").trim();
  return { fork, files: [...new Set(lines(git("diff", "--name-only", "--no-renames", fork)))] };
}

// A local file named in a page, stylesheet or script: quoted, or in url(...).
const LOCAL_REF = /["'`(]\s*((?:\.{0,2}\/)*[\w@%.-]+(?:\/[\w@%.-]+)*\.(?:css|js|mjs|json|woff2?))(?:[?#][^"'`)\s]*)?\s*["'`)]/g;

// Every teaching deck and the tracked files it loads, directly or through another file.
function findDecks() {
  const tracked = new Set(lines(git("ls-files")));
  const refsOf = new Map();
  const refs = (file) => {
    if (!refsOf.has(file)) {
      const found = new Set();
      for (const [, ref] of read(file).matchAll(LOCAL_REF)) {
        const target = ref.startsWith("/") ? ref.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file), ref));
        if (tracked.has(target) && target !== file) found.add(target);
      }
      refsOf.set(file, [...found]);
    }
    return refsOf.get(file);
  };
  return lines(git("ls-files", "gcsephy/decks/*/index.html", "ibdpphy/decks/*/index.html")).map((deck) => {
    const uses = new Set([deck]);
    const queue = [deck];
    while (queue.length) {
      const file = queue.pop();
      if (!/\.(html|css|js|mjs)$/.test(file)) continue;
      for (const target of refs(file)) if (!uses.has(target)) { uses.add(target); queue.push(target); }
    }
    return { deck, uses };
  });
}

// The decks whose entries differ between the base and this branch in a changed baseline.
function baselineDecks(files, fork) {
  const changed = new Set();
  for (const file of DECK_BASELINES.filter((name) => files.includes(name))) {
    if (!fork) return null;
    const before = JSON.parse(git("show", `${fork}:${file}`));
    const after = JSON.parse(read(file));
    for (const deck of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (JSON.stringify(before[deck]) !== JSON.stringify(after[deck])) changed.add(deck);
    }
  }
  return changed;
}

export function selectDecks(files, { all = false, fork = null } = {}) {
  const runsEverything = (file) => file.startsWith(".github/") && !(file in CHECK_FILES);
  if (all || files.some(runsEverything) || checkScriptsNeed(files, "decks")) return "all";
  const fromBaselines = baselineDecks(files, fork);
  if (!fromBaselines) return "all";
  const chosen = findDecks().filter(({ deck, uses }) => fromBaselines.has(deck) || files.some((file) => uses.has(file))).map(({ deck }) => deck);
  return chosen.length ? chosen.sort() : "none";
}

export function selectChecks(files, { fork = null, all = false } = {}) {
  const suites = findSuites();
  const allTests = [...suites.values()].flatMap((suite) => suite.tests).sort();
  const reasons = [];
  const runAll = all ? "a full run was asked for"
    : files.map((file) => isShared(file) ? `${file} is shared`
      : file in CHECK_FILES ? null
      : !appOf(file) && !ROOT_FILES.includes(file) && !NO_EFFECT.some((pattern) => pattern.test(file)) ? `${file} is not in an app`
      : null).find(Boolean);
  if (runAll) return { tests: allTests, a11y: "all", pages: [], reasons: [`Everything runs: ${runAll}.`] };

  const links = findExportLinks();
  const pages = sitemapPages(read("sitemap.xml"));
  const apps = new Set(files.map(appOf).filter(Boolean));
  // app → { why, tests }; a linked app runs only its hand-off tests unless it is chosen in full.
  const chosen = new Map();
  const choose = (app, why) => { if (suites.has(app) && !chosen.get(app)?.full) chosen.set(app, { why, full: true, tests: suites.get(app).tests }); };
  const chooseHandoff = (app, why) => {
    if (!suites.has(app) || chosen.has(app)) return;
    const tests = suites.get(app).tests.filter((test) => HANDOFF.test(read(test)));
    if (tests.length) chosen.set(app, { why: `${why} (hand-off tests only)`, full: false, tests });
  };

  for (const app of apps) choose(app, "changed");
  for (const suite of suites.values()) {
    const read = files.find((file) => [...suite.reads].some((input) => covers(input, file)));
    if (read) choose(suite.app, `its tests read ${read}`);
  }
  for (const app of apps) {
    for (const link of links) {
      if (link.from === app) chooseHandoff(link.to, `${app} exports to it`);
      if (link.to === app) chooseHandoff(link.from, `it exports to ${app}`);
    }
  }
  const checkedPages = new Set(pages.filter((page) =>
    files.includes(page) || [...apps].some((app) => page === `${app}.html` || page.startsWith(`${app}/`))));
  if (fork && files.includes("sitemap.xml")) {
    const before = new Set(sitemapPages(git("show", `${fork}:sitemap.xml`)));
    for (const page of pages) if (!before.has(page)) checkedPages.add(page);
  }

  for (const [app, { why }] of chosen) reasons.push(`${app} tests: ${why}`);
  const a11yAll = checkScriptsNeed(files, "a11y");
  if (a11yAll) reasons.push("Every sitemap page: a page check script changed.");
  return {
    tests: [...chosen.values()].flatMap(({ tests }) => tests).sort(),
    a11y: a11yAll ? "all" : checkedPages.size ? "pages" : "none",
    pages: a11yAll ? [] : [...checkedPages].sort(),
    reasons
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => { const at = args.indexOf(name); return at > -1 ? args[at + 1] : null; };
  let result;
  if (args.includes("--all")) result = selectChecks([], { all: true });
  else if (args.includes("--files")) result = selectChecks(args.slice(args.indexOf("--files") + 1));
  else {
    const { fork, files } = changedFiles(option("--base") || "origin/main");
    result = selectChecks(files, { fork });
  }
  const change = args.includes("--files") ? { fork: null, files: args.slice(args.indexOf("--files") + 1) }
    : args.includes("--all") ? { fork: null, files: [] } : changedFiles(option("--base") || "origin/main");
  const decks = selectDecks(change.files, { all: args.includes("--all"), fork: change.fork });
  for (const reason of result.reasons) console.log(reason);
  console.log(`Tests: ${result.tests.length ? result.tests.join(" ") : "none"}`);
  console.log(`Accessibility: ${result.a11y === "all" ? "every sitemap page" : result.pages.join(" ") || "none"}`);
  console.log(`Decks: ${decks === "all" ? "every deck" : decks === "none" ? "none" : decks.join(" ")}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tests=${result.tests.join(" ")}\na11y=${result.a11y}\npages=${result.pages.join(" ")}\ndecks=${Array.isArray(decks) ? decks.join(" ") : decks}\n`);
  }
}
