const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const tool = require('../tools/update-predefined-from-export');

test('renders role card JSON as predefined role card JS', () => {
  const profile = { id: 'rel-ai-test', name: '刘思琪', roleCard: true, nested: { ok: true } };
  const js = tool.renderRoleCardJs('liu-siqi', profile);
  assert.match(js, /window\.GameModules\.predefinedRoleCardData/);
  assert.match(js, /predefinedRoleCardData\['liu-siqi'\]/);
  assert.match(js, /"name": "刘思琪"/);
});

test('reads characters wrapper without changing profile shape', () => {
  const entry = {
    id: 'role-a',
    name: '刘思琪',
    worldTag: '测试世界',
    profile: { id: 'a', name: '刘思琪', bodyProfile: [{ part: 'x', tags: ['y'] }] },
    metrics: { emotions: { calm: 10 } },
    updatedAt: '2026-07-22T09:32:07.069Z',
  };
  const profile = tool.roleRecordFromEntry(entry);
  assert.deepStrictEqual(Object.keys(profile), ['id', 'name', 'worldTag', 'profile', 'metrics', 'updatedAt']);
  assert.deepStrictEqual(profile.profile.bodyProfile[0], { part: 'x', tags: ['y'] });
  assert.strictEqual(profile.updatedAt, '2026-07-22T09:32:07.069Z');
});

test('accepts a single exported role card object', () => {
  const entry = { id: 'role-a', name: '刘思琪', profile: { id: 'a', name: '刘思琪' }, updatedAt: 'now' };
  assert.deepStrictEqual(tool.characterEntries(entry), [entry]);
});

test('detects all successfully registered role card scripts in folder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'role-card-scripts-'));
  fs.writeFileSync(path.join(dir, 'b.js'), "window.GameModules.predefinedRoleCardData['b'] = {};\n");
  fs.writeFileSync(path.join(dir, 'helper.js'), "window.GameModules.helper = {};\n");
  fs.writeFileSync(path.join(dir, 'a.js'), "window.GameModules.predefinedRoleCardData['a'] = {};\n");
  assert.deepStrictEqual(tool.roleCardDataScripts(dir), [
    'predefined-role-cards/a.js',
    'predefined-role-cards/b.js',
  ]);
});

test('replaces manifest role card block with detected scripts only', () => {
  const manifest = [
    'window.GameScriptManifest = {',
    '  "chunks": {',
    '    "core": [',
    '      "config.js",',
    '      "predefined-role-cards/old-a.js",',
    '      "predefined-role-cards/old-b.js",',
    '      "predefined-role-card-support/triplet-essential-preference-layers.js",',
    '      "predefined-role-card-support/predefined-appearance-profiles.js",',
    '    ]',
    '  }',
    '};',
    '',
  ].join('\n');
  const next = tool.replaceManifestRoleCardScripts(manifest, ['predefined-role-cards/new-a.js']);
  assert.match(next, /"predefined-role-cards\/new-a\.js"/);
  assert.doesNotMatch(next, /old-a/);
  assert.match(next, /triplet-essential-preference-layers/);
});

