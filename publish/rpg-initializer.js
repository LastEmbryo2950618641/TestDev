/**
 * RPG 初始数值推导：结合人物资料、当前状态、进入时机和世界固有属性。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rpgInitializer = {
  context(store, character) {
    const profile = store?.characterProfiles?.[character.id]?.summary || '';
    return [
      character.name, character.role, character.job, character.rank,
      character.personality, character.detail, profile,
      store?.entryTimeLabel?.(), store?.entryCurrentAction,
      store?.quest, store?.selectedWork || character.work,
    ].filter(Boolean).join(' ');
  },

  infer(character, store, seed) {
    const text = this.context(store, character);
    const minor = character.importance === 'minor' || character.isMinor;
    const levelBase = minor ? 1 : this.has(text, /英灵|从者|Servant|王|顶级|高手|精英/) ? 12 : this.has(text, /魔术师|骑士|战士|军人|杀手|教师|医生|学者/) ? 7 : 4;
    return {
      text,
      level: this.clamp(levelBase + (seed % 4) - (this.has(text, /幼|儿童|小学生|病弱|囚禁|受害/) ? 2 : 0), 1, 100),
      danger: this.score(text, [/战斗|追杀|逃亡|圣杯战争|危险|地下室|囚禁|虫|受伤|失控/, /准备|潜伏|调查|监视/]),
      trauma: this.score(text, [/虐|虫|囚|牺牲|受害|孤|恐惧|崩溃|病弱/, /间桐|樱|实验|改造/]),
      mage: this.score(text, [/魔术|魔力|回路|刻印|圣杯|御主|术式|型月/, /研究|地下室|仪式/]),
      fighter: this.score(text, [/剑|枪|弓|拳|战斗|骑士|军人|杀手|从者|英灵/, /训练|准备|警戒/]),
      scholar: this.score(text, [/学者|教师|医生|研究|学习|分析|书|知识/, /准备|调查/]),
      leader: this.score(text, [/王|领袖|队长|贵族|公主|皇帝|高傲|统率/, /指挥|支配/]),
      weak: this.score(text, [/幼|小|病弱|虚弱|受伤|囚禁|疲惫|饥饿/, /地下室|虫/]),
    };
  },

  apply(values, character, store, seed, attrs) {
    const ctx = this.infer(character, store, seed);
    values.level = ctx.level;
    values.strength = this.clamp(values.strength + ctx.fighter - ctx.weak, 1, 100);
    values.agility = this.clamp(values.agility + Math.floor(ctx.fighter / 2) - Math.floor(ctx.weak / 2), 1, 100);
    values.constitution = this.clamp(values.constitution + ctx.fighter - ctx.trauma - ctx.weak, 1, 100);
    values.intelligence = this.clamp(values.intelligence + ctx.mage + ctx.scholar, 1, 100);
    values.perception = this.clamp(values.perception + ctx.danger + Math.floor(ctx.scholar / 2), 1, 100);
    values.willpower = this.clamp(values.willpower + ctx.leader + ctx.trauma - Math.floor(ctx.weak / 2), 1, 100);
    values.charisma = this.clamp(values.charisma + ctx.leader - Math.floor(ctx.trauma / 2), 1, 100);
    values.learning_ability = this.clamp(values.learning_ability + ctx.scholar + ctx.mage, 0, 100);
    values.growth_potential = this.clamp(values.growth_potential + (ctx.weak ? 8 : 0) - Math.floor(values.level / 8), 0, 100);
    values.exp = { current: values.exp?.current || 0, next: window.GameModules.progression.nextCharacterExp(values.level), curve: '100*level^1.65' };
    this.applyPools(values, ctx);
    this.applyWorld(values, attrs, ctx, seed);
    values.initial_context = this.summary(character, store, ctx);
    return values;
  },

  applyPools(values, ctx) {
    const hpMax = Math.max(1, values.level * 10 + values.constitution * 8);
    const spMax = Math.max(1, values.level * 8 + values.constitution * 5 + ctx.fighter * 3);
    const mentalMax = Math.max(1, 70 + values.willpower * 4);
    const hpRatio = this.clamp(100 - ctx.weak * 6 - ctx.danger * 2, 20, 100) / 100;
    const spRatio = this.clamp(88 - ctx.weak * 5 - ctx.danger * 3, 15, 100) / 100;
    const mentalRatio = this.clamp(82 - ctx.trauma * 7 - ctx.danger * 4, 10, 100) / 100;
    values.vitality = window.GameModules.progression.pool(hpMax * hpRatio, hpMax);
    values.stamina_pool = window.GameModules.progression.pool(spMax * spRatio, spMax);
    values.mental_stability = window.GameModules.progression.pool(mentalMax * mentalRatio, mentalMax);
    values.fatigue = window.GameModules.progression.pool(this.clamp(ctx.weak * 10 + ctx.danger * 5, 0, 100), 100);
  },

  applyWorld(values, attrs, ctx, seed) {
    for (const field of attrs?.fields || []) {
      if (field.key === 'magic_circuit_quality') values[field.key] = ctx.mage >= 3 ? 'A' : ctx.mage >= 1 ? 'C' : 'E';
      else if (field.key === 'magic_circuit_quantity') values[field.key] = this.clamp(18 + ctx.mage * 16 + seed % 18, 0, 100);
      else if (field.key === 'mana_capacity') values[field.key] = this.clamp(20 + ctx.mage * 14 + values.willpower * 2, 0, 100);
      else if (field.key === 'magic_attribute') values[field.key] = this.magicAttributes(ctx.text);
      else if (field.key === 'magic_trait') values[field.key] = this.magicTraits(ctx.text);
      else if (field.key === 'origin') values[field.key] = this.origins(ctx.text);
      else if (field.key === 'mystery_affinity') values[field.key] = this.clamp(15 + ctx.mage * 15 + ctx.trauma * 4, 0, 100);
      else if (field.key === 'magic_crest_affinity') values[field.key] = this.clamp(12 + ctx.mage * 12 - ctx.weak * 3 + seed % 20, 0, 100);
    }
  },

  summary(character, store, ctx) {
    return `基于${character.name}的人物资料、${store?.entryTimeLabel?.() || '未知时间'}、当前行动“${store?.entryCurrentAction || '未知'}”推导。危险${ctx.danger}，创伤${ctx.trauma}，魔术${ctx.mage}，战斗${ctx.fighter}。`;
  },

  magicAttributes(text) {
    if (/樱|影|虚|暗|虫|间桐/.test(text)) return ['虚', '影'];
    if (/火|爆|炎/.test(text)) return ['火'];
    if (/水|治愈|医/.test(text)) return ['水'];
    if (/风|弓|速/.test(text)) return ['风'];
    return /魔术|型月|圣杯/.test(text) ? ['地', '水'] : [];
  },

  magicTraits(text) {
    if (/虫|间桐|吸收|束缚/.test(text)) return ['吸收', '束缚'];
    if (/投影|复制|剑/.test(text)) return ['投影'];
    if (/治愈|保护/.test(text)) return ['修复'];
    return /魔术|术式/.test(text) ? ['转换'] : [];
  },

  origins(text) {
    if (/樱|牺牲|囚|受害/.test(text)) return ['承受'];
    if (/王|支配|统治/.test(text)) return ['支配'];
    if (/杀|复仇|愤怒/.test(text)) return ['破坏'];
    return [];
  },

  score(text, patterns) {
    return patterns.reduce((sum, pattern) => sum + (this.has(text, pattern) ? 2 : 0), 0);
  },

  has(text, pattern) { return pattern.test(String(text || '')); },
  clamp(value, min, max) { return Math.max(min, Math.min(max, Math.round(Number(value) || 0))); },
};
