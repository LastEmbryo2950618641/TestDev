window.GameModules = window.GameModules || {};

window.GameModules.professionInfo = {
  roleWords: /主角|配角|路人|核心|悲剧|女主|男主|反派|支持|重要|可被操控|出场人物|学生|中学生|高中生|初中生|小学生|大学生|年级|班学生/,

  normalizeJobName(name) {
    const text = String(name || '').replace(/lv\.?\d+/ig, '').trim();
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
      const prompt = this.prompt(worldTag, name, context);
      return await window.GameModules.jsonUtils.generateJsonWithRetry({
        model: 'nalang-medium-0826',
        maxTokens: 900,
        prompt,
        format: prompt,
        validate: (raw) => this.validate(raw, worldTag, name),
      });
    } catch (err) {
      console.error('职业资料生成失败，等待重新生成:', err.message, err.stack);
      throw err;
    }
  },

  prompt(worldTag, name, context) {
    const fields = (context.worldFields || []).map((x) => `${x.key}:${x.label}`).join('、') || '无';
    return `为 AI RPG 建立职业资料。世界=${worldTag}，职业=${name}，角色=${context.characterName || ''}，身份=${context.role || ''}，背景=${context.detail || ''}，世界专属能力字段=${fields}。职业必须是内化到角色自身的能力、经验与胜任资格，不等同当前公司、雇佣状态或岗位；工程师失业也仍可拥有工程师职业。学生/高中生/中学生/年级身份不算职业，属于阵营或角色地位，必须 confirmed=false。只有百分之百确认该职业适用时 confirmed=true，否则 confirmed=false。必须体现职业升级后如何变强：levelDescription 写该职业当前等级代表的职责/熟练度，effect 写该等级在剧情判定、资源、社会承认或行动中的实际作用。只返回 JSON：{"name":"职业名","confirmed":true,"summary":"30字内简单介绍","description":"120字内详细介绍","levelDescription":"当前等级说明","effect":"当前等级实际作用","intrinsicStats":["strength"],"learnedAbilities":["能力名"],"worldAbilities":["字段key或能力名"]}。除 name、confirmed、summary、description、levelDescription、effect 外，其它字段没有依据或不需要更改就不要返回。不要 Markdown。`;
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
