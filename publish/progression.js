window.GameModules = window.GameModules || {};

window.GameModules.progression = {
  learnedNext: [0, 100, 250, 600, 1400, 3200, 7200, Infinity],

  schemaSections(attrs) {
    return [
      { title: '基础能力', fields: [
        this.field('world_tag', '所属世界', 'text'), this.field('age', '年龄', 'number', 0, 999),
        this.field('level', '个人等级', 'number', 1, 100), this.field('exp', '个人经验', 'text'),
        this.field('vitality', '生命力', 'text'), this.field('stamina_pool', '精力池', 'text'),
        this.field('satiety', '饱食度', 'text'), this.field('hydration', '水分', 'text'),
        this.field('fatigue', '疲劳度', 'text'), this.field('learning_ability', '学习能力', 'number'),
        this.field('mental_stability', '精神稳定', 'text'), this.field('growth_potential', '成长潜力', 'number'),
        this.field('action_ability', '行动能力', 'text'),
      ] },
      { title: '身内能力', fields: ['strength:力量', 'agility:敏捷', 'constitution:体质', 'intelligence:智力', 'perception:感知', 'willpower:意志', 'charisma:魅力'].map((x) => {
        const [key, label] = x.split(':'); return this.field(key, label, 'number');
      }) },
      { title: '习得与职业', fields: [
        this.field('knowledge', '知识储备', 'list'), this.field('skills', '技能等级', 'list'),
        this.field('professions', '职业等级', 'list'), this.field('factions', '阵营地位', 'list'),
        this.field('equipment', '装备', 'list'), this.field('status_tags', '状态标签', 'list'),
        this.field('control_experience', '上线体验', 'text'), this.field('derived', '攻防衍生', 'text'),
        this.field('combat_simulation', '战斗模拟', 'text'),
      ] },
      { title: '世界固有属性', fields: (attrs?.fields || []).slice(0, 16).map((field, index) => ({
        key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `world_field_${index}`,
        label: String(field.label || field.key || '属性').slice(0, 12),
        type: ['number', 'rank', 'list', 'text'].includes(field.type) ? field.type : 'number',
        min: 0, max: 100, desc: String(field.desc || '').slice(0, 80),
      })) },
    ];
  },

  field(key, label, type, min = 0, max = 100) { return { key, label, type, min, max }; },
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
    if (!values.vitality?.max || !values.stamina_pool?.max) { this.recalculatePools(values, true); changed = true; }
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

  skills(character, seed) {
    const list = (character.skills || [{ name: '观察', desc: '从细节中判断局势。' }]).slice(0, 5);
    return list.map((skill, index) => this.learned(skill.name || `技能${index + 1}`, '技能', 1 + ((seed + index) % 3), this.linkedStats(skill.name), skill.desc || '角色已掌握的行动能力'));
  },

  professions(character, seed) {
    const name = window.GameModules.professionInfo.normalizeJobName(character.job);
    return name ? [this.learned(name, '职业', 1 + seed % 3, ['intelligence', 'willpower', 'charisma'], character.rank || '长期身份与社会功能')] : [];
  },

  learned(name, type, level, linkedStats, source) {
    const lv = this.clamp(level, 1, 7);
    return { name: String(name).slice(0, 16), type, level: lv, exp: { current: 0, next: this.learnedNext[lv] }, linkedStats, source };
  },

  linkedStats(name) {
    if (/剑|战|拳|武|射|枪/.test(name)) return ['strength', 'agility', 'perception'];
    if (/魔|术|医|学|分析/.test(name)) return ['intelligence', 'perception', 'willpower'];
    if (/交涉|说服|领导/.test(name)) return ['charisma', 'willpower', 'perception'];
    return ['agility', 'perception', 'intelligence'];
  },

  trainingBonus(character) { return /士兵|骑士|运动|佣兵|从者|英灵/.test(`${character.role || ''}${character.job || ''}`) ? 20 : 0; },
  percent(pool) { return pool?.max ? this.clamp((pool.current / pool.max) * 100, 0, 100) : 100; },

  recalculatePools(values, keepRatio) {
    const hpRatio = keepRatio && values.vitality?.max ? values.vitality.current / values.vitality.max : 1;
    const spRatio = keepRatio && values.stamina_pool?.max ? values.stamina_pool.current / values.stamina_pool.max : 1;
    values.vitality = this.pool((values.level * 10 + values.constitution * 8) * hpRatio, values.level * 10 + values.constitution * 8);
    values.stamina_pool = this.pool((values.level * 8 + values.constitution * 5) * spRatio, values.level * 8 + values.constitution * 5);
  },
};
