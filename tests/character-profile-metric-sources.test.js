const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const relativeScriptPath = 'character-profile-metric-sources.js';

function createRuntime(existingState = null) {
  const storeCalls = { get: [], save: [] };
  const originalEnsureCalls = [];
  const profileTool = {
    ensure: async (...args) => {
      originalEnsureCalls.push(args);
      return { id: 'original' };
    },
    normalize: (raw) => ({ ...raw }),
    inputSignature: () => 'signature-1',
    findSavedRoleCard: () => null,
    isReusableRoleCard: () => false,
    isRoleCard: () => true,
    hasRequiredRoleCardFieldReasons: () => true,
    hasRequiredInventoryReasons: () => true,
    hasRequiredRpgFieldReasons: () => true,
    initialMetricsComplete: () => true,
    withSignature: (profile, signature) => ({ ...profile, roleCardInputSignature: signature }),
  };
  const context = vm.createContext({
    console,
    Map,
    Object,
    Set,
    String,
    window: {
      GameModules: {
        characterProfile: profileTool,
        characterProfileSource: {
          resolve: async (raw) => ({ raw, preset: null }),
        },
        characterStateStore: {
          get: (id) => {
            storeCalls.get.push(id);
            return existingState;
          },
          save: async (state) => storeCalls.save.push(state),
        },
        metrics: {
          emotionKeys: ['喜悦'],
          playerKeys: ['信任'],
          clamp: (value) => Math.max(-100, Math.min(100, Number(value))),
          normalizeKey: (key) => key,
        },
      },
    },
  });

  const source = fs.readFileSync(path.join(root, 'publish', relativeScriptPath), 'utf8');
  vm.runInContext(source, context, { filename: `publish/${relativeScriptPath}` });
  return { profileTool, storeCalls, originalEnsureCalls };
}

async function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'boot', 'scripts.json'), 'utf8'));
  assert.ok(manifest.includes(relativeScriptPath), 'character profile metric sources must load at runtime');

  const existingState = {
    profile: {
      id: 'character-1',
      roleCard: true,
      roleCardInputSignature: 'signature-1',
      initialMetrics: {},
    },
  };
  const { profileTool, storeCalls } = createRuntime(existingState);

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(profileTool.metricSourceMap('ai'))),
    { 数值: 'AI', 解释: 'AI', 原因: 'AI' },
  );
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(profileTool.metricSources({ metricSources: { 数值: 'AI' } }))),
    { 数值: 'AI', 解释: '系统', 原因: '系统' },
  );

  const merged = profileTool.mergeMetricAiFields(
    { value: 10, status: '保留解释', reason: '旧原因', metricSources: { 数值: 'AI', 解释: 'AI', 原因: '系统' } },
    { value: 80, status: '新解释', reason: '新原因' },
  );
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(merged)),
    { value: 10, status: '保留解释', reason: '新原因', metricSources: { 数值: 'AI', 解释: 'AI', 原因: 'AI' } },
  );

  profileTool.initialMetricRepairable = () => true;
  profileTool.ensureInitialMetricSources = async (profile) => ({ ...profile, repaired: true });
  const ensured = await profileTool.ensure({ id: 'character-1' }, {});

  assert.deepStrictEqual(storeCalls.get, ['character-1']);
  assert.strictEqual(storeCalls.save.length, 1);
  assert.strictEqual(storeCalls.save[0], existingState);
  assert.strictEqual(ensured.repaired, true);
  assert.strictEqual(ensured.roleCardInputSignature, 'signature-1');

  console.log('PASS character profile metric sources preserve source fields and unified state-store repair');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
