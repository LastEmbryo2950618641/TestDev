/**
 * 出场人物设定：为已知角色与路人 NPC 固化完整资料。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterProfile = {
  async ensure(raw, store, context = '') {
    const base = this.normalize(this.withKnown(raw, store), store);
    const signature = this.inputSignature(base, context, store);
    const existing = window.GameModules.sqliteSave.getCharacterState(base.id);
    if (this.isRoleCard(existing?.profile) && existing.profile.initialMetrics && existing.profile.roleCardInputSignature === signature) return existing.profile;
    const lore = await window.GameModules.worldLore.ensure(base.work, context);
    const attrs = await window.GameModules.rpgState.ensureWorldAttributes(base.work);
    return this.generate(base, lore, attrs, context, store, signature);
  },

  withKnown(raw, store) {
    const known = this.findKnown(raw, store);
    if (!known) return raw;
    if (typeof raw !== 'object' || !raw) return known;
    return { ...known, ...raw, aliases: [...(known.aliases || []), ...(raw.aliases || [])] };
  },

  isRoleCard(profile) {
    return Boolean(profile?.roleCard && profile?.name && profile?.role && profile?.detail && profile?.personality && profile?.appearance);
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
      gender: String(data.gender || '').slice(0, 8),
      relationships: this.formatRelationships(data.relationships || ''),
      nameRule: String(data.nameRule || '').slice(0, 80),
      detail: String(data.detail || data.desc || '刚被剧情卷入的人物。').slice(0, 120),
      appearance: String(data.appearance || '外貌尚未固化。').slice(0, 120),
      personality: String(data.personality || '谨慎观察局势。').slice(0, 80),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 4).map(String) : [],
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 4) : [],
      importance: data.importance || (data.isMinor ? 'minor' : 'support'),
      isMinor: Boolean(data.isMinor),
      roleCard: true,
    };
  },

  async generate(base, lore, attrs, context, store, signature = '') {
    try {
      if (!window.dzmm?.completions) return this.withSignature(this.fallback(base, lore, attrs), signature);
      const prompt = await this.prompt(base, lore, attrs, context, store);
      return this.withSignature(await window.GameModules.jsonUtils.generateJsonWithRetry({
        model: 'nalang-medium-0826',
        maxTokens: 900,
        prompt,
        format: prompt,
        parse: (text) => this.parse(text),
        validate: (raw) => this.validate(raw, base, lore, attrs),
      }), signature);
    } catch (err) {
      console.warn('人物设定生成失败，使用兜底:', err.message);
      return this.withSignature(this.fallback(base, lore, attrs), signature);
    }
  },

  async prompt(base, lore, attrs, context, store) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(store);
    return window.GameModules.promptTemplates.render('character-profile-card', {
      人物基础区: sections.characterBase(base),
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      关系事件区: sections.relationContext(context),
      世界观资料区: sections.worldLore(lore),
      世界字段: sections.worldFields(attrs),
      情绪字段: window.GameModules.metrics.emotionKeys.join('、'),
      关系指标字段: window.GameModules.metrics.playerKeys.join('、'),
    });
  },

  parse(text) {
    const raw = String(text || '').replace(/```json|```/g, '').trim();
    const json = window.GameModules.jsonUtils.extractJson(raw);
    return JSON.parse(json.replace(/[\u0000-\u001F]/g, ''));
  },

  validate(profile, base, lore, attrs) {
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const confirmedJob = profile.jobConfirmed === true ? window.GameModules.professionInfo.normalizeJobName(profile.job) : '';
    return {
      ...base,
      name: this.validName(profile.name, base),
      gender: String(base.gender || profile.gender || '').slice(0, 8),
      relationships: this.formatRelationships(profile.relationships || base.relationships || ''),
      role: String(profile.role || base.role).slice(0, 18),
      detail: String(profile.detail || base.detail).slice(0, 160),
      appearance: String(profile.appearance || base.appearance || '外貌尚未固化。').slice(0, 140),
      personality: String(profile.personality || base.personality).slice(0, 100),
      faction: String(profile.faction || '无').slice(0, 18),
      job: confirmedJob,
      rank: confirmedJob ? String(profile.rank || lore.jobRanks[0] || '普通').slice(0, 12) : '',
      skills: skills.slice(0, 4).map((skill, index) => ({
        name: String(skill.name || `能力${index + 1}`).slice(0, 16),
        desc: String(skill.desc || '').slice(0, 60),
      })),
      worldValues: this.worldValues(profile.worldValues, attrs, base.name),
      initialMetrics: this.initialMetrics(profile.initialMetrics),
      roleCard: true,
      roleCardSource: 'ai',
      roleCardUpdatedAt: new Date().toISOString(),
    };
  },

  withSignature(profile, signature) {
    return { ...profile, roleCardInputSignature: signature || profile.roleCardInputSignature || '' };
  },

  inputSignature(base, context, store) {
    const p = store?.playerProfile || {};
    const data = {
      base: {
        id: base.id, name: base.name, work: base.work, role: base.role, gender: base.gender,
        relationships: base.relationships, nameRule: base.nameRule, detail: base.detail,
        appearance: base.appearance, personality: base.personality,
      },
      player: {
        name: p.name || store?.playerName, gender: p.gender, birthday: p.birthday, age: p.age,
        city: p.refinedCity || p.city, role: p.refinedRole || p.dailyRole, workplace: p.workplace,
        position: p.position, livingStatus: p.refinedLivingStatus || p.livingStatus,
        parents: p.parentStatus || p.parents, parentDeathCause: p.parentDeathCause,
        relationships: p.relationships, notes: p.notes, worldbuildingNote: p.worldbuildingNote,
      },
      context: String(context || '').slice(0, 1200),
    };
    const raw = JSON.stringify(data);
    return `v2:${raw.length}-${window.GameModules.rpgState.seed(raw)}`;
  },

  fallback(base, lore, attrs) {
    return this.validate({
      ...base,
      faction: lore.factions[0]?.name || '无',
      job: '',
      jobConfirmed: false,
      rank: '',
      skills: base.skills?.length ? base.skills : [{ name: '观察', desc: '从细节中判断局势。' }],
      worldValues: {},
    }, base, lore, attrs);
  },

  worldValues(values, attrs) {
    if (!values || typeof values !== 'object') return {};
    const keys = new Set((attrs.fields || []).map((field) => field.key));
    return Object.fromEntries(Object.entries(values).filter(([key]) => keys.has(key)));
  },

  initialMetrics(value) {
    const normalize = (items, keys) => Array.isArray(items) ? items.filter((item) => keys.includes(item?.key)).map((item) => ({ key: item.key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status || '').slice(0, 80), reason: String(item.reason || '').slice(0, 80) })) : [];
    return { emotions: normalize(value?.emotions, window.GameModules.metrics.emotionKeys), playerFeelings: normalize(value?.playerFeelings, window.GameModules.metrics.playerKeys) };
  },

  formatRelationships(value) {
    const parts = String(value || '').split(/[；;\n]+/).map((part) => part.trim()).filter(Boolean);
    return parts.map((part) => {
      const pair = part.split(/[：:]/);
      const rel = String(pair[0] || '').replace(/[，。,.].*$/, '').trim();
      const name = String(pair.slice(1).join('：') || '').replace(/[，。；;、,.].*$/, '').trim();
      const invalid = /同居|喜欢|倾向|关系|需要|生成|资料|补全|未知|待/.test(name) || name.length > 12;
      return rel && name && !invalid ? `${rel}：${name}` : '';
    }).filter(Boolean).join('；');
  },

  validName(name, base) {
    const raw = String(name || '').trim();
    const bad = !raw || /^(妹妹|姐姐|哥哥|弟弟|父亲|母亲|爸爸|妈妈|联系人|微信联系人|.+待命名)$/.test(raw);
    if (!bad) return raw.slice(0, 16);
    return '姓名待AI补全';
  },

  slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${window.GameModules.rpgState.seed(text)}`;
  },
};
