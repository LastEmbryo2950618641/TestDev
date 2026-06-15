/**
 * 出场人物设定：为已知角色与路人 NPC 固化完整资料。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterProfile = {
  async ensure(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = window.GameModules.cache?.enabled?.('generatedProfiles') ? window.GameModules.sqliteSave.getCharacterState(base.id) : null;
    if (existing && this.isReusableRoleCard(existing.profile, signature)) return existing.profile;
    const lore = await window.GameModules.worldLore.ensure(base.work, context);
    const attrs = await window.GameModules.rpgState.ensureWorldAttributes(base.work);
    return this.generate(base, lore, attrs, context, store, signature, source.preset);
  },

  withKnown(raw, store) {
    return raw;
  },

  isRoleCard(profile) {
    const hasFactions = Array.isArray(profile?.factions) && profile.factions.length;
    const hasForces = (Array.isArray(profile?.forcePositions) && profile.forcePositions.length) || (Array.isArray(profile?.force_positions) && profile.force_positions.length);
    return Boolean(profile?.roleCard && this.isConcreteName(profile.name) && profile?.role && profile?.detail && profile?.personality && profile?.appearance && hasFactions && hasForces);
  },

  isConcreteName(name) {
    const raw = String(name || '').trim();
    return Boolean(raw) && !/待命名|待AI补全|等待AI补全|等待ai补全|姓名待AI补全|未知|需要AI/i.test(raw)
      && !/^(妹妹|姐姐|哥哥|弟弟|父亲|母亲|爸爸|妈妈|联系人|微信联系人)$/.test(raw)
      && !/^(双胞胎|三胞胎|多胞胎)?(妹妹|姐姐|哥哥|弟弟|兄弟|姐妹|联系人)(之一|之二|之三|其一|其二|其三)$/.test(raw);
  },

  findKnown(raw, store) {
    const name = typeof raw === 'string' ? raw : raw?.name;
    if (!name) return null;
    return store.findKnownCharacter?.(name) || null;
  },

  normalize(raw, store, preset = null) {
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
      detail: String(data.detail || data.desc || preset?.summary || '刚被剧情卷入的人物。').slice(0, 120),
      appearance: String(data.appearance || '外貌尚未固化。').slice(0, 120),
      personality: String(data.personality || '谨慎观察局势。').slice(0, 80),
      age: data.age || (String(`${data.role || ''} ${data.relationships || ''} ${data.detail || data.desc || preset?.summary || ''}`).match(/(\d{1,3})\s*岁/)?.[1] || ''),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 4).map(String) : [],
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 4) : [],
      equipment: this.carryItemsLoose(data.equipment, '装备'),
      items: this.carryItemsLoose(data.items, '物品'),
      wearing: this.wearingItemsLoose(data.wearing),
      importance: data.importance || (data.isMinor ? 'minor' : 'support'),
      isMinor: Boolean(data.isMinor),
      roleCard: true,
      presetProfilePath: preset?.path || '',
    };
  },

  async generate(base, lore, attrs, context, store, signature = '', preset = null) {
    try {
      if (!window.dzmm?.completions) throw new Error('无法生成个人资料：AI接口不可用，不能使用本地兜底原因。');
      const prompt = await this.prompt(base, lore, attrs, context, store, preset);
      return this.withSignature(await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'character-profile-card',
        model: 'nalang-medium-0826',
        maxTokens: 3200,
        timeoutMs: 90000,
        prompt,
        format: prompt,
        parse: (text) => this.parse(text),
        validate: (raw) => this.validate(raw, base, lore, attrs, store),
      }), signature);
    } catch (err) {
      console.warn('人物设定生成失败:', err.code, err.message, err.stack);
      throw err;
    }
  },

  async prompt(base, lore, attrs, context, store, preset = null) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(store);
    return window.GameModules.promptTemplates.render('character-profile-card', {
      人物预设资料区: window.GameModules.characterProfileSource.presetText(preset),
      人物基础区: sections.characterBase(base),
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      关系事件区: sections.relationContext(context),
      世界观资料区: sections.worldLore(lore),
      世界字段: sections.worldFields(attrs),
      RPG字段列表: this.rpgFieldReasonKeys(attrs).join('、'),
      情绪字段: window.GameModules.metrics.emotionKeys.join('、'),
      关系指标字段: window.GameModules.metrics.playerKeys.join('、'),
    });
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(text);
  },

  validate(profile, base, lore, attrs, store = null) {
    profile = window.GameModules.characterReasonFallback?.apply?.({ ...base, ...(profile || {}) }, attrs) || profile;
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const confirmedJob = profile.jobConfirmed === true ? window.GameModules.professionInfo.normalizeJobName(profile.job) : '';
    const factions = this.factionRoles(profile, base, store);
    const forcePositions = this.forcePositions(profile, base, store);
    const validated = {
      ...base,
      name: this.validName(profile.name, base),
      gender: String(base.gender || profile.gender || '').slice(0, 8),
      age: base.age || profile.age || '',
      relationships: this.formatRelationships(profile.relationships || base.relationships || ''),
      role: String(profile.role || base.role).slice(0, 18),
      detail: String(profile.detail || base.detail).slice(0, 160),
      appearance: String(profile.appearance || base.appearance || '外貌尚未固化。').slice(0, 140),
      personality: String(profile.personality || base.personality).slice(0, 100),
      faction: String(factions[0]?.faction || profile.faction || '无').slice(0, 30),
      factionRole: String(factions[0]?.role || factions[0]?.position || profile.factionRole || profile.role || '').slice(0, 24),
      job: confirmedJob,
      rank: String(forcePositions[0]?.position || profile.rank || '').slice(0, 30),
      factions,
      forcePositions,
      force_positions: forcePositions,
      skills: skills.slice(0, 4).map((skill, index) => ({
        name: String(skill.name || `能力${index + 1}`).slice(0, 16),
        desc: String(skill.desc || '').slice(0, 60),
        reason: String(skill.reason || '').slice(0, 120),
        changeMode: String(skill.reason || '').slice(0, 120),
      })),
      roleCardFieldReasons: this.roleCardFieldReasons(profile.roleCardFieldReasons),
      equipment: this.carryItems(profile.equipment || base.equipment, '装备'),
      items: this.carryItems(profile.items || base.items, '物品'),
      wearing: this.wearingItems(profile.wearing || base.wearing),
      worldValues: this.worldValues(profile.worldValues, attrs, base.name),
      worldAttributes: attrs,
      rpgFieldReasons: this.rpgFieldReasons(profile.rpgFieldReasons, attrs, { ...base, ...profile, factions, forcePositions }),
      initialMetrics: this.initialMetrics(profile.initialMetrics),
      roleCard: true,
      roleCardSource: 'ai',
      roleCardUpdatedAt: new Date().toISOString(),
    };
    if (!this.hasRequiredInventoryReasons(validated)) throw new Error('角色卡数组词条缺少首次原因');
    return validated;
  },

  withSignature(profile, signature) {
    return { ...profile, roleCardInputSignature: signature || profile.roleCardInputSignature || '' };
  },

  inputSignature(base, context, store, preset = null) {
    const p = store?.playerProfile || {};
    const data = {
      base: {
        id: base.id, name: base.name, work: base.work, role: base.role, gender: base.gender,
        relationships: base.relationships, nameRule: base.nameRule, detail: base.detail,
        appearance: base.appearance, personality: base.personality, presetProfilePath: base.presetProfilePath,
        factions: base.factions, forcePositions: base.forcePositions || base.force_positions,
      },
      preset: { path: preset?.path || '', summary: preset?.summary || '' },
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
    return `v6:${raw.length}-${window.GameModules.rpgState.seed(raw)}`;
  },

  fallback(base, lore, attrs) {
    return this.validate({
      ...base,
      faction: lore.factions[0]?.name || '临时关系社群',
      job: '',
      jobConfirmed: false,
      rank: base.role || '成员',
      skills: base.skills?.length ? base.skills : [{ name: '观察', desc: '从细节中判断局势。' }],
      worldValues: {},
    }, base, lore, attrs, window.Alpine?.store?.('game'));
  },

  factionRoles(profile, base, store = null) {
    const social = window.GameModules.socialPosition;
    const list = Array.isArray(profile.factions) ? profile.factions : [];
    const items = list.map((item) => {
      if (typeof item === 'string') {
        const [faction, role] = item.split('/').map((x) => x.trim());
        return social?.item?.(faction, role || '成员') || { name: item, faction, role: role || '成员' };
      }
      const baseItem = social?.item?.(item.faction || item.name, item.role || item.position || '成员') || item;
      const reason = String(item.reason || item.changeMode || baseItem.reason || baseItem.changeMode || '').trim().slice(0, 120);
      return { ...baseItem, reason, changeMode: reason };
    }).filter((item) => item?.faction || item?.name);
    if (items.length) return items.slice(0, 4);
    const faction = profile.faction || base.faction || store?.playerProfile?.refinedCity || store?.playerProfile?.city || '临时关系社群';
    const role = profile.factionRole || base.factionRole || base.role || profile.role || '成员';
    return [social?.item?.(faction, role) || { name: `${faction} / ${role}`, faction, role }].filter((item) => item?.faction || item?.name).slice(0, 4);
  },

  forcePositions(profile, base = {}, store = null) {
    const social = window.GameModules.socialPosition;
    const list = Array.isArray(profile.forcePositions) ? profile.forcePositions : (Array.isArray(profile.force_positions) ? profile.force_positions : []);
    const items = list.map((item) => {
      if (typeof item === 'string') {
        const [force, position] = item.split('/').map((x) => x.trim());
        return social?.forceItem?.(force, position || '成员') || { name: item, force, position: position || '成员' };
      }
      const baseItem = social?.forceItem?.(item.force || item.faction || item.name, item.position || item.rank || '成员') || item;
      const reason = String(item.reason || item.changeMode || baseItem.reason || baseItem.changeMode || '').trim().slice(0, 120);
      return { ...baseItem, reason, changeMode: reason };
    }).filter((item) => item?.force || item?.faction || item?.name);
    const country = social?.countryForceItems?.(store?.factionState?.factions || []) || [];
    const modern = /原创世界|现实|现代|2026/.test(`${profile.work || base.work || ''}${store?.realWorld2026?.label || ''}`);
    if (modern && country.length && !items.some((item) => item.force === country[0].force || item.name === country[0].name)) items.unshift(country[0]);
    if (!items.length) {
      const force = profile.force || base.force || profile.workplace || base.workplace || '';
      const position = profile.position || base.position || profile.rank || base.rank || '';
      if (force && position) items.push(social?.forceItem?.(force, position) || { name: `${force} / ${position}`, force, position });
    }
    if (!items.length) items.push(social?.forceItem?.('现实社会', profile.rank || base.rank || profile.role || base.role || '成员') || { name: '现实社会 / 成员', force: '现实社会', position: '成员' });
    return items.slice(0, 4);
  },

  carryItemsLoose(value, kind) {
    const p = window.GameModules.progression;
    const list = Array.isArray(value) ? value : [];
    return list.map((item) => p.normalizeCarryItem(item, kind)).filter((item) => item.name && item.name !== '未命名物品').slice(0, 20);
  },

  wearingItemsLoose(value) {
    const list = Array.isArray(value) ? value : [];
    return list.map((item) => {
      const name = String(item?.name || '未穿戴').slice(0, 32);
      const slot = String(item?.slot || '').slice(0, 12);
      return { slot, name, type: '穿着', description: String(item?.description || '').slice(0, 80), reason: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), changeMode: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), level: -1 };
    }).filter((item) => item.slot && item.name !== '未穿戴').slice(0, 20);
  },

  carryItems(value, kind) {
    const list = this.carryItemsLoose(value, kind);
    return list.map((item) => {
      const reason = String(item?.reason || item?.changeMode || '').trim().slice(0, 120);
      if (this.abstractReason(reason)) throw new Error(`${kind}${item.name || ''}缺少AI给出的具体变化原因`);
      return { ...item, reason, changeMode: reason };
    });
  },

  wearingItems(value) {
    return this.wearingItemsLoose(value).map((item) => {
      const reason = String(item?.reason || item?.changeMode || '').trim().slice(0, 120);
      if (this.abstractReason(reason)) throw new Error(`穿着${item.name || ''}缺少AI给出的具体变化原因`);
      return { ...item, reason, changeMode: reason };
    });
  },

  worldValues(values, attrs) {
    if (!values || typeof values !== 'object') return {};
    const keys = new Set((attrs.fields || []).map((field) => field.key));
    return Object.fromEntries(Object.entries(values).filter(([key]) => keys.has(key)));
  },

  roleCardFieldKeys() {
    return ['姓名', '所属世界', '身份', '职业', '性别', '生日', '人际关系', '外貌', '性格', '人物说明', '社群角色', '势力地位'];
  },

  abstractReason(text) {
    const value = String(text || '').trim();
    if (!value) return true;
    return /^(来源于角色资料|剧情证据|世界规则|根据上下文|根据上下文推断|根据上下文判断|初始化|系统生成|综合判断|默认|身份信息|资料|固化|共同确定)$/.test(value)
      || /^(来源于|根据|基于).{0,8}(角色资料|剧情证据|世界规则|上下文)$/.test(value)
      || /^缺少明确证据所以默认/.test(value);
  },

  roleCardFieldReasons(value) {
    const keys = this.roleCardFieldKeys();
    if (!value || typeof value !== 'object') throw new Error('roleCardFieldReasons 缺失');
    const out = Object.fromEntries(keys.map((key) => [key, String(value[key] || '').trim().slice(0, 140)]));
    const vague = keys.filter((key) => this.abstractReason(out[key]));
    if (vague.length) throw new Error(`roleCardFieldReasons 缺少具体经历原因: ${vague.join(',')}`);
    return out;
  },

  hasRequiredRoleCardFieldReasons(value) {
    if (!value || typeof value !== 'object') return false;
    return this.roleCardFieldKeys().every((key) => !this.abstractReason(value[key]));
  },

  hasRequiredInventoryReasons(profile) {
    const hasReason = (items) => Array.isArray(items) && items.length && items.every((item) => String(item?.reason || item?.changeMode || '').trim());
    return hasReason(profile?.factions) && hasReason(profile?.forcePositions || profile?.force_positions) && hasReason(profile?.equipment) && hasReason(profile?.items) && hasReason(profile?.wearing) && hasReason(profile?.skills);
  },

  isReusableRoleCard(profile, signature = null) {
    const signatureOk = signature === null || profile?.roleCardInputSignature === signature;
    return signatureOk && this.isRoleCard(profile) && this.hasRequiredRoleCardFieldReasons(profile.roleCardFieldReasons) && this.hasRequiredInventoryReasons(profile) && this.hasRequiredInitialMetrics(profile.initialMetrics) && this.hasRequiredRpgFieldReasons(profile.rpgFieldReasons, profile?.worldAttributes);
  },

  rpgFieldReasonKeys(attrs = null) {
    const sections = window.GameModules.progression.schemaSections(attrs || { fields: [] });
    return [...new Set(sections.flatMap((section) => section.fields || []).map((field) => field.key).filter((key) => key !== 'intrinsic_sources'))];
  },


  hasRequiredRpgFieldReasons(value, attrs = null) {
    if (!value || typeof value !== 'object') return false;
    return this.rpgFieldReasonKeys(attrs).every((key) => !this.abstractReason(value[key]));
  },

  cleanRpgFieldReasons(value, attrs = null) {
    return this.requireRpgFieldReasons({ rpgFieldReasons: value, worldAttributes: attrs }, attrs, '个人资料');
  },

  requireRpgFieldReasons(profile, attrs = null, label = '个人资料') {
    const keys = this.rpgFieldReasonKeys(attrs || profile?.worldAttributes || null);
    const reasons = profile?.rpgFieldReasons || {};
    const missing = keys.filter((key) => this.abstractReason(reasons[key]));
    if (missing.length) throw new Error(`${label} 缺少AI给出的具体RPG变化原因: ${missing.join('、')}`);
    return Object.fromEntries(keys.map((key) => [key, String(reasons[key]).trim().slice(0, 120)]));
  },

  rpgFieldReasons(value, attrs = null, profile = {}) {
    return this.requireRpgFieldReasons({ ...profile, rpgFieldReasons: value, worldAttributes: attrs }, attrs, profile?.name || '角色卡');
  },

  hasRequiredInitialMetrics(value) {
    const hasAll = (items, keys) => Array.isArray(items) && keys.every((key) => {
      const item = items.find((entry) => entry?.key === key);
      return item && item.value !== undefined && String(item.reason || '').trim();
    });
    return hasAll(value?.emotions, window.GameModules.metrics.emotionKeys) && hasAll(value?.playerFeelings, window.GameModules.metrics.playerKeys);
  },

  initialMetrics(value) {
    const normalize = (items, keys) => Array.isArray(items) ? items.filter((item) => keys.includes(item?.key)).map((item) => ({ key: item.key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status || '').slice(0, 80), reason: String(item.reason || '').slice(0, 80) })) : [];
    const out = { emotions: normalize(value?.emotions, window.GameModules.metrics.emotionKeys), playerFeelings: normalize(value?.playerFeelings, window.GameModules.metrics.playerKeys) };
    if (!this.hasRequiredInitialMetrics(out)) throw new Error('initialMetrics 缺少完整数值或原因');
    return out;
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
    if (this.isConcreteName(raw)) return raw.slice(0, 16);
    return '姓名待AI补全';
  },

  slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${window.GameModules.rpgState.seed(text)}`;
  },
};
