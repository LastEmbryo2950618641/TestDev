const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const relativeScriptPath = 'real-world-settlement-actions.js';

function loadActions(namedState) {
  const calls = { getByName: [], save: [] };
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    window: {
      GameModules: {
        characterStateStore: {
          getByName: (name) => {
            calls.getByName.push(name);
            return namedState?.profile?.name === name ? namedState : null;
          },
          save: async (state) => calls.save.push(state),
        },
        metrics: {
          clamp: (value) => Math.max(0, Math.min(100, Number(value))),
          clampDelta: (value) => Math.max(-100, Math.min(100, Number(value))),
          lockedPlayerDelta: (_key, delta) => delta,
          metricDeltaValue: (item) => item.delta,
          cleanMetricStatus: (status) => status,
          cleanMetricReason: (reason) => reason,
        },
        updateRegistry: {
          normalizeSettlementText: (text) => String(text || '').trim(),
          settlementGroups: () => [],
        },
        progression: {
          percent: (pool) => Math.round((pool.current / pool.max) * 100),
          ensureStateMechanics: () => {},
          deltaPool: (pool, delta) => {
            pool.current = Math.max(0, Math.min(pool.max, pool.current + (pool.max * delta) / 100));
          },
        },
      },
    },
  });
  const source = fs.readFileSync(path.join(root, 'publish', relativeScriptPath), 'utf8');
  vm.runInContext(source, context, { filename: `publish/${relativeScriptPath}` });
  return { actions: context.window.GameModules.realWorldSettlementActions, calls };
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

async function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'boot', 'scripts.json'), 'utf8'));
  assert.ok(manifest.includes(relativeScriptPath), 'real-world settlement actions must load at runtime');

  const npc = { id: 'npc-1', profile: { name: '刘思琪' }, values: {} };
  const { actions, calls } = loadActions(npc);
  const runtime = {
    ...actions,
    playerName: '刘悠',
    playerIdentityState: () => ({ id: 'player-self', profile: { name: '刘悠' } }),
    itemSkillState: () => null,
    itemSkillStateLabel: (state) => state.profile?.name || state.id,
    ensureStateMetrics: () => ({ emotions: { 喜悦: 20 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} }),
    phoneDate: () => new Date('2026-07-14T12:00:00.000Z'),
    rpgStates: {},
  };

  assert.deepStrictEqual(
    json(runtime.resolveCharacterSettlementCard(runtime, '刘思琪')),
    { id: 'role:npc-1', title: '刘思琪', section: '角色卡' },
  );
  assert.deepStrictEqual(calls.getByName, ['刘思琪']);
  assert.strictEqual(runtime.realWorldSettlementCardForGroup('公司：星河工作室').section, '势力卡');
  assert.strictEqual(runtime.realWorldSettlementCardForGroup('地图地点').section, '地图卡');
  assert.strictEqual(runtime.realWorldSettlementGroup('穿着', '外套'), '物品');

  const metricRows = runtime.realWorldMetricSettlement(
    { id: 'npc-1' },
    { emotions: [{ key: '喜悦', delta: 5, status: '心情转好', reason: '收到好消息' }] },
    '刘思琪',
  );
  assert.strictEqual(metricRows[0].field, '情绪');
  assert.strictEqual(metricRows[0].value, '20 → 25（心情转好）');
  assert.strictEqual(metricRows[0].reason, '收到好消息');

  const vitalState = {
    id: 'npc-1',
    profile: { name: '刘思琪' },
    values: {
      vitality: { current: 80, max: 100 },
      stamina_pool: { current: 50, max: 100 },
    },
  };
  const vitalRows = runtime.realWorldVitalSettlement(vitalState, [{ key: 'vitality', delta: -10, reason: '奔跑消耗' }]);
  assert.strictEqual(vitalRows[0].field, '生命体征');
  assert.strictEqual(vitalRows[0].name, '生命力');
  assert.strictEqual(vitalRows[0].value, '变化-10：80 → 70%');

  await runtime.applyRealWorldVitalUpdates(vitalState, [{ key: 'vitality', delta: -10, reason: '奔跑消耗' }]);
  assert.strictEqual(vitalState.values.health, 70);
  assert.strictEqual(calls.save.length, 1);
  assert.strictEqual(calls.save[0], vitalState);

  console.log('PASS real-world settlement runtime preserves card grouping, metrics, vitals, and unified state storage');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
