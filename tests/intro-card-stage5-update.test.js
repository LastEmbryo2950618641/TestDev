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
        characterIdEnsure: {
          isPendingId(id = '') { return /^(?:pending|new|待建卡|\?)$/iu.test(String(id || '').trim()); },
          isRealCharacterId(id) { return /^rel-ai-/u.test(id); },
          allocateId(name = '') { return `rel-ai-${name === '妹妹' ? 'meimei' : 'new'}`; },
        },
      },
    },
  });

  load(context, 'publish/character-social-drive.js');
  load(context, 'publish/character-intro-store.js');
  load(context, 'publish/character-intro-card.js');
  load(context, 'publish/prompts/推演引擎/stage5-intro-card-update.js');
  load(context, 'publish/inference/intro-card-stage-update.js');

  const stage = context.window.GameModules.inferenceIntroCardStageUpdate;
  const prompts = [];
  const configs = [];
  let requestCount = 0;
  const loop = {
    markConfiguredStep() {},
    patchConfiguredSettlementThinking() {},
    async completeCachedJsonPrompt(_store, config) {
      configs.push(config);
      prompts.push(config.prompt);
      requestCount += 1;
      if (requestCount === 1) {
        return JSON.stringify({
          candidates: [
            {
              name: '妹妹',
              worldTag: '2026 现代都市现实世界',
              presenceKind: 'individual',
              role: '学生',
              reason: 'Stage1 待建卡且正文实际出现',
            },
          ],
          done: true,
        });
      }
      if (requestCount === 2) {
        return JSON.stringify({
          cards: [
            {
              id: 'rel-ai-meimei',
              name: '妹妹',
              worldTag: '2026 现代都市现实世界',
              presenceKind: 'individual',
              identity: { role: '学生', job: '初中生' },
              persona: { background: '本轮出现的人物', personality: '熟悉', appearance: '' },
              social: { relationToPlayer: '家人', familiarity: 0, affection: 0 },
              agenda: { short: '', deadline: '', needPlayer: false, needPlayerWhy: '', urgency: 0 },
              routine: { tags: ['学生'] },
              memory: { facts: [] },
            },
          ],
          done: true,
        });
      }
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
    updates: {},
    narration: '妹妹在小区门口与玩家短暂交谈。',
    participants: [{ id: '待建卡', name: '妹妹' }],
    effectiveSceneLayers: {
      forcedParticipants: [{ id: '待建卡', name: '妹妹' }],
      priorityCandidates: [],
      dramaCandidates: [],
      forbiddenParticipants: [],
    },
    logId: 'log-1',
    config: { label: '现实', kvCacheSession: { id: 'post-body-fork' } },
    loop,
  });

  assert.strictEqual(prompts.length, 3, 'Stage5 should render candidate, create and update prompts');
  assert.strictEqual(configs.length, 3, 'Stage5 should make three AI requests');
  assert.strictEqual(configs[0].kvCacheSession.id, 'post-body-fork', 'Stage5-0 should reuse post-body KV config');
  assert.strictEqual(configs[1].kvCacheSession.id, 'post-body-fork', 'Stage5-1 should reuse post-body KV config');
  assert.strictEqual(configs[2].kvCacheSession.id, 'post-body-fork', 'Stage5-2 should reuse post-body KV config');
  assert.ok(String(prompts[0] || '').includes('Stage5-0 介绍卡候选判定'));
  assert.ok(String(prompts[0] || '').includes('一类人/团体原型'), 'Stage5-0 should use the MD-synced group archetype rules');
  assert.ok(String(prompts[1] || '').includes('Stage5-1 介绍卡建卡'));
  assert.ok(String(prompts[1] || '').includes('rel-ai-meimei'));
  assert.ok(String(prompts[2] || '').includes('Stage5-2 介绍卡更新'));
  assert.strictEqual(result.applied.length, 3);
  const saved = cards.get('rel-ai-meimei');
  assert.strictEqual(saved.identity.role, '成都七中初三学生');
  assert.strictEqual(saved.social.familiarity, 6);
  assert.deepStrictEqual(saved.memory.facts, ['在小区门口与玩家短暂交谈']);
  assert.strictEqual(saved.displayType, undefined, 'runtime-only displayType must not be persisted');
  assert.ok(savedCards.length >= 2, 'create and update should both save cards');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
