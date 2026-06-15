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
    const allowed = store?.characterCardGenerationAllowed || await window.GameModules.characterCardConfirm?.request?.(store, [base]);
    if (allowed && !allowed.has(base.id)) return existing?.profile || this.withSignature(this.localRoleCard(base, source.preset), signature);
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
        maxTokens: 5000,
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
      skills: skills.slice(0, 4).map((skill, index) => {
        const item = { name: String(skill.name || `能力${index + 1}`).slice(0, 16), desc: String(skill.desc || '').slice(0, 60) };
        const reason = this.inventoryReason({ ...skill, ...item }, '技能', { ...base, ...profile });
        return { ...item, reason, changeMode: reason };
      }),
      roleCardFieldReasons: this.roleCardFieldReasons(profile.roleCardFieldReasons),
      equipment: this.carryItems(profile.equipment || base.equipment, '装备', { ...base, ...profile }),
      items: this.carryItems(profile.items || base.items, '物品', { ...base, ...profile }),
      wearing: this.wearingItems(profile.wearing || base.wearing, { ...base, ...profile }),
      worldValues: this.worldValues(profile.worldValues, attrs, base.name),
      worldAttributes: attrs,
      rpgFieldReasons: this.rpgFieldReasons(profile.rpgFieldReasons, attrs, { ...base, ...profile, factions, forcePositions }),
      initialMetrics: this.initialMetrics(profile.initialMetrics, { ...base, ...profile }),
      roleCard: true,
      roleCardSource: 'ai',
      roleCardUpdatedAt: new Date().toISOString(),
    };
    return this.ensureInventoryReasons(validated);
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

  localRoleCard(base, preset = null) {
    const reason = '玩家跳过AI生成，暂用本地人物设定和目录资料占位。';
    const profile = {
      ...base,
      detail: base.detail || preset?.summary || '本地资料暂未提供详细说明。',
      appearance: base.appearance || '本地资料暂未提供外貌。',
      personality: base.personality || '本地资料暂未提供性格。',
      factions: base.factions || [{ faction: base.work || '当前世界', role: base.role || '成员', reason }],
      forcePositions: base.forcePositions || base.force_positions || [{ force: base.work || '当前世界', position: base.role || '成员', reason }],
      roleCardFieldReasons: Object.fromEntries(this.roleCardFieldKeys().map((key) => [key, reason])),
      rpgFieldReasons: {},
      initialMetrics: { emotions: [], playerFeelings: [] },
      roleCard: true,
      roleCardSource: 'local-skip',
      roleCardUpdatedAt: new Date().toISOString(),
    };
    return this.ensureInventoryReasons(profile);
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

  inventoryReason(item, kind, profile = {}) {
    const explicit = String(item?.reason || item?.changeMode || '').trim().slice(0, 120);
    if (!this.abstractReason(explicit)) return explicit;
    const name = String(item?.name || item?.slot || kind || '词条').trim();
    const actor = profile.name || '该人物';
    const role = profile.role || profile.job || '当前身份';
    const setting = [profile.work, profile.relationships, profile.detail, profile.personality].filter(Boolean).join('，') || '当前生活处境';
    if (kind === '穿着') return `${actor}以${role}处在${setting}中，${name}符合其年龄、场景和日常穿戴需要。`.slice(0, 120);
    if (kind === '装备') return `${actor}以${role}行动时需要${name}支撑通讯、工作、训练或当前事件处理。`.slice(0, 120);
    if (kind === '物品') return `${actor}的${setting}让其日常需要携带${name}，便于生活、出行或处理当前关系事件。`.slice(0, 120);
    return `${actor}在${setting}中长期形成或需要使用${name}，支撑其${role}的行动判断。`.slice(0, 120);
  },

  carryItems(value, kind, profile = {}) {
    const list = this.carryItemsLoose(value, kind);
    return list.map((item) => {
      const reason = this.inventoryReason(item, kind, profile);
      return { ...item, reason, changeMode: reason };
    });
  },

  wearingItems(value, profile = {}) {
    return this.wearingItemsLoose(value).map((item) => {
      const reason = this.inventoryReason(item, '穿着', profile);
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
    const optionalReason = (items) => !Array.isArray(items) || !items.length || items.every((item) => String(item?.reason || item?.changeMode || '').trim());
    return hasReason(profile?.factions) && hasReason(profile?.forcePositions || profile?.force_positions) && optionalReason(profile?.equipment) && optionalReason(profile?.items) && optionalReason(profile?.wearing) && optionalReason(profile?.skills);
  },

  ensureInventoryReasons(profile) {
    const fill = (items, kind) => (Array.isArray(items) ? items.map((item) => {
      const reason = this.inventoryReason(item, kind, profile);
      return { ...item, reason, changeMode: reason };
    }) : []);
    const out = {
      ...profile,
      factions: fill(profile.factions, '社群角色'),
      forcePositions: fill(profile.forcePositions || profile.force_positions, '势力地位'),
      equipment: fill(profile.equipment, '装备'),
      items: fill(profile.items, '物品'),
      wearing: fill(profile.wearing, '穿着'),
      skills: fill(profile.skills, '技能'),
    };
    out.force_positions = out.forcePositions;
    return out;
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

  initialMetrics(value, profile = {}) {
    const normalize = (items, keys, type) => {
      const list = Array.isArray(items) ? items : [];
      return keys.map((key) => {
        const item = list.find((entry) => entry?.key === key) || {};
        const fallback = this.defaultMetric(key, type, profile);
        const metricValue = item.value !== undefined ? window.GameModules.metrics.clamp(item.value) : fallback.value;
        const stage = window.GameModules.metrics.stageFor(key, metricValue);
        return {
          key,
          value: metricValue,
          status: String(item.status || fallback.status || window.GameModules.metrics.stageStatus(key, stage)).slice(0, 80),
          reason: String(item.reason || fallback.reason).slice(0, 80),
        };
      });
    };
    return { emotions: normalize(value?.emotions, window.GameModules.metrics.emotionKeys, 'emotion'), playerFeelings: normalize(value?.playerFeelings, window.GameModules.metrics.playerKeys, 'player') };
  },

  defaultMetric(key, type, profile = {}) {
    const name = profile.name || '该人物';
    const role = profile.role || profile.job || '当前身份';
    const detail = profile.detail || profile.personality || '当前人物资料';
    const defaults = type === 'emotion' ? window.GameModules.metrics.defaults.emotions : window.GameModules.metrics.defaults.playerFeelings;
    const value = window.GameModules.metrics.clamp(defaults[key] ?? 0);
    const stage = window.GameModules.metrics.stageFor(key, value);
    const status = window.GameModules.metrics.stageStatus(key, stage);
    let reason = type === 'emotion'
      ? `${name}以${role}处在${detail}中，因此${key}按当前经历折算为初始状态。`
      : `${name}与玩家的关系证据来自${profile.relationships || detail}，因此对玩家的${key}按初始接触状态记录。`;
    if (key === '亲情' && /哥哥|姐姐|弟弟|妹妹|父亲|母亲|家人|亲属/.test(`${profile.relationships || ''} ${detail}`)) reason = `${name}与玩家存在明确亲属或家庭关系，因此亲情从人物关系中形成。`;
    if (key === '了解') reason = `${name}只掌握玩家当前表现出的身份、关系和行为线索，了解程度按初始接触记录。`;
    if (key === '警惕') reason = `${name}尚未完全确认玩家意图，会依据当前处境保持必要观察和防备。`;
    return { value, status, reason };
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
