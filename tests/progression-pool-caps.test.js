const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(rel, context) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'), context, { filename: rel });
}

test('poolCaps uses intrinsic formulas for satiety hydration fatigue', () => {
  const context = { console, window: { GameModules: {} } };
  context.window.window = context.window;
  vm.createContext(context);
  load('publish/progression.js', context);
  load('publish/progression-combat.js', context);
  const p = context.window.GameModules.progression;
  const caps = p.poolCaps({
    level: 10,
    strength: 12,
    agility: 10,
    constitution: 14,
    perception: 11,
    willpower: 13,
  }, {});
  assert.equal(caps.satiety, 30 + 10 * 2 + 14 * 3 + 12);
  assert.equal(caps.hydration, 30 + 10 * 2 + 14 * 2 + 11 * 2 + 13);
  assert.equal(caps.fatigue, 30 + 10 * 2 + 14 * 2 + 13 * 3);
  assert.equal(caps.vitality, 10 * 10 + 14 * 8);
  assert.equal(caps.stamina, 10 * 8 + 14 * 5);
});

test('recalculatePools refreshes satiety hydration fatigue max and keeps ratio', () => {
  const context = { console, window: { GameModules: {} } };
  context.window.window = context.window;
  vm.createContext(context);
  load('publish/progression.js', context);
  load('publish/progression-combat.js', context);
  const p = context.window.GameModules.progression;
  const values = {
    level: 5,
    strength: 10,
    agility: 10,
    constitution: 10,
    intelligence: 10,
    perception: 10,
    willpower: 10,
    charisma: 10,
    satiety: { current: 50, max: 100 },
    hydration: { current: 80, max: 100 },
    fatigue: { current: 20, max: 100 },
    vitality: { current: 100, max: 100 },
    stamina_pool: { current: 100, max: 100 },
    mental_stability: { current: 100, max: 100 },
    action_ability: { current: 100, max: 100 },
  };
  p.recalculatePools(values, true, {});
  const caps = p.poolCaps(values, {});
  assert.equal(values.satiety.max, caps.satiety);
  assert.equal(values.hydration.max, caps.hydration);
  assert.equal(values.fatigue.max, caps.fatigue);
  assert.equal(values.satiety.current, Math.round(caps.satiety * 0.5));
  assert.equal(values.hydration.current, Math.round(caps.hydration * 0.8));
  assert.equal(values.fatigue.current, Math.round(caps.fatigue * 0.2));
});

test('ensureStateMechanics upgrades legacy max 100 pools to formula caps', () => {
  const context = { console, window: { GameModules: { rpgState: { seed: () => 1 } } } };
  context.window.window = context.window;
  vm.createContext(context);
  load('publish/progression.js', context);
  load('publish/progression-definitions.js', context);
  load('publish/progression-combat.js', context);
  const p = context.window.GameModules.progression;
  const values = {
    level: 12,
    strength: 6,
    agility: 7,
    constitution: 8,
    intelligence: 15,
    perception: 11,
    willpower: 12,
    charisma: 9,
    exp: { current: 22, next: 6035, curve: 'nextExp=round(100*level^1.65)' },
    free_attribute_points: 0,
    level_growth: { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] },
    skills: [{ name: '观察', type: '技能', level: 1 }],
    vitality: { current: 162, max: 184 },
    stamina_pool: { current: 105, max: 136 },
    satiety: { current: 72, max: 100 },
    hydration: { current: 88, max: 100 },
    fatigue: { current: 21, max: 100 },
    mental_stability: { current: 12, max: 100 },
    action_ability: { current: 10, max: 86 },
  };
  values.intrinsic_sources = Object.fromEntries(
    ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']
      .map((k) => [k, { initial: values[k], level: 0, allocated: 0, npc: 0 }]),
  );
  const state = { values, name: '刘悠', worldTag: '2026', profile: {} };
  assert.equal(p.ensureStateMechanics(state), true);
  const caps = p.poolCaps(values, {});
  assert.equal(values.satiety.max, caps.satiety);
  assert.equal(values.hydration.max, caps.hydration);
  assert.equal(values.fatigue.max, caps.fatigue);
  assert.equal(values.mental_stability.max, caps.mental);
  assert.equal(caps.satiety, 84);
  assert.equal(caps.hydration, 104);
  assert.equal(caps.fatigue, 106);
  assert.equal(caps.mental, 118);
});
