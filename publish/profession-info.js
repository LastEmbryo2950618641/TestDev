window.GameModules = window.GameModules || {};

window.GameModules.professionInfo = {
  roleWords: /主角|配角|路人|核心|悲剧|女主|男主|反派|支持|重要|可被操控|出场人物/,

  normalizeJobName(name) {
    const text = String(name || '').trim();
    if (!text || this.roleWords.test(text)) return '无固定职业';
    return text.slice(0, 18);
  },

  async ensure(worldTag, name, context = {}) {
    const jobName = this.normalizeJobName(name);
    const save = window.GameModules.sqliteSave;
    const existing = save.getProfessionInfo?.(worldTag, jobName);
    if (existing) return existing;
    const info = await this.generate(worldTag, jobName, context);
    await save.saveProfessionInfo?.(worldTag, info);
    return info;
  },

  async generate(worldTag, name, context) {
    try {
      if (!window.dzmm?.completions) return this.fallback(worldTag, name, context);
      let buffer = '';
      await window.dzmm.completions({
        model: 'nalang-medium-0826',
        maxTokens: 900,
        messages: [{ role: 'user', content: this.prompt(worldTag, name, context) }],
      }, (chunk) => { buffer += chunk; });
      return this.validate(JSON.parse(window.GameModules.jsonUtils.extractJson(buffer)), worldTag, name);
    } catch (err) {
      console.warn('职业资料生成失败，使用兜底:', err.message, err.stack);
      return this.fallback(worldTag, name, context);
    }
  },

  prompt(worldTag, name, context) {
    const fields = (context.worldFields || []).map((x) => `${x.key}:${x.label}`).join('、') || '无';
    return `为 AI RPG 建立职业资料。世界=${worldTag}，职业=${name}，角色=${context.characterName || ''}，身份=${context.role || ''}，背景=${context.detail || ''}，世界专属能力字段=${fields}。职业必须是真实身份/训练/社会功能，不要把“主角/配角/悲剧核心/重要人物”等叙事标签当职业。只返回 JSON：{"name":"职业名","summary":"30字内简单介绍","description":"120字内详细介绍","intrinsicStats":["strength"],"learnedAbilities":["能力名"],"worldAbilities":["字段key或能力名"]}。不要 Markdown。`;
  },

  validate(raw, worldTag, name) {
    const arr = (value, fallback) => (Array.isArray(value) && value.length ? value : fallback).slice(0, 6).map((x) => String(x).slice(0, 24));
    return {
      worldTag,
      name: this.normalizeJobName(raw.name || name),
      summary: String(raw.summary || `${name}是在${worldTag}中承担特定行动与社会功能的职业。`).slice(0, 60),
      description: String(raw.description || `${name}的等级代表角色在该领域的训练、经验、职责与可调用资源。`).slice(0, 180),
      intrinsicStats: arr(raw.intrinsicStats, ['intelligence', 'willpower']),
      learnedAbilities: arr(raw.learnedAbilities, ['观察', '判断局势']),
      worldAbilities: arr(raw.worldAbilities, ['无']),
    };
  },

  fallback(worldTag, name, context = {}) {
    const fields = (context.worldFields || []).map((x) => x.key);
    return this.validate({
      name,
      summary: `${name}代表角色长期承担的身份、训练与行动职责。`,
      description: `${name}等级由角色经历、训练、社会位置、已掌握技能，以及当前世界规则共同决定。叙事标签不会写入职业。`,
      intrinsicStats: this.statsFor(name),
      learnedAbilities: context.skills?.length ? context.skills.map((x) => x.name || x) : ['观察', '行动判断'],
      worldAbilities: fields.length ? fields : ['无'],
    }, worldTag, name);
  },

  statsFor(name) {
    if (/魔|术|研究|学者|医生/.test(name)) return ['intelligence', 'perception', 'willpower'];
    if (/剑|骑士|战|兵|杀手|弓/.test(name)) return ['strength', 'agility', 'constitution'];
    if (/王|贵族|领袖|教师/.test(name)) return ['charisma', 'willpower', 'intelligence'];
    return ['intelligence', 'willpower', 'perception'];
  },
};
