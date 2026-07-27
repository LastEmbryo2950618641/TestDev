const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ROLE_CARD = '\u89d2\u8272\u5361';

const player = {
  id: 'player-self',
  profile: { id: 'player-self', name: 'Liu You', factions: [], memberships: [], certificates: [], titles: [] },
  values: { factions: [], memberships: [], skills: [], knowledge: [], professions: [] },
};
const store = {
  playerName: 'Liu You',
  playerProfile: player.profile,
  playerIdentityState: () => player,
  itemSkillState: (id) => id === player.id ? player : null,
};
const context = vm.createContext({
  console,
  performance: { now: () => 0 },
  setTimeout,
  window: {
    GameModules: {
      characterStateStore: { save: () => {} },
      jsonUtils: {
        extractJson(text = '') {
          const raw = String(text).trim();
          return raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        },
        repairJson: (text = '') => String(text),
        parseLoose(text = '') { return JSON.parse(this.extractJson(text)); },
        mergeStreamText: (a = '', b = '') => `${a}${b}`,
      },
      aiRequest: { outputTailLooksTruncated: () => false, complete: async () => '{}' },
      ai: {
        normalizeChoices: (choices, fallback = []) => Array.isArray(choices) && choices.length ? choices : fallback,
        normalizeCharacter: (item) => item,
      },
      promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
      initPromptRegistry: {
        skillText: () => '',
        schema: () => ({ initUpdates: [] }),
        canonicalSkillIds: (ids = []) => ids,
        ensureTemplateState(_template, state) { state.values = state.values || {}; },
      },
    },
  },
});
context.window.window = context.window;
context.window.console = console;

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

for (const file of [
  'publish/social-position.js',
  'publish/rpg-state.js',
  'publish/progression.js',
  'publish/progression-definitions.js',
  'publish/character-card-update-operations.js',
  'publish/real-world-agent-context.js',
  'publish/real-world-agent-loop.js',
]) load(file);

const subject = { type: 'player', id: player.id, name: player.profile.name };
const entries = [
  { subject, field: 'factions', op: 'add', value: { faction: 'Liu Family', role: 'Elder Brother' }, reason: 'family fact' },
  { subject, field: 'memberships', op: 'add', value: { orgName: 'Chengdu Yoyun Technology Co., Ltd.', title: 'Software Engineer', department: 'Platform R&D' }, reason: 'employment fact' },
  { subject, field: 'certificates', op: 'add', value: { orgName: 'Sichuan University', field: 'Computer Science', level: 'Master Degree' }, reason: 'education fact' },
  { subject, field: 'titles', op: 'add', value: { society: 'Chengdu Developer Community', field: 'Open Source', title: 'Annual Contributor' }, reason: 'award fact' },
];

const parsed = context.window.GameModules.realWorldAgentLoop.parseSettlementJson(
  JSON.stringify({ [ROLE_CARD]: entries }),
  { requestedTypes: [ROLE_CARD], participants: [subject], store },
);
assert.deepStrictEqual(Array.from(parsed.completeTypes), [ROLE_CARD]);
assert.deepStrictEqual(Array.from(parsed.incompleteTypes), []);
assert.strictEqual(parsed.genericUpdates.length, 4);
assert.ok(parsed.genericUpdates.every((update) => update.updateType === 'role-card-operation'));

(async () => {
  const operations = parsed.genericUpdates.map((update) => update.operation);
  const result = await context.window.GameModules.characterCardUpdateOperations.applyMany(store, operations);
  assert.strictEqual(result.applied.length, 4);
  assert.strictEqual(player.profile.factions[0].role, 'Elder Brother');
  assert.strictEqual(player.profile.memberships[0].title, 'Software Engineer');
  assert.strictEqual(player.profile.certificates[0].level, 'Master Degree');
  assert.strictEqual(player.profile.titles[0].title, 'Annual Contributor');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(player.values.factions)), JSON.parse(JSON.stringify(player.profile.factions)));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(player.values.memberships)), JSON.parse(JSON.stringify(player.profile.memberships)));

  const legacy = context.window.GameModules.realWorldAgentLoop.parseSettlementJson(
    JSON.stringify({ [ROLE_CARD]: [{ subject: 'Liu You', field: '\u4eba\u4e8b\u5f52\u5c5e', op: '\u589e\u52a0', value: 'Some Company/Engineer', reason: 'legacy format' }] }),
    { requestedTypes: [ROLE_CARD], participants: [subject], store },
  );
  assert.deepStrictEqual(Array.from(legacy.completeTypes), []);
  assert.deepStrictEqual(Array.from(legacy.incompleteTypes), [ROLE_CARD]);
  assert.strictEqual(legacy.genericUpdates.length, 0);

  const missingTarget = context.window.GameModules.characterCardUpdateOperations.apply(store, {
    subject,
    field: 'memberships',
    op: 'replace',
    target: { orgName: 'Missing Company', title: 'Engineer' },
    value: { orgName: 'Missing Company', title: 'Senior Engineer' },
    reason: 'invalid replacement',
  });
  assert.strictEqual(missingTarget.applied, false);
  assert.strictEqual(player.profile.memberships.length, 1, 'replace must not degrade into an upsert');

  console.log('PASS settlement social pipeline uses exact typed role-card operations');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
