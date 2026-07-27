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

  introById(id = '') {
    const key = String(id || '').trim();
    if (!key) return null;
    return window.GameModules.characterIntroStore?.getById?.(key) || null;
  },

  stateById(store = null, id = '') {
    const key = String(id || '').trim();
    if (!key) return null;
    return window.GameModules.characterStateStore?.get?.(key, store)
      || store?.rpgStates?.[key]
      || null;
  },

  query(store = null, method = '', params = {}) {
    if (method === 'listKnownCharacters') return this.listKnownCharacters(store, params);
    return this.searchCharacter(store, params);
  },

  searchCharacter(store = null, params = {}) {
    const id = String(params.id || params.characterId || '').trim();
    const name = String(params.name || params.keyword || params.characterName || '').trim();
    const worldTag = this.worldOf(store, params);
    const maxRaw = params.maxChars;
    const maxChars = maxRaw === 0 || maxRaw === '0' ? 0 : (Number(maxRaw) || 0);
    if (!id && !name) return '未提供角色ID或角色名，无法查询角色资料。';

    let state = id ? this.stateById(store, id) : null;
    if (!state && name) state = this.stateByName(store, name, worldTag);
    if (!state && id) state = this.stateByName(store, id, worldTag);

    const complete = state && !window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(state);
    if (complete) return this.stateText(state, worldTag, maxChars);

    const sharedId = state?.id || id || '';
    let intro = sharedId ? this.introById(sharedId) : null;
    if (!intro && name) intro = this.introByName(name, worldTag);
    if (!intro && id) intro = this.introById(id) || this.introByName(id, worldTag);
    if (intro) return this.introText(intro, maxChars || 1600);

    const label = name || id;
    return `未找到角色资料：${label}｜世界：${worldTag}。自然出场请用可区分姓名写入 Stage1 participants 为 姓名(待建卡)，系统会分配共享 ID 并先生成介绍卡（不是完整角色卡）。结算可补 appearedCharacters（name、role、intro、work、presenceKind：individual|group）；solidifiableCharacters 仅标记值得玩家手动升格。禁止无名纯「路人」。`;
  },

  listKnownCharacters(store = null, params = {}) {
    const worldTag = this.worldOf(store, params);
    const introApi = window.GameModules.characterIntroCard;
    const states = (window.GameModules.characterStateStore?.list?.() || []).filter((state) => this.worldMatches(worldTag, state.worldTag || state.profile?.work));
    const intros = (window.GameModules.characterIntroStore?.list?.() || []).filter((card) => this.worldMatches(worldTag, card.worldTag || card.work));
    const completeIds = new Set(
      states.filter((state) => !introApi?.isIncompleteRoleStub?.(state)).map((state) => state.id),
    );
    const rows = [
      ...states.filter((state) => !introApi?.isIncompleteRoleStub?.(state)).slice(0, 12).map((state) => (
        `角色卡｜${state.name || state.profile?.name || state.id}｜ID:${state.id}｜${state.worldTag || worldTag}｜${state.profile?.role || state.profile?.detail || '完整资料已固化'}`
      )),
      ...intros.filter((card) => !completeIds.has(card.id) && !completeIds.has(card.links?.roleCardId)).slice(0, 12).map((card) => (
        `介绍卡｜${card.name}｜ID:${card.id || ''}｜${card.worldTag || worldTag}｜${card.role || ''}｜${card.intro || ''}`
      )),
    ];
    return rows.join('\n') || `世界 ${worldTag} 暂无角色卡或介绍卡。`;
  },

  limit(text = '', max = 3200) {
    const raw = String(text || '').trim();
    const n = Number(max);
    if (!Number.isFinite(n) || n <= 0) return raw;
    return raw.slice(0, Math.max(200, n));
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
    if (Object.prototype.hasOwnProperty.call(value, 'onlineCount')) return `上线${value.onlineCount || 0}次｜${value.feeling || '未知'}｜适应${value.adaptation || 0}/100｜了解:${value.controllerAwareness || '尚不知晓控制者是谁'}｜${value.summary || ''}`;
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
    const covered = new Set(['world_tag', 'gender', 'age', 'factions', 'memberships', 'status_tags', 'level', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma', 'health', 'stamina', 'bodyStatus', 'intimacy', 'vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability', 'wearing', 'items', 'skills', 'knowledge', 'control_experience']);
    return (state.schema?.sections || []).map((section) => {
      const rows = (section.fields || []).map((field) => {
        if (!field?.key || covered.has(field.key) || values[field.key] === undefined) return '';
        return `${field.label || field.key}=${this.valueText(values[field.key])}`;
      }).filter(Boolean).slice(0, 8);
      return rows.length ? `${section.title || '状态'}：${rows.join('；')}` : '';
    }).filter(Boolean).join('\n');
  },

  lifeOrientationLines(profile = {}) {
    const goalApi = window.GameModules.characterGoalSystem;
    const goalSystem = profile?.goalSystem || profile?.lifeOrientation?.goalSystem;
    if (goalSystem && goalApi?.formatText) {
      const text = goalApi.formatText(goalSystem);
      if (text && !/（未填写）[\s\S]*（暂无）/.test(text.replace(/\n/g, ''))) {
        // Always emit structured block when any content exists.
        const has = goalApi.TIER_KEYS.some((key) => goalApi.normalize(goalSystem)[key]?.content)
          || (goalApi.normalize(goalSystem).achievements || []).length;
        if (has) return [text];
      }
    }
    const lo = profile?.lifeOrientation && typeof profile.lifeOrientation === 'object' ? profile.lifeOrientation : null;
    if (!lo) return [];
    const goals = lo.goals || {};
    const rows = [
      this.line('人生总结', lo.portraitSummary || lo.summary),
      this.line('目标摘要', goals.summary),
      this.line('近期目标', typeof goals.short === 'object' ? goals.short.content : goals.short),
      this.line('中期目标', typeof goals.medium === 'object' ? goals.medium.content : goals.medium),
      this.line('长期目标', typeof goals.long === 'object' ? goals.long.content : goals.long),
    ].filter(Boolean);
    if (rows.length) return rows;
    const goalBundle = String(lo.goalSummary || '').trim();
    if (!goalBundle) return [];
    return goalBundle.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).map((line) => (
      /^(?:目标方向|目标摘要|近期方向|中期方向|长期方向|近期目标|中期目标|长期目标)[:：]/u.test(line) ? line : `目标：${line}`
    ));
  },

  stateText(state = {}, fallbackWorld = '', maxChars = 0) {
    const profile = state.profile || {};
    const values = state.values || {};
    const metrics = state.metrics || {};
    const rows = [
      `资料类型：完整角色卡`,
      `姓名：${state.name || profile.name || state.id || '未知'}`,
      `角色ID：${state.id || profile.id || state.name || '未知'}`,
      `世界：${state.worldTag || profile.work || fallbackWorld || '未知世界'}`,
      `人物形态：${window.GameModules.characterSocialDrive?.presenceKindLabel?.(profile.presenceKind) || '具体的一个人'}`,
      `身份：${profile.role || profile.job || '未知'}`,
      this.line('性别', profile.gender || values.gender),
      this.line('年龄/生日', [values.age ?? profile.age, profile.birthday].filter(Boolean).join(' / ')),
      this.line('职业', profile.job || this.valueText(values.profession || values.professions)),
      this.line('当前地点', profile.currentLocation),
      this.line('人际关系', profile.relationships),
      this.line('外貌', profile.appearance),
      this.line('性格', profile.personality),
      this.line('喜好', profile.preferences),
      ...(window.GameModules.playerAspirationPreferenceLayers?.toLines?.(profile.essentialPreferenceLayers) || []),
      ...this.lifeOrientationLines(profile),
      ...this.socialDriveLines(profile.socialDrive),
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

  socialDriveLines(drive = null) {
    if (!drive || typeof drive !== 'object') return [];
    const agenda = drive.agenda || {};
    const reach = Array.isArray(drive.reach) ? drive.reach.join('、') : '';
    return [
      this.line('与主角关系', drive.relationToPlayer),
      this.line('关系说明', drive.relationDetail),
      drive.familiarity != null && drive.familiarity !== '' ? `熟识：${drive.familiarity}` : '',
      this.line('上次沟通', drive.lastContactAt),
      this.line('沟通渠道', drive.lastContactChannel),
      this.line('可达渠道', reach),
      this.line('当前事务', agenda.short),
      this.line('找主角理由', agenda.needPlayer ? (agenda.needPlayerWhy || '需要主角') : ''),
      agenda.urgency != null && agenda.needPlayer ? `紧迫度：${agenda.urgency}` : '',
    ].filter(Boolean);
  },

  introText(card = {}, maxChars = 1600) {
    const identity = card.identity || {};
    const persona = card.persona || {};
    const social = card.social || {};
    const agenda = card.agenda || {};
    const role = identity.role || card.role || '出场人物';
    const background = persona.background || card.intro || card.detail || '暂无介绍。';
    const prefs = Array.isArray(persona.preferences) ? persona.preferences.join('、') : '';
    const attraction = Array.isArray(persona.attraction) ? persona.attraction.join('、') : '';
    const reach = Array.isArray(social.reach) ? social.reach.join('、') : '';
    return this.limit([
      `资料类型：介绍卡`,
      `姓名：${card.name}`,
      `角色ID：${card.id || card.links?.roleCardId || ''}`,
      `世界：${card.worldTag || card.work || '未知世界'}`,
      `人物形态：${window.GameModules.characterSocialDrive?.presenceKindLabel?.(card.presenceKind) || '具体的一个人'}`,
      `身份：${role}`,
      this.line('职业', identity.job),
      this.line('介绍', background),
      this.line('外貌', persona.appearance || card.appearance),
      this.line('性格', persona.personality || card.personality),
      this.line('喜好', prefs),
      this.line('吸引偏好', attraction),
      this.line('与主角关系', social.relationToPlayer || card.relation || card.relationships),
      this.line('关系说明', social.relationDetail),
      social.affection != null && social.affection !== '' ? `好感：${social.affection}` : '',
      social.familiarity != null && social.familiarity !== '' ? `熟识：${social.familiarity}` : '',
      this.line('上次沟通', social.lastContactAt),
      this.line('沟通渠道', social.lastContactChannel),
      this.line('可达渠道', reach),
      this.line('当前事务', agenda.short),
      this.line('找主角理由', agenda.needPlayer ? (agenda.needPlayerWhy || '需要主角') : ''),
      agenda.urgency != null && agenda.needPlayer ? `紧迫度：${agenda.urgency}` : '',
    ].filter(Boolean).join('\n'), maxChars);
  },
};
