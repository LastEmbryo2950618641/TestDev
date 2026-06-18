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
    if (existing && this.isReusableRoleCard(existing.profile, signature)) {
      store?.finishRoleCardLoading?.(base.id, existing.profile);
      return existing.profile;
    }
    const lore = await window.GameModules.worldLore.ensure(base.work, context);
    const attrs = await window.GameModules.rpgState.ensureWorldAttributes(base.work);
    return this.generate(base, lore, attrs, context, store, signature, source.preset);
  },

  onProgress(store, id, stepKey, status, text = '') {
    store?.updateRoleCardLoadingStep?.(id, stepKey, status, text);
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
      personality: String(data.personality || '谨慎观察局势。').slice(0, 80),
      age: (data.age && typeof data.age === 'object' && data.age.value !== undefined ? data.age.value : data.age) || (String(`${data.role || ''} ${data.relationships || ''} ${data.detail || data.desc || preset?.summary || ''}`).match(/(\d{1,3})\s*岁/)?.[1] || ''),
      birthday: String(data.birthday || '').slice(0, 20),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 4).map(String) : [],
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 4) : [],
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
        玩家本人目标锁定: base.id === 'player-self' ? `本次只生成玩家本人"${base.name}"的角色卡。JSON 根字段 name 必须写"${base.name}"，不得写妹妹、姐姐、父母、联系人或关系事件里的任何其他姓名。` : '无。',
      };
      const loadingId = base.id;
      this.onProgress(store, loadingId, 'profile', 'running');
      const part1 = await this.generatePart(1, 'character-profile-part1-base-identity', commonVars, templates[1], base, lore, attrs, store);
      this.onProgress(store, loadingId, 'profile', 'done');
      store?.updateRoleCardLoading?.(loadingId, { name: part1.name || base.name, status: 'running' });
      const p1Summary = this.part1Summary(part1);
      this.onProgress(store, loadingId, 'emotions', 'running');
      const part2 = await this.generatePart(2, 'character-profile-part2-feeling', { ...commonVars, part1Summary: p1Summary }, templates[2], base, lore, attrs, store);
      this.onProgress(store, loadingId, 'emotions', 'done');
      this.onProgress(store, loadingId, 'playerFeelings', 'running');
      const part3 = await this.generatePart(3, 'character-profile-part3-player-feelings', { ...commonVars, part1Summary: p1Summary }, templates[3], base, lore, attrs, store);
      this.onProgress(store, loadingId, 'playerFeelings', 'done');
      this.onProgress(store, loadingId, 'abilities', 'running');
      const part4 = await this.generatePart(4, 'character-profile-part4-abilities-professions', { ...commonVars, part1Summary: p1Summary }, templates[4], base, lore, attrs, store);
      this.onProgress(store, loadingId, 'abilities', 'done');
      const rpgKeys = this.rpgFieldReasonKeys(attrs);
      this.onProgress(store, loadingId, 'inventory', 'running');
      const part5 = await this.generatePart(5, 'character-profile-part5-inventory-wearing-rpg', { ...commonVars, part1Summary: p1Summary, RPG字段列表: rpgKeys.join('、'), RPG字段列表JSON: rpgKeys.map((key) => `"${key}"`).join(', ') }, templates[5], base, lore, attrs, store);
      this.onProgress(store, loadingId, 'inventory', 'done');
      const merged = this.mergeGeneratedParts(part1, part2, part3, part4, part5, attrs);
      const profile = this.validate(merged, base, lore, attrs, store, { skipInitialMetrics: false });
      return this.withSignature(profile, signature);
    } catch (err) {
      store?.failRoleCardLoading?.(base.id, err.message || '生成失败');
      console.warn('人物设定生成失败:', err.code, err.message, err.stack);
      throw err;
    }
  },

  async loadPartTemplates() {
    if (this.partTemplateCache) return this.partTemplateCache;
    const templates = window.GameModules.characterProfileTemplateClass?.parts?.();
    if (!templates?.[1] || !templates?.[2] || !templates?.[3] || !templates?.[4] || !templates?.[5]) throw new Error('角色卡模板类未加载，无法生成五段角色卡。');
    this.partTemplateCache = templates;
    return templates;
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
      parse: (text) => this.parse(text),
      max: 2,
    });
    let normalized = this.sanitizePart(partIndex, raw, template);
    normalized = await this.completeMissingPart(partIndex, normalized, template, format, base, lore, attrs, store);
    return this.validatePart(partIndex, normalized, base, lore, attrs, store, template);
  },

  partRequiredRawFields(partIndex, fields = null) {
    const byPart = {
      1: ['name', 'worldTag', 'age', 'gender', 'factions', 'forcePositions'],
      2: ['name', 'feeling', 'emotions', 'cold', 'curiosity', 'despair'],
      3: ['name', 'feeling', 'playerFeelings', 'understanding', 'respect', 'submission'],
      4: ['name', 'skills', 'knowledge', 'professions'],
      5: ['name', 'items', 'wearing', 'rpgField', 'head', 'top', 'bottom', 'shoes', 'slot'],
    };
    if (!fields) return byPart[partIndex] || [];
    const nested = [];
    if (fields.includes('feeling')) nested.push('feeling', 'emotions', 'playerFeelings', 'cold', 'curiosity', 'understanding', 'submission');
    if (fields.includes('wearing')) nested.push('wearing', 'head', 'top', 'bottom', 'shoes', 'slot');
    if (fields.includes('rpgField')) nested.push('rpgField', 'intrinsicBase', 'derived');
    return [...new Set([...fields, ...nested])];
  },

  partPromptWithTemplate(prompt, template, partIndex) {
    return [
      prompt,
      '',
      '## MD角色卡模板字段骨架',
      '下方模板由 MD 文档结构生成，本次输出必须严格遵守这些字段名、嵌套结构和数组元素字段。',
      '模板中不存在的字段不要输出；不要把旧版 force_positions、数组式 feeling 或数组式 wearing 写回角色卡。',
      `Part${partIndex} 模板：`,
      '```json',
      JSON.stringify(template, null, 2),
      '```',
    ].join('\n');
  },

  sanitizePart(partIndex, raw, template) {
    const clean = this.sanitizeByTemplate(raw, template);
    if ((partIndex === 2 || partIndex === 3) && clean.feeling) {
      clean.feeling = this.normalizeFeelingObject(clean.feeling);
      if (partIndex === 2) delete clean.feeling.playerFeelings;
      if (partIndex === 3) delete clean.feeling.emotions;
    }
    if (partIndex === 1 && clean.initialMetrics) {
      clean.initialMetrics = this.sanitizeInitialMetrics(clean.initialMetrics);
    }
    return clean;
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
    }]));
    return { emotions: toObject(value.emotions, metric.emotionKeys), playerFeelings: toObject(value.playerFeelings, metric.playerKeys) };
  },

  metricGroupAsArray(value, keys) {
    if (Array.isArray(value)) return keys.map((key) => {
      const item = value.find((entry) => entry?.key === key || entry?.name === key) || {};
      return { key, value: item.value, status: item.status, reason: item.reason };
    });
    const source = value && typeof value === 'object' ? value : {};
    return keys.map((key) => {
      const item = source[key] || Object.values(source).find((entry) => entry?.name === key) || {};
      return { key, value: item.value, status: item.status, reason: item.reason };
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
    if (partIndex === 1 && ['relationships', 'role', 'detail', 'appearance', 'personality', 'rank'].includes(key)) return typeof value === 'string' && String(value).trim();
    if (partIndex === 1 && key === 'jobConfirmed') return typeof value === 'boolean';
    if (partIndex === 1 && key === 'control_experience') return value && typeof value === 'object' && Number.isInteger(Number(value.上线次数)) && typeof value.习惯程度 === 'string';
    if (partIndex === 1 && key === 'factions') return this.arrayItemsComplete(value, ['faction', 'role', 'reason'], false);
    if (partIndex === 1 && key === 'forcePositions') return this.arrayItemsComplete(value, ['force', 'position', 'reason'], false);
    if (partIndex === 1 && key === 'initialMetrics') return this.initialMetricsComplete(value);
    if (partIndex === 2 && key === 'feeling') return this.feelingGroupComplete(value, 'emotions');
    if (partIndex === 3 && key === 'feeling') return this.feelingGroupComplete(value, 'playerFeelings');
    if (partIndex === 4 && ['skills', 'knowledge'].includes(key)) return this.arrayItemsComplete(value, ['name', 'desc', 'level', 'levelEffects', 'reason'], false, (item) => this.learnedItemComplete(item));
    if (partIndex === 4 && key === 'professions') return this.arrayItemsComplete(value, ['name', 'desc', 'level', 'levelEffects', '所需skills', '所需knowledge', '所需intrinsicBase', 'reason'], true, (item) => this.learnedItemComplete(item) && ['所需skills', '所需knowledge', '所需intrinsicBase'].every((field) => Array.isArray(item[field])));
    if (partIndex === 5 && key === 'items') return this.arrayItemsComplete(value, ['name', 'description', 'quantity', 'reason'], true, (item) => Number.isInteger(Number(item.quantity)) && Number(item.quantity) >= 1);
    if (partIndex === 5 && key === 'wearing') return this.wearingObjectComplete(value);
    if (partIndex === 5 && key === 'rpgField') return this.rpgFieldComplete(value);
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
    const completeItem = (item, allowEmptyName = true) => item && typeof item === 'object' && String(item.bodyPart || '').trim() && String(item.reason || '').trim() && (allowEmptyName || String(item.name || '').trim()) && Object.prototype.hasOwnProperty.call(item, 'description');
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
      && keys.every((key) => this.intrinsicBaseItemComplete(value.intrinsicBase?.[key]))
      && ['攻击力', '防御力'].every((key) => this.valueReasonComplete(value.derived?.[key]));
  },

  async completeMissingPart(partIndex, data, template, format, base, lore, attrs, store) {
    let current = data;
    for (let i = 0; i < 2; i += 1) {
      let missing = this.missingPartFields(partIndex, current, template, base, attrs);
      if (!missing.length) return current;
      if ((partIndex === 2 || partIndex === 3) && missing.includes('feeling')) {
        const feeling = await this.generatePartFeeling(current, base, lore, attrs, format, store, partIndex === 2 ? 'emotions' : 'playerFeelings');
        current = this.sanitizePart(partIndex, { ...current, feeling }, template);
        missing = this.missingPartFields(partIndex, current, template, base, attrs);
        if (!missing.length) return current;
      }
      const patch = await this.generateMissingPartFields(partIndex, current, template, missing, format, base);
      current = this.sanitizePart(partIndex, { ...current, ...patch }, template);
    }
    const stillMissing = this.missingPartFields(partIndex, current, template, base, attrs);
    if (stillMissing.length) throw new Error(`Part${partIndex} 缺少字段：${stillMissing.join('、')}`);
    return current;
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

  async generateMissingPartFields(partIndex, current, template, missing, format, base) {
    const partialTemplate = Object.fromEntries(missing.map((key) => [key, template[key]]));
    const prompt = [
      `你正在修复角色卡 Part${partIndex}。目标人物只能是：${base.name}。`,
      `只生成缺失字段：${missing.join('、')}。其余字段已经合格，禁止重复输出、禁止改动。`,
      '输出必须是一个 JSON 对象，根字段只能包含上述缺失字段，并严格遵守下面模板。',
      '缺失字段模板：',
      JSON.stringify(partialTemplate, null, 2),
      '已合格字段（只作上下文，不要重写）：',
      JSON.stringify(current, null, 2),
      '原始要求：',
      String(format || '').slice(0, 2600),
    ].join('\n');
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source: `character-profile-part${partIndex}-missing`,
      model: 'nalang-turbo-0826',
      timeoutMs: 60000,
      prompt,
      format: prompt,
      repairHint: `只能返回缺失字段：${missing.join('、')}。不能新增其它字段。`,
      requiredRawFields: this.partRequiredRawFields(partIndex, missing),
      parse: (text) => this.parse(text),
      validate: (raw) => {
        const clean = this.sanitizeByTemplate(raw, partialTemplate);
        const extra = Object.keys(raw || {}).filter((key) => !missing.includes(key));
        if (extra.length) throw new Error(`缺失字段修复输出了多余字段：${extra.join('、')}`);
        const absent = this.missingPartFields(partIndex, { ...current, ...clean }, template, base).filter((key) => missing.includes(key));
        if (absent.length) throw new Error(`缺失字段仍未补齐：${absent.join('、')}`);
        return clean;
      },
      max: 2,
    });
  },

  mergeGeneratedParts(part1, part2, part3, part4, part5, attrs) {
    const feeling = { emotions: part2.feeling?.emotions, playerFeelings: part3.feeling?.playerFeelings };
    const merged = { ...part1, ...part4, ...part5, initialMetrics: this.sanitizeInitialMetrics(feeling) };
    merged.forcePositions = part1.forcePositions || part1.force_positions || [];
    merged.roleCardFieldReasons = this.roleReasonsFromParts(merged);
    merged.rpgFieldReasons = this.rpgReasonsFromPart5(merged, attrs);
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
      性格: profile.personality || '性格来自 Part1 personality。',
      人物说明: profile.detail || '人物说明来自 Part1 detail。',
      社群角色: factionText || '社群角色来自 Part1 factions。',
      势力地位: forceText || '势力地位来自 Part1 forcePositions。'
    };
  },

  rpgReasonsFromPart5(profile = {}, attrs = null) {
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
    return Object.fromEntries(this.rpgFieldReasonKeys(attrs).map((key) => [key, String(direct[key] || fallback[key] || `${profile.name || '该人物'}的${key}来自 Part1/Part5 固化资料。`).slice(0, 120)]));
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(text);
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
    const raw = String(text || '').replace(/```(?:txt|json)?|```/g, '').trim();
    const rows = raw.split(/\n+/).map((row) => row.trim()).filter(Boolean);
    const items = [];
    keys.forEach((key) => {
      const line = rows.find((row) => row.startsWith(`${key},`));
      if (!line) return;
      const parts = line.split(',').map((part) => part.trim());
      if (parts.length < 4 || parts[0] !== key) return;
      const value = Number(parts[1]);
      if (!Number.isFinite(value)) return;
      const status = parts[2] || '';
      const reason = parts.slice(3).join('，') || '';
      items.push({ key, value, status, reason, metricSources: this.metricSourceMap?.('ai') });
    });
    return { [group]: items };
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

  partRepairHint(partIndex, base, attrs = null) {
    const nameHint = `目标人物只能是：${base.name}。name 必须逐字等于"${base.name}"，不要同音改字。`;
    if (partIndex === 1) {
      return [
        nameHint,
        '必须返回根字段 worldTag（含 value 和 reason）、age（含 value 和 reason）。',
        '必须返回根字段 learningAbility、mentalStability、growthPotential、actionAbility（各含 value 和 reason）。',
        '必须返回根字段 factions 和 forcePositions（数组，每项含 reason）。',
        '本轮不要返回 feeling/skills/knowledge/professions/items/wearing/rpgField/rpgFieldReasons。',
      ].join('\n');
    }
    if (partIndex === 2) {
      return [
        nameHint,
        '必须返回根字段 feeling，且只包含 emotions（12项对象），不要返回 playerFeelings。',
        'emotions 中每个字段必须包含 name、value（0-100整数）、status、reason 四个子字段。',
        'emotions 的 value 不得全部为 0，必须根据人物性格、处境和关系证据给出合理数值。',
      ].join('\n');
    }
    if (partIndex === 3) {
      return [
        nameHint,
        '必须返回根字段 feeling，且只包含 playerFeelings（17项对象），不要返回 emotions。',
        'playerFeelings 中每个字段必须包含 name、value（0-100整数）、status、reason 四个子字段。',
        'playerFeelings 的 value 必须根据玩家资料、人物关系和剧情事件给出合理数值。',
      ].join('\n');
    }
    if (partIndex === 4) {
      return [
        nameHint,
        '必须返回根字段 skills（数组，至少1项）和 knowledge（数组，至少1项）。',
        '每项必须包含 name、desc、level、levelEffects、reason。',
        'levelEffects 必须是对象格式，包含 lv1 到当前等级，每级含 程度介绍 和 说明。',
        '如需返回 professions，每项必须包含 name、desc、level、levelEffects、所需skills、所需knowledge、所需intrinsicBase、reason。',
      ].join('\n');
    }
    return [
      nameHint,
      '必须返回根字段 rpgField，含 level、intrinsicBase（7项，每项含 value/description/reason）、derived（攻击力/防御力）。',
      'intrinsicBase 每项的 description 必须根据该属性含义和数值段描写对应表现。',
      '必须返回根字段 wearing（对象，含 head/neck/innerwearTop/top/outerwear/gloves/waist/innerwearBottom/bottom/socks/shoes/wrist 共12个固定槽位和 slot 数组）。',
      'wearing 每项必须包含 bodyPart、name、description、reason；未穿戴时 name/description 填空字符串、reason 写明原因。',
      'items 每项必须包含 name、description、quantity、reason。',
    ].join('\n');
  },

  validatePart(partIndex, raw, base, lore, attrs, store, template = null) {
    if (!raw || typeof raw !== 'object') throw new Error('AI 输出不是合法对象');
    if (template) {
      const extra = Object.keys(raw).filter((key) => !Object.prototype.hasOwnProperty.call(template, key));
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
      return raw;
    }
    if (partIndex === 3) {
      if (!this.feelingGroupComplete(raw.feeling, 'playerFeelings')) throw new Error('Part3 playerFeelings 字段不完整');
      return raw;
    }
    if (partIndex === 4) {
      if (!Array.isArray(raw.skills) || !raw.skills.length) throw new Error('Part4 缺少 skills');
      if (!Array.isArray(raw.knowledge) || !raw.knowledge.length) throw new Error('Part4 缺少 knowledge');
      return raw;
    }
    if (!this.rpgFieldComplete(raw.rpgField)) throw new Error('Part5 缺少 rpgField 完整结构');
    if (!this.wearingObjectComplete(raw.wearing)) throw new Error('Part5 缺少 wearing 完整结构');
    return raw;
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
    const knowledge = Array.isArray(profile.knowledge) ? profile.knowledge : [];
    const professions = Array.isArray(profile.professions) ? profile.professions : [];
    const confirmedJob = profile.jobConfirmed === true ? window.GameModules.professionInfo.normalizeJobName(profile.job) : '';
    const factions = this.factionRoles(profile, base, store);
    const forcePositions = this.forcePositions(profile, base, store);
    const validated = {
      ...base,
      name: base.id === 'player-self' ? base.name : this.validName(profile.name, base),
      gender: String(base.gender || profile.gender || '').slice(0, 8),
      age: (profile.age && typeof profile.age === 'object' && profile.age.value !== undefined) ? profile.age.value : (base.age || profile.age || ''),
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
      personality: String(profile.personality || base.personality).slice(0, 100),
      faction: String(factions[0]?.faction || profile.faction || '无').slice(0, 30),
      factionRole: String(factions[0]?.role || factions[0]?.position || profile.factionRole || profile.role || '').slice(0, 24),
      job: confirmedJob,
      rank: String(forcePositions[0]?.position || profile.rank || '').slice(0, 30),
      factions,
      forcePositions,
      force_positions: forcePositions,
      skills: skills.slice(0, 4).map((skill, index) => {
        const name = String(skill.name || `能力${index + 1}`).slice(0, 16);
        const desc = String(skill.desc || '').slice(0, 60);
        const reason = this.inventoryReason({ ...skill, name, desc }, '技能', { ...base, ...profile });
        const item = { name, desc, reason, changeMode: reason };
        if (skill.level !== undefined) item.level = skill.level;
        if (skill.levelEffects) item.levelEffects = skill.levelEffects;
        return item;
      }),
      knowledge: knowledge.slice(0, 5).map((k, index) => {
        const name = String(k.name || `知识${index + 1}`).slice(0, 16);
        const desc = String(k.desc || '').slice(0, 60);
        const reason = this.inventoryReason({ ...k, name, desc }, '知识', { ...base, ...profile });
        const item = { name, desc, reason, changeMode: reason };
        if (k.level !== undefined) item.level = k.level;
        if (k.levelEffects) item.levelEffects = k.levelEffects;
        return item;
      }),
      professions: professions.slice(0, 3).map((p) => ({
        name: String(p.name || '').slice(0, 24),
        desc: String(p.desc || '').slice(0, 80),
        level: p.level || 1,
        levelEffects: p.levelEffects || {},
        '所需skills': Array.isArray(p['所需skills']) ? p['所需skills'] : [],
        '所需knowledge': Array.isArray(p['所需knowledge']) ? p['所需knowledge'] : [],
        '所需intrinsicBase': Array.isArray(p['所需intrinsicBase']) ? p['所需intrinsicBase'] : [],
        reason: String(p.reason || '').slice(0, 120),
      })),
      rpgField: profile.rpgField || null,
      roleCardFieldReasons: this.roleCardFieldReasons(profile.roleCardFieldReasons, { ...base, ...profile }),
      items: this.carryItems(profile.items || base.items, '物品', { ...base, ...profile }),
      wearing: this.wearingObject(profile.wearing || base.wearing, { ...base, ...profile }),
      wearingItems: this.wearingItems(profile.wearing || base.wearing, { ...base, ...profile }),
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
    return { head: '头部', neck: '颈部', innerwearTop: '内衣', top: '上衣', outerwear: '外套', gloves: '手套', waist: '腰部', innerwearBottom: '内裤', bottom: '下衣', socks: '袜子', shoes: '鞋子', wrist: '手腕' };
  },

  normalizeWearSlot(slot, item = {}, profile = {}) {
    const source = item && typeof item === 'object' ? item : { name: item };
    const names = this.wearingSlotNames();
    const bodyPart = String(source.bodyPart || source.部位 || names[slot] || slot || '').slice(0, 16);
    const name = String(source.name || source.名称 || '').slice(0, 32);
    const description = String(source.description || source.desc || '').slice(0, 100);
    const reason = String(source.reason || source.changeMode || (name ? this.inventoryReason({ ...source, name, slot }, '穿着', profile) : `${bodyPart || slot}当前没有穿戴物。`)).slice(0, 120);
    return { bodyPart, name, description, reason };
  },

  wearingObject(value, profile = {}) {
    const template = window.GameModules.characterProfileTemplateClass?.wearingObject?.() || {};
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const fromArray = Array.isArray(value) ? Object.fromEntries(value.map((item) => [item?.slot, item]).filter(([slot]) => slot)) : {};
    const out = {};
    this.wearingSlotKeys().forEach((slot) => {
      out[slot] = this.normalizeWearSlot(slot, source[slot] || fromArray[slot] || template[slot], profile);
    });
    const custom = Array.isArray(source.slot) ? source.slot : [];
    const arrayCustom = Array.isArray(value) ? value.filter((item) => item?.slot && !this.wearingSlotKeys().includes(item.slot)) : [];
    out.slot = [...custom, ...arrayCustom].map((item) => {
      const slot = String(item?.slot || '自定义').slice(0, 16);
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
      return { ...item, slot: this.wearingSlotNames()[slot] || slot };
    });
    const custom = Array.isArray(value.slot) ? value.slot : [];
    return [...fixed, ...custom].filter(Boolean);
  },

  wearingItemsLoose(value) {
    const list = this.wearingAsArray(value);
    return list.map((item) => {
      const name = String(item?.name || '未穿戴').slice(0, 32);
      const slot = String(item?.slot || '').slice(0, 12);
      const bodyPart = String(item?.bodyPart || item?.部位 || '').slice(0, 12);
      return { slot, bodyPart, name, type: '穿着', description: String(item?.description || '').slice(0, 80), reason: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), changeMode: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), level: -1 };
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
        const reason = item.name ? this.inventoryReason({ ...item, slot }, '穿着', profile) : (item.reason || `${item.bodyPart || slot}当前没有穿戴物。`);
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
      wearingItems: fill(profile.wearingItems || this.wearingAsArray(wearing), '穿着'),
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
