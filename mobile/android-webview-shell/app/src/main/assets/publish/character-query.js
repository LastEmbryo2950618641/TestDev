window.GameModules = window.GameModules || {};

window.GameModules.characterQuery = {
  worldOf(store = null, params = {}) {
    return this.normalizeWorldTag(store?.currentWorldTag?.() || params.worldTag || params.world || params.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界');
  },

  normalizeWorldTag(value = '') {
    const text = String(value || '').trim().slice(0, 40);
    if (!text) return '';
    if (this.isRealWorldTag(text)) return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    return text;
  },

  isRealWorldTag(value = '') {
    const text = String(value || '').trim();
    return text === '现实世界' || text === '现代都市现实世界' || text === '2026 现代都市现实世界' || text === window.GameModules.realWorld2026?.label;
  },

  worldMatches(a = '', b = '') {
    const left = this.normalizeWorldTag(a);
    const right = this.normalizeWorldTag(b);
    return !left || !right || left === right;
  },

  stateNameMatches(state = {}, key = '') {
    const profile = state?.profile || {};
    return state?.name === key || profile.name === key || state?.id === key || profile.id === key;
  },

  stateByName(store = null, name = '', worldTag = '') {
    const key = String(name || '').trim();
    if (!key) return null;
    const stateStore = window.GameModules.characterStateStore;
    const exact = stateStore?.getByName?.(key, worldTag);
    if (exact) return exact;
    return [...Object.values(store?.rpgStates || {}), ...(stateStore?.list?.() || [])].find((state) => {
      const profile = state?.profile || {};
      return this.stateNameMatches(state, key) && this.worldMatches(worldTag, state?.worldTag || profile.work);
    }) || null;
  },

  introByName(name = '', worldTag = '') {
    const key = String(name || '').trim();
    if (!key) return null;
    const introStore = window.GameModules.characterIntroStore;
    return introStore?.get?.(key, worldTag)
      || (introStore?.list?.() || []).find((card) => card?.name === key && this.worldMatches(worldTag, card.worldTag || card.work))
      || null;
  },

  query(store = null, method = '', params = {}) {
    if (method === 'listKnownCharacters') return this.listKnownCharacters(store, params);
    return this.searchCharacter(store, params);
  },

  searchCharacter(store = null, params = {}) {
    const name = String(params.name || params.keyword || params.characterName || '').trim();
    const worldTag = this.worldOf(store, params);
    const maxChars = Number(params.maxChars) || 3200;
    if (!name) return '未提供角色名，无法查询角色资料。';
    const state = this.stateByName(store, name, worldTag);
    if (state) return this.stateText(state, worldTag, maxChars);
    const intro = this.introByName(name, worldTag);
    if (intro) return this.introText(intro, maxChars);
    return `未找到角色资料：${name}｜世界：${worldTag}。若正文确认该人物存在，请在结算 JSON 的 appearedCharacters 写入 name、role、intro、work；若值得手动固化，同时写入 solidifiableCharacters。`;
  },

  listKnownCharacters(store = null, params = {}) {
    const worldTag = this.worldOf(store, params);
    const states = (window.GameModules.characterStateStore?.list?.() || []).filter((state) => this.worldMatches(worldTag, state.worldTag || state.profile?.work));
    const intros = (window.GameModules.characterIntroStore?.list?.() || []).filter((card) => this.worldMatches(worldTag, card.worldTag || card.work));
    const rows = [
      ...states.slice(0, 12).map((state) => `角色卡｜${state.name || state.profile?.name || state.id}｜${state.worldTag || worldTag}｜${state.profile?.role || state.profile?.detail || '完整资料已固化'}`),
      ...intros.slice(0, 12).map((card) => `介绍卡｜${card.name}｜${card.worldTag || worldTag}｜${card.role || ''}｜${card.intro || ''}`),
    ];
    return rows.join('\n') || `世界 ${worldTag} 暂无角色卡或介绍卡。`;
  },

  limit(text = '', max = 3200) {
    return String(text || '').trim().slice(0, Math.max(200, Number(max) || 3200));
  },

  line(label, value) {
    const text = this.valueText(value);
    return text ? `${label}：${text}` : '';
  },

  valueText(value) {
    if (value === undefined || value === null || value === '') return '';
    if (Array.isArray(value)) return this.listText(value);
    if (typeof value !== 'object') return String(value);
    if (value.name && (value.current !== undefined || value.max !== undefined)) return `${value.name}:${value.current ?? ''}/${value.max ?? ''}`;
    if (value.name && (value.level || value.type)) return `${value.name}${value.level ? ` lv.${value.level}` : ''}${value.type ? `（${value.type}）` : ''}`;
    if (Object.prototype.hasOwnProperty.call(value, 'current')) return `${value.current}/${value.max ?? 'max'}`;
    if (Object.prototype.hasOwnProperty.call(value, 'onlineCount')) return `上线${value.onlineCount || 0}次｜${value.feeling || '未知'}｜适应${value.adaptation || 0}/100｜${value.summary || ''}`;
    if (Object.values(value).some((item) => item?.partKey && item?.status)) return Object.values(value).filter((item) => item?.partKey || item?.part || item?.name).map((item) => `${item.part || item.name || item.partKey}：${item.status || item.summary || '稳定'}`).join('；');
    return JSON.stringify(value);
  },

  listText(list, limit = 8) {
    const rows = Array.isArray(list) ? list : (list ? [list] : []);
    return rows.map((item) => {
      if (!item || typeof item !== 'object') return String(item || '').trim();
      const name = item.slot ? `${item.slot}:${item.name || '未穿戴'}` : (item.name || item.title || item.faction || item.force || item.position || item.role || item.key || '条目');
      const extra = [item.type, item.level ? `lv.${item.level}` : '', item.role, item.position, item.summary || item.desc || item.description || item.reason].filter(Boolean).join('｜');
      return extra ? `${name}（${extra}）` : String(name || '').trim();
    }).filter(Boolean).slice(0, limit).join('、');
  },

  locationText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value.currentLocation) return value.currentLocation;
    return [value.name, value.worldTag, value.reason].filter(Boolean).join('｜');
  },

  attributeText(values = {}) {
    const keys = [['level', '等级'], ['strength', '力量'], ['agility', '敏捷'], ['constitution', '体质'], ['intelligence', '智力'], ['perception', '感知'], ['willpower', '意志'], ['charisma', '魅力'], ['health', '生命'], ['stamina', '精力']];
    return keys.map(([key, label]) => values[key] !== undefined ? `${label}${this.valueText(values[key])}` : '').filter(Boolean).join('、');
  },

  bodyText(values = {}) {
    const rows = [];
    if (values.bodyStatus) rows.push(this.valueText(values.bodyStatus));
    if (values.intimacy?.bodyStatus) rows.push(this.valueText(values.intimacy.bodyStatus));
    ['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].forEach((key) => {
      if (values[key]) rows.push(`${key}:${this.valueText(values[key])}`);
    });
    return rows.filter(Boolean).join('；');
  },

  metricText(metrics = {}) {
    return Object.entries(metrics || {}).map(([key, value]) => `${key}${value}`).slice(0, 12).join('、');
  },

  schemaSectionText(state = {}) {
    const values = state.values || {};
    const covered = new Set(['world_tag', 'gender', 'age', 'current_location', 'factions', 'memberships', 'status_tags', 'level', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma', 'health', 'stamina', 'bodyStatus', 'intimacy', 'vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability', 'wearing', 'items', 'skills', 'knowledge', 'control_experience']);
    return (state.schema?.sections || []).map((section) => {
      const rows = (section.fields || []).map((field) => {
        if (!field?.key || covered.has(field.key) || values[field.key] === undefined) return '';
        return `${field.label || field.key}=${this.valueText(values[field.key])}`;
      }).filter(Boolean).slice(0, 8);
      return rows.length ? `${section.title || '状态'}：${rows.join('；')}` : '';
    }).filter(Boolean).join('\n');
  },

  stateText(state = {}, fallbackWorld = '', maxChars = 3200) {
    const profile = state.profile || {};
    const values = state.values || {};
    const metrics = state.metrics || {};
    const rows = [
      `资料类型：完整角色卡`,
      `姓名：${state.name || profile.name || state.id || '未知'}`,
      `角色ID：${state.id || profile.id || state.name || '未知'}`,
      `世界：${state.worldTag || profile.work || fallbackWorld || '未知世界'}`,
      `身份：${profile.role || profile.job || '未知'}`,
      this.line('性别', profile.gender || values.gender),
      this.line('年龄/生日', [values.age ?? profile.age, profile.birthday].filter(Boolean).join(' / ')),
      this.line('职业', profile.job || this.valueText(values.profession || values.professions)),
      this.line('当前地点', this.locationText(values.current_location)),
      this.line('人际关系', profile.relationships),
      this.line('外貌', profile.appearance),
      this.line('性格', profile.personality),
      this.line('喜好', profile.preferences),
      ...(window.GameModules.playerAspirationPreferenceLayers?.toLines?.(profile.essentialPreferenceLayers) || []),
      this.line('人物说明', profile.detail || state.note),
      this.line('社群角色', this.listText(profile.factions || values.factions, 8)),
      this.line('人事归属', this.listText(profile.memberships || values.memberships, 8)),
      this.line('状态标签', this.listText(values.status_tags, 12)),
      this.line('核心属性', this.attributeText(values)),
      this.line('身体状态', this.bodyText(values)),
      this.line('情绪', this.metricText(metrics.emotions)),
      this.line('对玩家感觉', this.metricText(metrics.playerFeelings)),
      this.line('穿着', this.listText(values.wearing || profile.wearingItems || profile.wearing, 12)),
      this.line('物品', this.listText(values.items || profile.items, 12)),
      this.line('技能', this.listText(values.skills || profile.skills, 10)),
      this.line('知识', this.listText(values.knowledge, 8)),
      this.line('上线体验', this.valueText(values.control_experience)),
      this.line('其他身份状态', this.schemaSectionText(state)),
    ].filter(Boolean);
    return this.limit(rows.join('\n'), maxChars);
  },

  introText(card = {}, maxChars = 1600) {
    return this.limit([
      `资料类型：介绍卡`,
      `姓名：${card.name}`,
      `世界：${card.worldTag || card.work || '未知世界'}`,
      `身份：${card.role || '出场人物'}`,
      this.line('介绍', card.intro || card.detail || '暂无介绍。'),
      this.line('性格', card.personality),
      this.line('关系', card.relationships || card.relation),
      this.line('外貌', card.appearance),
    ].filter(Boolean).join('\n'), maxChars);
  },
};
