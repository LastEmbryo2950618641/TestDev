/**
 * 出场人物设定：为已知角色与路人 NPC 固化完整资料。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterProfile = {
  async ensure(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = base.forceRoleCardRegenerate ? null : this.findSavedRoleCard(base, signature);
    if (existing) {
      const profile = { ...existing.profile, id: base.id, work: existing.profile?.work || base.work };
      store?.finishRoleCardLoading?.(base.id, profile);
      return profile;
    }
    const lore = await window.GameModules.worldLore.ensure(base.work, context);
    const attrs = await window.GameModules.rpgState.ensureWorldAttributes(base.work);
    return this.generate(base, lore, attrs, context, store, signature, source.preset);
  },

  onProgress(store, id, stepKey, status, text = '', progress = null) {
    store?.updateRoleCardLoadingStep?.(id, stepKey, status, text, progress);
  },

  partProgressTotal(partIndex, template, attrs = null, part = null) {
    if (partIndex === 2) return window.GameModules.metrics.emotionKeys.length + window.GameModules.metrics.playerKeys.length;
    if (partIndex === 3 && part) return this.partProgressDone(3, part) || 3;
    if (partIndex === 4 && part) return this.partProgressDone(4, part) || 13;
    if (partIndex === 5 || partIndex === 6) return this.bodyProfileParts().length;
    if (partIndex === 7) {
      const intrinsicCount = Object.keys(attrs?.intrinsicBase || {}).length;
      return intrinsicCount ? 1 + intrinsicCount : 8;
    }
    return Object.keys(template || {}).length || 1;
  },

  partProgressDone(partIndex, part = {}) {
    if (partIndex === 2) {
      const emotions = this.metricProgressDone(part.feeling?.emotions, window.GameModules.metrics.emotionKeys);
      const playerFeelings = this.metricProgressDone(part.feeling?.playerFeelings, window.GameModules.metrics.playerKeys);
      return emotions + playerFeelings;
    }
    if (partIndex === 3) return ['skills', 'knowledge', 'professions'].reduce((sum, key) => sum + ((part[key] || []).length), 0);
    if (partIndex === 4) return (part.items || []).length + this.fixedWearingSlots().filter((slot) => this.wearingSlotProgressDone(part.wearing?.[slot])).length + (part.wearing?.slot || []).length;
    if (partIndex === 5) return this.bodyProfileCompleteItems(part.bodyProfile).length;
    if (partIndex === 6) return this.bodyProfileCompleteItems(part.dressedProfile).length;
    if (partIndex === 7) return (this.valueReasonComplete(part.rpgField?.level) ? 1 : 0) + Object.values(part.rpgField?.intrinsicBase || {}).filter((item) => this.intrinsicBaseItemComplete(item)).length;
    const template = this.partTemplateCache?.[partIndex] || {};
    return Object.keys(template).filter((key) => this.partFieldComplete(partIndex, key, part[key], template[key], part)).length;
  },

  metricProgressDone(value, keys) {
    return this.metricGroupAsArray(value, keys).filter((item) => item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim()).length;
  },

  wearingSlotProgressDone(item) {
    return item && typeof item === 'object' && String(item.clothing_position || '').trim() && String(item.reason || '').trim() && Object.prototype.hasOwnProperty.call(item, 'description');
  },

  findSavedRoleCard(base, signature) {
    const save = window.GameModules.sqliteSave;
    const candidates = [
      save.getCharacterState(base.id),
      save.getCharacterStateByName?.(base.name, base.work),
      save.getCharacterStateByName?.(base.name),
    ].filter(Boolean);
    const exact = candidates.find((state) => this.roleCardMatchesTarget(state.profile, base) && this.isReusableRoleCard(state.profile, signature));
    if (exact) return exact;
    return candidates.find((state) => this.isReusableSavedRoleCard(state, base)) || null;
  },

  isReusableSavedRoleCard(state, base) {
    const profile = state?.profile;
    if (!this.roleCardMatchesTarget(profile, base)) return false;
    const savedWorld = profile.work || state.worldTag;
    if (base.work && savedWorld && savedWorld !== base.work) return false;
    return this.isReusableRoleCard(profile, null);
  },

  roleCardMatchesTarget(profile, base = {}) {
    if (!profile || profile.name !== base.name) return false;
    const lockedAge = this.lockedAge({ age: '' }, base);
    if (lockedAge !== undefined && lockedAge !== null && String(lockedAge).trim()) {
      const profileAge = profile.age && typeof profile.age === 'object' && profile.age.value !== undefined ? profile.age.value : profile.age;
      if (String(profileAge || '').trim() !== String(lockedAge).trim()) return false;
    }
    if (base.gender && profile.gender && String(profile.gender).trim() !== String(base.gender).trim()) return false;
    return true;
  },

  withKnown(raw, store) {
    return raw;
  },

  isRoleCard(profile) {
    const hasFactions = Array.isArray(profile?.factions) && profile.factions.length;
    const forces = profile?.forcePositions || profile?.force_positions;
    const hasForces = Array.isArray(forces) && forces.length;
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
      preferences: String(data.preferences || data.wearingPreference || '').slice(0, 120),
      personality: String(data.personality || '谨慎观察局势。').slice(0, 80),
      age: (data.age && typeof data.age === 'object' && data.age.value !== undefined ? data.age.value : data.age) || (String(`${data.role || ''} ${data.relationships || ''} ${data.detail || data.desc || preset?.summary || ''}`).match(/(\d{1,3})\s*岁/)?.[1] || ''),
      birthday: String(data.birthday || '').slice(0, 20),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 4).map(String) : [],
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 10) : [],
      items: this.carryItemsLoose(data.items, '物品'),
      wearing: this.wearingItemsLoose(data.wearing),
      importance: data.importance || (data.isMinor ? 'minor' : 'support'),
      isMinor: Boolean(data.isMinor),
      roleCard: true,
      forceRoleCardRegenerate: Boolean(data.forceRoleCardRegenerate),
      retryFromStep: String(data.retryFromStep || ''),
      roleCardRetryParts: data.roleCardRetryParts && typeof data.roleCardRetryParts === 'object' ? data.roleCardRetryParts : {},
      presetProfilePath: preset?.path || '',
    };
  },

  async generate(base, lore, attrs, context, store, signature = '', preset = null) {
    try {
      if (!window.dzmm?.completions) throw new Error('无法生成个人资料：AI接口不可用，不能使用本地兜底原因。');
      this.partTemplateCache = null;
      const sections = window.GameModules.promptSections;
      const player = sections.playerProfile(store);
      const templates = await this.loadPartTemplates();
      const commonVars = {
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
        玩家本人目标锁定: this.targetLockText(base),
      };
      const loadingId = base.id;
      const retryParts = base.roleCardRetryParts || {};
      const shouldReuse = (stepKey) => this.shouldReuseRoleCardPart(base.retryFromStep, stepKey) && retryParts[stepKey];
      const remember = (stepKey, part) => store?.rememberRoleCardLoadingPart?.(loadingId, stepKey, part);
      const part1Total = this.partProgressTotal(1, templates[1], attrs);
      let part1 = shouldReuse('profile') ? retryParts.profile : null;
      if (!part1) {
        this.onProgress(store, loadingId, 'profile', 'running', '', { done: 0, total: part1Total });
        part1 = await this.generatePart(1, 'character-profile-part1-base-identity', commonVars, templates[1], base, lore, attrs, store);
        this.onProgress(store, loadingId, 'profile', 'done', '', { done: this.partProgressDone(1, part1), total: part1Total });
        remember('profile', part1);
      }
      store?.updateRoleCardLoading?.(loadingId, { name: part1.name || base.name, status: 'running' });
      const p1Summary = this.part1Summary(part1);
      const namedBase = { ...base, name: this.isConcreteName(base.name) ? base.name : (part1.name || base.name) };
      const part2Total = this.partProgressTotal(2, templates[2], attrs);
      let part2 = shouldReuse('feeling') ? retryParts.feeling : null;
      if (!part2) {
        part2 = await this.generateOrDefaultPart(2, 'character-profile-part2-feeling', 'feeling', { ...commonVars, part1Summary: p1Summary }, templates[2], namedBase, lore, attrs, store, part2Total);
        remember('feeling', part2);
      }
      const part3StartTotal = this.partProgressTotal(3, templates[3], attrs);
      let part3 = shouldReuse('abilities') ? retryParts.abilities : null;
      if (!part3) {
        this.onProgress(store, loadingId, 'abilities', 'running', '', { done: 0, total: part3StartTotal });
        part3 = await this.generatePart(3, 'character-profile-part3-abilities-professions', { ...commonVars, part1Summary: p1Summary }, templates[3], namedBase, lore, attrs, store);
        const part3Total = this.partProgressTotal(3, templates[3], attrs, part3);
        this.onProgress(store, loadingId, 'abilities', 'done', '', { done: this.partProgressDone(3, part3), total: part3Total });
        remember('abilities', part3);
      }
      const rpgKeys = this.rpgFieldReasonKeys(attrs);
      const part4StartTotal = this.partProgressTotal(4, templates[4], attrs);
      let part4 = shouldReuse('inventory') ? retryParts.inventory : null;
      if (!part4) {
        this.onProgress(store, loadingId, 'inventory', 'running', '', { done: 0, total: part4StartTotal });
        part4 = await this.generatePart(4, 'character-profile-part4-inventory-wearing-rpg', { ...commonVars, part1Summary: p1Summary }, templates[4], namedBase, lore, attrs, store);
        const part4Total = this.partProgressTotal(4, templates[4], attrs, part4);
        this.onProgress(store, loadingId, 'inventory', 'done', '', { done: this.partProgressDone(4, part4), total: part4Total });
        remember('inventory', part4);
      }
      const p3Summary = this.part3Summary(part3);
      const p4Summary = this.part4Summary(part4);
      const part5Total = this.partProgressTotal(5, templates[5], attrs);
      let part5 = shouldReuse('bodyProfile') ? retryParts.bodyProfile : null;
      if (!part5) {
        part5 = await this.generateOrDefaultPart(5, 'character-profile-part5-body-profile', 'bodyProfile', { ...commonVars, part1Summary: p1Summary }, templates[5], namedBase, lore, attrs, store, part5Total);
        remember('bodyProfile', part5);
      }
      const p5Summary = this.bodyProfileSummary(part5.bodyProfile);
      const part6Total = this.partProgressTotal(6, templates[6], attrs);
      let part6 = shouldReuse('dressedProfile') ? retryParts.dressedProfile : null;
      if (!part6) {
        part6 = await this.generateOrDefaultPart(6, 'character-profile-part6-dressed-profile', 'dressedProfile', { ...commonVars, part1Summary: p1Summary, part4Summary: p4Summary, part5Summary: p5Summary }, templates[6], namedBase, lore, attrs, store, part6Total);
        remember('dressedProfile', part6);
      }
      const part7Total = this.partProgressTotal(7, templates[7], attrs);
      let part7 = shouldReuse('rpgField') ? retryParts.rpgField : null;
      if (!part7) {
        this.onProgress(store, loadingId, 'rpgField', 'running', '', { done: 0, total: part7Total });
        part7 = await this.generatePart(7, 'character-profile-part7-rpg-field', { ...commonVars, part1Summary: p1Summary, part3Summary: p3Summary, part4Summary: p4Summary, 世界字段: sections.worldFields(attrs), RPG字段列表: rpgKeys.join('、'), RPG字段列表JSON: rpgKeys.map((key) => `"${key}"`).join(', ') }, templates[7], namedBase, lore, attrs, store);
        this.onProgress(store, loadingId, 'rpgField', 'done', '', { done: this.partProgressDone(7, part7), total: part7Total });
        remember('rpgField', part7);
      }
      const merged = this.mergeGeneratedParts(part1, part2, part3, { ...part4, ...part5, ...part6, ...part7 }, attrs);
      const profile = this.validate(merged, base, lore, attrs, store, { skipInitialMetrics: false });
      return this.withSignature(profile, signature);
    } catch (err) {
      store?.failRoleCardLoading?.(base.id, err.message || '生成失败');
      console.warn('人物设定生成失败:', err.code, err.message, err.stack);
      throw err;
    }
  },

  shouldReuseRoleCardPart(retryFromStep = '', stepKey = '') {
    if (!retryFromStep) return false;
    const order = ['profile', 'feeling', 'abilities', 'inventory', 'bodyProfile', 'dressedProfile', 'rpgField', 'state'];
    const retryIndex = order.indexOf(retryFromStep);
    const stepIndex = order.indexOf(stepKey);
    return retryIndex > 0 && stepIndex >= 0 && stepIndex < retryIndex;
  },

  targetLockText(base = {}) {
    const locks = [];
    const name = String(base.name || '').trim();
    if (name) locks.push(`本次只生成候选人物本人“${name}”的角色卡；JSON 根字段 name 必须逐字写“${name}”，不得改字、换名、写成玩家、亲属、联系人或关系事件里的其他姓名。`);
    if (base.age !== undefined && base.age !== null && String(base.age).trim()) locks.push(`人物基础区已指定年龄为“${base.age}”，age.value 必须等于该年龄数字，不得按玩家年龄、随机年龄或其他人物年龄改写。`);
    if (base.gender) locks.push(`人物基础区已指定性别为“${base.gender}”，gender 必须保持一致。`);
    if (base.birthday) locks.push(`人物基础区已指定生日为“${base.birthday}”，不得用其他人物生日覆盖。`);
    if (base.id === 'player-self') locks.push('目标是玩家本人时，只能生成玩家本人，不得生成妹妹、姐姐、父母、联系人或关系事件里的任何其他人。');
    return locks.length ? locks.join('\n') : '无。';
  },

  async loadPartTemplates() {
    if (this.partTemplateCache) return this.partTemplateCache;
    const templates = window.GameModules.characterProfileTemplateClass?.parts?.();
    if (!templates?.[1] || !templates?.[2] || !templates?.[3] || !templates?.[4] || !templates?.[5] || !templates?.[6] || !templates?.[7]) throw new Error('角色卡模板类未加载，无法生成七段角色卡。');
    this.partTemplateCache = templates;
    return templates;
  },

  async generateOrDefaultPart(partIndex, promptId, stepKey, vars, template, base, lore, attrs, store, total) {
    const loadingId = base.id;
    if (this.playerPartUsesDefault(base, partIndex)) {
      const part = this.defaultPlayerPart(partIndex, base, template);
      this.onProgress(store, loadingId, stepKey, 'done', '采用系统缺省值', { done: total, total });
      return part;
    }
    this.onProgress(store, loadingId, stepKey, 'running', '', { done: 0, total });
    const part = await this.generatePart(partIndex, promptId, vars, template, base, lore, attrs, store);
    this.onProgress(store, loadingId, stepKey, 'done', '', { done: this.partProgressDone(partIndex, part), total });
    return part;
  },

  playerPartUsesDefault(base = {}, partIndex) {
    if (base.id !== 'player-self' && !base.isPlayer) return false;
    const key = `part${partIndex}`;
    return [2, 5, 6].includes(partIndex) && base.playerCardAiParts?.[key] === false;
  },

  defaultPlayerPart(partIndex, base = {}, template = {}) {
    const cloned = JSON.parse(JSON.stringify(template || {}));
    const name = base.name || cloned.name || '玩家本人';
    if (partIndex === 2) return this.defaultPlayerFeelingPart(name);
    if (partIndex === 5) return { name, bodyProfile: this.defaultBodyProfile('自然状态') };
    if (partIndex === 6) return { name, dressedProfile: this.defaultBodyProfile('盛装状态') };
    return { ...cloned, name };
  },

  defaultPlayerFeelingPart(name = '玩家本人') {
    const metric = window.GameModules.metrics;
    const item = (key, type) => {
      const defaults = type === 'emotion' ? metric.defaults.emotions : metric.defaults.playerFeelings;
      const value = metric.clamp(defaults[key] ?? 0);
      return { name: key, value, status: metric.valueExplanation(key, value), reason: `${name}采用系统缺省${key}数值。`, metricSources: this.metricSourceMap?.('系统') };
    };
    return {
      name,
      feeling: {
        emotions: Object.fromEntries(metric.emotionKeys.map((key) => [key, item(key, 'emotion')])),
        playerFeelings: Object.fromEntries(metric.playerKeys.map((key) => [key, item(key, 'playerFeelings')])),
      },
    };
  },

  defaultBodyProfile(label = '状态') {
    return this.bodyProfileParts().map((part, index) => ({
      index: index + 1,
      part,
      description: `采用系统缺省${label}：${part}暂无 AI 生成描写。`,
    }));
  },

  async generatePart(partIndex, promptId, vars, template, base, lore, attrs, store) {
    const prompt = await window.GameModules.promptTemplates.render(promptId, vars);
    const format = this.partPromptWithTemplate(prompt, template, partIndex);
    const raw = await window.GameModules.jsonUtils.generateJsonWithRetry({
      source: `character-profile-part${partIndex}`,
      model: 'nalang-turbo-0826',
      timeoutMs: 60000,
      prompt: format,
      format,
      repairHint: this.partRepairHint(partIndex, base, attrs, template),
      requiredRawFields: this.partRequiredRawFields(partIndex),
      parse: (text) => this.parsePartOutput(partIndex, text, base),
      max: 2,
    });
    const repairedRaw = await this.repairCsvPartRows(partIndex, raw, format, base, lore, attrs, store, vars);
    let normalized = this.lockPartTargetName(partIndex, this.sanitizePart(partIndex, repairedRaw, template), base);
    normalized = await this.completeMissingPart(partIndex, normalized, template, format, base, lore, attrs, store);
    return this.validatePart(partIndex, normalized, base, lore, attrs, store, template);
  },

  partRequiredRawFields(partIndex, fields = null) {
    const byPart = {
      1: ['name', 'worldTag', 'age', 'gender', 'factions', 'forcePositions'],
      2: ['name', 'value', 'status', 'reason', '冷静', '绝望', '了解', '服从'],
      3: ['type', 'name', 'level', 'reason', 'requiredIntrinsicBase', 'requiredKnowledge', 'requiredSkills'],
      4: ['type', 'slot', 'clothing_position', 'name', 'description', 'quantity', 'reason', 'wearing', 'item'],
      5: ['序号', '部位', '部位描写', '头发', '脸部', '胸部', '神秘花园', '双小腿'],
      6: ['序号', '部位', '部位描写', '头发', '脸部', '胸部', '神秘花园', '双小腿'],
      7: ['name', 'rpgField', 'level', 'intrinsicBase', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'],
    };
    if (!fields) return byPart[partIndex] || [];
    const nested = [];
    if (fields.includes('feeling')) nested.push('feeling', 'emotions', 'playerFeelings', 'cold', 'curiosity', 'understanding', 'submission');
    if (fields.includes('wearing')) nested.push('wearing', 'head', 'top', 'bottom', 'shoes', 'slot');
    if (fields.includes('bodyProfile')) nested.push('bodyProfile', '头发', '脸部', '胸部', '神秘花园', '双小腿');
    if (fields.includes('dressedProfile')) nested.push('dressedProfile', '头发', '脸部', '胸部', '神秘花园', '双小腿');
    if (fields.includes('rpgField')) nested.push('rpgField', 'level', 'intrinsicBase', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma');
    return [...new Set([...fields, ...nested])];
  },

  partPromptWithTemplate(prompt, template, partIndex) {
    if ([2, 3, 4, 5, 6].includes(partIndex)) return prompt;
    return [
      prompt,
      '',
      '## MD角色卡模板字段骨架',
      '下方模板由 MD 文档结构生成，本次输出必须严格遵守这些字段名、嵌套结构和数组元素字段。',
      '模板中不存在的字段不要输出；不要把旧版 force_positions、数组式 feeling 或数组式 wearing 写回角色卡。',
      `Part${partIndex} 模板：`,
      JSON.stringify(template, null, 2),
    ].join('\n');
  },

  sanitizePart(partIndex, raw, template) {
    const clean = partIndex === 3 ? raw : this.sanitizeByTemplate(raw, template);
    if (clean && typeof clean === 'object') {
      if ((partIndex === 4 || partIndex === 5 || partIndex === 6) && Array.isArray(raw?._csvRows)) clean._csvRows = raw._csvRows;
      if (partIndex !== 4 && partIndex !== 5 && partIndex !== 6) delete clean._csvRows;
    }
    if (partIndex === 2 && clean.feeling) {
      clean.feeling = this.normalizeFeelingObject(clean.feeling);
    }
    if (partIndex === 1 && clean.initialMetrics) {
      clean.initialMetrics = this.sanitizeInitialMetrics(clean.initialMetrics);
    }
    return clean;
  },

  lockPartTargetName(partIndex, data, base = {}) {
    const name = String(base?.name || '').trim();
    if (![2, 3, 4, 5, 6, 7].includes(partIndex) || !name || !data || typeof data !== 'object') return data;
    return { ...data, name };
  },

  sanitizeInitialMetrics(value) {
    if (!value || typeof value !== 'object') return value;
    return {
      emotions: this.metricGroupAsArray(value.emotions, window.GameModules.metrics.emotionKeys),
      playerFeelings: this.metricGroupAsArray(value.playerFeelings, window.GameModules.metrics.playerKeys),
    };
  },

  normalizeFeelingObject(value) {
    if (!value || typeof value !== 'object') return value;
    const metric = window.GameModules.metrics;
    const toObject = (items, keys) => Object.fromEntries(this.metricGroupAsArray(items, keys).map((item) => [item.key, {
      name: item.name || item.key,
      value: item.value,
      status: item.status,
      reason: item.reason,
      metricSources: item.metricSources || item.sourceMap,
    }]));
    return { emotions: toObject(value.emotions, metric.emotionKeys), playerFeelings: toObject(value.playerFeelings, metric.playerKeys) };
  },

  metricGroupAsArray(value, keys) {
    if (Array.isArray(value)) return keys.map((key) => {
      const item = value.find((entry) => entry?.key === key || entry?.name === key) || {};
      return { key, value: item.value, status: item.status, reason: item.reason, metricSources: item.metricSources || item.sourceMap };
    });
    const source = value && typeof value === 'object' ? value : {};
    return keys.map((key) => {
      const item = source[key] || Object.values(source).find((entry) => entry?.name === key) || {};
      return { key, value: item.value, status: item.status, reason: item.reason, metricSources: item.metricSources || item.sourceMap };
    });
  },

  sanitizeByTemplate(value, template) {
    if (Array.isArray(template)) {
      if (!Array.isArray(value)) return value;
      const itemTemplate = template[0];
      return itemTemplate && typeof itemTemplate === 'object'
        ? value.map((item) => this.sanitizeByTemplate(item, itemTemplate)).filter((item) => item && typeof item === 'object')
        : value;
    }
    if (template && typeof template === 'object') {
      const source = value && typeof value === 'object' ? value : {};
      return Object.fromEntries(Object.keys(template).filter((key) => Object.prototype.hasOwnProperty.call(source, key)).map((key) => [key, this.sanitizeByTemplate(source[key], template[key])]));
    }
    return value;
  },

  missingPartFields(partIndex, data, template, base, attrs = null) {
    const missing = [];
    const source = data && typeof data === 'object' ? data : {};
    Object.keys(template || {}).forEach((key) => { if (!this.partFieldComplete(partIndex, key, source[key], template[key], base, attrs)) missing.push(key); });
    return missing;
  },

  partFieldComplete(partIndex, key, value, template, base, attrs = null) {
    if (value === undefined || value === null) return false;
    if (key === 'name') {
      const current = String(value || '').trim(), expected = String(base?.name || '').trim();
      if (base?.id === 'player-self') return current === expected;
      if (this.isConcreteName(expected)) return current === expected;
      return this.isConcreteName(current);
    }
    if (partIndex === 1 && ['worldTag', 'age', 'learningAbility', 'mentalStability', 'growthPotential', 'actionAbility'].includes(key)) return this.valueReasonComplete(value);
    if (partIndex === 1 && ['gender', 'job'].includes(key)) return typeof value === 'string';
    if (partIndex === 1 && ['relationships', 'role', 'detail', 'appearance', 'preferences', 'personality', 'rank'].includes(key)) return typeof value === 'string' && String(value).trim();
    if (partIndex === 1 && key === 'jobConfirmed') return typeof value === 'boolean';
    if (partIndex === 1 && key === 'control_experience') return value && typeof value === 'object' && Number.isInteger(Number(value.上线次数)) && typeof value.习惯程度 === 'string';
    if (partIndex === 1 && key === 'factions') return this.arrayItemsComplete(value, ['faction', 'role', 'reason'], false);
    if (partIndex === 1 && key === 'forcePositions') return this.arrayItemsComplete(value, ['force', 'position', 'reason'], false);
    if (partIndex === 1 && key === 'initialMetrics') return this.initialMetricsComplete(value);
    if (partIndex === 2 && key === 'feeling') return this.feelingComplete(value);
    if (partIndex === 3 && ['skills', 'knowledge', 'professions'].includes(key)) return this.arrayItemsComplete(value, ['name', 'desc', 'level', 'levelEffects', 'reason'], key === 'professions', (item) => this.learnedItemComplete(item));
    if (partIndex === 4 && key === 'items') return this.arrayItemsComplete(value, ['name', 'description', 'quantity', 'reason'], true, (item) => Number.isInteger(Number(item.quantity)) && Number(item.quantity) >= 1);
    if (partIndex === 4 && key === 'wearing') return this.wearingObjectComplete(value);
    if (partIndex === 5 && key === 'bodyProfile') return this.bodyProfileComplete(value);
    if (partIndex === 6 && key === 'dressedProfile') return this.bodyProfileComplete(value);
    if (partIndex === 7 && key === 'rpgField') return this.rpgFieldComplete(value);
    if (Array.isArray(template)) return Array.isArray(value);
    if (template && typeof template === 'object') return value && typeof value === 'object';
    return typeof value === typeof template || value !== undefined;
  },

  valueReasonComplete(value) {
    return value && typeof value === 'object' && value.value !== undefined && String(value.reason || '').trim();
  },

  intrinsicBaseItemComplete(value) {
    return value && typeof value === 'object' && value.value !== undefined && String(value.description || '').trim() && String(value.reason || '').trim();
  },

  wearingObjectComplete(value) {
    const slots = ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist'];
    const completeItem = (item, allowEmptyName = true) => item && typeof item === 'object' && String(item.clothing_position || '').trim() && String(item.reason || '').trim() && (allowEmptyName || String(item.name || '').trim()) && Object.prototype.hasOwnProperty.call(item, 'description');
    return value && typeof value === 'object' && !Array.isArray(value)
      && slots.every((slot) => completeItem(value[slot], true))
      && Array.isArray(value.slot)
      && value.slot.every((item) => item && typeof item === 'object' && String(item.slot || '').trim() && completeItem(item, false));
  },

  initialMetricsComplete(value) {
    const templateKeys = { emotions: window.GameModules.metrics.emotionKeys, playerFeelings: window.GameModules.metrics.playerKeys };
    return value && typeof value === 'object' && Object.entries(templateKeys).every(([group, keys]) => {
      const list = this.metricGroupAsArray(value[group], keys);
      return keys.every((key) => {
        const item = list.find((entry) => entry?.key === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
    });
  },

  arrayItemsComplete(value, fields, allowEmpty = false, itemCheck = null) {
    if (!Array.isArray(value)) return false;
    if (!allowEmpty && !value.length) return false;
    return value.every((item) => item && typeof item === 'object' && fields.every((field) => item[field] !== undefined && (Array.isArray(item[field]) || String(item[field]).trim() !== '')) && (!itemCheck || itemCheck(item)));
  },

  learnedItemComplete(item) {
    return Number.isInteger(Number(item.level)) && Number(item.level) >= 1 && Number(item.level) <= 7 && item.levelEffects && typeof item.levelEffects === 'object';
  },

  feelingComplete(value) {
    return this.feelingGroupComplete(value, 'emotions') && this.feelingGroupComplete(value, 'playerFeelings');
  },

  feelingGroupComplete(value, group) {
    const keys = group === 'emotions' ? window.GameModules.metrics.emotionKeys : window.GameModules.metrics.playerKeys;
    const list = value?.[group];
    if (Array.isArray(list)) {
      return keys.every((key) => {
        const item = list.find((entry) => entry?.key === key || entry?.name === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
    }
    if (list && typeof list === 'object') {
      return keys.every((key) => {
        const item = list[key] || Object.values(list).find((entry) => entry?.name === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
    }
    return false;
  },

  rpgFieldComplete(value) {
    const keys = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return value && typeof value === 'object'
      && this.valueReasonComplete(value.level)
      && keys.every((key) => this.intrinsicBaseItemComplete(value.intrinsicBase?.[key]));
  },

  async completeMissingPart(partIndex, data, template, format, base, lore, attrs, store) {
    let current = this.lockPartTargetName(partIndex, data, base);
    for (let i = 0; i < 2; i += 1) {
      let missing = this.missingPartFields(partIndex, current, template, base, attrs);
      if (!missing.length) return current;
      if (partIndex === 2 && missing.includes('feeling')) {
        const feeling = await this.generatePartFeeling(current, base, lore, attrs, format, store, 'all');
        current = this.lockPartTargetName(partIndex, this.sanitizePart(partIndex, { ...current, feeling }, template), base);
        missing = this.missingPartFields(partIndex, current, template, base, attrs);
        if (!missing.length) return current;
      }
      if ((partIndex === 5 && missing.includes('bodyProfile')) || (partIndex === 6 && missing.includes('dressedProfile'))) {
        current = this.completeBodyProfileFallback(partIndex, current, base);
        missing = this.missingPartFields(partIndex, current, template, base, attrs);
        if (!missing.length) return current;
      }
      const patch = await this.generateMissingPartFields(partIndex, current, template, missing, format, base, attrs);
      current = this.lockPartTargetName(partIndex, this.sanitizePart(partIndex, this.mergeMissingPatch(partIndex, current, patch), template), base);
    }
    const stillMissing = this.missingPartFields(partIndex, current, template, base, attrs);
    if (stillMissing.length) throw new Error(`Part${partIndex} 缺少字段：${stillMissing.join('、')}`);
    return current;
  },

  async repairCsvPartRows(partIndex, raw, format, base, lore, attrs, store, vars = {}) {
    if (![2, 3, 4, 5, 6].includes(partIndex)) return raw;
    if (partIndex === 5 || partIndex === 6) raw = this.completeBodyProfileFallback(partIndex, raw, base);
    let currentRows = this.normalizeCsvPartRows(partIndex, this.rowsFromCsvPart(partIndex, raw));
    let attempts = 0;
    while (true) {
      attempts += 1;
      currentRows = this.applyLocalCsvFixes(partIndex, currentRows);
      const issues = this.csvPartIssues(partIndex, currentRows, base);
      if (!issues.length) return this.buildPartFromCsvRows(partIndex, currentRows, base.name);
      const aiIssues = issues.filter((issue) => !/超过10行$/.test(issue.reason || ''));
      const unlimitedRepair = partIndex === 2 || partIndex === 4 || partIndex === 5 || partIndex === 6;
      const repairLimit = partIndex === 4 || partIndex === 5 || partIndex === 6 ? 8 : 2;
      if (!aiIssues.length || (!unlimitedRepair && attempts >= 2) || (unlimitedRepair && attempts > repairLimit)) break;
      try {
        const fixedRows = await this.generateCsvFixRows(partIndex, aiIssues, currentRows, format, base, lore, attrs, store, vars);
        currentRows = this.normalizeCsvPartRows(partIndex, this.mergeCsvFixRows(partIndex, currentRows, fixedRows, issues));
      } catch (err) {
        if (!unlimitedRepair) throw err;
        console.warn(`[角色卡Part${partIndex}] CSV修复未收敛，继续重试:`, err?.message || 'unknown');
      }
    }
    const finalRows = this.applyLocalCsvFixes(partIndex, currentRows);
    const finalIssues = this.csvPartIssues(partIndex, finalRows, base);
    if ((partIndex === 5 || partIndex === 6) && finalIssues.length) {
      return this.completeBodyProfileFallback(partIndex, this.buildPartFromCsvRows(partIndex, finalRows, base.name), base);
    }
    if (partIndex === 4 && finalIssues.length) throw new Error(`Part${partIndex} CSV修复未收敛：${finalIssues.map((x) => `${x.key}:${x.reason}`).join('、')}`);
    return this.buildPartFromCsvRows(partIndex, finalRows, base.name);
  },

  rowsFromCsvPart(partIndex, raw) {
    if (Array.isArray(raw?._csvRows)) return raw._csvRows;
    const headers = { 2: 'name,value,status,reason', 3: 'type,name,level,', 4: 'type,slot,', 5: '序号,部位,部位描写', 6: '序号,部位,部位描写' };
    return this.csvDataRows(raw?.rawText || raw?.text || '', headers[partIndex] || '');
  },

  normalizeCsvPartRows(partIndex, rows) {
    if (partIndex === 2) return rows.map((row) => this.normalizePart2Row(row)).filter(Boolean);
    if (partIndex === 3) return rows.map((row) => this.normalizePart3Row(row)).filter(Boolean);
    if (partIndex === 4) return rows.map((row) => this.normalizePart4Row(row)).filter(Boolean);
    if (partIndex === 5 || partIndex === 6) return rows.map((row) => this.normalizePart5Row(row)).filter(Boolean);
    return rows;
  },

  normalizePart2Row(row) {
    const parts = this.csvParts(row);
    if (parts[0] === 'name' && parts.length >= 5) return this.normalizePart2Row(parts.slice(1).join(','));
    const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    if (!keys.includes(parts[0]) || parts.length <= 4) return row;
    return [parts[0], parts[1], parts[2], parts.slice(3).join('，')].join(',');
  },

  normalizePart3Row(row) {
    const parts = this.csvParts(row);
    if (parts.length <= 7) return row;
    const [type, itemName, level, reason, requiredIntrinsicBase, requiredKnowledge, ...requiredSkills] = parts;
    if (!['skills', 'knowledge', 'professions'].includes(type)) return row;
    return [type, itemName, level, reason, requiredIntrinsicBase, requiredKnowledge, requiredSkills.join('|')].join(',');
  },

  normalizePart5Row(row) {
    let parts = this.csvParts(row);
    if (parts.length > 3) parts = [parts[0], parts[1], parts.slice(2).join('，')];
    if (parts.length !== 3) return row;
    const [index, part, description] = parts;
    return this.csvJoin([index, part, description]);
  },

  normalizePart4Row(row) {
    let parts = this.csvParts(row);
    if (parts.length > 7 && ['item', 'wearing', 'slot'].includes(parts[0])) {
      parts = [parts[0], parts[1], parts[2], parts[3], parts.slice(4, -2).join('，'), parts.at(-2), parts.at(-1)];
    }
    if (parts.length !== 7) return row;
    let [type, slot, clothingPosition, itemName, description, quantity, reason] = parts;
    if (!['item', 'wearing', 'slot'].includes(type)) return this.csvJoin(parts);
    quantity = '1';
    if (type !== 'wearing') return this.csvJoin([type, slot, clothingPosition, itemName, description, quantity, reason]);
    const positions = this.wearingClothingPositions();
    if (this.fixedWearingSlots().includes(slot)) clothingPosition = positions[slot];
    if (this.part4EmptyLikeCell(itemName) && this.part4EmptyLikeCell(description)) {
      itemName = '--';
      description = '--';
    }
    return this.csvJoin([type, slot, clothingPosition, itemName, description, quantity, reason]);
  },

  part4EmptyLikeCell(value) {
    return /^(--|无|暂无|没有|未穿戴|不适用)$/.test(String(value || '').trim());
  },

  part4HasConcreteWear(parts) {
    return this.csvCell(parts?.[3]) && this.csvCell(parts?.[4]) && !this.part4EmptyLikeCell(parts[3]) && !this.part4EmptyLikeCell(parts[4]);
  },

  applyLocalCsvFixes(partIndex, rows) {
    if (partIndex === 2) return this.normalizePart2RowsLocally(rows);
    if (partIndex === 4) return this.normalizePart4RowsLocally(rows);
    if (partIndex !== 3) return rows;
    const kept = { skills: 0, knowledge: 0, professions: 0 };
    return this.normalizeCsvPartRows(partIndex, rows).filter((row) => {
      const type = this.csvParts(row)[0];
      if (!Object.prototype.hasOwnProperty.call(kept, type)) return true;
      kept[type] += 1;
      return kept[type] <= 10;
    });
  },

  normalizePart4RowsLocally(rows) {
    return this.normalizeCsvPartRows(4, rows);
  },

  normalizePart2RowsLocally(rows) {
    const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    const seen = new Set();
    const cleaned = [];
    rows.map((row) => this.normalizePart2Row(row)).forEach((row) => {
      let parts = this.csvParts(row);
      if (parts[0] === 'name' && keys.includes(parts[1])) parts = parts.slice(1);
      const key = parts[0];
      if (!keys.includes(key) || seen.has(key)) return;
      if (parts.length > 4) parts = [parts[0], parts[1], parts[2], parts.slice(3).join('，')];
      if (this.part2RowIssue(parts, key)) return;
      seen.add(key);
      cleaned.push(parts.join(','));
    });
    return cleaned;
  },

  buildPartFromCsvRows(partIndex, rows, name) {
    if (partIndex === 2) return this.buildFeelingFromRows(rows, name, true);
    if (partIndex === 3) return this.buildAbilitiesFromRows(rows, name, true);
    if (partIndex === 5) return this.buildBodyProfileFromRows(rows, name);
    if (partIndex === 6) return this.buildDressedProfileFromRows(rows, name);
    return this.buildInventoryFromRows(rows, name);
  },

  csvPartIssues(partIndex, rows, profile = null) {
    if (partIndex === 2) return this.part2CsvIssues(rows);
    if (partIndex === 3) return this.part3CsvIssues(rows);
    if (partIndex === 5 || partIndex === 6) return this.part5CsvIssues(rows);
    return this.part4CsvIssues(rows, profile);
  },

  part2CsvIssues(rows) {
    const issues = [];
    const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    const normalized = rows.map((row) => this.normalizePart2Row(row));
    keys.forEach((key) => {
      const lines = normalized.filter((row) => row.startsWith(`${key},`) || row.startsWith(`name,${key},`));
      if (!lines.length) {
        issues.push({ key, reason: '缺失该行' });
        return;
      }
      if (lines.length > 1) issues.push({ key, reason: '重复输出该情感行', badRow: lines.join(' / ') });
      let parts = this.csvParts(lines[0]);
      if (parts[0] === 'name' && parts[1] === key) parts = parts.slice(1);
      const reason = this.part2RowIssue(parts, key);
      if (reason) issues.push({ key, reason, badRow: lines[0] });
    });
    normalized.forEach((row, index) => {
      let parts = this.csvParts(row);
      if (parts[0] === 'name') parts = parts.slice(1);
      if (parts[0] && !keys.includes(parts[0]) && /[,，]/.test(row)) issues.push({ key: `row${index + 1}`, reason: '未要求或不支持的情感名', badRow: row });
    });
    return issues;
  },

  part3CsvIssues(rows) {
    const issues = [];
    const counts = { skills: 0, knowledge: 0, professions: 0 };
    rows.forEach((row, index) => {
      const parts = this.csvParts(row);
      const reason = this.part3RowIssue(parts);
      if (reason) {
        issues.push({ key: `row${index + 1}`, reason, badRow: row });
        return;
      }
      counts[parts[0]] += 1;
      if (counts[parts[0]] > 10) issues.push({ key: `row${index + 1}`, reason: `${parts[0]}超过10行`, badRow: row });
    });
    if (!counts.skills) issues.push({ key: 'skills', reason: '缺失至少1行skills' });
    if (!counts.knowledge) issues.push({ key: 'knowledge', reason: '缺失至少1行knowledge' });
    return issues;
  },

  part5CsvIssues(rows) {
    const issues = [];
    const expected = this.bodyProfileParts();
    const seen = new Set();
    rows.forEach((row, index) => {
      const normalized = this.normalizePart5Row(row);
      const parts = this.csvParts(normalized);
      const reason = this.part5RowIssue(parts);
      if (reason) {
        const key = expected.includes(parts[1]) ? parts[1] : `row${index + 1}`;
        issues.push({ key, reason, badRow: normalized });
        return;
      }
      seen.add(parts[1]);
    });
    expected.forEach((part) => {
      if (!seen.has(part)) issues.push({ key: part, reason: '缺失身体部位行' });
    });
    return issues;
  },

  part4CsvIssues(rows, profile = null) {
    const issues = [];
    const present = new Set();
    rows.forEach((row, index) => {
      const normalized = this.normalizePart4Row(row);
      const parts = this.csvParts(normalized);
      const reason = this.part4RowIssue(parts);
      if (reason) {
        const key = parts[0] === 'wearing' && this.fixedWearingSlots().includes(parts[1]) ? parts[1] : `row${index + 1}`;
        issues.push({ key, reason, badRow: normalized });
      }
      if (!reason && parts[0] === 'wearing') present.add(parts[1]);
    });
    this.fixedWearingSlots().forEach((slot) => {
      if (!present.has(slot)) issues.push({ key: slot, reason: '缺失固定wearing槽位' });
    });
    return issues;
  },


  async generateCsvFixRows(partIndex, issues, currentRows, format, base, lore, attrs, store, vars) {
    const promptIds = { 2: 'character-profile-part2-feeling-fix', 3: 'character-profile-part3-abilities-professions-fix' };
    const promptId = promptIds[partIndex] || null;
    const skeleton = this.csvFixSkeleton(partIndex, issues);
    const prompt = promptId
      ? await window.GameModules.promptTemplates.render(promptId, { ...vars, 需要AI返回的行: skeleton, 当前已合格行: this.validCsvRowsForPrompt(partIndex, currentRows).join('\n') || '无', 错误行说明: issues.map((x) => `${x.key}：${x.reason}${x.badRow ? `｜${x.badRow}` : ''}`).join('\n'), 严格修复要求: this.csvFixStrictRequirement(partIndex, issues, skeleton) })
      : this.inlineCsvFixPrompt(partIndex, issues, currentRows, format, base, skeleton);
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source: `character-profile-part${partIndex}-csv-fix`,
      model: 'nalang-turbo-0826',
      timeoutMs: 60000,
      prompt,
      format: prompt,
      repairHint: this.csvFixStrictRequirement(partIndex, issues, skeleton),
      requiredRawFields: this.partRequiredRawFields(partIndex),
      parse: (text) => ({ _csvRows: this.normalizeCsvPartRows(partIndex, this.csvDataRows(text, this.csvFixHeaderPrefix(partIndex))) }),
      validate: (parsed) => {
        const rows = this.csvFixRowsToApply(partIndex, issues, parsed._csvRows || []);
        if (!rows.length) throw new Error('CSV修复没有返回有效行');
        if (partIndex === 4 || partIndex === 5 || partIndex === 6) {
          const returnedIssue = this.csvFixReturnedIssue(partIndex, issues, rows, skeleton);
          if (returnedIssue) throw new Error(returnedIssue);
          const remaining = this.csvPartIssues(partIndex, this.mergeCsvFixRows(partIndex, currentRows, rows, issues), base);
          const wanted = new Set(issues.map((x) => x.key));
          const stillWanted = remaining.filter((x) => wanted.has(x.key) || /^row\d+$/.test(x.key));
          if (stillWanted.length) throw new Error(`CSV修复仍不完整：${stillWanted.map((x) => x.key).join('、')}`);
          return rows;
        }
        const returnedIssue = this.csvFixReturnedIssue(partIndex, issues, rows, skeleton);
        if (returnedIssue) throw new Error(returnedIssue);
        const remaining = this.csvPartIssues(partIndex, this.mergeCsvFixRows(partIndex, currentRows, rows, issues), base);
        const wanted = new Set(issues.map((x) => x.key));
        const stillWanted = remaining.filter((x) => wanted.has(x.key) || /^row\d+$/.test(x.key));
        if (stillWanted.length) throw new Error(`CSV修复仍不完整：${stillWanted.map((x) => x.key).join('、')}`);
        return rows;
      },
      max: (partIndex === 2 || partIndex === 4 || partIndex === 5 || partIndex === 6) ? 2 : (partIndex === 3 && issues.some((x) => x.key === 'skills' || x.key === 'knowledge') ? 4 : 2),
    });
  },

  csvFixStrictRequirement(partIndex, issues, skeleton) {
    if (partIndex === 2) {
      return [
        '只返回要求补齐的 Part2 CSV 行，不要表头、JSON、Markdown 或解释。',
        '每行必须恰好 4 列：情感名,value,status,reason。',
        '如果“需要AI返回的行”为空，必须返回空文本，不能发明 row1、row2 或其它行。',
        '第一列必须逐字照抄“需要AI返回的行”的情感名，禁止写 name，禁止改名，禁止新增未要求的行。',
        '必须批量返回本次所有有问题的行，返回行数必须等于需要AI返回的行数。',
        '禁止返回当前已合格行；禁止重复同一个情感名；禁止输出“好的、已理解”等确认语。',
        '禁止使用固定列表之外的情感名，禁止用喜悦替代高兴，禁止用羞愧替代羞耻，禁止用顺从替代服从。',
        'status 和 reason 内禁止英文逗号，只能用中文逗号；如果句子需要停顿必须使用中文逗号。',
        '每行第二列必须是 0-100 整数，第三列和第四列都必须是具体短句，不能留空。',
        '必须严格照下面的情感名列表逐行生成：',
        skeleton,
      ].join('\n');
    }
    if (partIndex === 5 || partIndex === 6) {
      const isDressed = partIndex === 6;
      return [
        `只返回要求补齐的 Part${partIndex} CSV 行，不要表头、JSON、Markdown 或解释。`,
        '每行必须恰好 3 列：序号,部位,部位描写。',
        `部位只能使用固定列表：${this.bodyProfileParts().join('、')}。`,
        '必须批量返回本次缺失或错误的身体部位；如果额外返回其它固定部位，代码会只提取有效部位合并。',
        '单元格内禁止英文逗号，需要停顿时用中文逗号。',
        isDressed
          ? '部位描写必须继承角色身份、Part4当前穿着和Part5身体原貌；本部分只写盛装/打扮完全后的造型、妆容、饰品、衣物包裹塑形与视觉效果。'
          : '部位描写必须继承角色身份、外貌、人物说明和备注；除非上下文明确说明外貌很丑，否则向很漂亮、很有吸引力的方向描写。',
        isDressed
          ? '如果当前穿着不足以构成盛装，必须基于人物身份、喜好、审美和身体原貌生成完整打扮方案；不要返回未打扮或空缺。'
          : '本部分只写毫无人工雕琢、未经衣物遮掩的原本躯体，不要写衣物、饰品、妆容、护肤或行为。',
        '需要AI返回的行：',
        skeleton,
      ].join('\n');
    }
    if (partIndex === 4) {
      return [
        '只返回要求补齐的 Part4 CSV 行，不要表头、JSON、Markdown 或解释。',
        '每行必须恰好 7 列：type,slot,clothing_position,name,description,quantity,reason。',
        'wearing 行的 slot 只能是固定值：head、neck、innerwearTop、top、outerwear、gloves、waist、innerwearBottom、bottom、socks、shoes、wrist。',
        '缺 socks 就必须返回 wearing,socks,袜子,...；鞋子必须用 shoes，禁止写 feet、foot、ankle、legs 或其它替代槽位。',
        'quantity 可统一写 1；代码不会用 quantity 判断穿着有效性。',
        '未穿戴是合法状态，name 和 description 必须同时写 --，reason 必须写清具体不穿原因。',
        '禁止返回 --.--、-.--、---、... 等非法占位；未穿戴只能用精确的 --。',
        '禁止返回“当前场景未穿戴该槽位物品/未穿戴该槽位物品/无/暂无/不适用/上下文未说明/信息不足/日常需要/符合身份”等泛化原因。',
        '禁止返回“日常上衣/日常下衣/日常袜子/上下文未写明异常/常规场景基础穿着槽位”等兜底文案。',
        '如果角色卡基础信息或输入的喜好写明 JK、制服、百褶裙、过膝袜、连裤袜、丝袜、黑丝、白丝等，必须落实到 top/bottom/socks，不能改成泛化日常衣物。',
        'bottom 只能写一件主要下装，不能同时写百褶裙和牛仔裤；过膝袜、连裤袜、丝袜必须写在 socks。',
        '槽位语义必须匹配：outerwear只能写外套，waist只能写腰带腰封，bottom只能写裤裙，socks只能写袜类，shoes只能写鞋类，neck不能写耳环耳钉。',
        'clothing_position 是人体着装部位，必须按固定映射逐字填写：head=头部，neck=颈部，innerwearTop=内衣，top=上衣，outerwear=外套，gloves=手套，waist=腰部，innerwearBottom=内衣，bottom=下装，socks=袜子，shoes=鞋子，wrist=手腕。',
        '不穿袜子、内衣、上衣、外套等都可以成立，但必须保留对应固定槽位行；例如袜子不穿仍输出 wearing,socks,袜子,--,--,1,具体不穿原因。',
        '裸体、裸睡、洗澡、换衣、刚醒等场景可以让多个穿着槽位未穿戴，但不得省略槽位，也不得把未穿戴槽位改成其它 slot。',
        '必须批量返回本次所有有问题的行，并严格照下面列表的 type 和 slot 生成：',
        skeleton,
      ].join('\n');
    }
    if (partIndex !== 3) return '只返回要求补齐的 CSV 行，不要表头、JSON、Markdown 或解释。每行列数必须完整。';
    const requiredTypes = issues.map((x) => x.key).filter((key) => key === 'skills' || key === 'knowledge');
    const lines = ['只返回要求补齐的 CSV 行，不要表头、JSON、Markdown 或解释。每行必须恰好 7 列。'];
    if (requiredTypes.length) {
      lines.push(`本次缺失的基础类型必须由 AI 补齐：${requiredTypes.join('、')}。`);
      lines.push(`返回行的 type 必须包含且只能针对这些缺失类型：${requiredTypes.join('、')}；禁止用其它 type 替代。`);
      lines.push('不要返回当前已合格行，不要返回未要求的 skills/knowledge/professions 行。');
    }
    lines.push('必须严格照“需要AI返回的行”的 type 生成：');
    lines.push(skeleton);
    return lines.join('\n');
  },

  csvFixRowsToApply(partIndex, issues, rows) {
    if (partIndex === 5 || partIndex === 6) {
      const used = new Set();
      return rows.map((row) => this.normalizePart5Row(row)).filter((row) => {
        const parts = this.csvParts(row);
        if (this.part5RowIssue(parts)) return false;
        if (used.has(parts[1])) return false;
        used.add(parts[1]);
        return true;
      });
    }
    if (partIndex !== 4) return rows;
    const requiredKeys = issues.map((x) => x.key).filter((key) => this.fixedWearingSlots().includes(key));
    const used = new Set();
    return rows.map((row) => this.normalizePart4Row(row)).filter((row) => {
      const parts = this.csvParts(row);
      if (this.part4RowIssue(parts)) return false;
      if (parts[0] !== 'wearing') return true;
      if (!requiredKeys.length) return true;
      if (!requiredKeys.includes(parts[1]) || used.has(parts[1])) return false;
      used.add(parts[1]);
      return true;
    });
  },

  csvFixReturnedIssue(partIndex, issues, rows, skeleton = '') {
    if (partIndex === 2) {
      const requiredKeys = issues.map((x) => x.key).filter((key) => [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys].includes(key));
      const returnedKeys = rows.map((row) => {
        const parts = this.csvParts(row);
        return parts[0] === 'name' ? parts[1] : parts[0];
      }).filter(Boolean);
      const missing = requiredKeys.filter((key) => !returnedKeys.includes(key));
      const extra = returnedKeys.filter((key) => !requiredKeys.includes(key));
      const duplicate = returnedKeys.filter((key, index) => returnedKeys.indexOf(key) !== index);
      if (missing.length || extra.length || duplicate.length || returnedKeys.length !== requiredKeys.length) return [
        `CSV修复必须且只能返回这些情感行：${requiredKeys.join('、')}。`,
        missing.length ? `缺失：${missing.join('、')}` : '',
        extra.length ? `多余或不支持：${extra.join('、')}` : '',
        duplicate.length ? `重复：${[...new Set(duplicate)].join('、')}` : '',
        '请按下面“需要AI返回的行”重写，不要返回表头、解释或当前已合格行：',
        skeleton,
      ].filter(Boolean).join('\n');
      const bad = rows.find((row) => {
        let parts = this.csvParts(row);
        if (parts[0] === 'name') parts = parts.slice(1);
        return this.part2RowIssue(parts, parts[0]);
      });
      if (bad) return `CSV修复行格式不合格：${bad}`;
      return '';
    }
    if (partIndex === 5 || partIndex === 6) {
      const requiredKeys = issues.map((x) => x.key).filter((key) => this.bodyProfileParts().includes(key));
      const normalizedRows = rows.map((row) => this.normalizePart5Row(row));
      if (!requiredKeys.length) return '';
      const relevantRows = normalizedRows.filter((row) => requiredKeys.includes(this.csvParts(row)[1]));
      const bad = relevantRows.find((row) => this.part5RowIssue(this.csvParts(row)));
      if (bad) return `CSV修复行格式不合格：${bad}`;
      const returnedKeys = [...new Set(normalizedRows.map((row) => this.csvParts(row)[1]).filter(Boolean))];
      const missing = requiredKeys.filter((key) => !returnedKeys.includes(key));
      if (missing.length) return [
        `CSV修复必须返回这些身体部位：${requiredKeys.join('、')}。`,
        `缺失：${missing.join('、')}`,
        '请按下面“需要AI返回的行”重写，不要返回表头或解释：',
        skeleton,
      ].filter(Boolean).join('\n');
      return '';
    }
    if (partIndex === 4) {
      const requiredKeys = issues.map((x) => x.key).filter((key) => this.fixedWearingSlots().includes(key));
      const normalizedRows = rows.map((row) => this.normalizePart4Row(row));
      const bad = normalizedRows.find((row) => this.part4RowIssue(this.csvParts(row)));
      if (bad) return `CSV修复行格式不合格：${bad}`;
      if (!requiredKeys.length) return '';
      const returnedKeys = normalizedRows.map((row) => this.csvParts(row)).filter((parts) => parts[0] === 'wearing').map((parts) => parts[1]);
      const missing = requiredKeys.filter((key) => !returnedKeys.includes(key));
      const duplicate = returnedKeys.filter((key, index) => returnedKeys.indexOf(key) !== index);
      if (missing.length || duplicate.length) return [
        `CSV修复必须返回这些 wearing 槽位：${requiredKeys.join('、')}。`,
        missing.length ? `缺失：${missing.join('、')}` : '',
        duplicate.length ? `重复：${[...new Set(duplicate)].join('、')}` : '',
        '请按下面“需要AI返回的行”重写，不要返回表头或解释：',
        skeleton,
      ].filter(Boolean).join('\n');
      return '';
    }
    if (partIndex !== 3) return '';
    const requiredTypes = issues.map((x) => x.key).filter((key) => key === 'skills' || key === 'knowledge');
    if (!requiredTypes.length) return '';
    const returnedTypes = rows.map((row) => this.csvParts(row)[0]).filter(Boolean);
    const missing = requiredTypes.filter((type) => !returnedTypes.includes(type));
    if (missing.length) return [
      `CSV修复必须返回 ${missing.join('、')} 行，不能用 ${returnedTypes.join('、') || '空输出'} 替代。`,
      '请只按下面“需要AI返回的行”的 type 重写，不要返回其它 type：',
      skeleton,
    ].join('\n');
    const extra = returnedTypes.filter((type) => !requiredTypes.includes(type));
    if (extra.length) return [
      `CSV修复返回了未要求的 Part3 类型：${extra.join('、')}；本次只能返回 ${requiredTypes.join('、')}。`,
      '请删除未要求行，只返回缺失基础类型对应行：',
      skeleton,
    ].join('\n');
    return '';
  },

  csvFixHeaderPrefix(partIndex) {
    if (partIndex === 2) return 'name,value,status,reason';
    if (partIndex === 3) return 'type,name,level,';
    if (partIndex === 5 || partIndex === 6) return '序号,部位,部位描写';
    return 'type,slot,';
  },

  inlineCsvFixPrompt(partIndex, issues, currentRows, format, base, skeleton = this.csvFixSkeleton(partIndex, issues)) {
    return [
      `你正在修复角色卡 Part${partIndex} CSV。目标人物只能是：${base.name}。`,
      '只返回下面要求补齐或重写的 CSV 行，不要表头，不要解释。',
      '每行必须列数完整，单元格内禁止英文逗号。',
      '严格修复要求：',
      this.csvFixStrictRequirement(partIndex, issues, skeleton),
      '需要AI返回的行：',
      skeleton,
      '错误行说明：',
      issues.map((x) => `${x.key}：${x.reason}${x.badRow ? `｜${x.badRow}` : ''}`).join('\n'),
      '当前已合格行：',
      this.validCsvRowsForPrompt(partIndex, currentRows).join('\n') || '无',
      '原始要求：',
      String(format || '').slice(0, 2200),
    ].join('\n');
  },

  csvFixSkeleton(partIndex, issues) {
    if (partIndex === 2) {
      const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
      return issues.filter((x) => keys.includes(x.key)).map((x) => `${x.key},50,${x.key}因为当前证据形成状态,${x.key}源于人物经历和关系证据`).join('\n');
    }
    if (partIndex === 3) return issues.map((x) => (x.key === 'knowledge' ? 'knowledge,现代常识,2,日常生活和教育经历形成基础常识,生活经验,家庭经历|教育背景,--' : 'skills,观察力,2,长期生活经历形成基础观察能力,perception|谨慎性格,现代常识|过往经历,日常观察习惯')).join('\n');
    if (partIndex === 5 || partIndex === 6) {
      const parts = this.bodyProfileParts();
      const direct = issues.map((x) => x.key).filter((key) => parts.includes(key));
      const fromBadRows = issues.map((x) => this.csvParts(this.normalizePart5Row(x.badRow || ''))[1]).filter((key) => parts.includes(key));
      const targets = [...new Set([...direct, ...fromBadRows])];
      return targets.map((part) => {
        const finalIndex = parts.indexOf(part) + 1;
        const text = partIndex === 6 ? this.dressedProfilePromptText(part) : this.bodyProfilePromptText(part);
        return `${finalIndex},${part},${text}`;
      }).join('\n');
    }
    const positions = this.wearingClothingPositions();
    const missingReasonHints = {
      head: '当前场景没有帽子或发饰需要佩戴',
      neck: '当前场景没有项链围巾等颈部饰物需要佩戴',
      innerwearTop: '当前场景明确没有胸部内衣穿戴记录',
      top: '当前场景明确没有上衣穿戴记录',
      outerwear: '室内或当前温度不需要额外外套',
      gloves: '当前行动需要直接触摸物品所以没有戴手套',
      waist: '当前下装不需要腰带腰封固定',
      innerwearBottom: '当前场景明确没有腰臀内衣穿戴记录',
      bottom: '当前场景明确没有下装穿戴记录',
      socks: '当前场景没有袜类穿戴记录',
      shoes: '当前处于室内或休息状态所以没有穿鞋',
      wrist: '当前场景没有腕表手链等手腕饰物需要佩戴',
    };
    return issues.map((x) => {
      if (!this.fixedWearingSlots().includes(x.key)) return 'item,--,--,随身钥匙,金属边缘有磨痕,1,临时出门需要随手带走';
      const parts = this.csvParts(x.badRow || '');
      const normalized = this.normalizePart4Row(x.badRow || '');
      if (!this.part4RowIssue(this.csvParts(normalized))) return normalized;
      const [, , , itemName, description, , reason] = parts;
      const safeReason = this.csvCell(reason) ? reason : missingReasonHints[x.key];
      return this.part4HasConcreteWear(parts)
        ? this.csvJoin(['wearing', x.key, positions[x.key], itemName, description, '1', safeReason])
        : this.csvJoin(['wearing', x.key, positions[x.key], '--', '--', '1', safeReason]);
    }).join('\n');
  },

  validCsvRowsForPrompt(partIndex, rows) {
    return rows.filter((row) => {
      const parts = this.csvParts(row);
      if (partIndex === 2) return parts[0] !== 'name' && !this.part2RowIssue(parts);
      if (partIndex === 3) return !this.part3RowIssue(parts);
      if (partIndex === 5 || partIndex === 6) return !this.part5RowIssue(parts);
      return !this.part4RowIssue(parts);
    });
  },

  mergeCsvFixRows(partIndex, rows, fixedRows, issues) {
    const output = rows.filter((row, index) => !issues.some((issue) => issue.key === `row${index + 1}`));
    fixedRows.forEach((row) => {
      const parts = this.csvParts(row);
      const key = partIndex === 2 ? (parts[0] === 'name' ? parts[1] : parts[0]) : (partIndex === 4 && parts[0] === 'wearing' ? parts[1] : ((partIndex === 5 || partIndex === 6) ? parts[1] : ''));
      const existingIndex = key ? output.findIndex((old) => {
        const oldParts = this.csvParts(old);
        if (partIndex === 2) return oldParts[0] === key || (oldParts[0] === 'name' && oldParts[1] === key);
        if (partIndex === 5 || partIndex === 6) return oldParts[1] === key;
        return oldParts[0] === 'wearing' && oldParts[1] === key;
      }) : -1;
      if (existingIndex >= 0) output[existingIndex] = row;
      else output.push(row);
    });
    return output;
  },

  async generatePartFeeling(profile, base, lore, attrs, context, store, group = 'all') {
    const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
    const toObject = (items, names) => Object.fromEntries(Object.entries(names).map(([key, name]) => {
      const item = items.find((entry) => entry?.key === name || entry?.name === name) || {};
      return [key, { name, value: item.value, status: item.status, reason: item.reason }];
    }));
    const feeling = {};
    if (group === 'all' || group === 'emotions') {
      const emotions = await this.generateMetricGroupChunks(profile, base, evidence, 'emotions', window.GameModules.metrics.emotionKeys);
      feeling.emotions = toObject(emotions, { cold: '冷静', fear: '恐惧', worry: '担忧', joy: '高兴', tension: '紧张', anger: '愤怒', shame: '羞耻', sadness: '悲伤', curiosity: '好奇', numbness: '麻木', jealousy: '嫉妒', despair: '绝望' });
    }
    if (group === 'all' || group === 'playerFeelings') {
      const playerFeelings = await this.generateMetricGroupChunks(profile, base, evidence, 'playerFeelings', window.GameModules.metrics.playerKeys);
      feeling.playerFeelings = toObject(playerFeelings, { understanding: '了解', trust: '信任', resistance: '反抗', affection: '好感', friendship: '友情', familyLove: '亲情', romanticLove: '爱情', lust: '肉欲', awe: '畏惧', respect: '尊敬', admiration: '崇拜', dislike: '讨厌', dependence: '依赖', vigilance: '警惕', dominance: '支配欲', possessiveness: '占有欲', submission: '服从' });
    }
    return feeling;
  },

  async generateMissingPartFields(partIndex, current, template, missing, format, base, attrs = null) {
    const partialTemplate = this.missingPartTemplate(partIndex, current, template, missing);
    const prompt = this.missingPartPrompt(partIndex, current, partialTemplate, missing, format, base);
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source: `character-profile-part${partIndex}-missing`,
      model: 'nalang-turbo-0826',
      timeoutMs: 60000,
      prompt,
      format: prompt,
      repairHint: this.missingPartRepairHint(partIndex, missing),
      requiredRawFields: this.partRequiredRawFields(partIndex, missing),
      parse: (text) => this.parse(text),
      validate: (raw) => {
        const clean = this.sanitizeByTemplate(raw, partialTemplate);
        const extra = Object.keys(raw || {}).filter((key) => !missing.includes(key));
        if (extra.length) throw new Error(`缺失字段修复输出了多余字段：${extra.join('、')}`);
        const absent = this.missingPartFields(partIndex, this.mergeMissingPatch(partIndex, current, clean), template, base, attrs).filter((key) => missing.includes(key));
        if (absent.length) throw new Error(`缺失字段仍未补齐：${absent.join('、')}`);
        return clean;
      },
      max: 2,
    });
  },

  missingPartTemplate(partIndex, current, template, missing) {
    if (partIndex !== 7 || !missing.includes('rpgField')) return Object.fromEntries(missing.map((key) => [key, template[key]]));
    const rpg = current?.rpgField || {};
    const src = template.rpgField || {};
    const intrinsicKeys = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    const rpgField = {};
    if (!this.valueReasonComplete(rpg.level)) rpgField.level = src.level;
    const intrinsicBase = {};
    intrinsicKeys.forEach((key) => {
      if (!this.intrinsicBaseItemComplete(rpg.intrinsicBase?.[key])) intrinsicBase[key] = src.intrinsicBase?.[key];
    });
    if (Object.keys(intrinsicBase).length) rpgField.intrinsicBase = intrinsicBase;
    return { rpgField };
  },

  missingPartPrompt(partIndex, current, partialTemplate, missing, format, base) {
    const lines = [
      `你正在修复角色卡 Part${partIndex}。目标人物只能是：${base.name}。`,
      `只生成缺失字段：${missing.join('、')}。其余字段已经合格，禁止重复输出、禁止改动。`,
      '输出必须是一个 JSON 对象，根字段只能包含上述缺失字段，并严格遵守下面模板。',
    ];
    if (partIndex === 7 && missing.includes('rpgField')) {
      lines.push(
        '只补模板中列出的 rpgField 子字段；已合格的 level 或 intrinsicBase 子项禁止重复输出、禁止改动。',
        'rpgField 只需要包含 level 与模板列出的 intrinsicBase 子项；禁止返回 derived、攻击力、防御力。',
        '每个返回的 intrinsicBase 子项必须含 integer value、description、reason。',
      );
    }
    return [
      ...lines,
      '缺失字段模板：',
      JSON.stringify(partialTemplate, null, 2),
      '已合格字段（只作上下文，不要重写）：',
      JSON.stringify(current, null, 2),
      '原始要求：',
      String(format || '').slice(0, 2600),
    ].join('\n');
  },

  missingPartRepairHint(partIndex, missing) {
    if (partIndex === 7 && missing.includes('rpgField')) {
      return '只能返回 rpgField 中模板列出的缺失子字段。已合格的 level 或 intrinsicBase 子项禁止重复输出；禁止返回 derived、攻击力、防御力。';
    }
    return `只能返回缺失字段：${missing.join('、')}。不能新增其它字段。`;
  },

  mergeMissingPatch(partIndex, current, patch) {
    if (partIndex !== 7) return { ...current, ...patch };
    const merged = { ...current, ...patch };
    if (current?.rpgField || patch?.rpgField) {
      merged.rpgField = this.mergeRpgField(current?.rpgField, patch?.rpgField);
    }
    return merged;
  },

  mergeRpgField(current = {}, patch = {}) {
    return {
      ...(current || {}),
      ...(patch || {}),
      level: patch?.level || current?.level,
      intrinsicBase: { ...(current?.intrinsicBase || {}), ...(patch?.intrinsicBase || {}) },
    };
  },

  mergeGeneratedParts(part1, part2, part3, part4, attrs) {
    const feeling = { emotions: part2.feeling?.emotions, playerFeelings: part2.feeling?.playerFeelings };
    const merged = { ...part1, ...part3, ...part4, initialMetrics: this.sanitizeInitialMetrics(feeling) };
    merged.forcePositions = part1.forcePositions || part1.force_positions || [];
    merged.roleCardFieldReasons = this.roleReasonsFromParts(merged);
    merged.rpgFieldReasons = this.rpgReasonsFromPart4(merged, attrs);
    return merged;
  },

  roleReasonsFromParts(profile = {}) {
    const factionText = (profile.factions || []).map((x) => `${x.faction}/${x.role}：${x.reason || ''}`).join('；');
    const forceText = ((profile.forcePositions || profile.force_positions) || []).map((x) => `${x.force}/${x.position}：${x.reason || ''}`).join('；');
    return {
      姓名: `${profile.name || '该人物'}的姓名来自 Part1 固化身份字段。`,
      所属世界: profile.worldTag?.reason || `${profile.name || '该人物'}的所属世界来自 Part1 worldTag。`,
      身份: `${profile.role || '身份'}来自 Part1 role 与人物背景。`,
      职业: profile.job ? `${profile.job}由 Part1 jobConfirmed 确认。` : 'Part1 未确认内化职业，职业保持为空。',
      性别: profile.gender ? `${profile.name || '该人物'}的性别由 Part1 gender 固化为${profile.gender}。` : 'Part1 未给出可确认性别。',
      生日: profile.birthday ? `${profile.name || '该人物'}生日来自人物基础资料。` : (profile.age?.reason || 'Part1 只固化年龄，未提供生日。'),
      人际关系: profile.relationships || `${profile.name || '该人物'}暂无可固化人际关系。`,
      外貌: profile.appearance || '外貌来自 Part1 appearance。',
      喜好: profile.preferences || '喜好来自 Part1 preferences。',
      性格: profile.personality || '性格来自 Part1 personality。',
      人物说明: profile.detail || '人物说明来自 Part1 detail。',
      社群角色: factionText || '社群角色来自 Part1 factions。',
      势力地位: forceText || '势力地位来自 Part1 forcePositions。'
    };
  },

  rpgReasonsFromPart4(profile = {}, attrs = null) {
    const fallback = window.GameModules.characterReasonFallback?.rpgReasons?.(profile, attrs) || {};
    const rpg = profile.rpgField || {};
    const base = rpg.intrinsicBase || {};
    const derived = rpg.derived || {};
    const direct = {
      level: rpg.level?.reason,
      strength: base.strength?.reason,
      agility: base.agility?.reason,
      constitution: base.constitution?.reason,
      intelligence: base.intelligence?.reason,
      perception: base.perception?.reason,
      willpower: base.willpower?.reason,
      charisma: base.charisma?.reason,
      derived: [derived.攻击力?.reason, derived.防御力?.reason].filter(Boolean).join('；'),
      learning_ability: profile.learningAbility?.reason,
      mental_stability: profile.mentalStability?.reason,
      growth_potential: profile.growthPotential?.reason,
      action_ability: profile.actionAbility?.reason,
      world_tag: profile.worldTag?.reason,
      control_experience: profile.control_experience?.习惯程度,
    };
    return Object.fromEntries(this.rpgFieldReasonKeys(attrs).map((key) => [key, String(direct[key] || fallback[key] || `${profile.name || '该人物'}的${key}来自 Part1/Part7 固化资料。`).slice(0, 120)]));
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(text);
  },

  parsePartOutput(partIndex, text, base = {}) {
    if (partIndex === 2) return this.buildFeelingFromRows(this.csvDataRows(text, 'name,value,status,reason'), base.name, false);
    if (partIndex === 3) return this.buildAbilitiesFromRows(this.csvDataRows(text, 'type,name,level,'), base.name, false);
    if (partIndex === 4) return this.buildInventoryFromRows(this.csvDataRows(text, 'type,slot,'), base.name);
    if (partIndex === 5) return this.buildBodyProfileFromRows(this.csvDataRows(text, '序号,部位,部位描写'), base.name);
    if (partIndex === 6) return this.buildDressedProfileFromRows(this.csvDataRows(text, '序号,部位,部位描写'), base.name);
    return this.parse(text);
  },

  parseCsvAbilitiesPart(text, name = '') {
    const rows = this.csvDataRows(text, 'type,name,level,');
    return this.buildAbilitiesFromRows(rows, name, true);
  },

  buildAbilitiesFromRows(rows, name = '', strict = false) {
    const result = { name, skills: [], knowledge: [], professions: [], _csvRows: [] };
    rows.forEach((row) => {
      const parts = this.csvParts(row);
      const issue = this.part3RowIssue(parts);
      if (issue) return;
      const [type, itemName, level, reason, requiredIntrinsicBase, requiredKnowledge, requiredSkills] = parts;
      const item = {
        name: itemName,
        desc: `${itemName}的实际表现与可用范围。`,
        level: Number(level),
        levelEffects: this.csvLevelEffects(itemName),
        reason: this.csvCell(reason),
      };
      item.requiredIntrinsicBase = this.csvList(requiredIntrinsicBase);
      item.requiredKnowledge = this.csvList(requiredKnowledge);
      item.requiredSkills = this.csvList(requiredSkills);
      result[type].push(item);
      result._csvRows.push(row);
    });
    this.promotePart3Dependencies(result);
    if (strict && !result.skills.length) throw new Error('Part3 CSV 缺少 skills 行');
    if (strict && !result.knowledge.length) throw new Error('Part3 CSV 缺少 knowledge 行');
    return result;
  },

  promotePart3Dependencies(result) {
    const baseKeys = new Set(['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']);
    const names = {
      skills: new Set(result.skills.map((item) => item.name)),
      knowledge: new Set(result.knowledge.map((item) => item.name)),
    };
    const add = (type, itemName) => {
      const name = this.csvCell(itemName);
      if (!name || baseKeys.has(name) || names[type].has(name)) return;
      result[type].push({
        name,
        desc: `${name}的基础掌握与实际应用。`,
        level: 1,
        levelEffects: this.csvLevelEffects(name),
        reason: '由能力依赖自动提升为角色基础能力。',
        requiredIntrinsicBase: [],
        requiredKnowledge: [],
        requiredSkills: [],
      });
      names[type].add(name);
    };
    [...result.skills, ...result.knowledge, ...result.professions].forEach((item) => {
      (item.requiredKnowledge || []).forEach((name) => add('knowledge', name));
      (item.requiredSkills || []).forEach((name) => add('skills', name));
    });
  },

  part3RowIssue(parts) {
    if (parts.length !== 7) return '列数不是7';
    const [type, itemName, level, reason] = parts;
    if (!['skills', 'knowledge', 'professions'].includes(type)) return 'type无效';
    if (!itemName || itemName === '--') return 'name缺失';
    if (!Number.isInteger(Number(level)) || Number(level) < 1 || Number(level) > 7) return 'level无效';
    if (!this.csvCell(reason)) return 'reason缺失';
    return '';
  },

  buildBodyProfileFromRows(rows, name = '') {
    const expected = this.bodyProfileParts();
    const byPart = new Map();
    rows.forEach((row) => {
      const normalized = this.normalizePart5Row(row);
      const parts = this.csvParts(normalized);
      if (this.part5RowIssue(parts)) return;
      const [index, part, description] = parts;
      byPart.set(part, { index: Number(index), part, description: this.csvCell(description) });
    });
    return { name, bodyProfile: expected.map((part, i) => byPart.get(part) || { index: i + 1, part, description: '' }), _csvRows: rows };
  },

  buildDressedProfileFromRows(rows, name = '') {
    const body = this.buildBodyProfileFromRows(rows, name);
    return { name, dressedProfile: body.bodyProfile, _csvRows: rows };
  },

  bodyProfileSummary(value) {
    const list = Array.isArray(value) ? value : [];
    return list.map((item, index) => {
      const part = String(item?.part || item?.部位 || '').trim();
      const description = String(item?.description || item?.部位描写 || '').trim();
      if (!part || !description) return '';
      return `${Number(item?.index || item?.序号) || index + 1}.${part}：${description}`;
    }).filter(Boolean).join('\n') || '未生成身体原貌。';
  },

  part5RowIssue(parts) {
    if (parts.length !== 3) return '列数不是3';
    const [index, part, description] = parts;
    const expected = this.bodyProfileParts();
    if (!Number.isInteger(Number(index)) || Number(index) < 1 || Number(index) > expected.length) return '序号无效';
    if (!expected.includes(part)) return '部位不在固定列表';
    if (!this.csvCell(description)) return '部位描写缺失';
    return '';
  },

  bodyProfileParts() {
    return ['头发', '脸部', '耳朵', '脖颈', '胸部', '双臂', '小腹', '臀部', '神秘花园', '双大腿', '双小腿'];
  },

  bodyProfilePromptText(part) {
    return {
      头发: '描写未经任何造型、未施任何护发产品的天然头发，包括其色泽、蓬松度、发丝的粗细、垂落时的走向，以及光线照射下呈现的天然光泽。',
      脸部: '描写完全素净的面容，无粉底、无口红、无眉笔修饰。重点描写眉毛的天然走向、眼睑的褶皱、鼻梁的天然弧线、唇色的本来气色（苍白或红润）。',
      耳朵: '描写耳廓的软骨弧度、耳垂的形态、耳后肌肤的细腻度，以及半透明软骨在逆光下的透光效果。',
      脖颈: '描写颈部的修长线条、咽喉处的轻微凸起（喉结或软骨）、锁骨的横向凹陷、颈窝的深浅，以及颈侧隐约的筋脉走向。',
      胸部: '（若为女性）描写未经胸衣束缚的天然乳房轮廓，包括侧面的弧线、乳晕的色泽与大小、静止时自然的下垂弧度；（若为男性）描写胸大肌的天然厚度、乳头的位置与形态、肋骨隐约浮现的痕迹。',
      双臂: '描写大臂的圆润、肘部骨节的突出、小臂内侧的浅静脉走向、手腕的纤细、手背的骨骼轮廓以及手指的长度与关节弧度。',
      小腹: '描写腹部的平坦或自然微凸、肚脐的形状（如椭圆形或圆形）、腹中线隐约的纵向纹路，以及呼吸时腹部轻微的起伏动态。',
      臀部: '描写臀部的饱满程度、从腰部到臀顶的弧线、臀缝的纵向凹陷、臀部下沿与大腿连接处的清晰分界褶皱。',
      神秘花园: '描写阴部的天然形态，使用含蓄隐喻（如“贝壳”“花瓣”“柔丘”等），包括耻骨的隆起、阴毛的天然分布（若有）、大小阴唇的闭合形态，作为身体美学的一部分呈现。',
      双大腿: '描写大腿从根部到膝盖的渐收线条、大腿内侧肌肤的细腻度、外侧的肌肉轮廓，以及站立时大腿之间的自然缝隙或贴合程度。',
      双小腿: '描写小腿肚的腓肠肌弧度、跟腱的修长拉伸感、脚踝两侧骨节的突出、脚背的拱形弧线。',
    }[part] || '描写未经人工修饰、未经衣物遮掩的天然身体状态。';
  },

  dressedProfilePromptText(part) {
    return {
      头发: '描写经过精心造型、使用护发与定型产品后的发型，包括发丝的光泽感（如精油或喷雾带来的镜面反光）、卷曲或盘起的弧度、发胶固定后的纹理走向，以及发饰（如簪子、发夹、发带）的点缀效果，光线照射下呈现的人工增亮光泽。',
      脸部: '描写完整的妆容修饰，包括粉底均匀覆盖后的无瑕肤色、眉毛经描画后的精致弧度与填充、眼睑上眼影的晕染层次、眼线的勾勒、睫毛膏的纤长卷翘效果、腮红赋予的双颊血色，以及唇膏/唇釉涂抹后的饱满色泽与边界分明的唇形。',
      耳朵: '描写佩戴耳饰后的耳朵状态，包括耳钉/耳环/耳坠的材质（金属、宝石、珍珠等）与造型、耳饰与耳廓的贴合或垂坠关系、耳垂因负重产生的轻微拉伸感，以及耳饰在光线下的闪烁反光，衬托得耳部肌肤愈发细腻。',
      脖颈: '描写颈部佩戴饰品（项链/项圈/choker）后的状态，包括链条的粗细、吊坠垂落的位置与锁骨窝的关系、金属或珠宝贴肤的冰凉质感暗示、颈链对颈部线条的视觉分割与修饰，以及妆容中脖颈部涂抹粉底的均匀过渡。',
      胸部: '（若为女性）描写穿着胸衣/礼服后的胸部形态，包括胸衣承托形成的饱满上提弧度、乳沟的明显聚拢效果、面料（蕾丝、缎面、薄纱）覆盖或半覆盖下的若隐若现；（若为男性）描写穿着衬衣或礼服后的胸廓形态，包括衬衣纽扣间的轻微张力、胸肌被衣料勾勒出的轮廓，以及领带/领结的垂落位置。',
      双臂: '描写佩戴臂饰/手镯/戒指等饰物后的手臂状态，包括袖口（长袖、中袖、无袖）的款式与堆叠褶皱、手镯在腕间滑动时与骨骼的触碰关系、戒指在手指上的位置与宝石的光泽、指甲油的颜色与指甲的修长形状，以及整体在衣物面料衬托下露出的肤色对比。',
      小腹: '描写穿着紧身服饰（如束腰、鱼骨、腰带、高腰裙/裤）后的小腹状态，包括衣物对腹部的轻微塑形压缩、面料贴腹产生的横向褶皱、腰带/腰封对腰部曲线的强化收紧、肚脐位置在薄透面料下的隐约可辨，以及整体呈现的人工塑形腰腹弧线。',
      臀部: '描写穿着下装（裙装/裤装）后的臀部形态，包括面料包裹臀部的紧绷或垂坠程度、臀缝在衣裙表面的隐约印痕、裙摆/裤管从臀部最凸点到下摆的流畅垂坠或蓬松展开，以及腰带/腰封在腰部与臀部之间形成的视觉强调。',
      神秘花园: '描写穿着下装（内裤、衬裙、紧身裙/裤）后阴部的遮掩状态，包括面料（蕾丝、丝绸、棉质）的覆盖质感、紧身面料贴合时勾勒出的轻微隆起轮廓、裤缝/裆线在人鱼线或腹股沟处的延伸走向，整体强调“被精心包裹与修饰”的含蓄美感。',
      双大腿: '描写穿着丝袜/裤袜/长靴或裸露于裙摆之外的大腿状态，包括丝袜覆盖下的肤色均匀化与细微光泽、裙摆边缘在大腿处形成的横向切割线、长靴筒口对大腿肌肉的轻微挤压痕迹、以及行走时衣料随大腿动作产生的皱褶位移。',
      双小腿: '描写穿着鞋袜后的小腿状态，包括高跟鞋/靴子对跟腱的拉伸修饰效果（使小腿线条更修长）、鞋面覆盖或露出脚背的弧线、袜子/丝袜在脚踝处的堆叠或绷紧、鞋跟在视觉上提升腿长的效果，以及鞋履本身的装饰细节（绑带、扣饰、镂空等）对小腿的衬托。',
    }[part] || '描写盛装/打扮完全后的造型、修饰和衣物包裹效果。';
  },

  bodyProfileCompleteItems(value) {
    const list = Array.isArray(value) ? value : [];
    return this.bodyProfileParts().filter((part, index) => {
      const item = list.find((entry) => entry?.part === part || entry?.部位 === part);
      return item && Number(item.index || item.序号) === index + 1 && String(item.description || item.部位描写 || '').trim();
    });
  },

  bodyProfileComplete(value) {
    return this.bodyProfileCompleteItems(value).length === this.bodyProfileParts().length;
  },

  completeBodyProfileFallback(partIndex, data, base = {}) {
    const key = partIndex === 6 ? 'dressedProfile' : 'bodyProfile';
    const list = Array.isArray(data?.[key]) ? data[key] : [];
    const byPart = new Map();
    list.forEach((item) => {
      const part = String(item?.part || item?.部位 || '').trim();
      const description = String(item?.description || item?.部位描写 || '').trim();
      if (this.bodyProfileParts().includes(part) && description) byPart.set(part, { ...item, part, description });
    });
    const label = partIndex === 6 ? '盛装状态' : '自然状态';
    const filled = this.bodyProfileParts().map((part, index) => {
      const old = byPart.get(part);
      if (old) return { index: index + 1, part, description: old.description };
      const text = partIndex === 6 ? this.dressedProfilePromptText(part) : this.bodyProfilePromptText(part);
      return { index: index + 1, part, description: `采用系统兜底${label}：${text}` };
    });
    return { ...(data || {}), name: base.name || data?.name || '', [key]: filled };
  },

  parseCsvInventoryPart(text, name = '') {
    const rows = this.csvDataRows(text, 'type,slot,clothing_position,');
    return this.buildInventoryFromRows(rows, name);
  },

  buildInventoryFromRows(rows, name = '') {
    const wearing = this.emptyWearingObject();
    const result = { name, items: [], wearing, _csvRows: [] };
    rows.forEach((row) => {
      const normalizedRow = this.normalizePart4Row(row);
      const parts = this.csvParts(normalizedRow);
      const issue = this.part4RowIssue(parts);
      if (issue) return;
      const [type, slot, clothingPosition, itemName, description, quantity, reason] = parts;
      if (type === 'item') {
        result.items.push({ name: itemName, description: this.csvCell(description), quantity: Math.max(1, Number(quantity) || 1), reason: this.csvCell(reason) });
      }
      if (type === 'wearing') {
        wearing[slot] = { clothing_position: this.csvCell(clothingPosition) || wearing[slot].clothing_position, name: this.csvCell(itemName), description: this.csvCell(description), reason: this.csvCell(reason) };
      }
      if (type === 'slot') {
        wearing.slot.push({ slot: this.csvCell(slot), clothing_position: this.csvCell(clothingPosition), name: itemName, description: this.csvCell(description), reason: this.csvCell(reason) });
      }
      result._csvRows.push(normalizedRow);
    });
    return result;
  },

  part4RowIssue(parts) {
    if (parts.length !== 7) return '列数不是7';
    const [type, slot, clothingPosition, itemName, description, quantity, reason] = parts;
    if (parts.some((cell) => this.invalidPlaceholderCell(cell))) return '非法占位符，未穿戴只能写--';
    if (!['item', 'wearing', 'slot'].includes(type)) return 'type无效';
    if (type === 'item') {
      if (slot !== '--' || clothingPosition !== '--') return 'item槽位列和人体着装部位列必须为--';
      if (!itemName || itemName === '--') return 'item名称缺失';
      if (!this.csvCell(description)) return 'item描述缺失';
      if (!this.csvCell(reason)) return 'item原因缺失';
    }
    if (type === 'wearing') {
      if (!this.fixedWearingSlots().includes(slot)) return 'wearing槽位无效';
      const expectedPosition = this.wearingClothingPositions()[slot];
      if (clothingPosition !== expectedPosition) return `clothing_position应为${expectedPosition}`;
      if (!this.csvCell(reason)) return 'reason缺失';
      const emptyName = itemName === '--';
      const emptyDesc = description === '--';
      if (emptyName !== emptyDesc) return '未穿戴时name和description必须同时为--';
      if (!emptyName && (!this.csvCell(itemName) || !this.csvCell(description))) return '穿戴物名称或描述缺失';
    }
    if (type === 'slot') {
      if (!this.csvCell(slot) || !this.csvCell(clothingPosition) || !itemName || itemName === '--' || !this.csvCell(description)) return 'slot字段缺失';
      if (!this.csvCell(reason)) return 'slot原因缺失';
    }
    return '';
  },

  emptyWearingObject() {
    const positions = this.wearingClothingPositions();
    return { ...Object.fromEntries(Object.entries(positions).map(([key, clothing_position]) => [key, { clothing_position, name: '', description: '', reason: '等待AI生成具体穿着或未穿戴原因。' }])), slot: [] };
  },

  invalidPlaceholderCell(value) {
    const text = String(value || '').trim();
    return Boolean(text) && text !== '--' && /^[-.。·_\s]+$/.test(text);
  },

  wearingClothingPositions() {
    return { head: '头部', neck: '颈部', innerwearTop: '内衣', top: '上衣', outerwear: '外套', gloves: '手套', waist: '腰部', innerwearBottom: '内衣', bottom: '下装', socks: '袜子', shoes: '鞋子', wrist: '手腕' };
  },

  fixedWearingSlots() {
    return ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist'];
  },

  csvDataRows(text, headerPrefix) {
    const raw = String(text || '').replace(/```(?:csv|txt|json)?|```/g, '').trim();
    return raw.split(/\n+/)
      .map((row) => row.trim().replace(/^[\-*]\s*/, '').replace(/^\d+[.)、]\s*/, ''))
      .filter(Boolean)
      .filter((row) => !row.toLowerCase().startsWith(headerPrefix));
  },

  csvParts(row) {
    const text = String(row || '');
    const parts = [];
    let current = '';
    let quote = '';
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const atCellStart = !current.trim();
      if ((ch === '"' || ch === '“') && (!quote || atCellStart)) {
        quote = quote ? '' : (ch === '“' ? '”' : ch);
        continue;
      }
      if (quote && ch === quote) {
        if (quote === '"' && text[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quote = '';
        }
        continue;
      }
      if (ch === ',' && !quote) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    parts.push(current.trim());
    return parts.map((part) => this.csvStripOuterQuotes(part));
  },

  csvStripOuterQuotes(value) {
    const text = String(value || '').trim();
    return text.replace(/^["“”]|["“”]$/g, '');
  },

  csvJoin(parts) {
    return parts.map((part) => String(part ?? '').replace(/,/g, '，')).join(',');
  },

  csvCell(value) {
    const text = this.csvStripOuterQuotes(value);
    return text === '--' ? '' : text;
  },

  csvList(value) {
    return this.csvCell(value).split('|').map((item) => item.trim()).filter(Boolean);
  },

  csvLevelEffects(name = '能力') {
    const labels = ['刚入门', '初学', '熟练', '专业', '专家', '大师', '极致'];
    return Object.fromEntries(labels.map((label, index) => [`lv${index + 1}`, { 程度介绍: label, 说明: `${name}${label}时的表现。` }]));
  },

  parseCsvFeelingPart(text, name = '') {
    const rows = this.csvDataRows(text, 'name,value,status,reason');
    return this.buildFeelingFromRows(rows, name, true);
  },

  buildFeelingFromRows(rows, name = '', strict = false) {
    const emotions = this.parseMetricGroupLines(rows, 'emotions', window.GameModules.metrics.emotionKeys).emotions || [];
    const playerFeelings = this.parseMetricGroupLines(rows, 'playerFeelings', window.GameModules.metrics.playerKeys).playerFeelings || [];
    if (strict && emotions.length !== window.GameModules.metrics.emotionKeys.length) throw new Error('emotions CSV 行数不完整');
    if (strict && playerFeelings.length !== window.GameModules.metrics.playerKeys.length) throw new Error('playerFeelings CSV 行数不完整');
    const emotionMap = { 冷静: 'cold', 恐惧: 'fear', 担忧: 'worry', 高兴: 'joy', 紧张: 'tension', 愤怒: 'anger', 羞耻: 'shame', 悲伤: 'sadness', 好奇: 'curiosity', 麻木: 'numbness', 嫉妒: 'jealousy', 绝望: 'despair' };
    const playerMap = { 了解: 'understanding', 信任: 'trust', 反抗: 'resistance', 好感: 'affection', 友情: 'friendship', 亲情: 'familyLove', 爱情: 'romanticLove', 肉欲: 'lust', 畏惧: 'awe', 尊敬: 'respect', 崇拜: 'admiration', 讨厌: 'dislike', 依赖: 'dependence', 警惕: 'vigilance', 支配欲: 'dominance', 占有欲: 'possessiveness', 服从: 'submission' };
    const toObject = (items, map) => Object.fromEntries(items.map((item) => [map[item.key] || item.key, { name: item.key, value: item.value, status: item.status, reason: item.reason, metricSources: item.metricSources || this.metricSourceMap?.('ai') }]));
    return { name, feeling: { emotions: toObject(emotions, emotionMap), playerFeelings: toObject(playerFeelings, playerMap) }, _csvRows: rows };
  },

  parseMetricGroup(text, group, keys) {
    const lined = this.parseMetricGroupLines(text, group, keys);
    if (lined[group]?.length === keys.length) return lined;
    const recovered = this.recoverMetricGroup(text, group, keys);
    if (recovered[group]?.length === keys.length) return recovered;
    try {
      return this.parse(text);
    } catch (err) {
      if (lined[group]?.length) return lined;
      if (recovered[group]?.length) return recovered;
      throw err;
    }
  },

  parseMetricGroupLines(text, group, keys) {
    const rawRows = Array.isArray(text) ? text : this.csvDataRows(text, 'name,value,status,reason');
    const rows = rawRows.map((row) => this.normalizePart2Row(row));
    const items = [];
    keys.forEach((key) => {
      const line = rows.find((row) => row.startsWith(`${key},`) || row.startsWith(`name,${key},`));
      if (!line) return;
      let parts = this.csvParts(line);
      if (parts[0] === 'name' && parts[1] === key) parts = parts.slice(1);
      if (parts.length === 3) parts = [parts[0], parts[1], parts[2], parts[2]];
      if (this.part2RowIssue(parts, key)) return;
      const value = Number(parts[1]);
      const status = parts[2] || '';
      const reason = parts[3] || status;
      items.push({ key, value, status, reason, metricSources: this.metricSourceMap?.('ai') });
    });
    return { [group]: items };
  },

  part2RowIssue(parts, expectedKey = '') {
    if (parts[0] === 'name' && expectedKey && parts[1] === expectedKey) parts = parts.slice(1);
    if (parts.length !== 4) return '列数不是4';
    const [key, value, status, reason] = parts;
    const allKeys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    if (expectedKey && key !== expectedKey) return '情感名错位';
    if (!allKeys.includes(key)) return '情感名不在固定列表';
    if (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 100) return 'value无效';
    if (!String(status || '').trim()) return 'status缺失';
    if (!String(reason || '').trim()) return 'reason缺失';
    return '';
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
      const value = chunk.match(/"value"\s*:\s*(-?\d+)/)?.[1] ?? chunk.match(/,\s*(-?\d+)\s*(?:[}\]])/)?.[1];
      const status = chunk.match(/"status"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1];
      const reason = this.pickMetricReason(raw, chunk, key, start);
      if (value !== undefined || status || reason) {
        const complete = value !== undefined && status && reason;
        const fallback = `${key}暂按当前资料保守记录，等待后续AI补齐。`;
        items.push({ key, value: Number(value || 0), status: status || fallback, reason: reason || fallback, metricSources: this.metricSourceMap?.(complete ? 'ai' : '系统') });
      }
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
    return [keys];
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
      const needsRepair = chunk.filter((key) => {
        const item = items.find((entry) => entry?.key === key);
        return !item || !this.metricSourcesAreAi?.(item);
      });
      if (needsRepair.length) {
        this.warnMetricGroupIssues('角色数值缺字段或系统来源，批量补齐一次', items, chunk, { ...base, ...profile, group, chunkIndex: i + 1 });
        try {
          const part = await this.generateMetricGroup(profile, base, evidence, group, needsRepair, `${i + 1}-repair`, chunks.length);
          needsRepair.forEach((key) => {
            const index = items.findIndex((item) => item?.key === key);
            if (index >= 0) items.splice(index, 1);
          });
          items.push(...part);
        } catch (err) {
          console.warn('[角色数值] 批量补齐失败，保留系统来源兜底:', { profile: profile.name || base.name, group, missing: needsRepair, error: err.message, stack: err.stack });
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
      requiredRawFields: [group, 'key', 'value', 'status', 'reason', ...keys],
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
        `喜好：${profile.preferences || base.preferences || ''}`,
        `性格：${profile.personality || base.personality || ''}`,
        `社群：${(profile.factions || []).map((x) => `${x.faction}/${x.role || x.position || ''}`).join('、') || profile.faction || ''}`,
        `势力：${((profile.forcePositions || profile.force_positions) || []).map((x) => `${x.force}/${x.position}`).join('、') || profile.rank || ''}`,
      ].join('\n').slice(0, 900),
      playerProfile: [
        player.playerBasic,
        player.playerIdentity,
        player.playerHome,
        player.playerRelations,
        player.playerNotes,
      ].map((text) => String(text || '').slice(0, 700)).join('\n'),
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
      完整JSON骨架: this.metricGroupJsonSkeleton(group, keys),
      完整行格式骨架: this.metricGroupSkeleton(group, keys),
      首个字段: keys[0],
    });
  },

  metricGroupSkeleton(group, keys) {
    return keys.map((key) => `${key},0,${key}因为人物经历与关系事件形成当前数值,${key}源于人物过去经历和当前关系事件的影响`).join('\n');
  },

  metricGroupJsonSkeleton(group, keys) {
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
      `目标数值组是 ${group}，但不要输出根字段名。`,
      `必须重写完整 ${group} 行列表，不是只输出报错的单个 key。`,
      relationEvidence,
      `直接按这个完整行格式骨架保留 key 和行数，再根据证据改写 value/status/reason；骨架里的 value 0 只是占位，不能当默认值：\n${this.metricGroupSkeleton(group, keys)}`,
      `${group} 必须按顺序完整包含：${keys.join('、')}，每个 key 精确一次，不能截断。`,
      '每一行都必须是 key,value,status,reason 四段；reason 是强制段，即使上一轮只有 status，也必须为同一个 key 补出 reason。',
      '本批 key 很少，必须完整输出每个 key；不要省略任何一行。',
      'status 必须是20-50个汉字的短句，必须以当前key开头，使用“当前key因为……”或“当前key源于……”句式。',
      'reason 必须是20-50个汉字的短句，必须以当前key开头，写形成该数值的具体原因，结合角色动机、处境与过去经历。',
      'status 和 reason 内不要使用英文逗号；reason 不能和 status 完全重复，不能只写抽象性格词；禁止写“默认、初始化、根据上下文、系统生成、综合判断、阶段定义、背景信息、个人动机与过去经历、等待后续AI补齐”等空话。',
      '不要返回英文 key、initial_metrics、affection、dependency、trust_level 等替代结构。',
      '只返回纯文本行，不要 JSON，不要 Markdown。',
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

  part1Summary(part1) {
    return [
      `姓名：${part1.name || ''}`,
      `所属世界：${part1.worldTag?.value || ''}`,
      `性别：${part1.gender || ''}`,
      `年龄：${part1.age?.value || part1.age || ''}`,
      `身份：${part1.role || ''}`,
      `关系：${part1.relationships || ''}`,
      `背景：${part1.detail || ''}`,
      `外貌：${part1.appearance || ''}`,
      `喜好：${part1.preferences || ''}`,
      `性格：${part1.personality || ''}`,
      `学习能力：${part1.learningAbility?.value || ''}`,
      `精神稳定度：${part1.mentalStability?.value || ''}`,
      `成长潜力：${part1.growthPotential?.value || ''}`,
      `行动能力：${part1.actionAbility?.value || ''}`,
      `社群：${(part1.factions || []).map((x) => `${x.faction}/${x.role}`).join('、')}`,
      `势力：${((part1.forcePositions || part1.force_positions) || []).map((x) => `${x.force}/${x.position}`).join('、')}`,
      `职业：${part1.job || '无'}`,
    ].join('\n');
  },

  part3Summary(part3 = {}) {
    const names = (items) => (items || []).map((item) => `${item.name || ''}lv${item.level || ''}`).filter(Boolean).join('、') || '无';
    return [`技能：${names(part3.skills)}`, `知识：${names(part3.knowledge)}`, `职业：${names(part3.professions)}`].join('\n');
  },

  part4Summary(part4 = {}) {
    const items = (part4.items || []).map((item) => item.name).filter(Boolean).slice(0, 6).join('、') || '无';
    const wearing = Object.entries(part4.wearing || {}).filter(([key, item]) => key !== 'slot' && item?.name).map(([key, item]) => `${key}:${item.name}`).join('、') || '无';
    return [`物品：${items}`, `穿着：${wearing}`].join('\n');
  },

  partRepairHint(partIndex, base, attrs = null) {
    const nameHint = `目标人物只能是：${base.name}。name 必须逐字等于"${base.name}"，不要同音改字。`;
    if (partIndex === 1) {
      return [
        nameHint,
        '必须返回根字段 worldTag（含 value 和 reason）、age（含 value 和 reason）。',
        '必须返回根字段 learningAbility、mentalStability、growthPotential、actionAbility（各含 value 和 reason）。',
        '必须返回根字段 factions 和 forcePositions（数组，每项含 reason）。',
        'relationships 只能写“当前人物与别人”的关系，冒号右侧不能是当前人物本人；当前人物自己的长兄、妹妹、学生等身份写入 role/detail。',
        '本轮不要返回 feeling/skills/knowledge/professions/items/wearing/rpgField/rpgFieldReasons。',
      ].join('\n');
    }
    if (partIndex === 2) {
      return [
        nameHint,
        '必须只返回 CSV，不要返回 JSON。',
        '第一行必须是 name,value,status,reason。',
        '必须按固定顺序返回 29 行：先 12 行情绪，再 17 行对玩家感觉。',
        '每行四列：中文名称,0-100整数,状态短句,原因短句。',
      ].join('\n');
    }
    if (partIndex === 3) {
      return [
        nameHint,
        '必须只返回 CSV，不要返回 JSON。',
        '第一行必须是 type,name,level,reason,requiredIntrinsicBase,requiredKnowledge,requiredSkills。',
        'type 只能是 skills、knowledge、professions；skills 和 knowledge 至少各 1 行。',
        '每行必须恰好 7 列，单元格内不要使用英文逗号。',
        '不存在或不适用的字段值填 --；依赖多项用竖线 | 分隔；requiredIntrinsicBase 只能用 strength/agility/constitution/intelligence/perception/willpower/charisma。',
      ].join('\n');
    }
    if (partIndex === 4) {
      return [
        nameHint,
        '必须只返回 CSV，不要返回 JSON。',
        '第一行必须是 type,slot,clothing_position,name,description,quantity,reason。',
        'type 只能是 item、wearing、slot；wearing 必须包含 12 个固定槽位。',
        '每行必须恰好 7 列；不存在或不适用字段填 --；单元格内不要使用英文逗号。',
      ].join('\n');
    }
    if (partIndex === 5 || partIndex === 6) {
      return [
        nameHint,
        '必须只返回 CSV，不要返回 JSON。',
        '第一行必须是 序号,部位,部位描写。',
        `必须完整返回这些部位：${this.bodyProfileParts().join('、')}。`,
        '每行必须恰好 3 列；单元格内不要使用英文逗号。',
      ].join('\n');
    }
    return [
      nameHint,
      '必须返回根字段 rpgField，含 level、intrinsicBase（7项，每项含 value/description/reason）。',
      '不要返回 derived、攻击力或防御力；这些由代码根据 level 与 intelligence 自动计算。',
      '顶层只能包含 name 和 rpgField，不要返回 items、wearing 或 rpgFieldReasons。',
      'intrinsicBase 每项的 description 必须根据该属性含义和数值段描写对应表现。',
    ].join('\n');
  },

  validatePart(partIndex, raw, base, lore, attrs, store, template = null) {
    if (!raw || typeof raw !== 'object') throw new Error('AI 输出不是合法对象');
    if (template) {
      const internalKeys = new Set((partIndex === 4 || partIndex === 5 || partIndex === 6) ? ['_csvRows'] : []);
      const extra = Object.keys(raw).filter((key) => !internalKeys.has(key) && !Object.prototype.hasOwnProperty.call(template, key));
      if (extra.length) throw new Error(`Part${partIndex} 返回了模板外字段：${extra.join('、')}`);
      const missing = this.missingPartFields(partIndex, raw, template, base, attrs);
      if (missing.length) throw new Error(`Part${partIndex} 缺少字段：${missing.join('、')}`);
    }
    if (partIndex === 1) {
      if (base.id === 'player-self' && raw.name !== base.name) throw new Error(`Part1 玩家本人姓名漂移: ${raw.name}`);
      if (!this.isConcreteName(raw.name) && base.id !== 'player-self') throw new Error(`Part1 缺少有效姓名: ${raw.name}`);
      return raw;
    }
    if (partIndex === 2) {
      if (!this.feelingGroupComplete(raw.feeling, 'emotions')) throw new Error('Part2 emotions 字段不完整');
      if (!this.feelingGroupComplete(raw.feeling, 'playerFeelings')) throw new Error('Part2 playerFeelings 字段不完整');
      return raw;
    }
    if (partIndex === 3) {
      if (!Array.isArray(raw.skills) || !raw.skills.length) throw new Error('Part3 缺少 skills');
      if (!Array.isArray(raw.knowledge) || !raw.knowledge.length) throw new Error('Part3 缺少 knowledge');
      return raw;
    }
    if (partIndex === 4) {
      if (!this.wearingObjectComplete(raw.wearing)) throw new Error('Part4 缺少 wearing 完整结构');
      return raw;
    }
    if (partIndex === 5) {
      if (!this.bodyProfileComplete(raw.bodyProfile)) throw new Error('Part5 缺少 bodyProfile 完整结构');
      return raw;
    }
    if (partIndex === 6) {
      if (!this.bodyProfileComplete(raw.dressedProfile)) throw new Error('Part6 缺少 dressedProfile 完整结构');
      return raw;
    }
    if (!this.rpgFieldComplete(raw.rpgField)) throw new Error('Part7 缺少 rpgField 完整结构');
    return raw;
  },

  repairHint(base, attrs = null) {
    return [
      `目标人物只能是：${base.name}。name 必须逐字等于“${base.name}”，不要同音改字，不要改成亲属、联系人或关系对象。`,
      '必须返回根字段 roleCardFieldReasons，不是 roleCardField、中文字段平铺或社群映射。',
      'roleCardFieldReasons 必须完整包含：姓名、所属世界、身份、职业、性别、生日、人际关系、外貌、喜好、性格、人物说明、社群角色、势力地位。每个值建议写一句人物相关原因。',
      `必须返回根字段 rpgFieldReasons，并完整包含：${this.rpgFieldReasonKeys(attrs).join('、')}。`,
      '本轮不要返回 initialMetrics、initial_metrics 或任何情绪/感觉数组。',
      'relationships 必须是字符串，格式“关系：姓名”；不要对象。',
    ].join('\n');
  },

  validate(profile, base, lore, attrs, store = null, options = {}) {
    let rawProfile = profile || {};
    const expectedName = String(base.name || '').trim();
    rawProfile = this.lockTargetProfile(rawProfile, base);
    if (this.isConcreteName(expectedName) && rawProfile.name && rawProfile.name !== expectedName) {
      throw new Error(`目标人物漂移: 需要生成${expectedName}，AI返回了${rawProfile.name}`);
    }
    profile = { ...base, ...rawProfile, name: expectedName || rawProfile.name || base.name };
    const fallbackApplied = window.GameModules.characterReasonFallback?.apply?.(profile, attrs) || profile;
    profile = { ...profile, roleCardFieldReasons: fallbackApplied.roleCardFieldReasons, rpgFieldReasons: fallbackApplied.rpgFieldReasons };
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const knowledge = Array.isArray(profile.knowledge) ? profile.knowledge : [];
    const professions = Array.isArray(profile.professions) ? profile.professions : [];
    const confirmedJob = profile.jobConfirmed === true ? window.GameModules.professionInfo.normalizeJobName(profile.job) : '';
    const factions = this.factionRoles(profile, base, store);
    const forcePositions = this.forcePositions(profile, base, store);
    const validated = {
      ...base,
      name: this.validName(profile.name, base),
      gender: String(base.gender || profile.gender || '').slice(0, 8),
      age: this.lockedAge(profile, base),
      worldTag: profile.worldTag || null,
      learningAbility: profile.learningAbility || null,
      mentalStability: profile.mentalStability || null,
      growthPotential: profile.growthPotential || null,
      actionAbility: profile.actionAbility || null,
      control_experience: profile.control_experience || { 上线次数: 0, 习惯程度: '初次操控尚不熟悉' },
      relationships: this.formatRelationships(profile.relationships || base.relationships || '', base),
      role: String(profile.role || base.role).slice(0, 18),
      detail: String(profile.detail || base.detail).slice(0, 160),
      appearance: String(profile.appearance || base.appearance || '外貌尚未固化。').slice(0, 140),
      preferences: String(profile.preferences || base.preferences || '').slice(0, 140),
      personality: String(profile.personality || base.personality).slice(0, 100),
      faction: String(factions[0]?.faction || profile.faction || '无').slice(0, 30),
      factionRole: String(factions[0]?.role || factions[0]?.position || profile.factionRole || profile.role || '').slice(0, 24),
      job: confirmedJob,
      rank: String(forcePositions[0]?.position || profile.rank || '').slice(0, 30),
      factions,
      forcePositions,
      force_positions: forcePositions,
      skills: skills.slice(0, 10).map((skill, index) => {
        const name = String(skill.name || `能力${index + 1}`).slice(0, 16);
        const desc = String(skill.desc || '').slice(0, 60);
        const reason = this.inventoryReason({ ...skill, name, desc }, '技能', { ...base, ...profile });
        const item = { name, desc, reason, changeMode: reason };
        if (skill.level !== undefined) item.level = skill.level;
        if (skill.levelEffects) item.levelEffects = skill.levelEffects;
        item.requiredSkills = Array.isArray(skill.requiredSkills) ? skill.requiredSkills : [];
        item.requiredKnowledge = Array.isArray(skill.requiredKnowledge) ? skill.requiredKnowledge : [];
        item.requiredIntrinsicBase = Array.isArray(skill.requiredIntrinsicBase) ? skill.requiredIntrinsicBase : [];
        return item;
      }),
      knowledge: knowledge.slice(0, 10).map((k, index) => {
        const name = String(k.name || `知识${index + 1}`).slice(0, 16);
        const desc = String(k.desc || '').slice(0, 60);
        const reason = this.inventoryReason({ ...k, name, desc }, '知识', { ...base, ...profile });
        const item = { name, desc, reason, changeMode: reason };
        if (k.level !== undefined) item.level = k.level;
        if (k.levelEffects) item.levelEffects = k.levelEffects;
        item.requiredSkills = Array.isArray(k.requiredSkills) ? k.requiredSkills : [];
        item.requiredKnowledge = Array.isArray(k.requiredKnowledge) ? k.requiredKnowledge : [];
        item.requiredIntrinsicBase = Array.isArray(k.requiredIntrinsicBase) ? k.requiredIntrinsicBase : [];
        return item;
      }),
      professions: professions.slice(0, 10).map((p) => ({
        name: String(p.name || '').slice(0, 24),
        desc: String(p.desc || '').slice(0, 80),
        level: p.level || 1,
        levelEffects: p.levelEffects || {},
        'requiredSkills': Array.isArray(p['requiredSkills']) ? p['requiredSkills'] : [],
        'requiredKnowledge': Array.isArray(p['requiredKnowledge']) ? p['requiredKnowledge'] : [],
        'requiredIntrinsicBase': Array.isArray(p['requiredIntrinsicBase']) ? p['requiredIntrinsicBase'] : [],
        reason: String(p.reason || '').slice(0, 120),
      })),
      rpgField: profile.rpgField || null,
      roleCardFieldReasons: this.roleCardFieldReasons(profile.roleCardFieldReasons, { ...base, ...profile }),
      items: this.carryItems(profile.items || base.items, '物品', { ...base, ...profile }),
      wearing: this.wearingObject(profile.wearing || base.wearing, { ...base, ...profile }),
      bodyProfile: Array.isArray(profile.bodyProfile) ? profile.bodyProfile : [],
      dressedProfile: Array.isArray(profile.dressedProfile) ? profile.dressedProfile : [],
      wearingItems: this.wearingItems(profile.wearing || base.wearing, { ...base, ...profile }),
      wearingRawRows: Array.isArray(profile._csvRows) ? profile._csvRows.filter((row) => String(row || '').startsWith('wearing,')) : [],
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
    return this.lockTargetProfile(profile, { ...base, id: 'player-self', isPlayer: true });
  },

  lockTargetProfile(profile, base) {
    const locked = { ...profile };
    if (base.id) locked.id = base.id;
    if (base.name) locked.name = base.name;
    if (base.isPlayer || base.id === 'player-self') locked.isPlayer = true;
    ['gender', 'age', 'birthday'].forEach((key) => {
      if (base[key] !== undefined && base[key] !== null && String(base[key]).trim()) locked[key] = base[key];
    });
    ['work', 'role', 'job', 'faction', 'workplace', 'position', 'rank'].forEach((key) => {
      if (base[key] !== undefined && base[key] !== null && String(base[key]).trim()) locked[key] = base[key];
    });
    const wrongName = String(profile?.name || '').trim();
    if (base.name && wrongName && wrongName !== base.name) {
      console.warn('[角色卡] AI返回姓名与目标不一致，已强制锁回:', { expected: base.name, actual: wrongName });
      locked.detail = base.detail || locked.detail;
      locked.personality = base.personality || locked.personality;
      locked.appearance = base.appearance || locked.appearance;
      locked.relationships = base.relationships || locked.relationships;
    }
    return locked;
  },

  lockedAge(profile, base) {
    const baseAge = base?.age && typeof base.age === 'object' && base.age.value !== undefined ? base.age.value : base?.age;
    if (baseAge !== undefined && baseAge !== null && String(baseAge).trim()) return baseAge;
    return (profile.age && typeof profile.age === 'object' && profile.age.value !== undefined) ? profile.age.value : (profile.age || '');
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
        id: base.id, name: base.name, work: base.work, role: base.role, gender: base.gender, age: base.age, birthday: base.birthday,
        relationships: base.relationships, nameRule: base.nameRule, detail: base.detail,
        appearance: base.appearance, preferences: base.preferences, personality: base.personality, presetProfilePath: base.presetProfilePath,
        factions: base.factions, forcePositions: base.forcePositions || base.force_positions,
      },
      preset: { path: preset?.path || '', summary: preset?.summary || '' },
      player: {
        name: p.name || store?.playerName, gender: p.gender, birthday: p.birthday, age: p.age,
        city: p.refinedCity || p.city, role: p.refinedRole || p.dailyRole, workplace: p.workplace,
        position: p.position, livingStatus: p.refinedLivingStatus || p.livingStatus,
        parents: p.parentStatus || p.parents, parentDeathCause: p.parentDeathCause,
        relationships: p.relationships, notes: p.notes, worldbuildingNote: p.worldbuildingNote,
        playerCardAiParts: p.playerCardAiParts,
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
    const list = Array.isArray((profile.forcePositions || profile.force_positions)) ? (profile.forcePositions || profile.force_positions) : [];
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

  wearingSlotKeys() {
    return ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist'];
  },

  wearingSlotNames() {
    return this.wearingClothingPositions();
  },

  normalizeWearSlot(slot, item = {}, profile = {}) {
    const source = item && typeof item === 'object' ? item : { name: item };
    const names = this.wearingSlotNames();
    const clothing_position = String(source.clothing_position || source.部位 || names[slot] || slot || '').slice(0, 16);
    const name = String(source.name || source.名称 || '').slice(0, 32);
    const description = String(source.description || source.desc || '').slice(0, 100);
    const reason = String(source.reason || source.changeMode || (name ? this.inventoryReason({ ...source, name, slot }, '穿着', profile) : `${clothing_position || slot}当前没有穿戴物。`)).slice(0, 120);
    return { clothing_position, name, description, reason };
  },

  canonicalWearSlot(itemOrSlot) {
    const p = window.GameModules.progression;
    if (p?.canonicalWearSlot) return p.canonicalWearSlot(itemOrSlot);
    const item = typeof itemOrSlot === 'object' && itemOrSlot ? itemOrSlot : { slot: itemOrSlot };
    const slot = String(item.slot || '').trim();
    const text = `${slot}${item.clothing_position || ''}${item.slotLabel || ''}${item.name || ''}${item.description || ''}`;
    const exact = { 头部: 'head', 颈部: 'neck', 上衣: 'top', 外套: 'outerwear', 手套: 'gloves', 腰部: 'waist', 下衣: 'bottom', 下装: 'bottom', 袜子: 'socks', 鞋子: 'shoes', 手腕: 'wrist' }[slot];
    if (exact || this.wearingSlotKeys().includes(slot)) return exact || slot;
    if (slot === '内裤') return 'innerwearBottom';
    if (slot === '内衣') return /内裤|底裤|三角裤|四角裤/.test(text) ? 'innerwearBottom' : 'innerwearTop';
    return slot;
  },

  wearingObject(value, profile = {}) {
    const template = window.GameModules.characterProfileTemplateClass?.wearingObject?.() || {};
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const fromArray = Array.isArray(value) ? Object.fromEntries(value.map((item) => [this.canonicalWearSlot(item), item]).filter(([slot]) => slot)) : {};
    const out = {};
    this.wearingSlotKeys().forEach((slot) => {
      out[slot] = this.normalizeWearSlot(slot, source[slot] || fromArray[slot] || template[slot], profile);
    });
    const custom = Array.isArray(source.slot) ? source.slot : [];
    const arrayCustom = Array.isArray(value) ? value.filter((item) => {
      const slot = this.canonicalWearSlot(item);
      return item?.slot && slot && !this.wearingSlotKeys().includes(slot);
    }) : [];
    out.slot = [...custom, ...arrayCustom].map((item) => {
      const slot = String(this.canonicalWearSlot(item) || item?.slot || '自定义').slice(0, 16);
      return { slot, ...this.normalizeWearSlot(slot, item, profile) };
    }).filter((item) => item.name).slice(0, 20);
    return out;
  },

  wearingAsArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') {
      const text = String(value || '').trim();
      return text ? [{ slot: '穿着', name: text }] : [];
    }
    const fixed = this.wearingSlotKeys().map((slot) => {
      const item = value[slot];
      if (!item || typeof item !== 'object') return null;
      return { ...item, slot, slotLabel: this.wearingSlotNames()[slot] || slot };
    });
    const custom = Array.isArray(value.slot) ? value.slot : [];
    return [...fixed, ...custom].filter(Boolean);
  },

  wearingItemsLoose(value) {
    const list = this.wearingAsArray(value);
    return list.map((item) => {
      const name = String(item?.name || '未穿戴').slice(0, 32);
      const slot = String(this.canonicalWearSlot(item) || item?.slot || '').slice(0, 24);
      const clothing_position = String(item?.clothing_position || item?.部位 || this.wearingSlotNames()[slot] || '').slice(0, 12);
      return { slot, clothing_position, name, type: '穿着', description: String(item?.description || '').slice(0, 80), reason: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), changeMode: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), source: item?.source, level: -1 };
    }).filter((item) => item.slot).slice(0, 24);
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
      const reason = item.name === '未穿戴' && String(item.reason || '').trim()
        ? String(item.reason).trim().slice(0, 120)
        : this.inventoryReason(item, '穿着', profile);
      return { ...item, reason, changeMode: reason, source: 'AI生成' };
    });
  },

  worldValues(values, attrs) {
    if (!values || typeof values !== 'object') return {};
    const keys = new Set((attrs.fields || []).map((field) => field.key));
    return Object.fromEntries(Object.entries(values).filter(([key]) => keys.has(key)));
  },

  roleCardFieldKeys() {
    return ['姓名', '所属世界', '身份', '职业', '性别', '生日', '人际关系', '外貌', '喜好', '性格', '人物说明', '社群角色', '势力地位'];
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
    const wearingReason = (wearing) => {
      if (Array.isArray(wearing)) return optionalReason(wearing);
      if (!wearing || typeof wearing !== 'object') return true;
      const fixedOk = this.wearingSlotKeys().every((slot) => String(wearing[slot]?.reason || '').trim());
      const customOk = !Array.isArray(wearing.slot) || wearing.slot.every((item) => String(item?.reason || '').trim());
      return fixedOk && customOk;
    };
    return hasReason(profile?.factions) && hasReason(profile?.forcePositions || profile?.force_positions) && optionalReason(profile?.items) && wearingReason(profile?.wearing) && optionalReason(profile?.wearingItems) && optionalReason(profile?.skills);
  },

  ensureInventoryReasons(profile) {
    const fill = (items, kind) => (Array.isArray(items) ? items.map((item) => {
      const reason = this.inventoryReason(item, kind, profile);
      return { ...item, reason, changeMode: item.changeMode && !this.abstractReason(item.changeMode) && item.changeMode.length < 24 ? item.changeMode : '角色卡初始固化' };
    }) : []);
    const fillWearingObject = (wearing) => {
      const obj = this.wearingObject(wearing, profile);
      const fixed = Object.fromEntries(this.wearingSlotKeys().map((slot) => {
        const item = obj[slot] || {};
        const reason = item.name === '未穿戴' && String(item.reason || '').trim()
          ? String(item.reason).trim().slice(0, 120)
          : (item.name ? this.inventoryReason({ ...item, slot }, '穿着', profile) : (item.reason || `${item.clothing_position || slot}当前没有穿戴物。`));
        return [slot, { ...item, reason }];
      }));
      fixed.slot = (Array.isArray(obj.slot) ? obj.slot : []).map((item) => ({ ...item, reason: this.inventoryReason(item, '穿着', profile) }));
      return fixed;
    };
    const forcePositions = fill((profile.forcePositions || profile.force_positions), '势力地位');
    const wearing = fillWearingObject(profile.wearing);
    const out = {
      ...profile,
      factions: fill(profile.factions, '社群角色'),
      forcePositions,
      force_positions: forcePositions,
      items: fill(profile.items, '物品'),
      wearing,
      wearingItems: fill(profile.wearingItems || this.wearingAsArray(wearing), '穿着').map((item) => ({ ...item, changeMode: item.reason || item.changeMode, source: item.source || 'AI生成' })),
      skills: fill(profile.skills, '技能'),
    };
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
    return this.rpgFieldReasonKeys(attrs).every((key) => this.validRpgReasonText(value[key]));
  },

  validRpgReasonText(text) {
    const value = String(text || '').trim();
    return Boolean(value) && !/^[-+]?\d+(?:\.\d+)?$/.test(value) && value.length >= 8;
  },

  cleanRpgFieldReasons(value, attrs = null) {
    return this.requireRpgFieldReasons({ rpgFieldReasons: value, worldAttributes: attrs }, attrs, '个人资料');
  },

  requireRpgFieldReasons(profile, attrs = null, label = '个人资料') {
    const finalAttrs = attrs || profile?.worldAttributes || null;
    const keys = this.rpgFieldReasonKeys(finalAttrs);
    const reasons = profile?.rpgFieldReasons || {};
    const fallback = window.GameModules.characterReasonFallback?.rpgReasons?.(profile, finalAttrs) || {};
    const missing = keys.filter((key) => !String(reasons[key] || fallback[key] || '').trim());
    if (missing.length) throw new Error(`${label} 缺少AI给出的RPG变化原因: ${missing.join('、')}`);
    return Object.fromEntries(keys.map((key) => {
      const current = String(reasons[key] || '').trim();
      const safe = this.validRpgReasonText(current) ? current : String(fallback[key] || '').trim();
      return [key, safe.slice(0, 120)];
    }));
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
      const list = this.metricGroupAsArray(items, keys);
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
    const dropped = [];
    const formatted = parts.map((part) => {
      const pair = part.split(/[：:]/);
      const rel = String(pair[0] || '').replace(/[，。,.].*$/, '').trim();
      const name = String(pair[1] || '').replace(/[，。；;、,.].*$/, '').trim();
      if (self && name === self) {
        dropped.push(`${rel}：${name}`);
        return '';
      }
      const invalid = /同居|喜欢|倾向|关系|需要|生成|资料|补全|未知|待/.test(name) || name.length > 12;
      return rel && name && !invalid ? `${rel}：${name}` : '';
    }).filter(Boolean).join('；');
    if (dropped.length) console.debug('[角色卡] 已移除指向当前角色本人的关系项:', { name: self, dropped });
    return formatted;
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
