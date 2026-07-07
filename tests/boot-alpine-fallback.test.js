const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function runBoot({ failLocal = false } = {}) {
  const script = fs.readFileSync(path.join(root, 'publish/boot/boot.js'), 'utf8');
  const loadCalls = [];
  const removed = [];
  const window = {
    GameScriptManifest: { chunks: { core: ['core.js'] } },
    GameBootActions: {
      setBootMessage() {},
      async loadCore() {},
    },
    GameBoot: {
      async loadScript(src, options) {
        loadCalls.push({ src, options });
        if (src === 'vendor/alpinejs-3.14.9-cdn.min.js' && failLocal) {
          throw new Error('local missing');
        }
        if (/alpinejs/.test(src)) window.Alpine = {};
      },
    },
  };
  const context = {
    window,
    document: {
      readyState: 'complete',
      events: [],
      addEventListener(type, handler, options) {
        this.events.push({ type, handler, options });
      },
      querySelectorAll() {
        return [];
      },
      getElementById(id) {
        return {
          remove() {
            removed.push(id);
          },
        };
      },
    },
    console,
  };
  vm.runInNewContext(script, context);
  return new Promise((resolve) => {
    setImmediate(() => resolve({ loadCalls, removed, window, document: context.document }));
  });
}

function runBootScriptWithFallbackDom() {
  const script = fs.readFileSync(path.join(root, 'publish/boot/boot.js'), 'utf8');
  const listeners = {};
  const style = {
    display: undefined,
    setProperty(name, value) {
      this[name] = value;
    },
    removeProperty(name) {
      delete this[name];
    },
  };
  const backdrop = {
    style,
    attrs: { 'data-fallback-closed': 'true' },
    querySelector() { return true; },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
  };
  const closeTarget = {
    closest(selector) {
      return selector.includes('data-faction-close-detail') ? this : null;
    },
  };
  const store = {
    closeCalls: 0,
    closeFactionDetail() { this.closeCalls += 1; },
  };
  const window = {
    __skipBootGameForTest: true,
    Alpine: {
      store(name) {
        return name === 'game' ? store : null;
      },
    },
  };
  const document = {
    readyState: 'complete',
    addEventListener(type, handler, options) {
      listeners[type] = listeners[type] || [];
      listeners[type].push({ handler, options });
    },
    querySelectorAll(selector) {
      return selector.includes('faction-modal-backdrop') ? [backdrop] : [];
    },
    getElementById() {
      return null;
    },
  };
  vm.runInNewContext(script, { window, document, console });
  listeners.click.forEach(({ handler }) => handler({
    target: closeTarget,
    preventDefault() {},
    stopPropagation() {},
  }));
  return { backdrop, store, listeners };
}

async function test(name, fn) {
  await fn();
  console.log(`PASS ${name}`);
}

(async () => {
  await test('boot loads local Alpine before CDN', async () => {
    const { loadCalls, window } = await runBoot();
    const alpineCalls = loadCalls.filter((call) => /alpinejs/.test(call.src));
    assert.deepStrictEqual(
      alpineCalls.map((call) => call.src),
      ['vendor/alpinejs-3.14.9-cdn.min.js']
    );
    assert.strictEqual(alpineCalls[0].options.defer, true);
    assert.strictEqual(window.GameBoot.bootComplete, true);
  });

  await test('boot falls back to CDN only when local Alpine fails', async () => {
    const { loadCalls, window } = await runBoot({ failLocal: true });
    const alpineCalls = loadCalls.filter((call) => /alpinejs/.test(call.src));
    assert.deepStrictEqual(
      alpineCalls.map((call) => call.src),
      [
        'vendor/alpinejs-3.14.9-cdn.min.js',
        'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
      ]
    );
    assert.strictEqual(window.GameBoot.bootComplete, true);
  });

  await test('index cache-busts boot script itself', async () => {
    const html = fs.readFileSync(path.join(root, 'publish/index.html'), 'utf8');
    assert.ok(html.includes('boot/boot.js?v=2026-07-07-faction-native-nav-v4'));
  });

  await test('boot installs native faction detail close fallback', async () => {
    const { document, window } = await runBoot();
    assert.strictEqual(window.__factionDetailCloseFallbackInstalled, true);
    assert.ok(document.events.some((event) => event.type === 'pointerdown' && event.options === true));
    assert.ok(document.events.some((event) => event.type === 'click' && event.options === true));
    assert.strictEqual(typeof window.closeFactionDetailNative, 'function');
  });

  await test('native close fallback hides the current modal even when Alpine store is available', async () => {
    const { backdrop, store } = runBootScriptWithFallbackDom();
    assert.strictEqual(store.closeCalls, 1);
    assert.strictEqual(backdrop.style.display, 'none');
    assert.strictEqual(backdrop.attrs['data-fallback-closed'], 'true');
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
