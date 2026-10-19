const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/ui.js'), 'utf8')
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*'[^']+';/, '')
  .replace(/export /g, '');
function setup(extra = {}) {
  return vm.runInNewContext(`${source}\n({ normalizeCloudImageUrl, checkImageLoads, readLocalImage })`, {
    URL, setTimeout, clearTimeout, ...extra
  });
}
const { normalizeCloudImageUrl: normalize } = setup();
test('Dropbox legacy and current shares use raw rendering and retain access keys', () => {
  for (const sharePath of ['/s/token/photo.png', '/scl/fi/token/photo.png']) {
    const result = new URL(normalize(`https://www.dropbox.com${sharePath}?rlkey=secret&dl=0&raw=0`));
    assert.equal(result.hostname, 'www.dropbox.com');
    assert.equal(result.searchParams.get('raw'), '1');
    assert.equal(result.searchParams.get('rlkey'), 'secret');
    assert.equal(result.searchParams.has('dl'), false);
    assert.equal(normalize(result.href), result.href);
  }
});
test('Drive file and query shares preserve resource keys and stay stable on rerender', () => {
  for (const input of [
    'https://drive.google.com/file/d/abc/view?resourcekey=key',
    'https://drive.google.com/open?id=abc&resourcekey=key',
    'https://docs.google.com/uc?id=abc&resourcekey=key'
  ]) {
    const result = normalize(input);
    assert.equal(result, 'https://lh3.googleusercontent.com/d/abc?resourcekey=key');
    assert.equal(normalize(result), result);
  }
});
test('ordinary image URLs, unsupported schemes and unrelated hosts stay unchanged', () => {
  for (const input of ['https://example.com/a.png?x=1', 'not a URL', 'data:image/png;base64,abc',
    'https://drive.google.com.example.com/file/d/abc/view',
    'https://www.dropbox.com/scl/fo/folder?dl=0']) {
    assert.equal(normalize(input), input);
  }
});
function imageHarness() {
  let image;
  const api = setup({ Image: class {
    constructor() { image = this; this.naturalWidth = 100; }
    removeAttribute(name) { this.removed = name; }
  } });
  return { ...api, image: () => image };
}
test('image check accepts decoded images without requiring CORS', async () => {
  const api = imageHarness();
  const result = api.checkImageLoads('https://example.com/a.png');
  const image = api.image();
  assert.equal(image.src, 'https://example.com/a.png');
  assert.equal(image.crossOrigin, undefined);
  image.onload();
  assert.equal(await result, true);
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
});
test('image errors, empty images and timeouts fail cleanly', async () => {
  for (const mode of ['error', 'empty', 'timeout']) {
    const api = imageHarness();
    const result = api.checkImageLoads('https://example.com/bad', mode === 'timeout' ? 1 : 1000);
    const image = api.image();
    if (mode === 'error') image.onerror();
    if (mode === 'empty') { image.naturalWidth = 0; image.onload(); }
    assert.equal(await result, false);
    assert.equal(image.removed, 'src');
    assert.equal(image.onerror, null);
  }
});

function readerHarness() {
  let reader;
  const api = setup({ FileReader: class {
    constructor() { reader = this; }
    readAsDataURL(file) { this.file = file; }
  } });
  return { ...api, reader: () => reader };
}
test('local image embeds file contents in a portable data URL', async () => {
  const api = readerHarness();
  const file = { type: 'image/png', size: 100, name: 'photo.png' };
  const result = api.readLocalImage(file);
  const reader = api.reader();
  assert.equal(reader.file, file);
  reader.result = 'data:image/png;base64,aGVsbG8=';
  reader.onload();
  assert.equal(await result, reader.result);
});
test('non-images and oversized files are rejected before reading', async () => {
  const api = readerHarness();
  await assert.rejects(api.readLocalImage({ type: 'text/html', size: 10 }), /Choose an image/);
  await assert.rejects(api.readLocalImage({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }), /smaller than 5 MB/);
  assert.equal(api.reader(), undefined);
});
test('local image read errors and cancellation produce useful messages', async () => {
  for (const event of ['onerror', 'onabort']) {
    const api = readerHarness();
    const result = api.readLocalImage({ type: 'image/jpeg', size: 1 });
    api.reader()[event]();
    await assert.rejects(result, /could not be read|cancelled/);
  }
});
