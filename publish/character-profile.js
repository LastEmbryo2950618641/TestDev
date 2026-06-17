/**
 * 出场人物设定：为已知角色与路人 NPC 固化完整资料。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterProfile = {
  async ensure(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = window.GameModules.sqliteSave.getCharacterState(base.id);
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
      birthday: String(data.birthday || '').slice(0, 20),
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
      const profile = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'character-profile-card',
        model: 'nalang-turbo-0826',
        timeoutMs: 60000,
        prompt,
        format: prompt,
        repairHint: this.repairHint(base, attrs),
        parse: (text) => this.parse(text),
        validate: (raw) => this.validate(raw, base, lore, attrs, store, { skipInitialMetrics: true }),
      });
      const initialMetrics = await this.generateInitialMetrics(profile, base, lore, attrs, context, store);
      return this.withSignature({ ...profile, initialMetrics }, signature);
    } catch (err) {
      console.warn('人物设定生成失败:', err.code, err.message, err.stack);
      throw err;
    }
  },

  async prompt(base, lore, attrs, context, store, preset = null) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(store);
    const data = {
      presetText: window.GameModules.characterProfileSource.presetText(preset),
      characterBase: sections.characterBase(base),
      playerBasic: player.playerBasic,
      playerIdentity: player.playerIdentity,
      playerHome: player.playerHome,
      playerRelations: player.playerRelations,
      playerNotes: player.playerNotes,
      relationContext: sections.relationContext(context),
      worldLore: sections.worldLore(lore),
      worldFields: sections.worldFields(attrs),
      rpgKeys: this.rpgFieldReasonKeys(attrs).join('、'),
      emotionKeys: window.GameModules.metrics.emotionKeys.join('、'),
      playerKeys: window.GameModules.metrics.playerKeys.join('、'),
    };
    const text = await window.GameModules.promptTemplates.render('character-profile-card', {
      人物预设资料区: data.presetText,
      人物基础区: data.characterBase,
      玩家基础资料区: data.playerBasic,
      玩家现实身份区: data.playerIdentity,
      玩家居住家庭区: data.playerHome,
      玩家人际关系区: data.playerRelations,
      玩家备注区: data.playerNotes,
      关系事件区: data.relationContext,
      世界观资料区: data.worldLore,
      世界字段: data.worldFields,
      RPG字段列表: data.rpgKeys,
      情绪字段: data.emotionKeys,
      关系指标字段: data.playerKeys,
      玩家本人目标锁定: base.id === 'player-self' ? `本次只生成玩家本人“${base.name}”的角色卡。JSON 根字段 name 必须写“${base.name}”，不得写妹妹、姐姐、父母、联系人或关系事件里的任何其他姓名。如果上下文提到亲属，她们只能写进 relationships/detail 作为关系对象，不能成为本角色卡主语。gender、age、birthday 优先沿用人物基础区；不要根据亲属资料改写玩家本人身份。` : '无。',
    });
    return text;
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(text);
  },

  parseMetricGroup(text, group, keys) {
    const recovered = this.recoverMetricGroup(text, group, keys);
    if (recovered[group]?.length === keys.length) return recovered;
    try {
      return this.parse(text);
    } catch (err) {
      if (recovered[group]?.length) return recovered;
      throw err;
    }
  },

  recoverMetricGroup(text, group, keys) {
    const raw = String(text || '').replace(/```(?:json)?|```/g, '');
    const items = [];
    keys.forEach((key, index) => {
      const keyPattern = new RegExp(`"key"\\s*:\\s*"${key}"`);
      const found = raw.match(keyPattern);
      const start = found?.index ?? -1;
      const endKey = keys[index + 1];
      const endMatch = endKey && start >= 0 ? raw.slice(start + 1).match(new RegExp(`"key"\\s*:\\s*"${endKey}"`)) : null;
      const end = endMatch ? start + 1 + endMatch.index : -1;
      const chunk = start >= 0 ? raw.slice(start, end >= 0 ? end : undefined) : '';
      const value = chunk.match(/"value"\s*:\s*(-?\d+)/)?.[1];
      const status = chunk.match(/"status"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1];
      const reason = this.pickMetricReason(raw, chunk, key, start);
      if (value !== undefined || status || reason) items.push({ key, value: Number(value || 0), status: status || '', reason: reason || '' });
    });
    return { [group]: items };
  },

  pickMetricReason(raw, chunk, key, start) {
    const normal = chunk.match(/"reason"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1];
    if (normal) return normal;
    const tail = String(raw || '').slice(Math.max(0, start));
    const loose = tail.match(new RegExp(`"reason"\\s*:\\s*"(${key}[^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`));
    return loose?.[1] || '';
  },

  async generateInitialMetrics(profile, base, lore, attrs, context, store) {
    const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
    const emotions = await this.generateMetricGroupChunks(profile, base, evidence, 'emotions', window.GameModules.metrics.emotionKeys);
    const playerFeelings = await this.generateMetricGroupChunks(profile, base, evidence, 'playerFeelings', window.GameModules.metrics.playerKeys);
    return this.initialMetrics({ emotions, playerFeelings }, { ...base, ...profile });
  },

  metricGroupKeyChunks(group, keys) {
    const maxKeysPerRequest = 10;
    const chunks = [];
    for (let i = 0; i < keys.length; i += maxKeysPerRequest) chunks.push(keys.slice(i, i + maxKeysPerRequest));
    return chunks;
  },

  estimateMetricItemChars(key) {
    return 170 + key.length * 3;
  },

  async generateMetricGroupChunks(profile, base, evidence, group, keys) {
    const chunks = this.metricGroupKeyChunks(group, keys);
    const items = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      try {
        const part = await this.generateMetricGroup(profile, base, evidence, group, chunk, i + 1, chunks.length);
        items.push(...part);
      } catch (err) {
        console.warn('[角色数值] 分块生成失败:', { profile: profile.name || base.name, group, keys: chunk, error: err.message });
      }
      const missing = chunk.filter((key) => !items.some((item) => item?.key === key));
      if (missing.length) {
        this.warnMetricGroupIssues('角色数值缺字段，批量补齐一次', items, chunk, { ...base, ...profile, group, chunkIndex: i + 1 });
        try {
          const part = await this.generateMetricGroup(profile, base, evidence, group, missing, `${i + 1}-repair`, chunks.length);
          items.push(...part);
        } catch (err) {
          console.warn('[角色数值] 批量补齐失败，保留后续校验告警:', { profile: profile.name || base.name, group, missing, error: err.message, stack: err.stack });
        }
      }
    }
    return this.validateMetricGroup(items, keys, { ...base, ...profile, group });
  },

  async generateMetricGroup(profile, base, evidence, group, keys, chunkIndex = 1, chunkTotal = 1) {
    const prompt = await this.metricGroupPrompt(profile, base, evidence, group, keys);
    const source = chunkTotal > 1 ? `character-profile-${group}-${chunkIndex}` : `character-profile-${group}`;
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source,
      model: 'nalang-turbo-0826',
      timeoutMs: 60000,
      prompt,
      format: prompt,
      repairHint: this.metricGroupRepairHint(base, group, keys, evidence),
      parse: (text) => this.parseMetricGroup(text, group, keys),
      validate: (raw) => this.validateMetricGroup(raw?.[group] || raw?.items || raw, keys, { ...base, ...profile, group }),
    });
  },

  initialMetricsEvidence(profile, base, lore, attrs, context, store) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(store);
    return {
      roleCard: [
        `姓名：${profile.name || base.name}`,
        `身份：${profile.role || base.role || ''}`,
        `关系：${profile.relationships || base.relationships || ''}`,
        `背景：${profile.detail || base.detail || ''}`,
        `外貌：${profile.appearance || base.appearance || ''}`,
        `性格：${profile.personality || base.personality || ''}`,
        `社群：${(profile.factions || []).map((x) => `${x.faction}/${x.role || x.position || ''}`).join('、') || profile.faction || ''}`,
        `势力：${(profile.forcePositions || []).map((x) => `${x.force}/${x.position}`).join('、') || profile.rank || ''}`,
      ].join('\n').slice(0, 900),
      playerProfile: [player.playerBasic, player.playerIdentity, player.playerHome, player.playerRelations, player.playerNotes].join('\n').slice(0, 900),
      worldLore: sections.worldLore(lore).slice(0, 700),
      worldFields: sections.worldFields(attrs).slice(0, 400),
      relationContext: sections.relationContext(context).slice(0, 900),
    };
  },

  async metricGroupPrompt(profile, base, evidence, group, keys) {
    return window.GameModules.promptTemplates.render('character-profile-metric-group', {
      人物姓名: profile.name || base.name,
      数值组名称: group === 'emotions' ? '情绪' : '对玩家感觉',
      根字段: group,
      字段列表: keys.join('、'),
      人物角色卡: evidence.roleCard,
      玩家资料: evidence.playerProfile,
      世界观资料: evidence.worldLore,
      世界字段: evidence.worldFields,
      剧情关系事件: evidence.relationContext,
      完整JSON骨架: this.metricGroupSkeleton(group, keys),
      首个字段: keys[0],
    });
  },

  metricGroupSkeleton(group, keys) {
    return JSON.stringify({ [group]: keys.map((key) => ({ key, value: 0, status: `${key}因为人物经历与关系事件形成当前数值`, reason: `${key}源于人物过去经历和当前关系事件的影响` })) });
  },

  metricGroupRepairHint(base, group, keys, evidence = {}) {
    const relationEvidence = group === 'playerFeelings' ? [
      '修复 playerFeelings 时请重新参考下列证据，避免只照抄骨架里的 0：',
      `人物角色卡：${evidence.roleCard || ''}`,
      `玩家资料：${evidence.playerProfile || ''}`,
      `剧情关系事件：${evidence.relationContext || ''}`,
      '若证据中存在亲属、恋人、暧昧、依赖、占有、肉欲、畏惧、尊敬、支配等明确关系，相关 key 建议给出匹配数值，避免无依据地补成 0。',
      '证据明确缺乏对应关系或冲动时，亲情、爱情、肉欲、依赖、占有欲等可以为 0。',
    ].join('\n') : '';
    return [
      `目标人物只能是：${base.name}。`,
      `根字段必须是 ${group}。`,
      `必须重写完整 ${group} 数组，不是只输出报错的单个 key。`,
      relationEvidence,
      `直接按这个完整 JSON 骨架保留 key 和结构，再根据证据改写 value/status/reason；骨架里的 value:0 只是占位，不能当默认值：${this.metricGroupSkeleton(group, keys)}`,
      `${group} 必须按顺序完整包含：${keys.join('、')}，每个 key 精确一次，不能截断。`,
      '每一项都必须有 key、value、status、reason 四个字段；reason 是强制字段，即使上一轮只有 status，也必须为同一个 key 补出 reason。',
      '每个对象必须以 reason 作为最后一个字段，写完 reason 才能关闭对象。',
      '本批 key 很少，必须完整输出每个 key；不要省略任何一个对象。',
      'status 和 reason 都应是短中文句子，建议以当前key开头，说明状态和原因，不能留空。',
      'status 和 reason 尽量包含当前 key 字面文本，并优先结合人物经历、处境、关系、玩家或家庭证据。',
      '尽量少写“坚强的性格支撑”“性格使然”“综合判断”等抽象空话。',
      '不要返回英文 key、initial_metrics、affection、dependency、trust_level 等替代结构。',
      '只返回一行紧凑 JSON，不要 Markdown。',
    ].filter(Boolean).join('\n');
  },

  warnMetricGroupIssues(label, value, keys, profile = {}) {
    const list = Array.isArray(value) ? value : [];
    const returnedKeys = list.map((entry) => entry?.key).filter(Boolean);
    const missing = keys.filter((key) => !list.some((entry) => entry?.key === key));
    const missingValue = keys.filter((key) => {
      const item = list.find((entry) => entry?.key === key);
      return item && item.value === undefined;
    });
    const missingStatus = keys.filter((key) => {
      const item = list.find((entry) => entry?.key === key);
      return item && !String(item.status || '').trim();
    });
    const missingReason = keys.filter((key) => {
      const item = list.find((entry) => entry?.key === key);
      return item && !String(item.reason || '').trim();
    });
    const extra = returnedKeys.filter((key) => !keys.includes(key));
    if (missing.length || missingValue.length || missingStatus.length || missingReason.length || extra.length) {
      console.warn(`[${label}]`, { profile: profile.name || '角色', group: profile.group || 'unknown', expectedKeys: keys, returnedKeys, missing, missingValue, missingStatus, missingReason, extra, chunkIndex: profile.chunkIndex || null });
    }
    return { missing, missingValue, missingStatus, missingReason, extra };
  },

  validateMetricGroup(value, keys, profile = {}) {
    if (!Array.isArray(value)) {
      console.warn('[角色数值校验] 数值组不是数组:', { profile: profile.name || '角色', group: profile.group || 'unknown', value });
      throw new Error(`${profile.name || '角色'} 的数值组不是数组`);
    }
    const issues = this.warnMetricGroupIssues('角色数值校验缺字段', value, keys, profile);
    if (issues.missing.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missing.join('、')}数值项`);
    if (issues.missingValue.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missingValue.join('、')}数值`);
    if (issues.missingStatus.length) throw new Error(`${profile.name || '角色'} 的${issues.missingStatus.join('、')}缺少AI生成的数值解释`);
    if (issues.missingReason.length) throw new Error(`${profile.name || '角色'} 的${issues.missingReason.join('、')}缺少AI生成的变化原因`);
    return keys.map((key) => {
      const item = value.find((entry) => entry?.key === key);
      return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180) };
    });
  },

  repairHint(base, attrs = null) {
    return [
      `目标人物只能是：${base.name}。name 必须逐字等于“${base.name}”，不要同音改字，不要改成亲属、联系人或关系对象。`,
      '必须返回根字段 roleCardFieldReasons，不是 roleCardField、中文字段平铺或社群映射。',
      'roleCardFieldReasons 必须完整包含：姓名、所属世界、身份、职业、性别、生日、人际关系、外貌、性格、人物说明、社群角色、势力地位。每个值建议写一句人物相关原因。',
      `必须返回根字段 rpgFieldReasons，并完整包含：${this.rpgFieldReasonKeys(attrs).join('、')}。`,
      '本轮不要返回 initialMetrics、initial_metrics 或任何情绪/感觉数组。',
      'relationships 必须是字符串，格式“关系：姓名”；不要对象。',
    ].join('\n');
  },

  validate(profile, base, lore, attrs, store = null, options = {}) {
    let rawProfile = profile || {};
    const expectedName = String(base.name || '').trim();
    if (base.id === 'player-self') {
      rawProfile = this.lockPlayerSelfProfile(rawProfile, base);
    } else if (this.isConcreteName(expectedName) && rawProfile.name && rawProfile.name !== expectedName) {
      throw new Error(`目标人物漂移: 需要生成${expectedName}，AI返回了${rawProfile.name}`);
    }
    profile = { ...base, ...rawProfile, name: base.id === 'player-self' ? expectedName : (rawProfile.name || base.name) };
    const fallbackApplied = window.GameModules.characterReasonFallback?.apply?.(profile, attrs) || profile;
    profile = { ...profile, roleCardFieldReasons: fallbackApplied.roleCardFieldReasons, rpgFieldReasons: fallbackApplied.rpgFieldReasons };
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const confirmedJob = profile.jobConfirmed === true ? window.GameModules.professionInfo.normalizeJobName(profile.job) : '';
    const factions = this.factionRoles(profile, base, store);
    const forcePositions = this.forcePositions(profile, base, store);
    const validated = {
      ...base,
      name: base.id === 'player-self' ? base.name : this.validName(profile.name, base),
      gender: String(base.gender || profile.gender || '').slice(0, 8),
      age: base.age || profile.age || '',
      relationships: this.formatRelationships(profile.relationships || base.relationships || '', base),
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
      roleCardFieldReasons: this.roleCardFieldReasons(profile.roleCardFieldReasons, { ...base, ...profile }),
      equipment: this.carryItems(profile.equipment || base.equipment, '装备', { ...base, ...profile }),
      items: this.carryItems(profile.items || base.items, '物品', { ...base, ...profile }),
      wearing: this.wearingItems(profile.wearing || base.wearing, { ...base, ...profile }),
      worldValues: this.worldValues(profile.worldValues, attrs, base.name),
      worldAttributes: attrs,
      rpgFieldReasons: this.rpgFieldReasons(profile.rpgFieldReasons, attrs, { ...base, ...profile, factions, forcePositions }),
      initialMetrics: options.skipInitialMetrics ? null : this.initialMetrics(profile.initialMetrics, { ...base, ...profile }),
      roleCard: true,
      roleCardSource: 'ai',
      roleCardUpdatedAt: new Date().toISOString(),
    };
    return this.ensureInventoryReasons(validated);
  },

  lockPlayerSelfProfile(profile, base) {
    const locked = { ...profile, id: 'player-self', name: base.name, isPlayer: true };
    ['gender', 'age', 'birthday'].forEach((key) => {
      if (base[key] !== undefined && base[key] !== null && String(base[key]).trim()) locked[key] = base[key];
    });
    ['work', 'role', 'job', 'faction', 'workplace', 'position', 'rank'].forEach((key) => {
      if (base[key] !== undefined && base[key] !== null && String(base[key]).trim()) locked[key] = base[key];
    });
    const wrongName = String(profile?.name || '').trim();
    if (wrongName && wrongName !== base.name) {
      console.warn('[角色卡] 玩家本人姓名被AI写成其他人物，已强制锁回:', { expected: base.name, actual: wrongName });
      locked.detail = base.detail || locked.detail;
      locked.personality = base.personality || locked.personality;
      locked.appearance = base.appearance || locked.appearance;
      locked.relationships = base.relationships || locked.relationships;
    }
    return locked;
  },

  escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    return `v7:${raw.length}-${window.GameModules.rpgState.seed(raw)}`;
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

  compactProfileContext(profile = {}) {
    return [profile.work, this.formatRelationships(profile.relationships || ''), profile.role || profile.job, profile.personality].filter(Boolean).join('，').slice(0, 80);
  },

  inventoryReason(item, kind, profile = {}) {
    const explicit = String(item?.reason || '').trim().slice(0, 120);
    if (!this.abstractReason(explicit)) return explicit;
    const name = String(item?.name || item?.slot || kind || '词条').trim();
    const actor = profile.name || '该人物';
    const role = profile.role || profile.job || '当前身份';
    const setting = this.compactProfileContext(profile) || '当前生活处境';
    if (kind === '穿着') return `${actor}当前处于${setting}，${name}符合其年龄、场景和日常穿戴需要。`.slice(0, 120);
    if (kind === '装备') return `${actor}以${role}行动时需要${name}支撑通讯、工作、训练或当前事件处理。`.slice(0, 120);
    if (kind === '物品') return `${actor}在${setting}中日常需要携带${name}，便于生活、出行或处理当前事件。`.slice(0, 120);
    return `${actor}在${setting}中长期形成或需要使用${name}，支撑其${role}的行动判断。`.slice(0, 120);
  },

  carryItems(value, kind, profile = {}) {
    const list = this.carryItemsLoose(value, kind);
    return list.map((item) => {
      const reason = this.inventoryReason(item, kind, profile);
      return { ...item, reason, changeMode: '角色卡初始固化' };
    });
  },

  wearingItems(value, profile = {}) {
    return this.wearingItemsLoose(value).map((item) => {
      const reason = this.inventoryReason(item, '穿着', profile);
      return { ...item, reason, changeMode: '角色卡初始固化' };
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
      || /^缺少明确证据所以默认$/.test(value);
  },

  wrongSubjectReason(text, profile = {}, key = '') {
    const value = String(text || '').trim(), name = String(profile?.name || '').trim();
    const kinship = /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/;
    if (!name || key === '人际关系' || kinship.test(String(profile?.role || ''))) return false;
    if (value.includes(name)) return false;
    return /(作为|是|属于|承担|体现了).{0,18}(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/.test(value) || /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子).{0,12}(身份|性格|外貌|生日|职业|资料)/.test(value);
  },

  roleCardFieldReasons(value, profile = {}) {
    const keys = this.roleCardFieldKeys();
    const fallback = window.GameModules.characterReasonFallback?.roleReasons?.(profile) || {};
    const source = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(keys.map((key) => {
      const current = String(source[key] || '').trim().slice(0, 140);
      const safeCurrent = current && !this.wrongSubjectReason(current, profile, key) ? current : '';
      return [key, safeCurrent || String(fallback[key] || `${profile.name || '该人物'}的${key}由当前人物资料与生活处境共同确定。`).slice(0, 140)];
    }));
  },

  hasRequiredRoleCardFieldReasons(value, profile = {}) {
    if (!value || typeof value !== 'object') return false;
    return this.roleCardFieldKeys().every((key) => String(value[key] || '').trim() && !this.wrongSubjectReason(value[key], profile, key));
  },

  hasRequiredInventoryReasons(profile) {
    const hasReason = (items) => Array.isArray(items) && items.length && items.every((item) => String(item?.reason || item?.changeMode || '').trim());
    const optionalReason = (items) => !Array.isArray(items) || !items.length || items.every((item) => String(item?.reason || item?.changeMode || '').trim());
    return hasReason(profile?.factions) && hasReason(profile?.forcePositions || profile?.force_positions) && optionalReason(profile?.equipment) && optionalReason(profile?.items) && optionalReason(profile?.wearing) && optionalReason(profile?.skills);
  },

  ensureInventoryReasons(profile) {
    const fill = (items, kind) => (Array.isArray(items) ? items.map((item) => {
      const reason = this.inventoryReason(item, kind, profile);
      return { ...item, reason, changeMode: item.changeMode && !this.abstractReason(item.changeMode) && item.changeMode.length < 24 ? item.changeMode : '角色卡初始固化' };
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
    return signatureOk && this.isRoleCard(profile) && this.hasRequiredRoleCardFieldReasons(profile.roleCardFieldReasons, profile) && this.hasRequiredInventoryReasons(profile) && this.hasRequiredInitialMetrics(profile.initialMetrics) && this.hasRequiredRpgFieldReasons(profile.rpgFieldReasons, profile?.worldAttributes);
  },

  rpgFieldReasonKeys(attrs = null) {
    const sections = window.GameModules.progression.schemaSections(attrs || { fields: [] });
    return [...new Set(sections.flatMap((section) => section.fields || []).map((field) => field.key).filter((key) => key !== 'intrinsic_sources'))];
  },


  hasRequiredRpgFieldReasons(value, attrs = null) {
    if (!value || typeof value !== 'object') return false;
    return this.rpgFieldReasonKeys(attrs).every((key) => String(value[key] || '').trim());
  },

  cleanRpgFieldReasons(value, attrs = null) {
    return this.requireRpgFieldReasons({ rpgFieldReasons: value, worldAttributes: attrs }, attrs, '个人资料');
  },

  requireRpgFieldReasons(profile, attrs = null, label = '个人资料') {
    const keys = this.rpgFieldReasonKeys(attrs || profile?.worldAttributes || null);
    const reasons = profile?.rpgFieldReasons || {};
    const missing = keys.filter((key) => !String(reasons[key] || '').trim());
    if (missing.length) throw new Error(`${label} 缺少AI给出的RPG变化原因: ${missing.join('、')}`);
    return Object.fromEntries(keys.map((key) => [key, String(reasons[key]).trim().slice(0, 120)]));
  },

  rpgFieldReasons(value, attrs = null, profile = {}) {
    return this.requireRpgFieldReasons({ ...profile, rpgFieldReasons: value, worldAttributes: attrs }, attrs, profile?.name || '角色卡');
  },

  hasRequiredInitialMetrics(value) {
    const hasAll = (items, keys) => Array.isArray(items) && keys.every((key) => {
      const item = items.find((entry) => entry?.key === key);
      return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
    });
    return hasAll(value?.emotions, window.GameModules.metrics.emotionKeys) && hasAll(value?.playerFeelings, window.GameModules.metrics.playerKeys);
  },

  validMetricText(text, key) {
    return Boolean(String(text || '').trim());
  },

  initialMetrics(value, profile = {}) {
    const normalize = (items, keys, type) => {
      const list = Array.isArray(items) ? items : [];
      return keys.map((key) => {
        const item = list.find((entry) => entry?.key === key) || {};
        if (item.value === undefined) throw new Error(`${profile.name || '角色'} 缺少AI生成的${key}数值`);
        if (!String(item.status || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的数值解释`);
        if (!String(item.reason || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的变化原因`);
        const metricValue = window.GameModules.metrics.clamp(item.value);
        return {
          key,
          value: metricValue,
          status: String(item.status).slice(0, 160),
          reason: String(item.reason).slice(0, 180),
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

  formatRelationships(value, base = null) {
    const self = String(base?.name || '').trim();
    const knownRel = '妹妹|姐姐|哥哥|弟弟|父亲|母亲|爸爸|妈妈|兄长|兄弟|姐妹|女儿|儿子|朋友|同学|同事|邻居|恋人|妻子|丈夫';
    const normalized = String(value || '').replace(new RegExp(`([：:])(?=(${knownRel})[：:])`, 'g'), '；');
    const parts = normalized.split(/[；;\n]+/).map((part) => part.trim()).filter(Boolean);
    return parts.map((part) => {
      const pair = part.split(/[：:]/);
      const rel = String(pair[0] || '').replace(/[，。,.].*$/, '').trim();
      const name = String(pair[1] || '').replace(/[，。；;、,.].*$/, '').trim();
      if (self && name === self) throw new Error(`关系方向错误: ${rel}：${name} 把当前角色本人写成了关系对象`);
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
