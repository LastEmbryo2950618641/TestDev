const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createContext() {
  const context = {
    console,
    performance: { now: () => 0 },
    setTimeout,
    window: {},
  };
  context.window.window = context.window;
  context.window.console = console;
  context.window.GameModules = {
    jsonUtils: {
      extractJson(text = '') {
        const raw = String(text || '').trim();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start < 0 || end < start) throw new Error('JSON missing');
        return raw.slice(start, end + 1);
      },
      repairJson(text = '') { return String(text || ''); },
      parseLoose(text = '') {
        const json = this.extractJson(text).replace(/,\s*\}/g, '}');
        return JSON.parse(json);
      },
      mergeStreamText(a = '', b = '') { return `${a}${b}`; },
    },
    aiRequest: { outputTailLooksTruncated: () => false, complete: async () => '{}' },
    ai: {
      normalizeChoices(choices, fallback = []) {
        return Array.isArray(choices) && choices.length ? choices.slice(0, 4) : fallback.slice(0, 4);
      },
      normalizeCharacter(item) { return item; },
    },
    promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
    updateRegistry: null,
    sqliteSave: {
      getCharacterState: () => null,
      getCharacterStateByName: () => null,
      saveCharacterState: async () => {},
    },
    initPromptRegistry: {
      skillText: () => '',
      schema: () => ({ initUpdates: [] }),
      canonicalSkillIds: (ids = []) => ids,
      ensureTemplateState(_template, state) {
        state.values = state.values || {};
        state.values.intimacy = state.values.intimacy || {};
        state.values.bodyStatus = state.values.bodyStatus || {};
      },
    },
  };
  return vm.createContext(context);
}

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

function loadCore(context) {
  loadScript(context, 'publish/prompts/materials/real-world-materials.js');
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/update/generic-update-applier.js');
  loadScript(context, 'publish/update/sexual-experience-update.js');
  loadScript(context, 'publish/update/sexual-history-update.js');
  loadScript(context, 'publish/update/body-status-update.js');
  if (fs.existsSync(path.join(root, 'publish/update/wearing-state-update.js'))) loadScript(context, 'publish/update/wearing-state-update.js');
  loadScript(context, 'publish/inference/agent-context-core.js');
  loadScript(context, 'publish/inference/material-request-catalog.js');
  loadScript(context, 'publish/inference/scene-boundary.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
}

const context = createContext();
loadCore(context);
const loop = context.window.GameModules.realWorldAgentLoop;
const raw = '{"plan":"资料足够","status":"资料已足够","sceneQueries":{"location":[],"causality":[],"conflict":[]},"participants":{"forced":[],"priority":[],"drama":[],"forbidden":[]},"factions":[],"randomEvents":[],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":[]}';
const parsed = loop.parseStep(raw, loop.realConfig());
assert.strictEqual(parsed.type, 'context_done');
assert.strictEqual(parsed.reason, '资料足够');
assert.strictEqual(Array.isArray(parsed.requests), true);
assert.strictEqual(parsed.requests.length, 0);
console.log('PASS stage1 parser accepts strict JSON object');

assert.throws(
  () => loop.parseStep('{"plan":"旧壳","status":"资料已足够","sceneQueries":{"location":[],"causality":[],"conflict":[]},"participants":{"forced":[],"priority":[],"drama":[],"forbidden":[]},"factions":["成都市高新区科创有限公司(待创建)"],"randomEvents":[],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":[]}', loop.realConfig()),
  /factions 必须是标准 JSON 对象数组/,
);
assert.throws(
  () => loop.parseStep('说明文字\n{"plan":"JSON外壳","status":"资料已足够","sceneQueries":{"location":[],"causality":[],"conflict":[]},"participants":{"forced":[],"priority":[],"drama":[],"forbidden":[]},"factions":[],"randomEvents":[],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":[]}', loop.realConfig()),
  /必须返回标准 JSON/,
);
console.log('PASS stage1 parser rejects string-shell factions and JSON wrapper text');

const nullFactionRaw = '{"plan":"资料足够但有待建势力","status":"资料已足够","sceneQueries":{"location":[],"causality":[],"conflict":[]},"participants":{"forced":[],"priority":[],"drama":[],"forbidden":[]},"factions":[{"name":"成都市高新区科创有限公司","id":null,"status":"待创建"},{"name":"中华人民共和国","id":"country-china","status":"已获取"}],"randomEvents":[],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":[]}';
const factionRaw = '{"plan":"资料足够但有待建势力","status":"资料已足够","sceneQueries":{"location":[],"causality":[],"conflict":[]},"participants":{"forced":[],"priority":[],"drama":[],"forbidden":[]},"factions":[{"name":"成都市高新区科创有限公司","id":"","status":"待创建"},{"name":"中华人民共和国","id":"country-china","status":"已获取"}],"randomEvents":[],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":[]}';
const factionParsed = loop.parseStep(factionRaw, loop.realConfig());
assert.strictEqual(factionParsed.type, 'context_done');
assert.strictEqual(Array.from(factionParsed.factions).map((item) => `${item.name}:${item.pending ? 'pending' : item.id}`).join('|'), '成都市高新区科创有限公司:pending|中华人民共和国:country-china');
assert.strictEqual(factionParsed.requests.length, 0);
const materialSession = context.window.GameModules.realWorldMaterials.createSession('行动');
const nullParsed = loop.parseStep(nullFactionRaw, loop.realConfig());
assert.strictEqual(Array.from(nullParsed.factions).map((item) => `${item.name}:${item.pending ? 'pending' : item.id}`).join('|') , '成都市高新区科创有限公司:pending|中华人民共和国:country-china');
const pending = loop.recordStage1PendingFactions(materialSession, factionParsed.factions, factionRaw);
assert.strictEqual(pending.length, 1);
assert.strictEqual(materialSession.pendingFactionCandidates[0].name, '成都市高新区科创有限公司');
console.log('PASS stage1 factions field records pending candidate without keeping Stage1 open');

// Verify resolveStage1Factions resolves existing and pending correctly
const resolveStore = { factionState: { factions: [{ id: 'country-china', name: '中华人民共和国', type: '国家', structure: [], solid: { overviewPanels: {} } }] }, initFactionSystem() {} };
const resolveResult = loop.resolveStage1Factions(materialSession, factionParsed.factions, resolveStore, new Set(), context.window.GameModules.realWorldMaterials);
const countryResolved = resolveResult.items.find((it) => it.name === '中华人民共和国');
const kejiPending = resolveResult.items.find((it) => it.name === '成都市高新区科创有限公司');
assert.strictEqual(countryResolved.status, '已获取');
assert.strictEqual(countryResolved.id, 'country-china');
assert.strictEqual(kejiPending.status, '待创建');
assert.ok(kejiPending.id.startsWith('force-pending-'));
// Pending candidate should be recorded with status
const updatedCandidates = context.window.GameModules.realWorldMaterials.pendingFactionCandidates(materialSession);
const kejiCandidate = updatedCandidates.find((c) => c.name === '成都市高新区科创有限公司');
assert.strictEqual(kejiCandidate.status, '待创建');
console.log('PASS resolveStage1Factions: existing resolved, pending gets generated ID with status');

const inferenceContext = loop.pendingFactionInferenceContext(materialSession, loop.realConfig());
assert.ok(inferenceContext.includes('成都市高新区科创有限公司'));
assert.ok(inferenceContext.includes('场景锚定与正文'));
assert.ok(inferenceContext.includes('不得编造势力ID'));
console.log('PASS Stage1 pending factions become downstream inference context');

const stage9Context = loop.buildFactionStage9Context({
  base: '基础上下文：刘悠任职于科创公司。',
  loaded: [{ title: '刘悠角色卡', text: '职业：软件工程师；单位：成都市高新区科创有限公司。' }],
  trace: [{ step: 1, factions: factionParsed.factions, reason: '识别工作单位' }],
  sceneAnchor: { data: { currentLocation: '刘悠家中', currentAction: '前往刘思琪房间' } },
  updates: { 人事归属: [] },
  participants: [{ id: 'player-self', name: '刘悠' }],
  materialSession,
  config: loop.realConfig(),
});
assert.ok(stage9Context.includes('基础上下文：刘悠任职于科创公司。'));
assert.ok(stage9Context.includes('职业：软件工程师'));
assert.ok(stage9Context.includes('识别工作单位'));
assert.ok(stage9Context.includes('成都市高新区科创有限公司'));
assert.ok(stage9Context.includes('刘悠家中'));
console.log('PASS Stage9 review context contains the complete inference chain');

