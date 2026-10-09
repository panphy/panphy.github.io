#!/usr/bin/env node
/* Repository checks, run on every pull request by .github/workflows/checks.yml.

     node .github/scripts/check.mjs                 everything except the BUILD_ID bump
     node .github/scripts/check.mjs --base origin/main   also compares with that commit

   No dependencies. Each check adds a line to `problems`; any line fails the run. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = "https://panphy.app";
const EXAM_STATS = "gcsephy/do-now/exam-stats";
const PAPER_MARKS = { "8463/1H": 100, "8463/2H": 100, "8464/P/1H": 70, "8464/P/2H": 70 };
// Pages whose links to local files are checked.
const LINK_PAGES = ["index.html", "beta/index.html", "misc/index.html", "gcsephy/index.html"];

const baseAt = process.argv.indexOf("--base");
const base = baseAt > -1 ? process.argv[baseAt + 1] : "";

const problems = [];
let section = "";
const check = (name) => { section = name; };
const fail = (message) => problems.push(`${section}: ${message}`);

const read = (file) => readFileSync(path.join(ROOT, file), "utf8");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const isFile = (file) => { const full = path.join(ROOT, file); return existsSync(full) && statSync(full).isFile(); };

// The file a same-origin URL path is served from: no query or fragment, and a folder serves its index.html.
function servedFile(urlPath) {
  let file = decodeURIComponent(urlPath.split(/[?#]/)[0]).replace(/^\/+/, "");
  if (file === "" || file.endsWith("/")) file += "index.html";
  else if (existsSync(path.join(ROOT, file)) && statSync(path.join(ROOT, file)).isDirectory()) file += "/index.html";
  return file;
}

// The value of `const NAME = [...]` or `const NAME = {...}` when it is a plain literal.
function literal(source, name, file) {
  const start = source.search(new RegExp(`const ${name} = [\\[{]`));
  if (start < 0) throw new Error(`${file}: ${name} not found`);
  const open = source.indexOf("=", start) + 2;
  const close = source[open] === "[" ? "]" : "}";
  const end = source.indexOf(`\n${source.slice(source.lastIndexOf("\n", start) + 1, start)}${close};`, open);
  if (end < 0) throw new Error(`${file}: end of ${name} not found`);
  return vm.runInNewContext(`(${source.slice(open, end + 1)}${close})`);
}

// RFC 4180 parser: quoted fields may hold commas, doubled quotes and newlines.
function csv(file) {
  let text = read(file);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((name) => name.trim());
  return rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, (cells[i] || "").trim()])));
}

const swSource = read("sw.js");
const cached = literal(swSource, "ASSETS_TO_CACHE", "sw.js");
const cachedLocal = cached.filter((url) => url.startsWith("/"));

check("Cached files");
{
  const seen = new Set();
  for (const url of cached) {
    if (seen.has(url)) fail(`${url} is listed twice in ASSETS_TO_CACHE`);
    seen.add(url);
  }
  for (const url of cachedLocal) {
    if (!isFile(servedFile(url))) fail(`${url} is in ASSETS_TO_CACHE but ${servedFile(url)} does not exist`);
  }
}

check("Homepage offline requirements");
{
  const home = read("index.html");
  const cachedSet = new Set(cached);
  const requirements = literal(home, "OFFLINE_CARD_REQUIREMENTS", "index.html");
  const common = literal(home, "OFFLINE_COMMON_ASSETS", "index.html");
  for (const url of common) {
    if (!cachedSet.has(url)) fail(`${url} (OFFLINE_COMMON_ASSETS) is not in ASSETS_TO_CACHE`);
  }
  for (const [page, urls] of Object.entries(requirements)) {
    if (!home.includes(`href="${page}"`)) fail(`${page} has offline requirements but no homepage link`);
    for (const url of urls) {
      if (!cachedSet.has(url)) fail(`${url} (required by ${page}) is not in ASSETS_TO_CACHE`);
    }
  }
}

check("BUILD_ID");
{
  const buildId = (source) => (source.match(/^const BUILD_ID = '([^']*)';/m) || [])[1];
  const current = buildId(swSource);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(current || "") || Number.isNaN(Date.parse(current))) {
    fail(`"${current}" is not a UTC timestamp like 2026-01-31T12:00:00Z`);
  } else if (base) {
    // Compare with where this branch left the base, so a branch that is merely behind passes.
    const fork = git("merge-base", base, "HEAD").trim();
    const before = buildId(git("show", `${fork}:sw.js`));
    const changed = new Set(git("diff", "--name-only", fork).split("\n").filter(Boolean));
    const touched = [...new Set(cachedLocal.map(servedFile))].filter((file) => changed.has(file));
    if (touched.length && current === before) {
      fail(`cached files changed but BUILD_ID was not updated: ${touched.slice(0, 5).join(", ")}${touched.length > 5 ? ` and ${touched.length - 5} more` : ""}`);
    } else if (current < before) {
      fail(`${current} is earlier than ${before}, the value this branch started from`);
    }
  }
}

check("Links");
{
  for (const page of LINK_PAGES) {
    const folder = path.posix.dirname(page);
    for (const [, href] of read(page).matchAll(/<a\b[^>]*?\bhref="([^"]*)"/g)) {
      if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href) || href === "") continue;
      const target = servedFile(href.startsWith("/") ? href : path.posix.join("/", folder, href));
      if (!isFile(target)) fail(`${page} links to ${href}, but ${target} does not exist`);
    }
  }
  for (const [, loc] of read("sitemap.xml").matchAll(/<loc>([^<]*)<\/loc>/g)) {
    if (!loc.startsWith(`${SITE}/`)) fail(`sitemap.xml: ${loc} is not under ${SITE}/`);
    else if (!isFile(servedFile(loc.slice(SITE.length)))) fail(`sitemap.xml lists ${loc}, which does not exist`);
  }
}

check("Exam statistics data");
{
  const marks = csv(`${EXAM_STATS}/marks.csv`);
  const sections = csv(`${EXAM_STATS}/sections.csv`).map((row) => row.Section);
  const mapped = (reference) => sections.some((known) => reference === known || reference.startsWith(`${known}.`));
  const references = (cell) => cell.split(";").map((item) => item.trim()).filter(Boolean);
  const key = (row) => `${row.Series} ${row.Paper} ${row.Part}`;
  const parts = new Map();
  const totals = new Map();
  for (const row of marks) {
    const name = key(row);
    if (parts.has(name)) fail(`${name} is in marks.csv twice`);
    parts.set(name, row);
    const paper = `${row.Series} ${row.Paper}`;
    if (!(row.Paper in PAPER_MARKS)) { fail(`${name}: unknown paper ${row.Paper}`); continue; }
    if (!/^\d{4}-(06|11)$/.test(row.Series)) fail(`${name}: series should be YYYY-06 or YYYY-11`);
    const [total, recall] = [Number(row.Marks), Number(row.Recall)];
    if (!Number.isInteger(total) || total < 1) fail(`${name}: Marks "${row.Marks}" is not a whole number above 0`);
    if (!(recall >= 0 && recall <= total)) fail(`${name}: Recall "${row.Recall}" is not between 0 and Marks`);
    if (row.Equation === "1" && recall > 0) fail(`${name}: an equation part has recall marks`);
    if (!references(row.Sections).length) fail(`${name}: no Sections`);
    for (const reference of references(row.Sections)) {
      if (!mapped(reference)) fail(`${name}: section ${reference} is not in sections.csv`);
    }
    totals.set(paper, (totals.get(paper) || 0) + total);
  }
  for (const [paper, total] of totals) {
    const expected = PAPER_MARKS[paper.split(" ")[1]];
    if (total !== expected) fail(`${paper} adds up to ${total} marks, not ${expected}`);
  }
  for (const row of csv(`${EXAM_STATS}/corrections.csv`)) {
    if (!parts.has(key(row))) fail(`corrections.csv: ${key(row)} is not in marks.csv`);
    for (const reference of references(row.Sections)) {
      if (!mapped(reference)) fail(`corrections.csv: ${key(row)} section ${reference} is not in sections.csv`);
    }
  }
  for (const row of csv(`${EXAM_STATS}/facts.csv`)) {
    const part = parts.get(key(row));
    if (!part) fail(`facts.csv: "${row.Fact}" points at ${key(row)}, which is not in marks.csv`);
    else if (!(Number(part.Recall) > 0)) fail(`facts.csv: "${row.Fact}" points at ${key(row)}, which has no recall marks`);
  }
}

check("Agent instructions");
{
  const body = (file) => read(file).split("\n").slice(1).join("\n");
  if (body("AGENTS.md") !== body("CLAUDE.md")) fail("AGENTS.md and CLAUDE.md differ below their titles");
}

check("JavaScript syntax");
{
  for (const file of git("ls-files", "-z", "*.js", "*.mjs", "*.cjs").split("\0").filter(Boolean)) {
    try {
      execFileSync(process.execPath, ["--check", file], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
    } catch (error) {
      fail(`${file}\n${String(error.stderr || error.message).trim().split("\n").slice(0, 6).join("\n")}`);
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} problem${problems.length === 1 ? "" : "s"} found:\n`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`All checks passed${base ? ` (compared with ${base})` : " (no --base given, so the BUILD_ID bump was not checked)"}.`);
