const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(rel, context) {
  const file = path.join(__dirname, '..', rel);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: rel });
}

function createContext() {
  const context = { console, setTimeout, window: { GameModules: {} } };
  context.window.window = context.window;
  vm.createContext(context);
  return context;
}

test('life-energy band maps source level to fixed exp windows', () => {
  const context = createContext();
  load('publish/progression-life-energy.js', context);
  const energy = context.window.GameModules.progressionLifeEnergy;
  const b1 = energy.bandForSourceLevel(1);
  assert.equal(b1.bandMin, 1);
  assert.equal(b1.bandMax, 10);
  assert.equal(energy.bandForSourceLevel(10).bandMax, 10);
  assert.equal(energy.bandForSourceLevel(11).bandMin, 11);
  assert.equal(energy.bandForSourceLevel(100).bandMin, 91);
});

test('life-energy clamp rejects out-of-band AI expGain', () => {
  const context = createContext();
  load('publish/progression-life-energy.js', context);
  const energy = context.window.GameModules.progressionLifeEnergy;
  const over = energy.clampExpGain(5, 999, 'peak');
  assert.equal(over.bandMin, 1);
  assert.equal(over.bandMax, 10);
  assert.equal(over.expGain, 10);
  const under = energy.clampExpGain(25, 1, 'low');
  assert.equal(under.expGain, 21);
});

test('growth potential scales AI exp: 50 neutral, 0 locks, decays with level', () => {
  const context = createContext();
  load('publish/progression.js', context);
  load('publish/progression-combat.js', context);
  const p = context.window.GameModules.progression;
  assert.equal(p.effectiveGrowthPotential({ growth_potential: 100, level: 1 }), 100 * (1 - 1 / 120));
  assert.equal(p.effectiveGrowthPotential({ growth_potential: 100, level: 60 }), 50);
  assert.equal(p.effectiveGrowthPotential({ growth_potential: 100, level: 120 }), 0);
  assert.equal(p.scaleExpByGrowthPotential({ growth_potential: 50, level: 1 }, 10).expGain, Math.round(10 * (50 * (1 - 1 / 120)) / 50));
  assert.equal(p.scaleExpByGrowthPotential({ growth_potential: 0, level: 1 }, 10).expGain, 0);
  assert.equal(p.scaleExpByGrowthPotential({ growth_potential: 100, level: 1 }, 10).expGain, Math.round(10 * (100 * (1 - 1 / 120)) / 50));
  assert.equal(p.scaleExpByGrowthPotential({ growth_potential: 25, level: 1 }, 10).expGain, Math.round(10 * (25 * (1 - 1 / 120)) / 50));
});

test('life-energy applyGain increases character exp and can level up', () => {
  const context = createContext();
  load('publish/progression.js', context);
  load('publish/progression-combat.js', context);
  load('publish/progression-life-energy.js', context);
  context.window.GameModules.rpgState = { seed: () => 1 };
  const energy = context.window.GameModules.progressionLifeEnergy;
  const progression = context.window.GameModules.progression;
  const state = {
    id: 'player-self',
    name: '测试者',
    profile: { name: '测试者', isPlayer: true },
    values: {
      level: 1,
      growth_potential: 50,
      exp: { current: 95, next: progression.nextCharacterExp(1), curve: '' },
      free_attribute_points: 0,
      level_growth: { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] },
      strength: 10, agility: 10, constitution: 10, intelligence: 10, perception: 10, willpower: 10, charisma: 10,
      vitality: { current: 100, max: 100 },
      stamina_pool: { current: 100, max: 100 },
      satiety: { current: 100, max: 100 },
      hydration: { current: 100, max: 100 },
      fatigue: { current: 0, max: 100 },
      mental_stability: { current: 100, max: 100 },
      action_ability: { current: 100, max: 100 },
      intrinsic_sources: {},
    },
  };
  const store = {
    rpgStates: { 'player-self': state },
    playerIdentityState: () => state,
    itemSkillState: (id) => (id === 'player-self' ? state : null),
  };
  const before = state.values.exp.current;
  // 跳过 ensureStateMechanics 的重依赖；applyGain 内已兜底 exp
  const result = energy.applyGain(store, {
    subject: { id: 'player-self', name: '测试者' },
    sourceType: 'kill',
    sourceName: '流浪野犬',
    sourceLevel: 8,
    quality: 'high',
    expGain: 80,
    evidence: '正文确认击杀并吸收能量',
  });
  assert.equal(result.ok, true);
  assert.equal(result.gain.expGain, 10);
  // 潜力50、Lv1：有效潜力≈49.17 → 实际经验 round(10*49.17/50)=10
  assert.equal(result.appliedExp, 10);
  assert.ok(state.values.level >= 1);
  assert.ok(state.values.exp.current !== before || state.values.level > 1);
});

test('life-energy applyGain with zero potential grants no exp', () => {
  const context = createContext();
  load('publish/progression.js', context);
  load('publish/progression-combat.js', context);
  load('publish/progression-life-energy.js', context);
  const energy = context.window.GameModules.progressionLifeEnergy;
  const progression = context.window.GameModules.progression;
  const state = {
    id: 'npc-a',
    name: '定型者',
    profile: { name: '定型者' },
    values: {
      level: 20,
      growth_potential: 0,
      exp: { current: 10, next: progression.nextCharacterExp(20), curve: '' },
      free_attribute_points: 0,
      level_growth: { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] },
      strength: 10, agility: 10, constitution: 10, intelligence: 10, perception: 10, willpower: 10, charisma: 10,
      vitality: { current: 100, max: 100 },
      stamina_pool: { current: 100, max: 100 },
      satiety: { current: 100, max: 100 },
      hydration: { current: 100, max: 100 },
      fatigue: { current: 0, max: 100 },
      mental_stability: { current: 100, max: 100 },
      action_ability: { current: 100, max: 100 },
      intrinsic_sources: {},
    },
  };
  const store = {
    rpgStates: { 'npc-a': state },
    itemSkillState: (id) => (id === 'npc-a' || id === '定型者' ? state : null),
  };
  const result = energy.applyGain(store, {
    subject: { id: 'npc-a', name: '定型者' },
    sourceType: 'kill',
    sourceName: '猎物',
    sourceLevel: 15,
    quality: 'normal',
    expGain: 15,
  });
  assert.equal(result.ok, true);
  assert.equal(result.appliedExp, 0);
  assert.equal(state.values.exp.current, 10);
  assert.equal(state.values.level, 20);
});

test('life-energy stage parser accepts gains and learnedGains payload', () => {
  const context = createContext();
  load('publish/inference/life-energy-stage.js', context);
  const stage = context.window.GameModules.inferenceLifeEnergyStage;
  const parsed = stage.parseGainsPayload('{"gains":[{"subject":{"id":"player-self","name":"A"},"sourceType":"kill","sourceName":"虫","sourceLevel":3,"quality":"normal","expGain":3,"evidence":"击杀"}],"learnedGains":[{"subject":{"id":"player-self","name":"A"},"learnedType":"skill","name":"观察","expGain":12,"evidence":"练习"}],"done":true}');
  assert.equal(parsed.gains.length, 1);
  assert.equal(parsed.gains[0].sourceLevel, 3);
  assert.equal(parsed.learnedGains.length, 1);
  assert.equal(parsed.learnedGains[0].name, '观察');
});

test('applyLearnedGain writes skill exp and ignores unknown names', () => {
  const context = createContext();
  load('publish/progression.js', context);
  load('publish/progression-definitions.js', context);
  load('publish/progression-combat.js', context);
  load('publish/progression-life-energy.js', context);
  const energy = context.window.GameModules.progressionLifeEnergy;
  const skill = {
    name: '编程与软件开发',
    type: '技能',
    level: 4,
    exp: { current: 10, next: 1400, curve: 'x' },
  };
  const state = {
    id: 'player-self',
    name: '刘悠',
    profile: { name: '刘悠', isPlayer: true },
    values: {
      level: 12,
      growth_potential: 50,
      skills: [skill],
      knowledge: [],
      professions: [],
    },
  };
  const store = {
    rpgStates: { 'player-self': state },
    playerIdentityState: () => state,
    itemSkillState: (id) => (id === 'player-self' || id === '刘悠' ? state : null),
  };
  const ok = energy.applyLearnedGain(store, {
    subject: { id: 'player-self', name: '刘悠' },
    learnedType: 'skill',
    name: '编程与软件开发',
    expGain: 20,
    evidence: '调试模块',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.appliedExp, 20);
  assert.equal(skill.exp.current, 30);
  const miss = energy.applyLearnedGain(store, {
    subject: { id: 'player-self', name: '刘悠' },
    learnedType: 'skill',
    name: '不存在的技能',
    expGain: 20,
  });
  assert.equal(miss.ok, false);
});
