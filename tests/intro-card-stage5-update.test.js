const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(context, relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

async function run() {
  const savedCards = [];
  const cards = new Map();
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        platform: {
          storage: {
            characterIntroSource: {
              get(name, worldTag) {
                return [...cards.values()].find((card) => card.name === name && card.worldTag === worldTag) || null;
              },
              getById(id) {
                return cards.get(id) || null;
              },
              list() {
                return [...cards.values()];
              },
              async saveCharacterIntro(card) {
                cards.set(card.id, JSON.parse(JSON.stringify(card)));
                savedCards.push(JSON.parse(JSON.stringify(card)));
                return card;
              },
              async save(card) {
                cards.set(card.id, JSON.parse(JSON.stringify(card)));
                savedCards.push(JSON.parse(JSON.stringify(card)));
                return card;
              },
            },
          },
        },
        realWorld2026: { label: '2026 现代都市现实世界' },
        characterStateStore: { get() { return null; }, getByName() { return null; }, list() { return []; } },
        characterQuery: { normalizeWorldTag(value) { return value; }, worldMatches(a, b) { return !a || !b || a === b; } },
        characterIdEnsure: { isRealCharacterId(id) { return /^rel-ai-/u.test(id); } },
      },
    },
  });

  load(context, 'publish/character-social-drive.js');
  load(context, 'publish/character-intro-store.js');
  load(context, 'publish/character-intro-card.js');
  load(context, 'publish/inference/intro-card-stage-update.js');

  const stage = context.window.GameModules.inferenceIntroCardStageUpdate;
  const prompts = [];
  const configs = [];
  const loop = {
    markConfiguredStep() {},
    patchConfiguredSettlementThinking() {},
    async renderPrompt(id, vars) {
      prompts.push({ id, vars });
      return JSON.stringify(vars);
    },
    async completeConfiguredStep(_store, _prompt, _logId, _stream, config) {
      configs.push(config);
      return JSON.stringify({
        ops: [
          { id: 'rel-ai-meimei', field: 'identity.role', op: 'set', value: '成都七中初三学生', reason: '正文确认其为学生' },
          { id: 'rel-ai-meimei', field: 'social.familiarity', op: 'delta', value: 6, reason: '本轮发生直接互动' },
          { id: 'rel-ai-meimei', field: 'memory.facts', op: 'add', value: '在小区门口与玩家短暂交谈', reason: '正文事实' },
        ],
        done: true,
      });
    },
  };

  const result = await stage.runAfterSettlement({
    store: { currentWorldTag: () => '2026 现代都市现实世界' },
    updates: {
      appearedCharacters: [{ id: 'rel-ai-meimei', name: '妹妹', role: '学生', intro: '本轮出现的人物' }],
    },
    narration: '妹妹在小区门口与玩家短暂交谈。',
    participants: [{ id: 'rel-ai-meimei', name: '妹妹' }],
    logId: 'log-1',
    config: { label: '现实', kvCacheSession: { id: 'post-body-fork' } },
    loop,
  });

  assert.strictEqual(prompts.length, 1, 'Stage5 should render one AI prompt');
  assert.strictEqual(configs.length, 1, 'Stage5 should make one AI request');
  assert.strictEqual(configs[0].kvCacheSession.id, 'post-body-fork', 'Stage5 should reuse post-body KV config');
  assert.strictEqual(result.applied.length, 3);
  const saved = cards.get('rel-ai-meimei');
  assert.strictEqual(saved.identity.role, '成都七中初三学生');
  assert.strictEqual(saved.social.familiarity, 6);
  assert.deepStrictEqual(saved.memory.facts, ['在小区门口与玩家短暂交谈']);
  assert.strictEqual(saved.displayType, undefined, 'runtime-only displayType must not be persisted');
  assert.ok(savedCards.length >= 2, 'ensure and AI apply should save cards');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
