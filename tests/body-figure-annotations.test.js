const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadBodyFigure() {
  const listeners = new Map();
  const window = {
    GameModules: {
      metadataStore: {
        get: () => null,
        save: async () => true,
      },
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
    dispatchEvent() {},
  };
  window.window = window;
  const context = vm.createContext({
    console,
    window,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
  });
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/body-figure.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/body-figure.js' });
  return { bodyFigure: context.window.GameModules.bodyFigure, listeners };
}

test('body figure annotations account for image padding', () => {
  const { bodyFigure } = loadBodyFigure();
  bodyFigure.metaCache.foo = {
    path: 'foo',
    imageSize: { width: 529, height: 1024 },
    parts: [{ part: '头发', anchor: { x: 0, y: 10 }, label: { x: 10, y: 10, side: 'left' } }],
  };

  const resolved = bodyFigure.buildResolvedFigure('foo', {}, [], '');
  assert.ok(resolved.annotations[0].anchorX > 15);
  assert.ok(resolved.annotations[0].anchorX < 16);
  assert.strictEqual(resolved.annotations[0].anchor.imageX, 0);
});

test('body figure styles keep labels inside the stage', () => {
  const { bodyFigure } = loadBodyFigure();
  // Left: outer bottom-left at x=10, box grows right into the gutter.
  assert.match(bodyFigure.calloutStyle({ label: { side: 'left', x: 10, y: 12 } }), /left:10%;top:12%;transform:translate\(0, -100%\)/);
  // Right: outer bottom-right at x=90, box grows left into the gutter.
  assert.match(bodyFigure.calloutStyle({ label: { side: 'right', x: 90, y: 12 } }), /left:90%;top:12%;transform:translate\(-100%, -100%\)/);
  assert.match(bodyFigure.anchorStyle({ anchor: { x: 50, y: 10 } }), /translate\(-50%, -50%\)/);
});

test('body figure lines attach to the inner bottom corner of callouts', () => {
  const { bodyFigure } = loadBodyFigure();
  bodyFigure.metaCache.foo = {
    path: 'foo',
    imageSize: { width: 529, height: 1024 },
    parts: [
      { part: '头发', anchor: { x: 50, y: 10 }, label: { x: 10, y: 12, side: 'left' } },
      { part: '耳朵', anchor: { x: 60, y: 14 }, label: { x: 90, y: 12, side: 'right' } },
    ],
  };
  const resolved = bodyFigure.buildResolvedFigure('foo', {}, [], '');
  const left = resolved.annotations.find((ann) => ann.part === '头发');
  const right = resolved.annotations.find((ann) => ann.part === '耳朵');
  assert.ok(left.line.x2 > left.label.x);
  assert.strictEqual(left.line.y2, 12);
  assert.ok(right.line.x2 < right.label.x);
  assert.strictEqual(right.line.y2, 12);
});

test('body figure label drag updates and saves position', async () => {
  const { bodyFigure, listeners } = loadBodyFigure();
  const saved = [];
  bodyFigure.metaCache.foo = {
    path: 'foo',
    imageSize: { width: 529, height: 1024 },
    parts: [{ part: '头发', anchor: { x: 20, y: 20 }, label: { x: 10, y: 10, side: 'left' } }],
  };
  bodyFigure.saveMeta = async (pathKey, meta) => {
    saved.push({ pathKey, meta: JSON.parse(JSON.stringify(meta)) });
    return true;
  };

  const stage = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 600 }) };
  const target = {
    dataset: {},
    classList: { add() {}, remove() {} },
    closest: () => stage,
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  const ann = bodyFigure.buildResolvedFigure('foo', {}, [], '').annotations[0];

  bodyFigure.startLabelDrag({ currentTarget: target, pointerId: 1, clientX: 20, clientY: 20 }, { path: 'foo' }, ann);
  await listeners.get('pointermove')?.({ clientX: 350, clientY: 120 });
  await listeners.get('pointerup')?.({ clientX: 350, clientY: 120 });

  assert.strictEqual(target.dataset.bodyFigureDragMoved, '1');
  assert.ok(ann.label.x > 80);
  assert.ok(ann.label.y > 15);
  assert.strictEqual(saved[0].pathKey, 'foo');
  assert.strictEqual(saved[0].meta.parts[0].label.x, ann.label.x);
  assert.strictEqual(saved[0].meta.parts[0].label.y, ann.label.y);
});

