const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'publish/root-key-autofill.js'), 'utf8');

async function main() {
  const context = {
    window: {
      GameModules: {
        platform: {
          keys: { source: { readDeepseekKey: async () => 'should-not-use-namespace' } },
        },
      },
    },
    console,
  };
  vm.runInNewContext(source, context, { filename: 'root-key-autofill.js' });
  const api = context.window.GameModules.rootKeyAutofill;
  const store = { settingsState: { deepseekApiKey: '', pixaiApiKey: '' } };

  const used = await api.readFromDesktopBridge(store);
  assert.strictEqual(used, false);
  assert.strictEqual(store.settingsState.deepseekApiKey, '');

  api.readTextFileCandidates = async () => 'sk-from-root-file';
  await api.applyToStore(store);
  assert.strictEqual(store.settingsState.deepseekApiKey, 'sk-from-root-file');
  console.log('PASS root key autofill falls through to root txt file');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
