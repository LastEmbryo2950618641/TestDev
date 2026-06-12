window.GameModules = window.GameModules || {};

window.GameModules.professionInfo = {
  roleWords: /主角|配角|路人|核心|悲剧|女主|男主|反派|支持|重要|可被操控|出场人物/,

  normalizeJobName(name) {
    const text = String(name || '').trim();
    if (!text || this.roleWords.test(text)) return '';
    return text.slice(0, 18);
  },

  async ensure(worldTag, name, context = {}) {
    const jobName = this.normalizeJobName(name);
    if (!jobName) return null;
    const save = window.GameModules.sqliteSave;
    const existing = save.getProfessionInfo?.(worldTag, jobName);
    if (existing) return existing;
    const info = await this.generate(worldTag, jobName, context);
    if (!info) return null;
    await save.saveProfessionInfo?.(worldTag, info);
    await window.GameModules.rpgLexicon.save(worldTag, '职业', info.name, { summary: info.summary, description: info.description, nameAiGenerated: true, valueAiGenerated: true, changeMode: 'AI演算', related: [...info.intrinsicStats, ...info.learnedAbilities, ...info.worldAbilities], meta: { info }, source: 'ai' });
    return info;
  },

  async generate(worldTag, name, context) {
    try {
      if (!window.dzmm?.completions) return null;
      let buffer = '';
      await window.dzmm.completions({
        model: 'nalang-medium-0826',
        maxTokens: 900,
        messages: [{ role: 'user', content: this.prompt(worldTag, name, context) }],
      }, (chunk) => { buffer += chunk; });
      return this.validate(JSON.parse(window.GameModules.jsonUtils.extractJson(buffer)), worldTag, name);
    } catch (err) {
      console.warn('职业资料生成失败，不固化职业:', err.message, err.stack);
      return null;
    }
  },

  prompt(worldTag, name, context) {
    const fields = (context.worldFields || []).map((x) => `${x.key}:${x.label}`).join('、') || '无';
    return `为 AI RPG 建立职业资料。世界=${worldTag}，职业=${name}，角色=${context.characterName || ''}，身份=${context.role || ''}，背景=${context.detail || ''}，世界专属能力字段=${fields}。职业必须是真实身份/训练/社会功能，不要把“主角/配角/悲剧核心/重要人物”等叙事标签当职业。只有百分之百确认该职业适用时 confirmed=true，否则 confirmed=false。必须体现职业升级后如何变强：levelDescription 写该职业当前等级代表的职责/熟练度，effect 写该等级在剧情判定、资源、社会承认或行动中的实际作用。只返回 JSON：{"name":"职业名","confirmed":true,"summary":"30字内简单介绍","description":"120字内详细介绍","levelDescription":"当前等级说明","effect":"当前等级实际作用","intrinsicStats":["strength"],"learnedAbilities":["能力名"],"worldAbilities":["字段key或能力名"]}。除 name、confirmed、summary、description、levelDescription、effect 外，其它字段没有依据或不需要更改就不要返回。不要 Markdown。`;
  },

  validate(raw, worldTag, name) {
    if (!raw || typeof raw !== 'object' || raw.confirmed !== true) return null;
    const arr = (value) => (Array.isArray(value) ? value : []).slice(0, 6).map((x) => String(x).slice(0, 24));
    const cleanName = this.normalizeJobName(raw.name || name);
    if (!cleanName || !raw.summary || !raw.description) return null;
    return {
      worldTag,
      name: cleanName,
      summary: String(raw.summary).slice(0, 60),
      description: String(raw.description).slice(0, 180),
      levelDescription: raw.levelDescription ? String(raw.levelDescription).slice(0, 100) : '',
      effect: raw.effect ? String(raw.effect).slice(0, 120) : '',
      intrinsicStats: arr(raw.intrinsicStats),
      learnedAbilities: arr(raw.learnedAbilities),
      worldAbilities: arr(raw.worldAbilities),
    };
  },
};
