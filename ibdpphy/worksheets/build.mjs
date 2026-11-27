// Prints worksheets to PDF with headless Chrome: the worksheet with its answers on the last page, and a
// 2-up copy (two A4 pages per landscape A4 sheet). No server or packages needed.
//   node build.mjs y12-a2-momentum-and-collisions   (one sheet, named after its file in sheets/)
//   node build.mjs                                  (every sheet in sheets/)
// PDFs go to pdf/. A sheet with an overflowing page, or an odd number of question pages (the answers
// would share a 2-up sheet with questions), is not printed; ALLOW_OVERFLOW=1 prints it to inspect.
// The 2-up copy needs pdfjam (TeX Live); Ghostscript, when installed, shrinks both PDFs.
// Set CHROME if Chrome is elsewhere.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].find(existsSync);
if (!chrome) { console.error('Chrome was not found. Set CHROME to the browser binary.'); process.exit(1); }
const has = (cmd) => { try { execFileSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }); return true; } catch { return false; } };
const compress = join(here, '../../gcsephy/assets/compress-pdfs.sh');

const slugs = process.argv.slice(2).length
  ? process.argv.slice(2).map((s) => s.replace(/\.js$/, ''))
  : readdirSync(join(here, 'sheets')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
const out = join(here, 'pdf');
mkdirSync(out, { recursive: true });

const flags = (profile) => ['--headless', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files',
  `--user-data-dir=${profile}`, '--virtual-time-budget=5000'];

function inspect(url) {
  const profile = mkdtempSync(join(tmpdir(), 'worksheet-'));
  try {
    const dom = execFileSync(chrome, [...flags(profile), '--dump-dom', url], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] });
    const attr = (n) => (dom.match(new RegExp(`<body[^>]*\\bdata-${n}="([^"]*)"`)) || [])[1];
    const over = [...dom.matchAll(/data-over="([^"]*)"/g)].map((m) => m[1]);
    return { ready: attr('ready'), error: attr('error'), overflow: attr('overflow'), over, pages: attr('pages'), questionPages: attr('question-pages'), title: attr('title') };
  } finally { rmSync(profile, { recursive: true, force: true }); }
}

function countPages(file) {
  return (readFileSync(file, 'latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

// Headless Chrome may not exit after printing, so it is stopped once the PDF has been written.
async function print(url, dest, expected, attempt = 1) {
  const profile = mkdtempSync(join(tmpdir(), 'worksheet-'));
  const tmp = join(profile, 'out.pdf');
  const proc = spawn(chrome, [...flags(profile), `--print-to-pdf=${tmp}`, url], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(existsSync(tmp) && statSync(tmp).size > 0); i++) await sleep(500);
  await sleep(1500);
  proc.kill();
  const ok = existsSync(tmp) && countPages(tmp) === expected;
  if (ok) renameSync(tmp, dest);
  rmSync(profile, { recursive: true, force: true });
  if (ok) return true;
  if (attempt < 3) return print(url, dest, expected, attempt + 1);
  return false;
}

let failed = false;
for (const slug of slugs) {
  const url = pathToFileURL(join(here, 'worksheet.html')).href + `?sheet=${encodeURIComponent(slug)}`;
  const info = inspect(url);
  if (info.ready !== '1' || info.error) { console.error(`FAILED ${slug}: ${info.error || 'the page did not render'}`); failed = true; continue; }
  if (!process.env.ALLOW_OVERFLOW) {
    if (info.overflow) { console.error(`FAILED ${slug}: page ${info.overflow} overflows by ${info.over.join(', ')}. Open worksheet.html?sheet=${slug} to see it.`); failed = true; continue; }
    if (info.pages - info.questionPages > 1) { console.error(`FAILED ${slug}: the answers take ${info.pages - info.questionPages} pages; shorten them to one.`); failed = true; continue; }
    if (info.questionPages % 2) { console.error(`FAILED ${slug}: ${info.questionPages} question pages; make it even so the answers start a 2-up sheet of their own.`); failed = true; continue; }
  }
  const dest = join(out, `${info.title}.pdf`);
  if (!(await print(url, dest, Number(info.pages)))) { console.error(`FAILED ${slug}: Chrome did not print ${info.pages} pages`); failed = true; continue; }
  console.log(`Wrote pdf/${info.title}.pdf (${info.pages} pages)`);
  const twoUp = join(out, `${info.title} (2-up).pdf`);
  if (has('pdfjam')) {
    execFileSync('pdfjam', ['--nup', '2x1', '--landscape', '--a4paper', '--quiet', dest, '-o', twoUp]);
    console.log(`Wrote pdf/${info.title} (2-up).pdf`);
  } else console.log('pdfjam not found: skipped the 2-up copy');
  execFileSync('sh', [compress, dest, ...(existsSync(twoUp) ? [twoUp] : [])], { stdio: 'inherit' });
}
process.exit(failed ? 1 : 0);
