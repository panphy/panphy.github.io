const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../theme.js'), 'utf8');

function openPage({ values = new Map(), legacy = {}, darkDevice = false, blocked = false } = {}) {
  const listeners = {};
  const events = [];
  let theme = 'light';
  let chrome;
  const storage = {
    getItem(key) { if (blocked) throw Error('blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('blocked'); values.set(key, value); }
  };
  const context = {
    localStorage: storage,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    document: {
      currentScript: { dataset: legacy },
      documentElement: {
        getAttribute: () => theme,
        setAttribute: (key, value) => { theme = value; }
      },
      querySelector: () => ({ setAttribute: (key, value) => { chrome = value; } }),
      visibilityState: 'visible',
      addEventListener: (type, callback) => { listeners[type] = callback; }
    },
    window: {
      matchMedia: () => ({ matches: darkDevice }),
      addEventListener: (type, callback) => { listeners[type] = callback; },
      dispatchEvent(event) { events.push(event); }
    }
  };
  vm.runInNewContext(source, context);
  return {
    api: context.window.PanPhyTheme, events, values, listeners,
    chrome: () => chrome,
    storageEvent(key, newValue, storageArea = storage) {
      listeners.storage({ key, newValue, storageArea });
    }
  };
}

test('first visit follows the device; explicit light overrides a dark device and survives navigation', () => {
  const values = new Map();
  const first = openPage({ values, darkDevice: true });
  assert.equal(first.api.get(), 'dark');
  first.api.toggle();
  assert.equal(values.get('panphy-theme'), 'light');
  assert.equal(first.chrome(), '#F8F6F1');
  assert.equal(openPage({ values, darkDevice: true }).api.get(), 'light');
});

test('migrates legacy preferences once; shared choice overrides conflicting app preferences', () => {
  for (const oldTheme of ['dark', 'light', 'markdown-dark', 'markdown-light']) {
    const values = new Map([['theme', oldTheme]]);
    const page = openPage({ values, legacy: { legacyTheme: 'theme' } });
    assert.equal(page.api.get(), oldTheme.endsWith('dark') ? 'dark' : 'light');
    assert.equal(values.get('panphy-theme'), page.api.get());
  }
  const values = new Map([['app-dark', '1'], ['app-light', '1']]);
  const page = openPage({ values, legacy: { legacyDark: 'app-dark' } });
  assert.equal(page.api.get(), 'dark');
  page.api.set('light');
  assert.equal(openPage({ values, legacy: { legacyDark: 'app-dark' } }).api.get(), 'light');
  assert.equal(openPage({ values: new Map([['app-light', '1']]), legacy: { legacyLight: 'app-light' }, darkDevice: true }).api.get(), 'light');
  assert.equal(openPage({ values: new Map([['panphy-dark', 'true']]) }).api.get(), 'dark');
});

test('open tabs update chrome and emit refresh events without echoing changes', () => {
  const values = new Map();
  const first = openPage({ values });
  const second = openPage({ values });
  first.api.set('dark');
  second.storageEvent('panphy-theme', values.get('panphy-theme'));
  assert.equal(second.api.get(), 'dark');
  assert.equal(second.chrome(), '#111110');
  assert.equal(second.events.at(-1).detail.theme, 'dark');
  second.storageEvent('panphy-theme', 'dark');
  assert.equal(second.events.length, 1);
  second.storageEvent('other-preference', 'light');
  second.storageEvent('panphy-theme', 'light', {});
  assert.equal(second.api.get(), 'dark');
  second.storageEvent(null, null);
  assert.equal(second.api.get(), 'light');
});

test('returning pages pick up changes missed while suspended', () => {
  const page = openPage();
  page.values.set('panphy-theme', 'dark');
  page.listeners.pageshow();
  assert.equal(page.api.get(), 'dark');
  page.values.set('panphy-theme', 'light');
  page.listeners.visibilitychange();
  assert.equal(page.api.get(), 'light');
});

test('blocked storage and invalid preferences do not break theme controls', () => {
  const page = openPage({ blocked: true, darkDevice: true });
  page.api.toggle();
  assert.equal(page.api.get(), 'light');
  page.api.set('invalid');
  assert.equal(page.api.get(), 'light');
  assert.equal(openPage({ values: new Map([['panphy-theme', 'invalid']]), darkDevice: true }).api.get(), 'dark');
});

test('a scoped section keeps its own preference, apart from the shared one and from other scopes', () => {
  const values = new Map();
  const home = openPage({ values });
  const ib = openPage({ values, legacy: { themeScope: 'ibdpphy' } });
  const gcse = openPage({ values, legacy: { themeScope: 'gcsephy' } });
  ib.api.set('dark');
  assert.equal(values.get('panphy-theme-ibdpphy'), 'dark');
  assert.equal(values.has('panphy-theme'), false);
  assert.equal(openPage({ values }).api.get(), 'light');
  assert.equal(openPage({ values, legacy: { themeScope: 'gcsephy' } }).api.get(), 'light');
  assert.equal(openPage({ values, legacy: { themeScope: 'ibdpphy' } }).api.get(), 'dark');

  home.api.set('dark');
  ib.api.set('light');
  home.storageEvent('panphy-theme-ibdpphy', 'light');
  gcse.storageEvent('panphy-theme', 'dark');
  assert.equal(home.api.get(), 'dark');
  assert.equal(gcse.api.get(), 'light');
  ib.storageEvent('panphy-theme-ibdpphy', 'dark');
  assert.equal(ib.api.get(), 'dark');
});

test('a scoped section ignores the old site-wide preferences and follows the device at first', () => {
  const values = new Map([['panphy-dark', '1'], ['panphy-theme', 'dark']]);
  assert.equal(openPage({ values, legacy: { themeScope: 'ibdpphy' } }).api.get(), 'light');
  assert.equal(openPage({ values, legacy: { themeScope: 'ibdpphy' }, darkDevice: true }).api.get(), 'dark');
  assert.equal(values.has('panphy-theme-ibdpphy'), false);
  const own = new Map([['old-deck-dark', '1']]);
  assert.equal(openPage({ values: own, legacy: { themeScope: 'gcsephy', legacyDark: 'old-deck-dark' } }).api.get(), 'dark');
  assert.equal(own.get('panphy-theme-gcsephy'), 'dark');
});
