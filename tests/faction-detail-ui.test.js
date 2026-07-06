const assert = require('assert');
const fs = require('fs');
const path = require('path');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('faction detail modal renders overview panels from capability cards instead of legacy stat grid', () => {
  const html = read('publish/index.html');
  assert.ok(html.includes('factionCapabilityCards()'));
  assert.ok(html.includes('faction-overview-grid'));
  assert.ok(html.includes('faction-overview-symbol'));
  assert.ok(html.includes('战略态势图'));
  assert.ok(!html.includes('<div class="faction-rpg-stats">'));
  assert.ok(!html.includes('<strong>领域</strong>'));
  assert.ok(!html.includes('<strong>影响力</strong>'));
  assert.ok(!html.includes('<h3>全量词条理由</h3>'));
});

test('faction org actions expose overview display helpers for faction/community semantics', () => {
  const script = read('publish/faction-org-actions.js');
  assert.ok(script.includes('factionOverviewModeMeta('));
  assert.ok(script.includes('factionOverviewFieldLabel('));
  assert.ok(script.includes('maturityClass'));
});

test('game store fallback exposes faction detail helpers used by overview UI', () => {
  const script = read('publish/game.js');
  assert.ok(script.includes('selectedFactionStatusLabel()'));
  assert.ok(script.includes('selectedFactionResolutionBadge()'));
  assert.ok(script.includes('factionOverviewModeMeta(faction = null)'));
  assert.ok(script.includes('factionOverviewPanelSkin(panelKey ='));
  assert.ok(script.includes('factionCapabilityCards()'));
  assert.ok(script.includes('selectedFactionStubNotice()'));
});

test('boot loader appends manifest version to local scripts for cache busting', () => {
  const loader = read('publish/boot/script-loader.js');
  const manifest = read('publish/boot/script-manifest.js');
  assert.ok(loader.includes('versionedSrc(src)'));
  assert.ok(loader.includes('window.GameScriptManifest?.version'));
  assert.ok(manifest.includes('"version": "2026-07-06-faction-overview-ui"'));
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
