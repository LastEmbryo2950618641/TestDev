window.GameModules = window.GameModules || {};

window.GameModules.professionInfo = {
  pending: {},
  roleWords: /主角|配角|路人|核心|悲剧|女主|男主|反派|支持|重要|可被操控|出场人物|学生|中学生|高中生|初中生|小学生|大学生|年级|班学生/,

  normalizeJobName(name) {
    const text = String(name || '').replace(/lv\.?\d+/ig, '').trim();
    if (!text || this.roleWords.test(text)) return '';
    return text.slice(0, 18);
  },

  async ensure(worldTag, name, context = {}) {
    const jobName = this.normalizeJobName(name);
    if (!jobName) return null;
    const professionStore = window.GameModules.professionInfoStore;
    const existing = professionStore?.get?.(worldTag, jobName);
    if (existing) {
      const normalized = this.validate({ ...existing, confirmed: true }, worldTag, existing.name || jobName, context);
      if (normalized) {
        if (JSON.stringify(normalized) !== JSON.stringify(existing)) await professionStore?.save?.(worldTag, normalized);
        return normalized;
      }
    }
    const key = `${worldTag}::${jobName}`;
    if (!this.pending[key]) this.pending[key] = this.createAndSave(worldTag, jobName, context);
    try { return await this.pending[key]; }
    finally { delete this.pending[key]; }
  },

  async createAndSave(worldTag, jobName, context) {
    const info = await this.generate(worldTag, jobName, context);
    if (!info) return null;
    await window.GameModules.professionInfoStore?.save?.(worldTag, info);
    await window.GameModules.rpgLexicon.save(worldTag, '职业', info.name, { summary: info.summary, description: info.description, reason: info.requirements.reason, nameAiGenerated: true, valueAiGenerated: true, changeMode: info.requirements.reason, related: [...info.intrinsicStats, ...info.learnedAbilities, ...info.knowledgeAreas, ...info.worldAbilities], meta: { info }, source: 'ai' });
    return info;
  },

  async generate(worldTag, name, context) {
    try {
      if (!window.dzmm?.completions) return null;
      const prompt = await this.prompt(worldTag, name, context);
      return await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'profession-info',
        promptId: 'profession-info',
        model: window.GameModules.aiRequest?.selectedTextModel?.(),
        timeoutMs: 60000,
        prompt,
        format: prompt,
        validate: (raw) => this.validate(raw, worldTag, name, context),
      });
    } catch (err) {
      console.error('职业资料生成失败，等待重新生成:', err.message, err.stack);
      throw err;
    }
  },

  prompt(worldTag, name, context) {
    const fields = (context.worldFields || []).map((x) => `${x.key}:${x.label}`).join('、') || '无';
    const list = (items, pick) => (items || []).map((x) => pick ? pick(x) : (x.name || x.key || x.label || x)).filter(Boolean).join('、') || '无';
    return window.GameModules.renderPrompt('profession-info', {
      世界: worldTag,
      职业: name,
      角色: context.characterName || '',
      身份: context.role || '',
      背景: context.detail || '',
      身内能力候选: context.intrinsicStats || 'strength(力量)、agility(敏捷)、constitution(体质)、intelligence(智力)、perception(感知)、willpower(意志)、charisma(魅力)',
      世界专属能力候选: fields,
      技能候选: list(context.skills),
      知识储备候选: list(context.knowledge),
    });
  },

  validate(raw, worldTag, name, context = {}) {
    if (!raw || typeof raw !== 'object' || raw.confirmed !== true) return null;
    const arr = (value) => (Array.isArray(value) ? value : []).slice(0, 6).map((x) => String(x).slice(0, 24)).filter(Boolean);
    const cleanName = this.normalizeJobName(raw.name || name);
    const intrinsicStats = this.pickIntrinsic(arr(raw.intrinsicStats));
    const learnedAbilities = this.ensureList(arr(raw.learnedAbilities), context.skills);
    const knowledgeAreas = this.ensureList(arr(raw.knowledgeAreas), context.knowledge);
    const worldAbilities = this.pickWorldAbilities(arr(raw.worldAbilities), context.worldFields);
    const reason = String(raw.requirements?.reason || raw.reason || '').trim().slice(0, 120);
    if (!cleanName || !raw.summary || !raw.description || !reason || window.GameModules.characterProfile?.abstractReason?.(reason) || !intrinsicStats.length || !learnedAbilities.length || !knowledgeAreas.length) return null;
    const reqStats = this.pickIntrinsic(arr(raw.requirements?.intrinsicStats?.length ? raw.requirements.intrinsicStats : intrinsicStats));
    const reqSkills = this.ensureList(arr(raw.requirements?.learnedAbilities?.length ? raw.requirements.learnedAbilities : learnedAbilities), context.skills);
    const reqKnowledge = this.ensureList(arr(raw.requirements?.knowledgeAreas?.length ? raw.requirements.knowledgeAreas : knowledgeAreas), context.knowledge);
    if (!reqStats.length || !reqSkills.length || !reqKnowledge.length) return null;
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
        intrinsicStats: reqStats,
        worldAbilities: this.pickWorldAbilities(arr(raw.requirements?.worldAbilities?.length ? raw.requirements.worldAbilities : worldAbilities), context.worldFields),
        learnedAbilities: reqSkills,
        knowledgeAreas: reqKnowledge,
        reason,
      },
    };
  },

  pickIntrinsic(items) {
    const allowed = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return items.filter((x) => allowed.includes(x)).slice(0, 4);
  },

  pickWorldAbilities(items, fields = []) {
    const keys = new Set((fields || []).flatMap((x) => [x.key, x.label].filter(Boolean).map(String)));
    return items.filter((x) => keys.has(x)).slice(0, 4);
  },

  ensureList(items, candidates = []) {
    const names = (candidates || []).map((x) => String(x?.name || x || '').trim()).filter(Boolean);
    const matched = names.filter((name) => items.some((item) => name.includes(item) || item.includes(name)));
    return [...new Set([...items, ...matched])].slice(0, 6);
  },
};
