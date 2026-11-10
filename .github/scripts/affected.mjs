#!/usr/bin/env node
/* Chooses the app tests and accessibility pages a pull request needs, run by .github/workflows/checks.yml.

     node .github/scripts/affected.mjs --base origin/main     what this branch changed since it left main
     node .github/scripts/affected.mjs --files a.html b.js    as if only these files changed
     node .github/scripts/affected.mjs --all                  everything

   An app is a page and its folder in tools/, sandboxes/, simulations/, for_teachers/, fun/ or misc/,
   such as tools/panphyplot.html with tools/panphyplot/. A changed app runs:
     - its own tests, found as <app>/tests/*.test.{js,cjs,mjs};
     - the tests of apps it exports to, and of apps that export to it. Exports are links to
       /<section>/<app>.html#import=… in the app's code, read from the code itself;
     - the tests of any suite that reads one of the changed files from outside its own app
       (a '../' path in the test, such as sw.js, index.html or assets/graph-range.js);
     - the accessibility check on its pages that are in sitemap.xml.
   Changes to assets/, .github/, manifest.json or any file not covered below run everything.

   No dependencies. In GitHub Actions it writes `tests`, `a11y` (all, pages or none) and `pages` outputs. */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = "https://panphy.app/";
const APP_SECTIONS = ["tools", "sandboxes", "simulations", "for_teachers", "fun", "misc"];
// Shared by every page or by the checks themselves.
const RUN_ALL = [/^assets\//, /^\.github\//, /^manifest\.json$/];
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
      for (const [, relative] of read(file).matchAll(/['"`](\.\.\/[^'"`$]+)['"`]/g)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), relative)).replace(/\/$/, "");
        if (!covers(suite.app, target) && !target.startsWith(`${suite.app}.`)) suite.reads.add(target);
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

export function selectChecks(files, { fork = null, all = false } = {}) {
  const suites = findSuites();
  const allTests = [...suites.values()].flatMap((suite) => suite.tests).sort();
  const reasons = [];
  const runAll = all ? "a full run was asked for"
    : files.map((file) => RUN_ALL.some((pattern) => pattern.test(file)) ? `${file} is shared`
      : !appOf(file) && !ROOT_FILES.includes(file) && !NO_EFFECT.some((pattern) => pattern.test(file)) ? `${file} is not in an app`
      : null).find(Boolean);
  if (runAll) return { tests: allTests, a11y: "all", pages: [], reasons: [`Everything runs: ${runAll}.`] };

  const links = findExportLinks();
  const pages = sitemapPages(read("sitemap.xml"));
  const apps = new Set(files.map(appOf).filter(Boolean));
  const chosen = new Map();
  const choose = (app, why) => { if (suites.has(app) && !chosen.has(app)) chosen.set(app, why); };

  for (const app of apps) choose(app, "changed");
  for (const app of apps) {
    for (const link of links) {
      if (link.from === app) choose(link.to, `${app} exports to it`);
      if (link.to === app) choose(link.from, `it exports to ${app}`);
    }
  }
  for (const suite of suites.values()) {
    const read = files.find((file) => [...suite.reads].some((input) => covers(input, file)));
    if (read) choose(suite.app, `its tests read ${read}`);
  }

  const checkedPages = new Set(pages.filter((page) =>
    files.includes(page) || [...apps].some((app) => page === `${app}.html` || page.startsWith(`${app}/`))));
  if (fork && files.includes("sitemap.xml")) {
    const before = new Set(sitemapPages(git("show", `${fork}:sitemap.xml`)));
    for (const page of pages) if (!before.has(page)) checkedPages.add(page);
  }

  for (const [app, why] of chosen) reasons.push(`${app} tests: ${why}`);
  return {
    tests: [...chosen.keys()].flatMap((app) => suites.get(app).tests).sort(),
    a11y: checkedPages.size ? "pages" : "none",
    pages: [...checkedPages].sort(),
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
  for (const reason of result.reasons) console.log(reason);
  console.log(`Tests: ${result.tests.length ? result.tests.join(" ") : "none"}`);
  console.log(`Accessibility: ${result.a11y === "all" ? "every sitemap page" : result.pages.join(" ") || "none"}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tests=${result.tests.join(" ")}\na11y=${result.a11y}\npages=${result.pages.join(" ")}\n`);
  }
}
