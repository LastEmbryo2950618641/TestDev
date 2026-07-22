const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const tool = require('../tools/sync-predefined-role-card-scripts');

test('syncs role card scripts into scripts.json before support anchor', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-role-card-scripts-'));
  const scriptsJsonPath = path.join(dir, 'scripts.json');
  fs.writeFileSync(scriptsJsonPath, JSON.stringify([
    'config.js',
    'predefined-role-cards/old-a.js',
    'predefined-role-cards/old-b.js',
    'predefined-role-card-support/triplet-essential-preference-layers.js',
    'predefined-role-card-support/predefined-appearance-profiles.js',
    'role-card-editor.js',
  ], null, 2), 'utf8');

  fs.mkdirSync(path.join(dir, 'predefined-role-cards'));
  fs.writeFileSync(path.join(dir, 'predefined-role-cards', 'b.js'), "window.GameModules.predefinedRoleCardData['b'] = {};\n");
  fs.writeFileSync(path.join(dir, 'predefined-role-cards', 'a.js'), "window.GameModules.predefinedRoleCardData['a'] = {};\n");
  const next = tool.syncScriptsJson(scriptsJsonPath, ['predefined-role-cards/a.js', 'predefined-role-cards/b.js']);

  assert.deepStrictEqual(next, [
    'config.js',
    'predefined-role-cards/a.js',
    'predefined-role-cards/b.js',
    'predefined-role-card-support/triplet-essential-preference-layers.js',
    'predefined-role-card-support/predefined-appearance-profiles.js',
    'role-card-editor.js',
  ]);
});
