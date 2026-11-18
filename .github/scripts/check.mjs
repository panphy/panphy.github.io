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
const LINK_PAGES = ["index.html", "beta/index.html", "misc/index.html", "gcsephy/index.html", "ibdpphy/index.html"];

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

check("Stable cache");
{
  // Stable files are kept across builds, so changing one needs a new STABLE_CACHE_VERSION.
  const stableVersion = (source) => (source.match(/^const STABLE_CACHE_VERSION = '([^']*)';/m) || [])[1];
  const stable = literal(swSource, "STABLE_ASSETS", "sw.js");
  const cachedSet = new Set(cached);
  for (const url of stable) {
    if (!cachedSet.has(url)) fail(`${url} is in STABLE_ASSETS but not in ASSETS_TO_CACHE`);
  }
  if (!stableVersion(swSource)) fail("STABLE_CACHE_VERSION not found in sw.js");
  if (base) {
    const fork = git("merge-base", base, "HEAD").trim();
    const before = stableVersion(git("show", `${fork}:sw.js`));
    const changed = new Set(git("diff", "--name-only", fork).split("\n").filter(Boolean));
    const touched = stable.map(servedFile).filter((file) => changed.has(file));
    if (before && touched.length && stableVersion(swSource) === before) {
      fail(`stable files changed but STABLE_CACHE_VERSION was not updated: ${touched.join(", ")}`);
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

check("Canvas texture gradients");
{
  // A conservative guard: keep 2D-only gradient drawings in modules that do not
  // upload canvases to WebGL. Text labels and dynamic scopes remain supported.
  for (const file of git("ls-files", "-z", "*.js", "*.mjs", "*.html").split("\0").filter((file) => /^(simulations|assets)\//.test(file))) {
    const source = read(file);
    if (/\bCanvasTexture\s*\(/.test(source) && /\bcreateRadialGradient\s*\(/.test(source)) {
      fail(`${file}: canvas radial gradients can acquire colored noise on Safari; use assets/three-textures.js for WebGL textures`);
    }
  }
}

check("Deck units");
{
  // A compound unit (m s⁻², kg m², N m) and the number before it must not break across lines:
  // join them with &nbsp;. Math, scripts, styles and tags are skipped.
  const UNIT = "(?:mol|rad|rev|min|day|kWh|kW|MW|GW|kJ|MJ|GJ|keV|MeV|GeV|eV|kPa|Pa|kHz|MHz|GHz|Hz|kV|mV|mA|μA|kΩ|MΩ|Ω|Wb|Bq|Sv|Gy|cd|lx|ly|pc|AU|km|cm|mm|μm|nm|pm|fm|kg|mg|g|m|s|ms|μs|ns|h|J|N|W|K|C|T|V|A|F|L|yr|y|atm)[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]*";
  const SEP = "(?: |&nbsp;| )";
  const NUM = `(?:\\d{1,3}(?:${SEP}\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)`;
  const compound = new RegExp(`(?<![\\w\\\\{.])(?:${NUM}${SEP})?${UNIT}(?:${SEP}${UNIT})+(?![\\w⁻⁰¹²³⁴⁵⁶⁷⁸⁹])`, "g");
  const skip = /<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|<[^>]*>/g;
  for (const file of git("ls-files", "-z", "ibdpphy/decks/*.html", "gcsephy/decks/*.html").split("\0").filter(Boolean)) {
    for (const text of read(file).split(skip)) {
      for (const [unit] of text.matchAll(compound)) {
        const isUnit = /[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(unit) || /(?:^|[\s;])(?:N(?: |&nbsp;)[ms]|kW(?: |&nbsp;)h)$/.test(unit);
        if (isUnit && unit.includes(" ")) fail(`${file}: "${unit}" can break across lines; join it with &nbsp;`);
      }
    }
  }
}

// Pages, and where this branch left the base (empty without --base).
const pages = git("ls-files", "-z", "*.html").split("\0").filter((file) => file && !/^googl/.test(file));
const fork = base ? git("merge-base", base, "HEAD").trim() : "";
const changedFiles = fork ? new Set(git("diff", "--name-only", fork).split("\n").filter(Boolean)) : new Set();
const addedFiles = fork ? new Set(git("diff", "--name-only", "--diff-filter=A", fork).split("\n").filter(Boolean)) : new Set();
const headOf = (source) => (source.match(/<head\b[\s\S]*?<\/head>/i) || [""])[0];
// Build sources rendered to PDF, not pages for visitors.
const isBuildSource = (source) => /<meta\s+name="robots"\s+content="noindex/i.test(source);
const sitemapPages = [...read("sitemap.xml").matchAll(/<loc>([^<]*)<\/loc>/g)]
  .map(([, loc]) => loc).filter((loc) => loc.startsWith(`${SITE}/`)).map((loc) => [loc, servedFile(loc.slice(SITE.length))]);

check("Copyright");
{
  // Only pages added on this branch: some older pages render the line from script or predate the rule.
  for (const file of pages.filter((page) => addedFiles.has(page))) {
    if (!/(&copy;|©) PanPhy Labs\. All rights reserved\./.test(read(file))) fail(`${file} has no "© PanPhy Labs. All rights reserved."`);
  }
}

check("Theme script");
{
  for (const file of pages) {
    const source = read(file);
    const tag = (source.match(/<script\b[^>]*\/assets\/theme\.js[^>]*>/) || [])[0];
    if (!tag) continue;
    const head = headOf(source);
    const scope = (file.match(/^(gcsephy|ibdpphy)\//) || [])[1];
    const tagScope = (tag.match(/data-theme-scope="([^"]*)"/) || [])[1];
    if (!head.includes(tag)) fail(`${file}: load /assets/theme.js in the head`);
    else if (/\b(defer|async|type="module")/.test(tag)) fail(`${file}: load /assets/theme.js synchronously (no defer, async or module)`);
    else if (head.search(/<link\b[^>]*rel="stylesheet"|<style\b/) > -1 && head.search(/<link\b[^>]*rel="stylesheet"|<style\b/) < head.indexOf(tag)) {
      fail(`${file}: load /assets/theme.js before any stylesheet`);
    }
    if (scope && tagScope !== scope) fail(`${file}: theme.js needs data-theme-scope="${scope}"`);
    if (!scope && tagScope) fail(`${file}: data-theme-scope is only for gcsephy/ and ibdpphy/ pages`);
  }
}

check("Published page metadata");
{
  for (const [loc, file] of sitemapPages) {
    if (!isFile(file)) continue;
    const source = read(file);
    const canonical = (source.match(/<link\s+rel="canonical"\s+href="([^"]*)"/) || [])[1];
    if (canonical !== loc) fail(`${file}: canonical link should be ${loc}${canonical ? `, not ${canonical}` : ""}`);
    if (!/<meta\s+name="description"\s+content="[^"]+"/.test(source)) fail(`${file}: no meta description`);
    if (!source.includes("/assets/standalone-top.css")) fail(`${file}: does not link /assets/standalone-top.css`);
    const status = (source.match(/apple-mobile-web-app-status-bar-style"\s+content="([^"]*)"/) || [])[1];
    if (status && status !== "default") fail(`${file}: apple-mobile-web-app-status-bar-style should be "default"`);
    const [fonts, design] = [source.indexOf("/assets/fonts/fonts.css"), source.indexOf("/assets/design.css")];
    if (design > -1 && (fonts < 0 || fonts > design)) fail(`${file}: load /assets/fonts/fonts.css before /assets/design.css`);
  }
  if (fork) {
    const lastmod = (xml) => new Map([...xml.matchAll(/<loc>([^<]*)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>/g)].map(([, loc, date]) => [loc, date]));
    const [now, before] = [lastmod(read("sitemap.xml")), lastmod(git("show", `${fork}:sitemap.xml`))];
    for (const [loc, file] of sitemapPages) {
      if (changedFiles.has(file) && before.has(loc) && now.get(loc) === before.get(loc)) fail(`${file} changed but its sitemap <lastmod> did not`);
    }
  }
}

check("Section pages");
{
  for (const file of pages) {
    const section = (file.match(/^(gcsephy|ibdpphy)\//) || [])[1];
    const source = read(file);
    if (section && !isBuildSource(source) && !source.includes(`/${section}/sw-register.js`)) {
      fail(`${file}: include <script src="/${section}/sw-register.js" defer></script>`);
    }
    if (/^(gcsephy|ibdpphy)\/decks\/[^/]+\/index\.html$/.test(file) && !/(?:\.\.\/|\/decks\/)assets\/readable\.css/.test(source)) {
      fail(`${file}: load the section's decks/assets/readable.css`);
    }
  }
  const scoped = (file, section) => read(file).split("\n").slice(1).join("\n").replaceAll(section, "SECTION");
  for (const name of ["sw.js", "sw-register.js"]) {
    if (scoped(`gcsephy/${name}`, "gcsephy") !== scoped(`ibdpphy/${name}`, "ibdpphy")) {
      fail(`gcsephy/${name} and ibdpphy/${name} differ beyond their scope (and first line)`);
    }
  }
}

check("Inventories and network-only sections");
{
  for (const folder of ["beta", "misc"]) {
    const index = read(`${folder}/index.html`);
    for (const file of pages.filter((page) => page.startsWith(`${folder}/`) && page.split("/").length === 2 && page !== `${folder}/index.html`)) {
      const name = file.slice(folder.length + 1);
      if (!index.includes(`href="${name}"`) && !index.includes(`href="/${file}"`)) fail(`${file} is not listed in ${folder}/index.html`);
    }
  }
  for (const file of pages.filter((page) => /^(beta|misc|fun)\//.test(page))) {
    if (read(file).includes("/assets/sw-register.js")) fail(`${file}: ${file.split("/")[0]}/ is network-only; remove /assets/sw-register.js`);
  }
}

check("App groups");
{
  // getAssetGroup (sw.js) versions each app's files; getAppGroup (assets/sw-register.js) picks the page's version.
  const assetGroup = vm.runInNewContext(`(${(swSource.match(/function getAssetGroup\(pathname\) \{[\s\S]*?\n\}/) || ["() => null"])[0]})`);
  const register = read("assets/sw-register.js");
  const appGroup = vm.runInNewContext(`(${(register.match(/\(pathname\) => \{[\s\S]*?\n  \}/) || ["() => null"])[0]})`);
  const groups = new Set(cachedLocal.map((url) => assetGroup(new URL(url, SITE).pathname)));
  for (const file of pages.filter((page) => read(page).includes("/assets/sw-register.js"))) {
    const pathname = file === "index.html" ? "/" : `/${file}`;
    const [asset, app] = [assetGroup(pathname), appGroup(pathname)];
    if (asset !== app) fail(`${file}: getAssetGroup gives "${asset}" but getAppGroup gives "${app}"`);
    else if (!groups.has(app)) fail(`${file}: no cached file is in its app group "${app}", so it prompts on every build`);
  }
}

check("Teaching conventions");
{
  // Wording the course has settled. A line ending with a `check-ok` comment is exempt (a quoted data booklet form, say).
  const RULES = [
    [/terminal speed/i, "say \"terminal velocity\""],
    [/\bv(?:\^\{?2\}?|²)\s*=\s*u(?:\^\{?2\}?|²)\s*\+\s*2\s*a\s*s\b/, "write v² − u² = 2as"],
    [/\bQ\s*=\s*(?:\\Delta|Δ)\s*U\s*\+\s*W\b/, "write the first law as ΔU = Q − W"],
    [/\s(?:·|&middot;)\s/, "separate items with commas, not ·"],
  ];
  const IB_RULES = [[/÷|&divide;|\\div\b/, "write division as a fraction"]];
  for (const file of git("ls-files", "-z", "gcsephy/*.html", "gcsephy/*.js", "ibdpphy/*.html", "ibdpphy/*.js").split("\0").filter(Boolean)) {
    const rules = file.startsWith("ibdpphy/") ? [...RULES, ...IB_RULES] : RULES;
    read(file).split("\n").forEach((line, i) => {
      if (/check-ok/.test(line)) return;
      for (const [pattern, advice] of rules) if (pattern.test(line)) fail(`${file}:${i + 1}: ${advice}`);
    });
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
