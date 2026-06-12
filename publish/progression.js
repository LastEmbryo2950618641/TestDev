window.GameModules = window.GameModules || {};

window.GameModules.progression = {
  learnedNext: [0, 100, 250, 600, 1400, 3200, 7200, Infinity],

  schemaSections(attrs) {
    return [
      { title: '基础能力', fields: [
        this.field('world_tag', '所属世界', 'text', 0, 100, '角色所属的作品或世界。'), this.field('age', '年龄', 'number', 0, 999, '角色在当前进入时间点的年龄。'),
        this.field('level', '个人等级', 'number', 1, 100, '角色综合成长阶段。'), this.field('exp', '个人经验', 'text', 0, 100, '当前经验与升到下一级所需经验。'),
        this.field('free_attribute_points', '自由属性点', 'number', 0, 999, '升级获得、可用于分配到身内能力的点数。'), this.field('level_growth', '升级成长记录', 'text', 0, 100, '个人等级提升时自动加点与自由属性点记录。'),
        this.field('vitality', '生命力', 'text', 0, 100, '当前承伤、生存与身体完整状态。'), this.field('stamina_pool', '精力池', 'text', 0, 100, '体能、耐力与持续行动余量。'),
        this.field('satiety', '饱食度', 'text', 0, 100, '进食状态对体力与恢复的影响。'), this.field('hydration', '水分', 'text', 0, 100, '补水状态对体力与判断的影响。'),
        this.field('fatigue', '疲劳度', 'text', 0, 100, '累积疲惫、伤痛和行动消耗。'), this.field('learning_ability', '学习能力', 'number', 0, 100, '理解、模仿和掌握新知识技能的效率。'),
        this.field('mental_stability', '精神稳定', 'text', 0, 100, '心理稳定、创伤压力和判断能力。'), this.field('growth_potential', '成长潜力', 'number', 0, 100, '未来继续成长与突破的空间。'),
        this.field('action_ability', '行动能力', 'text', 0, 100, '可执行行动的灵活度、协调性与主动性。'),
      ] },
      { title: '身内能力', fields: [
        ['strength', '力量', '肌肉力量、爆发力与近战压制能力。'], ['agility', '敏捷', '速度、反应和身体协调性。'],
        ['constitution', '体质', '抗伤、耐受、恢复和身体基础强度。'], ['intelligence', '智力', '理解、推理、知识运用和术式分析能力。'],
        ['perception', '感知', '观察、直觉、索敌和异常察觉能力。'], ['willpower', '意志', '忍耐、抗压、抵抗精神干涉和坚持目标的能力。'],
        ['charisma', '魅力', '外在吸引力、表达力和影响他人的能力。'],
      ].map(([key, label, desc]) => this.field(key, label, 'number', 0, 100, desc)) },
      { title: '习得与职业', fields: [
        this.field('knowledge', '知识储备', 'list', 0, 100, '已掌握的知识领域及等级。'), this.field('skills', '技能等级', 'list', 0, 100, '经过学习或训练获得的技能等级。'),
        this.field('professions', '职业等级', 'list', 0, 100, '已固化的真实职业、训练身份或社会功能。'), this.field('factions', '阵营地位', 'list', 0, 100, '所属势力、社会关系或阵营位置。'),
        this.field('equipment', '装备', 'list', 0, 100, '当前持有或可调用的重要装备。'), this.field('status_tags', '状态标签', 'list', 0, 100, '当前处境、身份标签或剧情状态。'),
        this.field('control_experience', '上线体验', 'text', 0, 100, '角色对被玩家上线操控的经历记录。'), this.field('derived', '攻防衍生', 'text', 0, 100, '由基础能力推导出的攻防表现。'),
        this.field('combat_simulation', '战斗模拟', 'text', 0, 100, '基于当前状态估算的一次战斗表现。'),
      ] },
      { title: '世界固有属性', fields: (attrs?.fields || []).slice(0, 16).map((field, index) => ({
        key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `world_field_${index}`,
        label: String(field.label || field.key || '属性').slice(0, 12),
        type: ['number', 'rank', 'list', 'text'].includes(field.type) ? field.type : 'number',
        min: 0, max: 100, desc: String(field.desc || '').slice(0, 80), grade: Boolean(field.grade),
      })) },
    ];
  },

  field(key, label, type, min = 0, max = 100, desc = '') { return { key, label, type, min, max, desc }; },
  nextCharacterExp(level) { return Math.round(100 * Math.max(1, Number(level) || 1) ** 1.65); },
  clamp(value, min, max) { return Math.max(min, Math.min(max, Math.round(Number(value) || 0))); },
  pool(current, max) { return { current: this.clamp(current, 0, max), max: Math.max(1, Math.round(max)) }; },
  normalizeCharacterExp(exp, level, fallbackCurrent = 0) {
    const next = this.nextCharacterExp(level);
    return { current: this.clamp(exp?.current ?? fallbackCurrent, 0, next), next, curve: 'nextExp=round(100*level^1.65)' };
  },

  ensureStateMechanics(state, character = state?.profile || {}) {
    if (!state?.values) return false;
    const values = state.values;
    const seed = window.GameModules.rpgState.seed(`${state.name}${state.worldTag}${character.role || ''}`);
    let changed = false;
    const incomplete = !values.level || !values.exp?.next || !values.skills?.[0]?.level;
    if (incomplete) { Object.assign(values, this.createValues(character, seed, values)); changed = true; }
    const normalizedExp = this.normalizeCharacterExp(values.exp, values.level, seed % 60);
    if (!values.exp?.next || values.exp.next !== normalizedExp.next || values.exp.curve !== normalizedExp.curve) { values.exp = normalizedExp; changed = true; }
    if (!values.level_growth) { values.free_attribute_points = 0; values.level_growth = { totalLevelUps: 0, autoPointsPerLevel: 2, freePointsPerLevel: 1, history: [] }; changed = true; }
    if (this.ensureIntrinsicSources(values)) changed = true;
    if (this.normalizeFreeAttributePoints(values)) changed = true;
    if (this.normalizeLearnedLists(values)) changed = true;
    if (!values.vitality?.max || !values.stamina_pool?.max) { this.recalculatePools(values, true, character); changed = true; }
    if (!values.derived?.attackPower) { values.derived = this.derived(values); changed = true; }
    if (!values.combat_simulation) { values.combat_simulation = this.defaultCombat(values); changed = true; }
    this.ensureProgressionNotes(values);
    values.health = this.percent(values.vitality);
    values.stamina = this.percent(values.stamina_pool);
    return changed;
  },

  createValues(character, seed, existing) {
    const minor = character.importance === 'minor' || character.isMinor;
    const level = this.clamp(existing.level || (minor ? 1 + seed % 4 : 3 + seed % 8), 1, 100);
    const intrinsic = this.intrinsic(character, seed, level);
    const learning = this.clamp(35 + intrinsic.intelligence * 4 + seed % 18, 0, 100);
    const vitalityMax = level * 10 + intrinsic.constitution * 8;
    const staminaMax = level * 8 + intrinsic.constitution * 5 + this.trainingBonus(character);
    return {
      level,
      exp: this.normalizeCharacterExp(existing.exp, level, seed % 60),
      free_attribute_points: 0,
      level_growth: { totalLevelUps: 0, autoPointsPerLevel: 2, freePointsPerLevel: 1, history: [] },
      intrinsic_sources: this.createIntrinsicSources(intrinsic),
      vitality: existing.vitality?.max ? existing.vitality : this.pool(existing.health ?? vitalityMax, vitalityMax),
      stamina_pool: existing.stamina_pool?.max ? existing.stamina_pool : this.pool(existing.stamina ?? staminaMax, staminaMax),
      satiety: existing.satiety || this.pool(70 + seed % 20, 100),
      hydration: existing.hydration || this.pool(72 + seed % 18, 100),
      fatigue: existing.fatigue || this.pool(seed % 25, 100),
      learning_ability: learning,
      mental_stability: existing.mental_stability?.max ? existing.mental_stability : this.pool(40 + intrinsic.willpower * 4 + intrinsic.perception * 2, 70 + intrinsic.willpower * 4),
      growth_potential: existing.growth_potential ?? this.clamp(82 - level * 4 + seed % 25, 0, 100),
      action_ability: existing.action_ability?.max ? existing.action_ability : this.pool(35 + intrinsic.agility * 5 + intrinsic.constitution * 2, 35 + intrinsic.agility * 5 + intrinsic.constitution * 2),
      ...intrinsic,
      knowledge: existing.knowledge?.length ? existing.knowledge : this.knowledge(character, seed),
      skills: existing.skills?.[0]?.level ? existing.skills : this.skills(character, seed),
      professions: existing.professions?.length ? existing.professions : this.professions(character, seed),
      factions: existing.factions || [character.faction || character.role || '无'].filter((x) => x && x !== '无'),
      derived: {},
    };
  },

  intrinsic(character, seed, level) {
    const text = `${character.role || ''}${character.detail || ''}${character.job || ''}`;
    const supernatural = /魔术|英灵|Servant|从者|鬼|神|龙|超能力/.test(text);
    const base = supernatural ? 8 + level % 8 : 3 + seed % 5;
    const stat = (offset, bonus = 0) => this.clamp(base + bonus + ((seed + offset) % 5) - 2, 1, 100);
    return {
      strength: stat(1, /战士|骑士|佣兵|从者|英灵/.test(text) ? 3 : 0), agility: stat(2, /刺客|弓|剑|忍/.test(text) ? 3 : 0),
      constitution: stat(3, /病弱|幼/.test(text) ? -2 : (/英灵|龙|鬼/.test(text) ? 4 : 0)), intelligence: stat(4, /魔术|学者|医生|教师|军师/.test(text) ? 4 : 0),
      perception: stat(5, /侦探|弓|刺客|感知/.test(text) ? 3 : 0), willpower: stat(6, /王|骑士|复仇|圣/.test(text) ? 3 : 0),
      charisma: stat(7, /王|偶像|领袖|公主/.test(text) ? 4 : 0),
    };
  },

  knowledge(character, seed) {
    return [this.learned('世界常识', '知识', 1 + seed % 3, ['intelligence', 'perception'], '成长经历与原作背景')];
  },

  isStageIdentity(name) {
    return /学生|中学生|高中生|初中生|小学生|大学生|年级|班学生/.test(String(name || ''));
  },

  skills(character, seed) {
    const list = (character.skills || [{ name: '观察', desc: '从细节中判断局势。' }]).filter((skill) => !this.isStageIdentity(skill.name)).slice(0, 5);
    return list.map((skill, index) => this.learned(skill.name || `技能${index + 1}`, '技能', 1 + ((seed + index) % 3), this.linkedStats(skill.name), skill.desc || '角色已掌握的行动能力'));
  },

  professions(character, seed) {
    const name = window.GameModules.professionInfo.normalizeJobName(character.job);
    return name && !this.isStageIdentity(name) ? [this.learned(name, '职业', 1 + seed % 3, ['intelligence', 'willpower', 'charisma'], character.rank || '长期身份与社会功能')] : [];
  },

  normalizeLearnedLists(values) {
    if (!values) return false;
    let changed = false;
    const clean = (list) => (list || []).filter((item) => {
      const keep = !this.isStageIdentity(typeof item === 'string' ? item : item?.name);
      if (!keep) changed = true;
      return keep;
    });
    values.skills = clean(values.skills);
    values.professions = clean(values.professions);
    return changed;
  },

  learned(name, type, level, linkedStats, source) {
    const lv = this.clamp(level, 1, 7);
    const cleanName = String(name).slice(0, 16);
    return { name: cleanName, type, level: lv, exp: { current: 0, next: this.learnedNext[lv] }, linkedStats, source, levelDescription: this.levelDescription(type, lv), effect: this.levelEffect(cleanName, type, lv) };
  },

  levelDescription(type, lv) {
    const map = ['无', '入门：知道基本概念或能做最简单动作。', '初学：能在低压环境稳定使用。', '熟练：能处理常见情况。', '专业：能独立应对复杂情况。', '专家：能创新、优化或指导他人。', '大师：领域内极少数高位者。', '传说：世界观顶级或规格外。'];
    return `${type || '能力'}lv${lv}｜${map[lv]}`;
  },

  levelEffect(name, type, lv) {
    const scope = lv <= 2 ? '基础场景' : lv <= 4 ? '常见与复杂场景' : lv <= 6 ? '高压或专业场景' : '世界观顶级场景';
    return `${name}达到lv${lv}后，可在${scope}中提供${type === '职业' ? '职责、身份与资源影响' : '行动判定与成长效率'}加成。`;
  },

  linkedStats(name) {
    if (/剑|战|拳|武|射|枪/.test(name)) return ['strength', 'agility', 'perception'];
    if (/魔|术|医|学|分析/.test(name)) return ['intelligence', 'perception', 'willpower'];
    if (/交涉|说服|领导/.test(name)) return ['charisma', 'willpower', 'perception'];
    return ['agility', 'perception', 'intelligence'];
  },

  trainingBonus(character) { return /士兵|骑士|运动|佣兵|从者|英灵/.test(`${character.role || ''}${character.job || ''}`) ? 20 : 0; },
  percent(pool) { return pool?.max ? this.clamp((pool.current / pool.max) * 100, 0, 100) : 100; },
  intrinsicKeys() { return ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']; },
  createIntrinsicSources(values) { return Object.fromEntries(this.intrinsicKeys().map((k) => [k, { initial: values[k] || 1, level: 0, allocated: 0, npc: 0 }])); },
  ensureIntrinsicSources(values) {
    let changed = false;
    if (!values.intrinsic_sources) { values.intrinsic_sources = {}; changed = true; }
    for (const k of this.intrinsicKeys()) {
      if (!values.intrinsic_sources[k]) { values.intrinsic_sources[k] = { initial: values[k] || 1, level: 0, allocated: 0, npc: 0 }; changed = true; }
      const s = values.intrinsic_sources[k];
      const total = (s.initial || 0) + (s.level || 0) + (s.allocated || 0) + (s.npc || 0);
      if (total !== values[k]) { s.initial = this.clamp((s.initial || 1) + values[k] - total, 1, 100); changed = true; }
    }
    return changed;
  },
  normalizeFreeAttributePoints(values) {
    const earned = (values.level_growth?.totalLevelUps || 0) * (values.level_growth?.freePointsPerLevel || 1);
    const spent = Object.values(values.intrinsic_sources || {}).reduce((sum, s) => sum + (s.allocated || 0), 0);
    const expected = Math.max(0, earned - spent);
    if (values.level_growth) values.level_growth.allocatedSpent = spent;
    if (values.level_growth?.totalLevelUps === 0 && values.free_attribute_points !== 0) { values.free_attribute_points = 0; return true; }
    if (!Number.isFinite(values.free_attribute_points) || values.free_attribute_points > earned || values.free_attribute_points < 0) { values.free_attribute_points = expected; return true; }
    return false;
  },

  recalculatePools(values, keepRatio, character = {}) {
    const hpRatio = keepRatio && values.vitality?.max ? values.vitality.current / values.vitality.max : 1;
    const spRatio = keepRatio && values.stamina_pool?.max ? values.stamina_pool.current / values.stamina_pool.max : 1;
    const msRatio = keepRatio && values.mental_stability?.max ? values.mental_stability.current / values.mental_stability.max : 1;
    const acRatio = keepRatio && values.action_ability?.max ? values.action_ability.current / values.action_ability.max : 1;
    const hpMax = values.level * 10 + values.constitution * 8;
    const spMax = values.level * 8 + values.constitution * 5 + this.trainingBonus(character);
    const msMax = 70 + values.willpower * 4;
    const acMax = 35 + values.agility * 5 + values.constitution * 2;
    values.vitality = this.pool(hpMax * hpRatio, hpMax);
    values.stamina_pool = this.pool(spMax * spRatio, spMax);
    values.mental_stability = this.pool(msMax * msRatio, msMax);
    values.action_ability = this.pool(acMax * acRatio, acMax);
    values.learning_ability = this.clamp(25 + values.intelligence * 4 + Math.floor((values.perception + values.willpower) / 4), 0, 100);
    values.derived = this.derived(values);
    values.combat_simulation = this.defaultCombat(values);
  },
};
