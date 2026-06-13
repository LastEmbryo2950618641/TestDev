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
      const prompt = await this.prompt(worldTag, name, context);
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
    const list = (items, pick) => (items || []).map((x) => pick ? pick(x) : (x.name || x.key || x.label || x)).filter(Boolean).join('、') || '无';
    return window.GameModules.promptTemplates.render('profession-info', {
      世界: worldTag,
      职业: name,
      角色: context.characterName || '',
      身份: context.role || '',
      背景: context.detail || '',
      身内能力候选: context.intrinsicStats || 'strength、agility、constitution、intelligence、perception、willpower、charisma、learning_ability、mental_stability、action_ability',
      世界专属能力候选: fields,
      技能候选: list(context.skills),
      知识储备候选: list(context.knowledge),
    });
  },

  validate(raw, worldTag, name) {
    if (!raw || typeof raw !== 'object' || raw.confirmed !== true) return null;
    const arr = (value) => (Array.isArray(value) ? value : []).slice(0, 6).map((x) => String(x).slice(0, 24)).filter(Boolean);
    const cleanName = this.normalizeJobName(raw.name || name);
    const intrinsicStats = arr(raw.intrinsicStats);
    const learnedAbilities = arr(raw.learnedAbilities);
    const knowledgeAreas = arr(raw.knowledgeAreas);
    const worldAbilities = arr(raw.worldAbilities);
    if (!cleanName || !raw.summary || !raw.description || !intrinsicStats.length || !learnedAbilities.length || !knowledgeAreas.length) return null;
    return {
      worldTag,
      name: cleanName,
      summary: String(raw.summary).slice(0, 60),
      description: String(raw.description).slice(0, 180),
      levelDescription: raw.levelDescription ? String(raw.levelDescription).slice(0, 100) : '',
      effect: raw.effect ? String(raw.effect).slice(0, 120) : '',
      intrinsicStats,
      learnedAbilities,
      knowledgeAreas,
      worldAbilities,
      requirements: {
        intrinsicStats: arr(raw.requirements?.intrinsicStats || intrinsicStats),
        worldAbilities: arr(raw.requirements?.worldAbilities || worldAbilities),
        learnedAbilities: arr(raw.requirements?.learnedAbilities || learnedAbilities),
        knowledgeAreas: arr(raw.requirements?.knowledgeAreas || knowledgeAreas),
        reason: String(raw.requirements?.reason || '满足该职业lv.1所需基础构成。').slice(0, 120),
      },
    };
  },
};
