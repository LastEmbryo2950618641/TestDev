/**
 * 出场人物设定：为已知角色与路人 NPC 固化完整资料。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterProfile = {
  async ensure(raw, store, context = '') {
    const known = this.findKnown(raw, store);
    if (known) return known;
    const base = this.normalize(raw, store);
    if (window.GameModules.cache.enabled('generatedProfiles')) {
      const existing = window.GameModules.sqliteSave.getCharacterState(base.id);
      if (existing?.profile) return existing.profile;
    }
    const lore = await window.GameModules.worldLore.ensure(base.work, context);
    const attrs = await window.GameModules.rpgState.ensureWorldAttributes(base.work);
    return this.generate(base, lore, attrs, context);
  },

  findKnown(raw, store) {
    const name = typeof raw === 'string' ? raw : raw?.name;
    if (!name) return null;
    return store.findKnownCharacter?.(name) || null;
  },

  normalize(raw, store) {
    const data = typeof raw === 'object' && raw ? raw : { name: String(raw || '无名路人') };
    const name = String(data.name || '无名路人').slice(0, 16);
    const work = String(data.work || store.character.work || '原创世界').slice(0, 24);
    const id = data.id || `npc-${this.slug(work)}-${this.slug(name)}`;
    return {
      id,
      name,
      work,
      role: String(data.role || (data.isMinor ? '路人' : '出场人物')).slice(0, 18),
      detail: String(data.detail || data.desc || '刚被剧情卷入的人物。').slice(0, 120),
      personality: String(data.personality || '谨慎观察局势。').slice(0, 80),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 4).map(String) : [],
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 4) : [],
      importance: data.importance || (data.isMinor ? 'minor' : 'support'),
      isMinor: Boolean(data.isMinor),
    };
  },

  async generate(base, lore, attrs, context) {
    try {
      if (!window.dzmm?.completions) return this.fallback(base, lore, attrs);
      let buffer = '';
      await window.dzmm.completions({
        model: 'nalang-medium-0826',
        maxTokens: 900,
        messages: [{ role: 'user', content: this.prompt(base, lore, attrs, context) }],
      }, (chunk) => { buffer += chunk; });
      return this.validate(this.parse(buffer), base, lore, attrs);
    } catch (err) {
      console.warn('人物设定生成失败，使用兜底:', err.message);
      return this.fallback(base, lore, attrs);
    }
  },

  prompt(base, lore, attrs, context) {
    return `为 AI RPG 视觉小说生成出场人物固化设定。人物基础：${JSON.stringify(base)}。当前剧情：${context || '暂无'}。世界观：${lore.background}；势力：${lore.factions.map((x) => x.name).join('、')}；特殊职业：${lore.specialJobs.map((x) => x.name).join('、')}；职业等级：${lore.jobRanks.join('、')}。只返回 JSON：{"name":"姓名","role":"身份","detail":"个人背景","personality":"性格","faction":"所属势力或无","job":"职业","rank":"等级","skills":[{"name":"技能","desc":"说明"}],"worldValues":{"字段key":"该人物固化取值"}}。worldValues 必须覆盖该角色所属世界的固有字段：${attrs.fields.map((x) => `${x.key}(${x.label}:${x.type})`).join('、')}。不要 Markdown。`;
  },

  parse(text) {
    const raw = String(text || '').replace(/```json|```/g, '').trim();
    const json = window.GameModules.jsonUtils.extractJson(raw);
    return JSON.parse(json.replace(/[\u0000-\u001F]/g, ''));
  },

  validate(profile, base, lore, attrs) {
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    return {
      ...base,
      name: String(profile.name || base.name).slice(0, 16),
      role: String(profile.role || base.role).slice(0, 18),
      detail: String(profile.detail || base.detail).slice(0, 160),
      personality: String(profile.personality || base.personality).slice(0, 100),
      faction: String(profile.faction || '无').slice(0, 18),
      job: window.GameModules.professionInfo.normalizeJobName(profile.job || this.jobFromRole(base.role, base.detail)),
      rank: String(profile.rank || lore.jobRanks[0] || '普通').slice(0, 12),
      skills: skills.slice(0, 4).map((skill, index) => ({
        name: String(skill.name || `能力${index + 1}`).slice(0, 16),
        desc: String(skill.desc || '').slice(0, 60),
      })),
      worldValues: this.worldValues(profile.worldValues, attrs, base.name),
    };
  },

  fallback(base, lore, attrs) {
    return this.validate({
      ...base,
      faction: lore.factions[0]?.name || '无',
      job: this.jobFromRole(base.role, base.detail),
      rank: lore.jobRanks[0] || '普通',
      skills: base.skills?.length ? base.skills : [{ name: '观察', desc: '从细节中判断局势。' }],
      worldValues: {},
    }, base, lore, attrs);
  },

  worldValues(values, attrs, seedText) {
    const seed = window.GameModules.rpgState.seed(seedText);
    return Object.fromEntries((attrs.fields || []).map((field, index) => [field.key, values?.[field.key] ?? this.valueFor(field, seed + index)]));
  },

  jobFromRole(role, detail = '') {
    const text = `${role || ''}${detail || ''}`;
    if (/魔术/.test(text)) return '魔术师';
    if (/学生|儿童|少女|少年|小学生/.test(text)) return '学生';
    if (/骑士|剑士|战士|军人|杀手|弓兵|枪兵/.test(text)) return '战斗人员';
    if (/王|贵族|领主|皇帝|公主/.test(text)) return '统治者';
    return '无固定职业';
  },

  valueFor(field, seed) {
    if (field.type === 'number') return seed % 101;
    if (field.type === 'rank') return ['E', 'D', 'C', 'B', 'A', 'EX'][seed % 6];
    return [];
  },

  slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${window.GameModules.rpgState.seed(text)}`;
  },
};
