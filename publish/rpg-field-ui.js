window.GameModules = window.GameModules || {};

window.GameModules.rpgFieldUi = {
  bodyFigureMaskState: { natural: false, dressed: false },
  bodyFigurePickerOpen: false,
  bodyFigurePickerLoading: false,
  bodyFigurePickerError: '',
  bodyFigurePickerKind: 'natural',
  bodyFigurePickerTarget: null,
  bodyFigurePickerItems: [],

  rpgFieldKey(field) { return `${field?.stateId || 'state'}:${field?.key || ''}:${field?.label || ''}`; },
  rpgItemKey(field, index) { return `${this.rpgFieldKey(field)}:item:${index}`; },
  toggleRpgField(field) { const key = this.rpgFieldKey(field); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  toggleRpgItem(field, index) { const key = this.rpgItemKey(field, index); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  clearAbilityDetail() {
    this.abilityDetailPanel = null;
    this.expandedRpgFieldKey = '';
  },
  openAbilityDetail(field, item = null, index = null) {
    if (!field) return;
    const key = item != null && index != null ? this.rpgItemKey(field, index) : this.rpgFieldKey(field);
    const title = item != null ? this.rpgItemSummary(item, field) : String(field.label || field.key || '详情');
    const text = item != null ? this.rpgItemDetail(field, item) : this.rpgFieldDetail(field);
    const links = item != null ? this.learnedPrerequisiteLinks(item) : [];
    this.expandedRpgFieldKey = key;
    this.abilityDetailPanel = { key, title, text, links };
  },
  toggleAbilityDetail(field, item = null, index = null) {
    const key = item != null && index != null ? this.rpgItemKey(field, index) : this.rpgFieldKey(field);
    if (this.abilityDetailPanel?.key === key) {
      this.clearAbilityDetail();
      return;
    }
    this.openAbilityDetail(field, item, index);
  },
  isAbilityDetailOpen(field, item = null, index = null) {
    const key = item != null && index != null ? this.rpgItemKey(field, index) : this.rpgFieldKey(field);
    return this.abilityDetailPanel?.key === key;
  },

  learnedPrerequisiteLinks(item = {}) {
    const links = [];
    const add = (name, fieldKey, prefix) => {
      const label = String(name || '').trim();
      if (!label) return;
      links.push({ label: `${prefix}${label}`, fieldKey, name: label });
    };
    (item.requiredSkills || []).forEach((name) => add(name, 'skills', '技能·'));
    (item.requiredKnowledge || []).forEach((name) => add(name, 'knowledge', '知识·'));
    const info = item.info || {};
    (info.learnedAbilities || []).forEach((name) => add(name, 'skills', '技能·'));
    (info.knowledgeAreas || []).forEach((name) => add(name, 'knowledge', '知识·'));
    return links.filter((link, index, list) => list.findIndex((row) => row.fieldKey === link.fieldKey && row.name === link.name) === index);
  },

  openAbilityDetailLink(link = {}) {
    const store = this;
    const stateId = String(link.stateId || store.identityTargetId || store.selectedCharacterId || '').trim();
    const state = store.rpgStates?.[stateId] || store.characterRpgState || store.currentRpgState;
    if (!state?.values) return;
    const entries = store.rpgEntries?.(state) || [];
    const targetField = entries.flatMap((section) => section.fields || []).find((field) => field.key === link.fieldKey);
    if (!targetField) return;
    const items = store.rpgListItems(targetField);
    const index = items.findIndex((item) => {
      const name = store.rpgItemName(item);
      return name === link.name || name.includes(link.name) || link.name.includes(name);
    });
    if (index < 0) return;
    store.openAbilityDetail({ ...targetField, stateId: targetField.stateId || state.id }, items[index], index);
  },

  rpgItemPrerequisiteTags(item = {}) {
    const tags = [];
    if ((item.requiredSkills || []).length) tags.push(`技×${item.requiredSkills.length}`);
    if ((item.requiredKnowledge || []).length) tags.push(`知×${item.requiredKnowledge.length}`);
    if ((item.requiredIntrinsicBase || []).length) tags.push(`身×${item.requiredIntrinsicBase.length}`);
    return tags;
  },
  isRpgFieldOpen(field) { return this.expandedRpgFieldKey === this.rpgFieldKey(field); },
  isRpgItemOpen(field, index) { return this.expandedRpgFieldKey === this.rpgItemKey(field, index); },
  isRpgListField(field) { return ['knowledge', 'skills', 'professions', 'factions', 'memberships', 'items', 'wearing', 'bodyProfile', 'dressedProfile', 'bodyStatus', 'sexualExperienceParts', 'sexualPartners', 'status_tags'].includes(field?.key) && Array.isArray(field.raw); },
  isIdentityInfoStyledField(field = {}) {
    const label = String(field?.label || '').trim();
    const key = String(field?.key || '').trim();
    return /姓名|身份|职业|所属世界|年龄|生日|性别|思念度|当前位置|外貌|喜好|性格|人物说明|备注|社群角色|阵营|人事归属|world_tag|current_location|appearance|preferences|personality|detail|factions|memberships|longing|(^|[-_])(name|role|job|work|age|birthday|gender)$/.test(`${label} ${key}`);
  },
  identityInfoSummary(field = {}) {
    const meta = this.identityInfoFieldMeta(field);
    const label = String(field?.label || field?.key || '未记录').trim();
    if (this.isRpgListField(field)) {
      const unit = { factions: '项', memberships: '项', sexualPartners: '人' }[field.key] || '项';
      return `${meta.icon} ${label} · ${this.rpgListItems(field).length}${unit}`;
    }
    const preview = this.identityInfoPreview(field, /外貌|喜好|性格|人物说明|detail|appearance|preferences|personality/.test(`${label} ${field?.key || ''}`) ? 26 : 18);
    return `${meta.icon} ${label} · ${preview || '未记录'}`;
  },
  rpgFieldSummary(field) {
    if (this.isIdentityInfoStyledField(field)) return this.identityInfoSummary(field);
    if (!this.isRpgListField(field)) return `${field.label}：${Array.isArray(field.value) ? field.value.join('、') || '无' : field.value}`;
    const unit = { knowledge: '知识', skills: '技能', professions: '职业', bodyProfile: '部位', dressedProfile: '部位', bodyStatus: '部位', sexualExperienceParts: '分类', sexualPartners: '人' }[field.key] || '项';
    return `${field.label}：${field.raw.length}${unit}`;
  },
  canExpandRpgField(field) { return Boolean(field); },
  isLexiconField(field) { return Boolean(field); },
  roleCardReasonGetter(profile = {}) {
    const reasons = profile.roleCardFieldReasons || {}, log = {};
    (profile.roleCardChangeLog || []).forEach((item) => [item.field, item.name].filter(Boolean).forEach((key) => { log[key] = item.reason || log[key] || ''; }));
    const wrongSubject = (text, label = '') => {
      const value = String(text || '').trim(), name = String(profile?.name || '').trim();
      if (!name || label === '人际关系' || /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/.test(String(profile?.role || ''))) return false;
      if (value.includes(name)) return false;
      return /(作为|是|属于|承担|体现了).{0,18}(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/.test(value) || /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子).{0,12}(身份|性格|外貌|生日|职业|资料)/.test(value);
    };
    const usable = (text, label) => !/^错误：.*缺少AI给出的变化原因/.test(String(text || '').trim()) && !wrongSubject(text, label) && String(text || '').trim();
    return (label, key) => usable(reasons[label], label) || usable(reasons[key], label) || usable(log[label], label) || usable(log[key], label) || this.missingReasonText(`${profile?.name || '个人资料'}-${label}`);
  },

  missingReasonText(name = '词条') { return `错误：${name}缺少AI给出的变化原因，请重新生成个人资料或重新触发AI更新。`; },
  rpgListItems(field) { return Array.isArray(field?.raw) ? field.raw : []; },
  isBodyProfileField(field) { return field?.key === 'bodyProfile' || field?.key === 'dressedProfile'; },
  rpgBodyPartDescription(item) { return String(item?.description || '未记录').trim(); },

  profileIdentityFields(state, provided = []) {
    if (Array.isArray(provided) && provided.length) return provided;
    const p = state?.profile || {};
    const worldTag = p.work || state?.worldTag || '原创世界';
    const reasonFor = this.roleCardReasonGetter(p);
    const locationText = p.currentLocation
      || window.GameModules.currentLocationField?.fromCharacterState?.(state)
      || '';
    const row = (key, label, value, desc) => ({ key: `profile-${state?.id || 'target'}-${key}`, stateId: state?.id || '', label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: key !== 'work' });
    return [
      row('name', '姓名', p.name || state?.name, '角色卡固化姓名。'), row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('currentLocation', '当前位置', locationText, '角色卡当前位置；格式为[势力层级链...]·地点·地点内位置（倒数第2段=地图节点，最后1段=室内细节）。'),
      row('role', '身份', p.role || p.job, '角色当前身份。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
      row('gender', '性别', p.gender, '角色性别资料。'), row('birthday', '生日', p.birthday, '角色生日资料。'),
      row('relationships', '人际关系', p.relationships, '关系必须使用“关系：姓名”的格式。'), row('appearance', '外貌', p.appearance, '角色卡固化外貌。'),
      row('preferences', '喜好', p.preferences, '角色稳定喜好和穿着偏好。'), row('personality', '性格', p.personality, '角色卡固化性格。'), row('detail', '人物说明', p.detail, '角色卡补充说明。'),
    ];
  },

  profileDisplayState(state, identityFields = []) {
    if (state?.values) return state;
    const fromFields = Object.fromEntries((identityFields || []).map((field) => [field.key, field.value]));
    const id = identityFields?.[0]?.stateId || state?.id || 'profile-preview';
    const profile = { ...(state?.profile || {}), id, name: fromFields.name || state?.name || '未命名', work: fromFields.work || state?.worldTag || '原创世界', role: fromFields.role || fromFields.job || '', job: fromFields.job || fromFields.role || '', isPlayer: id === 'player-self' };
    return { ...(state || {}), id, name: profile.name, worldTag: profile.work, profile, values: {} };
  },

  rpgEntries(state = {}) {
    const values = state?.values || {};
    const profile = state?.profile || {};
    const stateId = state?.id || profile.id || this.identityTargetId || 'player-self';
    const labels = {
      world_tag: '世界',
      age: '年龄',
      current_location: '当前位置',
      level: '等级',
      exp: '经验',
      free_attribute_points: '可分配属性点',
      health: '生命力',
      stamina: '体力',
      vitality: '生命池',
      stamina_pool: '体力池',
      satiety: '饱食度',
      hydration: '饮水度',
      fatigue: '疲劳',
      learning_ability: '学习能力',
      mental_stability: '心智稳定',
      growth_potential: '成长潜力',
      action_ability: '行动能力',
      strength: '力量',
      agility: '敏捷',
      constitution: '体质',
      intelligence: '智力',
      perception: '感知',
      willpower: '意志',
      charisma: '魅力',
      knowledge: '知识',
      skills: '技能',
      professions: '职业',
      factions: '社群角色',
      memberships: '人事归属',
      items: '物品',
      wearing: '穿着',
      status_tags: '状态标签',
      control_experience: '上线体验',
    };
    const formatValue = (value) => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') return this.rpgFieldValue?.(value) || JSON.stringify(value);
      return value ?? '';
    };
    const field = (key, kind = '角色状态') => ({
      key,
      stateId,
      label: labels[key] || key,
      kind,
      type: kind,
      value: formatValue(values[key]),
      raw: Array.isArray(values[key]) ? values[key] : values[key],
      desc: profile.rpgFieldReasons?.[key] || profile.roleCardFieldReasons?.[labels[key]] || '',
      reason: profile.rpgFieldReasons?.[key] || profile.roleCardFieldReasons?.[labels[key]] || '',
      worldTag: values.world_tag || state.worldTag || profile.work || '',
    });
    const existing = (key) => Object.prototype.hasOwnProperty.call(values, key);
    const take = (keys, kind) => keys.filter(existing).map((key) => field(key, kind));
    return [
      { title: '基础状态', fields: take(['world_tag', 'age', 'current_location', 'level', 'exp', 'free_attribute_points', 'health', 'stamina', 'vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'learning_ability', 'mental_stability', 'growth_potential', 'action_ability', 'control_experience'], '基础状态') },
      { title: '身内能力', fields: take(['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'], '身内能力') },
      { title: '习得能力', fields: take(['knowledge', 'skills', 'professions'], '习得能力') },
      { title: '关系归属', fields: take(['factions', 'memberships'], '身份归属') },
      { title: '装备与物品', fields: take(['items', 'wearing'], '装备与物品') },
      { title: '状态标签', fields: take(['status_tags'], '状态标签') },
    ].filter((section) => section.fields.length);
  },

  shouldShowEssentialPreferenceSection(displayState = {}) {
    try {
      return Boolean(this.essentialPreferenceViewForState?.(displayState));
    } catch (err) {
      console.warn('[profileSections] essential preference preview skipped:', err?.message || err);
      return false;
    }
  },

  profileSectionTabMeta(section = {}) {
    const title = String(section?.title || '').trim();
    const byTitle = {
      个人能力: { icon: '⚡', label: '能力', hint: '技能、知识与职业' },
      身内能力: { icon: '💪', label: '属性', hint: '七维身内属性' },
      '装备与物品': { icon: '🎒', label: '装备', hint: '物品与穿着' },
      当前自然状态: { icon: '🌿', label: '自然', hint: '身体原貌' },
      盛装: { icon: '👗', label: '盛装', hint: '打扮与造型' },
      状态标签: { icon: '🏷️', label: '标签', hint: '当前状态标记' },
      人际关系: { icon: '🤝', label: '关系', hint: '社交与亲属' },
      身份信息: { icon: '🪪', label: '身份', hint: '基础档案' },
      人生取向: { icon: '🧭', label: '取向', hint: '人生价值取向' },
      人生目标: { icon: '🧭', label: '取向', hint: '人生价值取向' },
      长期目标: { icon: '🎯', label: '目标', hint: '短中长期目标与成果' },
      本质偏好: { icon: '✨', label: '偏好', hint: '本质偏好五层' },
      身体状态: { icon: '💓', label: '身体', hint: '亲密与体征' },
    };
    if (section.view === 'essentialPreference') return { icon: '✨', label: '偏好', hint: '本质偏好五层' };
    if (section.view === 'lifeOrientation') return { icon: '🧭', label: '取向', hint: '人生价值取向' };
    if (section.view === 'goalSystem' || section.view === 'goals') return { icon: '🎯', label: '目标', hint: '短中长期目标与成果' };
    return byTitle[title] || { icon: '📋', label: title.slice(0, 4) || '分区', hint: title || '状态分区' };
  },

  isGoalSystemField(field = {}) {
    if (field?.profileGroup === '长期目标') return true;
    if (['short', 'medium', 'long', 'achievements', 'goalBundle'].includes(field?.goalsRole)) return true;
    const label = String(field?.label || '').trim();
    return /^(?:短期目标|近期目标|中期目标|长期目标|阶段成果|目标)$/u.test(label);
  },

  profileSections(state, identityFields = []) {
    const displayState = this.profileDisplayState(state, identityFields);
    const aspirationFields = (identityFields || []).filter((field) => field.profileGroup === '人生取向');
    const orientationFields = aspirationFields.filter((field) => !this.isGoalSystemField(field));
    const goalSystemFields = (identityFields || []).filter((field) => this.isGoalSystemField(field));
    const essentialPreferenceFields = (identityFields || []).filter((field) => field.profileGroup === '本质偏好');
    const baseIdentityFields = (identityFields || []).filter((field) => field.profileGroup !== '人生取向' && field.profileGroup !== '本质偏好' && field.profileGroup !== '长期目标');
    const entries = this.rpgEntries?.(displayState) || [];
    const all = entries.flatMap((section) => section.fields || []);
    const byKey = (key) => all.find((field) => field.key === key);
    const take = (keys) => keys.map(byKey).filter(Boolean);
    const identity = this.profileIdentityFields(displayState, baseIdentityFields);
    const relations = identity.filter((field) => field.label === '人际关系' || /relationships|人际关系/.test(field.key));
    const privateLabels = new Set(['性经验次数', '当前身体状态']);
    const identityRest = identity.filter((field) => !relations.includes(field) && !privateLabels.has(field.label));
    const naturalState = this.profileNaturalStateField(displayState);
    const dressedState = this.profileDressedStateField(displayState);
    const intimacyUi = window.GameModules.initPromptRegistry?.uiFor?.('intimacyBody') || {};
    const intimacyAllFields = this.intimacyBodyInitialized(displayState) ? (window.GameModules.initPromptRegistry?.fields?.('intimacyBody', displayState) || []) : [];
    const intimacyFieldKeys = new Set(intimacyUi.fieldKeys || ['sexualStatus', 'sexualPartnerCount', 'sexualPartners', 'sexualExperienceCount', 'sexualExperienceParts', 'bodyStatus']);
    const intimacyFields = intimacyAllFields.filter((field) => intimacyFieldKeys.has(field.key));
    if (!intimacyFields.length) intimacyFields.push(...this.defaultIntimacyBodyFields(displayState));
    const longing = this.profileLongingField(state);
    const used = new Set(['world_tag', 'age', 'factions', 'memberships', 'current_location', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma', 'items', 'wearing', 'bodyProfile', 'dressedProfile', 'bodyStatus', 'intimacy', 'status_tags']);
    const personal = all.filter((field) => !used.has(field.key));
    const groups = [
      { title: '个人能力', fields: personal },
      { title: '身内能力', fields: take(['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']) },
      { title: '装备与物品', fields: take(['items', 'wearing']) },
      { title: '当前自然状态', fields: naturalState ? [naturalState] : [] },
      { title: '盛装', fields: dressedState ? [dressedState] : [] },
      { title: '状态标签', fields: take(['status_tags']) },
      { title: '人际关系', fields: relations },
      { title: '身份信息', fields: [...identityRest, ...(longing ? [longing] : []), ...take(['world_tag', 'age', 'factions', 'memberships'])] },
    ];
    let insertAt = groups.findIndex((group) => group.title === '身份信息') + 1;
    if (insertAt < 1) insertAt = groups.length;
    if (orientationFields.length) {
      groups.splice(insertAt, 0, {
        title: '人生取向',
        fields: orientationFields,
        view: 'lifeOrientation',
      });
      insertAt += 1;
    }
    if (goalSystemFields.length) {
      groups.splice(insertAt, 0, {
        title: '长期目标',
        fields: goalSystemFields,
        view: 'goalSystem',
      });
      insertAt += 1;
    }
    if (this.shouldShowEssentialPreferenceSection(displayState)) {
      groups.splice(insertAt, 0, {
        title: '本质偏好',
        fields: essentialPreferenceFields,
        view: 'essentialPreference',
      });
    }
    return this.placeProfileSection(groups, { title: intimacyUi.sectionTitle || '身体状态', fields: intimacyFields }, intimacyUi).filter((group) => group.fields.length || group.view === 'lifeOrientation' || group.view === 'goalSystem' || group.view === 'goals' || group.view === 'essentialPreference');
  },

  placeProfileSection(groups = [], section = {}, ui = {}) {
    if (!section.fields?.length || ui.hidden) return groups;
    const next = groups.slice();
    const after = ui.afterSection || '身份信息';
    const before = ui.beforeSection || '';
    const index = before ? next.findIndex((group) => group.title === before) : next.findIndex((group) => group.title === after);
    const at = index < 0 ? next.length : (before ? index : index + 1);
    next.splice(at, 0, section);
    return next;
  },

  intimacyBodyInitialized(state = {}) {
    const body = state.values?.bodyStatus;
    const intimacy = state.values?.intimacy;
    const bodyDone = body && typeof body === 'object' && Object.values(body).some((item) => item?.initializedByAi || item?.source === 'AI初始化');
    const intimacyDone = Boolean(intimacy?.initializedByAi || intimacy?.source === 'AI初始化');
    return Boolean(bodyDone || intimacyDone);
  },

  defaultIntimacyBodyFields(state = {}) {
    const template = window.GameModules.initDefaults?.intimacyBody || window.GameModules.initTemplateSources?.intimacyBody;
    const intimacy = template?.intimacy?.() || template?.intimacyDefaults || {};
    const bodyStatus = template?.bodyStatus?.() || template?.bodyStatusDefaults || {};
    const sexRows = Object.entries(template?.sexPartLabels || {}).map(([partKey, name]) => ({ partKey, name, count: 0, initialCount: 0, laterCount: 0, prompt: template?.sexPartPrompts?.[partKey] || template?.sexPartPrompts?.other || '', type: template?.fieldMeta?.sexualExperienceParts?.kind || '性经验分类', pendingAiInit: true }));
    const bodyRows = Object.values(bodyStatus || {}).map((item) => ({ ...item, name: item.part || item.partKey, type: template?.fieldMeta?.bodyStatus?.kind || '当前身体状态', pendingAiInit: true, reason: '尚未经过现实推演AI初始化；当前仅按模板占位显示。' }));
    const base = { templateKey: 'intimacyBody', stateId: state.id || '', worldTag: state.worldTag || state.profile?.work || '原创世界', targetType: state.profile?.isPlayer ? '非角色' : '角色', commonField: true, pendingAiInit: true, reason: '待AI初始化。' };
    const meta = template?.fieldMeta || {};
    return [
      { key: 'sexualStatus', ...base, ...(meta.sexualStatus || {}), value: `${intimacy.sexualStatus || '待AI判断'}｜模板占位，待AI初始化`, raw: intimacy.sexualStatus || '待AI判断' },
      { key: 'sexualPartnerCount', ...base, ...(meta.sexualPartnerCount || {}), value: `${Number(intimacy.sexualPartnerCount) || 0}人｜模板占位，待AI初始化`, raw: Number(intimacy.sexualPartnerCount) || 0 },
      { key: 'sexualPartners', ...base, ...(meta.sexualPartners || {}), value: [template?.displayTexts?.noPartner || '无', '模板占位，待AI初始化'], raw: [template?.displayTexts?.noPartner || '无'] },
      { key: 'sexualExperienceCount', ...base, ...(meta.sexualExperienceCount || {}), value: `${Number(intimacy.sexualExperienceCount) || 0}次｜模板占位，待AI初始化`, raw: Number(intimacy.sexualExperienceCount) || 0 },
      { key: 'sexualExperienceParts', ...base, ...(meta.sexualExperienceParts || {}), value: sexRows.map((item) => `${item.name}：0(初次见面) + 0 (后续次数)`), raw: sexRows },
      { key: 'bodyStatus', ...base, ...(meta.bodyStatus || {}), value: bodyRows.map((item) => template?.formatBodyStatus?.(item) || `${item.part || item.partKey}：${item.status || '--'}`), raw: bodyRows, desc: '身体状态尚未经过现实推演AI初始化；当前显示的是模板占位，不作为真实原始值。' },
    ];
  },

  profileLongingField(state = {}) {
    if (!state?.id || state.id === 'player-self') return null;
    const p = state.profile || {};
    const raw = state.values?.longing_to_player || {};
    const value = Math.max(0, Math.min(999, Number(raw.value) || 0));
    const updatedAt = Number(raw.updatedAt) || 0;
    const date = updatedAt ? new Date(updatedAt) : null;
    const time = date && Number.isFinite(date.getTime()) ? date.toLocaleString('zh-CN') : '尚未结算';
    return {
      key: 'longing_to_player', stateId: state.id, label: '思念度', kind: '关系状态', value: `${value.toFixed(1)}/100`, raw: value,
      desc: '角色对玩家的思念累积值；满100会在现实推演中触发一次思念事件。',
      reason: `${p.name || state.name || '该角色'}的思念度由现实推演间隔时间、好感度与随机系数结算累积；最近结算：${time}。`,
      worldTag: p.work || state.worldTag || '原创世界', targetType: '角色', commonField: true,
    };
  },

  profileNaturalStateField(state = {}) {
    const source = this.profileAppearanceSource(state);
    const cfg = window.GameModules.appearanceProfileTags;
    const metaText = cfg?.formatNaturalMeta?.(source.bodyProfileMeta || {}) || '';
    const field = this.profileBodyStateField(state, source.bodyProfile, {
      key: 'bodyProfile', label: '当前自然状态', kind: '身体原貌', type: '身体原貌',
      desc: '角色未经衣物遮掩、未作人工修饰时的原本身体状态。',
      reason: `${source.name || '该人物'}的自然状态来自角色卡 Part5 身体原貌生成结果。`,
      metaText,
    });
    if (field) {
      if (source.bodyProfileMeta) field.meta = source.bodyProfileMeta;
      return field;
    }
    if (!metaText && !source.gender && !source.appearance) return null;
    return {
      key: 'bodyProfile',
      stateId: state?.id || '',
      label: '当前自然状态',
      kind: '身体原貌',
      type: '身体原貌',
      raw: [],
      value: [],
      metaText,
      meta: source.bodyProfileMeta || {},
      desc: '角色未经衣物遮掩、未作人工修饰时的原本身体状态。',
      reason: `${source.name || '该人物'}的自然状态来自角色卡 Part5 身体原貌生成结果。`,
      worldTag: source.work || state?.worldTag || '原创世界',
      targetType: source.isPlayer ? '非角色' : '角色',
      commonField: true,
    };
  },

  profileDressedStateField(state = {}) {
    const source = this.profileAppearanceSource(state);
    const cfg = window.GameModules.appearanceProfileTags;
    const metaText = cfg?.formatDressedMeta?.(source.dressedProfileMeta || {}) || '';
    const field = this.profileBodyStateField(state, source.dressedProfile, {
      key: 'dressedProfile', label: '盛装', kind: '盛装状态', type: '盛装状态',
      desc: '角色盛装或打扮完全后各身体部位的造型、修饰与衣物包裹状态。',
      reason: `${source.name || '该人物'}的盛装状态来自角色卡 Part6 盛装状态生成结果。`,
      metaText,
    });
    if (field) {
      if (source.dressedProfileMeta) field.meta = source.dressedProfileMeta;
      return field;
    }
    if (!metaText && !(source.dressedProfile || []).length) return null;
    return {
      key: 'dressedProfile',
      stateId: state?.id || '',
      label: '盛装',
      kind: '盛装状态',
      type: '盛装状态',
      raw: [],
      value: [],
      metaText,
      meta: source.dressedProfileMeta || {},
      desc: '角色盛装或打扮完全后各身体部位的造型、修饰与衣物包裹状态。',
      reason: `${source.name || '该人物'}的盛装状态来自角色卡 Part6 盛装状态生成结果。`,
      worldTag: source.work || state?.worldTag || '原创世界',
      targetType: source.isPlayer ? '非角色' : '角色',
      commonField: true,
    };
  },

  profileAppearanceSource(state = {}) {
    const p = state?.profile || {};
    const cards = window.GameModules.predefinedRoleCardData || {};
    const keys = window.GameModules.predefinedRoleCards?.keys || Object.keys(cards);
    const roleProfile = window.GameModules.predefinedRoleCards?.roleProfile || ((record) => record);
    const probe = {
      ...p,
      name: String(p.name || state?.name || '').trim(),
      id: String(p.id || state?.id || '').trim(),
    };
    let key = window.GameModules.predefinedRoleCards?.cardKeyFor?.(probe) || '';
    if (!key && probe.id) key = keys.find((k) => roleProfile(cards[k])?.id === probe.id) || '';
    if (!key && probe.name) key = keys.find((k) => roleProfile(cards[k])?.name === probe.name) || '';
    const preset = key ? roleProfile(cards[key]) : null;
    const pickParts = (runtime = [], fallback = []) => {
      const valid = (list) => (Array.isArray(list) ? list : []).filter((item) => String(item?.part || item?.部位 || '').trim() && String(item?.description || item?.部位描写 || '').trim());
      const run = valid(runtime);
      const pre = valid(fallback);
      if (run.length >= 11) return runtime;
      if (pre.length) return fallback;
      return run.length ? runtime : (fallback || []);
    };
    return {
      ...p,
      name: probe.name || p.name,
      id: probe.id || p.id,
      gender: p.gender || preset?.gender || '',
      appearance: p.appearance || preset?.appearance || '',
      bodyProfile: pickParts(p.bodyProfile, preset?.bodyProfile),
      bodyProfileMeta: p.bodyProfileMeta || preset?.bodyProfileMeta || {},
      dressedProfile: pickParts(p.dressedProfile, preset?.dressedProfile),
      dressedProfileMeta: p.dressedProfileMeta || preset?.dressedProfileMeta || {},
    };
  },

  profileBodyStateField(state = {}, source = [], meta = {}) {
    const p = state?.profile || {};
    const cfg = window.GameModules.appearanceProfileTags;
    const list = Array.isArray(source) ? source : [];
    const rows = list.map((item, index) => {
      const part = String(item?.part || item?.部位 || '').trim();
      const description = String(item?.description || item?.部位描写 || '').trim();
      if (!part || !description) return null;
      const tags = cfg?.normalizeStringList?.(item.tags, 6) || [];
      return { index: Number(item?.index || item?.序号) || index + 1, part, tags, description, name: part, type: meta.type };
    }).filter(Boolean).sort((a, b) => a.index - b.index);
    if (!rows.length && !meta.metaText) return null;
    const valueRows = rows.map((item) => {
      const tagText = item.tags?.length ? `[${item.tags.join('、')}]` : '';
      return `${item.part}${tagText}：${item.description}`;
    });
    if (meta.metaText) valueRows.unshift(`【全局】${meta.metaText}`);
    return {
      key: meta.key, stateId: state?.id || '', label: meta.label, kind: meta.kind, value: valueRows, raw: rows,
      desc: meta.desc, reason: meta.reason, metaText: meta.metaText || '',
      worldTag: p.work || state?.worldTag || '原创世界', targetType: p.isPlayer ? '非角色' : '角色', commonField: true,
    };
  },

  lexiconKind(field, item = null) {
    if (item?.type) return item.type;
    if (field?.key && !item) return { knowledge: '知识树', skills: '技能树', professions: '职业树', factions: '社群角色', memberships: '人事归属', items: '物品', wearing: '穿着', bodyProfile: '身体原貌', dressedProfile: '盛装状态', status_tags: '状态' }[field.key] || field.kind || '属性';
    if (field?.kind) return field.kind;
    return { factions: '社群角色', memberships: '人事归属', items: '物品', wearing: '穿着', bodyProfile: '身体原貌', dressedProfile: '盛装状态', status_tags: '状态' }[field?.key] || '属性';
  },

  lexiconFor(field, item = null) {
    const worldTag = field?.worldTag || this.currentRpgState?.worldTag || this.character?.work || '原创世界';
    const kind = this.lexiconKind(field, item);
    const name = this.rpgItemName(item) || field?.label;
    return window.GameModules.rpgLexicon.get(worldTag, kind, name) || null;
  },

  fallbackDesc(field) {
    const worldTag = this.currentRpgState?.worldTag || this.character?.work || '';
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    const sections = this.currentRpgState?.schema?.sections || window.GameModules.progression.schemaSections(attrs);
    const found = sections.flatMap((section) => section.fields || []).find((item) => item.key === field?.key)?.desc;
    return found || `${field?.label || '该词条'}用于记录可被剧情判定和成长系统引用的具体状态。`;
  },

  activeDetailState(field = null) {
    const id = field?.stateId || field?.ownerStateId || '';
    if (id && this.rpgStates?.[id]) return this.rpgStates[id];
    return this.identityTargetState?.() || this.currentRpgState || this.playerIdentityState?.() || null;
  },

  usableChangeReason(reason, blocked = []) {
    const text = String(reason || '').trim();
    if (/^错误：.*缺少AI给出的变化原因/.test(text)) return '';
    if (/性别：|年龄：|生日：|具体地址：|人事归属：|社群角色：|居住：|父母：|关系：|备注：|关系为.*备注为|居住在.*生活状态.*家庭状态/.test(text)) return '';
    if (/^(AI演算|系统结算|系统词条调整|用户主动)$/.test(text) || /词条说明|当前作用|用于记录|暂无详细说明/.test(text)) return '';
    if (/依据.*(当前值|上限|已落库|经验曲线)|当前为.*依据|被记录为当前|后续(获得|使用|消耗|转让|遗失|损坏|穿戴|由明确行动|状态变化)时会更新|当前属于.*词条/.test(text)) return '';
    return blocked.some((item) => item && text === String(item).trim()) ? '' : text;
  },

  fallbackBasis(field, obj = null, kind = '', name = '') {
    const state = this.activeDetailState?.(field) || this.currentRpgState || this.playerIdentityState?.() || null;
    const profile = state?.profile || {};
    const generated = window.GameModules.characterReasonFallback?.rpgReasons?.(profile, profile.worldAttributes || { fields: state?.schema?.sections?.find((section) => section.title === '世界固有属性')?.fields || [] }) || {};
    if (!obj && generated[field?.key]) return generated[field.key];
    const finalKind = kind || (obj ? this.lexiconKind(field, obj) : (field?.kind || this.lexiconKind(field)));
    const finalName = name || (obj ? this.rpgItemName(obj) : (field?.label || field?.key || '该词条'));
    if (obj && finalKind === '穿着') return `${profile.name || '该人物'}当前穿着为${finalName}，后续只有明确换装、脱下、破损或洗浴等事件才会更新。`;
    if (obj) return `${profile.name || '该人物'}持有${finalName}，是其${finalKind}、当前处境或既有生活经历的一部分，后续会随明确剧情事件更新。`;
    if (field?.source) return `${profile.name || '该人物'}的${finalName}由初始经历、等级成长、自由分配和非玩家成长共同形成。`;
    return `${profile.name || '该人物'}的${finalName}按其当前身份、处境、过去经历和可支配资源固化。`;
  },

  explicitFieldChangeReason(field, lexicon = null) {
    const state = this.activeDetailState(field), values = state?.values || {}, profile = state?.profile || {};
    const explicit = this.usableChangeReason(field?.reason || lexicon?.meta?.modifyReason, [lexicon?.description, lexicon?.summary, field?.desc]);
    if (explicit) return explicit;
    const aiReason = this.usableChangeReason(profile.rpgFieldReasons?.[field?.key] || profile.rpgFieldReasons?.[field?.label], [lexicon?.description, lexicon?.summary, field?.desc]);
    if (aiReason) return String(aiReason).slice(0, 120);
    if (field?.key === 'level' && values.level_growth?.history?.length) return values.level_growth.history.at(-1)?.reason || '';
    if (field?.key === 'level_growth' && values.level_growth?.history?.length) return values.level_growth.history.at(-1)?.reason || '';
    return '';
  },

  fieldChangeReason(field, lexicon = null) {
    return this.explicitFieldChangeReason(field, lexicon) || this.missingReasonText(field?.label || field?.key || '词条');
  },

  cleanDetailText(text = '') {
    return String(text || '').replace(/([：:])(?=(妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长|朋友|同学|同事)[：:])/g, '；');
  },

  pollutedDetailText(text = '') {
    const value = String(text || '').trim();
    return value.length > 90 || /变化方式|生成来源|词条名AI生成|值AI生成/.test(value) || /[：:](妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长)[：:]/.test(value);
  },

  itemChangeMode(obj = {}, lexicon = null) {
    const raw = String(lexicon?.changeMode || obj.changeMode || '').trim();
    if (obj?.type === '穿着' && obj?.source === 'AI生成') return 'AI生成';
    return raw && !this.pollutedDetailText(raw) && raw.length < 24 ? raw : '状态规范化';
  },

  itemBasis(field, obj = {}, kind = '', name = '') {
    const reason = this.itemChangeReason(field, obj, this.lexiconFor(field, obj));
    if ((kind || obj?.type) === '穿着' && reason && !/^错误：/.test(reason)) return reason;
    return this.fallbackBasis(field, obj, kind, name);
  },

  itemChangeReason(field, obj = {}, lexicon = null) {
    const raw = lexicon?.meta?.modifyReason || obj.reason || '';
    const cleaned = this.cleanDetailText(raw);
    const explicit = !this.pollutedDetailText(cleaned) ? this.usableChangeReason(cleaned, [lexicon?.description, lexicon?.summary, obj.description, obj.desc, obj.source, obj.changeMode]) : '';
    return explicit || window.GameModules.progression?.itemReason?.(obj, this.lexiconKind(field, obj)) || this.missingReasonText(this.rpgItemName(obj) || field?.label || '词条');
  },

  rpgItemName(item) {
    if (typeof item === 'string') return item;
    return item?.name || item?.part || (item?.force ? `${item.force} / ${item.position || '成员'}` : (item?.faction ? `${item.faction} / ${item.role || item.position || '成员'}` : '未命名'));
  },

  initUiRow(field, item = null) {
    const ui = field?.templateKey ? window.GameModules.initPromptRegistry?.uiFor?.(field.templateKey) : null;
    if (typeof ui?.row !== 'function') return null;
    return ui.row(field, item);
  },

  rpgItemSummary(item, field = null) {
    const row = field?.key === 'bodyStatus' ? this.initUiRow(field, item) : null;
    if (row) return `${row.name || row.field || '身体状态'}：${row.value || '--'}`;
    const name = this.rpgItemName(item);
    if (typeof item === 'string') return name;
    if (item?.type === '身体原貌' || item?.type === '盛装状态') {
      const tagText = Array.isArray(item.tags) && item.tags.length ? `[${item.tags.join('、')}]` : '';
      return `${item.index || ''}.${item.part || name}${tagText}`;
    }
    if (item?.type === '性经验分类') return `${item.name || name}：${item.initialCount || 0}(初次见面) + ${item.laterCount || 0} (后续次数)`;
    if (item?.type === '当前身体状态') {
      const desc = item.description || item['描述状态'] || '';
      return `${item.part || name}：${item.status || '稳定'}${desc ? `｜${desc}` : ''}`;
    }
    const levelName = Number(item?.level) > 0 ? `${name} lv.${item.level}` : name;
    const tags = this.rpgItemPrerequisiteTags(item);
    const tagged = tags.length ? `${levelName} · ${tags.join(' ')}` : levelName;
    if (field && this.isIdentityInfoStyledField(field) && this.identityInfoFieldMeta(field).section === 'list') {
      return `${this.identityInfoFieldMeta(field).itemIcon || '✦'} ${tagged}`;
    }
    if (item?.type === '穿着' && item?.slot && item?.clothing_position) return `${item.clothing_position}｜${tagged}`;
    return tagged;
  },

  sexPartTemplate(defaults = null) {
    return defaults || window.GameModules.initDefaults?.intimacyBody || window.GameModules.initTemplateSources?.intimacyBody || {};
  },

  sexPartKey(obj = {}, defaults = null) {
    const template = this.sexPartTemplate(defaults);
    const prompts = template.sexPartPrompts || {}, labels = template.sexPartLabels || {};
    const names = [obj.partKey, obj.key, obj.name, obj.label, obj.value, obj.raw].map((x) => String(x || '').trim()).filter(Boolean);
    const direct = names.find((name) => prompts[name]);
    const byLabel = Object.entries(labels).find(([key, label]) => names.some((name) => name === label || name.includes(label) || label.includes(name) || name.includes(key)))?.[0];
    return direct || byLabel || 'other';
  },

  sexPartPrompt(obj = {}, defaults = null) {
    const template = this.sexPartTemplate(defaults);
    const key = this.sexPartKey(obj, template);
    return obj.prompt || template.sexPartPrompts?.[key] || template.sexPartPrompts?.other || '该分类暂无次数增加标准。';
  },

  learnedDefinition(kind, name, obj = {}, lexicon = null, info = {}) {
    const explicit = [info.description, lexicon?.description, obj.description, obj.desc, obj.source].find((x) => x && !/暂无|资料|当前作用/.test(String(x)));
    if (explicit) return explicit;
    if (name === '世界常识') return '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。';
    if (name === '手机操作') return '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。';
    if (name === '现实观察' || name === '观察') return '通过细节、环境变化和他人反应判断局势的能力。';
    if (kind === '知识') return `对“${name}”这一知识领域的概念、规则、背景和应用范围的理解程度。`;
    if (kind === '职业') return `以“${name}”为核心的内化职业能力、经验与胜任资格；不等同当前雇佣单位或岗位，失业也不直接失去该职业。`;
    if (kind === '装备') return `装备词条，说明“${name}”的当前状态、效果、持有者、可调用方式和是否可穿戴。`;
    if (kind === '物品') return `物品词条，说明“${name}”的数量、用途、所在位置和消耗或转让条件。`;
    if (kind === '穿着') return `穿着词条，说明“${name}”占用的槽位、外观、状态和对现实行动的影响。`;
    if (kind === '社群角色' || kind === '阵营') {
      const community = obj.community || obj.faction || info.community || info.faction || name.split('/')[0]?.trim();
      const role = obj.role || info.role || obj.position || info.position || name.split('/')[1]?.trim() || '成员';
      return `社群：${community}；角色：${role}。该词条说明角色所属居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`;
    }
    if (kind === '人事归属') {
      const orgName = obj.orgName || info.orgName || name.split('/')[0]?.trim();
      const title = obj.title || info.title || name.split('/').at(-1)?.trim() || '成员';
      const department = obj.department || info.department || '';
      return `组织：${orgName}；${department ? `部门：${department}；` : ''}身份：${title}。该词条说明角色在势力或社群组织架构中的部门、职位、身份或成员关系。`;
    }
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },

  rpgItemDetail(field, item) {
    const lexicon = this.lexiconFor(field, item);
    const obj = typeof item === 'string' ? { name: item, type: this.lexiconKind(field, item) } : item;
    const info = lexicon?.meta?.info || obj?.info || {};
    const exp = obj?.exp || {};
    const statName = { strength: '力量', agility: '敏捷', constitution: '体质', intelligence: '智力', perception: '感知', willpower: '意志', charisma: '魅力' };
    const kind = field?.key === 'sexualExperienceParts' ? '性经验分类' : (obj?.type || this.lexiconKind(field, obj));
    const name = this.rpgItemName(obj) || field?.label || '未知';
    if (kind === '身体原貌' || kind === '盛装状态') {
      const tagLine = Array.isArray(obj.tags) && obj.tags.length ? `标签: ${obj.tags.join('、')}` : '';
      return [`部位: ${name}`, `序号: ${obj.index || '未记录'}`, tagLine, `所属世界: ${field?.worldTag || '公共'}`, `词条类型: ${field?.targetType || '角色'}`, `当前依据: ${field?.reason || (kind === '盛装状态' ? '来自角色卡 Part6 盛装状态生成结果。' : '来自角色卡 Part5 身体原貌生成结果。')}`].filter(Boolean).join('\n');
    }
    if (kind === '性经验分类') {
      const defaults = window.GameModules.initDefaults?.intimacyBody;
      const partKey = this.sexPartKey(obj, defaults);
      return [`分类: ${obj.name || name}`, `字段: intimacy.sexualExperienceParts.${partKey}`, `次数: ${defaults?.formatExperienceSplit?.(obj) || ''}`, `初始化: ${obj.pendingAiInit ? '否，当前为模板占位，待AI初始化' : (field?.pendingAiInit ? '否，当前为模板占位，待AI初始化' : '按当前记录')}`, `次数增加标准: ${this.sexPartPrompt(obj, defaults)}`, `所属世界: ${field?.worldTag || defaults?.displayTexts?.publicWorld || '公共'}`].join('\n');
    }
    if (kind === '当前身体状态') {
      const uiRow = this.initUiRow(field, obj);
      const defaults = window.GameModules.initDefaults?.intimacyBody, text = defaults?.displayTexts || {}, values = defaults?.valueDefaults || {};
      const lines = [`部位: ${uiRow?.name || obj.part || name}`, `状态: ${obj.status || values.bodyStatus || ''}`, `初始化: ${obj.pendingAiInit ? '否，当前为模板占位，待AI初始化' : (obj.initializedByAi ? '是，已由AI初始化' : '未标记')}`, `初始见面: ${obj.initialMeeting || text.noRecord || ''}`, `描述状态: ${obj.description || text.noRecord || ''}`];
      if (Array.isArray(uiRow?.detailLines)) lines.push(...uiRow.detailLines);
      lines.push(`变化原因: ${obj.reason || text.currentRecord || ''}`, `更新时间: ${obj.updatedAt || text.noRecord || ''}`, `所属世界: ${field?.worldTag || text.publicWorld || '公共'}`);
      return lines.join('\n');
    }
    const hasLevel = Number(obj?.level) > 0;
    const lines = [`名称: ${name}`, `定义: ${this.learnedDefinition(kind, name, obj, lexicon, info)}`, `类型: ${kind}`, `所属世界: ${field?.worldTag || lexicon?.worldTag || '公共'}`, `词条类型: ${field?.targetType || lexicon?.meta?.targetType || '角色'}`];
    if (kind === '穿着' && (obj?.clothing_position || obj?.slotLabel)) lines.push(`穿戴位: ${obj.clothing_position || obj.slotLabel}`);
    if (kind === '穿着' && obj?.slot) lines.push(`槽位: ${obj.slot}`);
    if ((kind === '物品' || kind === '穿着' || kind === '装备') && (obj?.id || obj?.ownerId || obj?.characterId)) lines.push(`唯一ID: ${obj.id || '未记录'}`, `所属角色ID: ${obj.ownerId || obj.characterId || '未记录'}`);
    if ((kind === '社群角色' || kind === '阵营') && (obj?.community || obj?.faction || info.community || info.faction)) lines.push(`社群: ${obj.community || obj.faction || info.community || info.faction}`, `角色: ${obj.role || info.role || obj.position || info.position || '成员'}`);
    if (kind === '人事归属' && (obj?.orgName || info.orgName)) lines.push(`组织: ${obj.orgName || info.orgName}`, `部门: ${obj.department || info.department || '未记录'}`, `身份: ${obj.title || info.title || '成员'}`);
    if (hasLevel) {
      const p = window.GameModules.progression;
      const lv = Number(obj?.level) || 1;
      const expNext = p?.learnedNext?.[lv] ?? exp.next;
      const expCurrent = exp.current || 0;
      lines.push(`等级: lv${obj.level}`);
      lines.push(`当前等级含义: ${obj?.levelDescription || info.levelDescription || window.GameModules.progression.levelDescription(kind, obj.level)}`);
      lines.push(`完整等级含义: ${window.GameModules.progression.levelDescriptionList(kind)}`);
      lines.push(`等级效果: ${obj?.effect || info.effect || window.GameModules.progression.levelEffect(name, kind, obj.level)}`);
      lines.push(`经验值/升级所需经验值: ${expCurrent}/${expNext === Infinity ? 'max' : expNext}`);
    }
    const sync = window.GameModules.progressionLearnedSync;
    const requiredSkills = [...new Set([...(obj.requiredSkills || []), ...(info.learnedAbilities || [])])];
    const requiredKnowledge = [...new Set([...(obj.requiredKnowledge || []), ...(info.knowledgeAreas || [])])];
    const intrinsicKeys = sync?.normalizeIntrinsicBase?.([
      ...(obj.requiredIntrinsicBase || []),
      ...(info.intrinsicStats || []),
      ...(obj.linkedStats || []),
    ]) || [];
    const intrinsicLabels = sync?.intrinsicLabels?.(intrinsicKeys) || (obj.requiredIntrinsicBase || []).map((x) => statName[x] || x);
    if (requiredSkills.length) lines.push(`前置技能: ${requiredSkills.join('、')}`);
    if (requiredKnowledge.length) lines.push(`前置知识: ${requiredKnowledge.join('、')}`);
    lines.push(`关联身内能力: ${intrinsicLabels.join('、') || '无直接关联'}`);
    if ((info.worldAbilities || []).length) lines.push(`关联世界能力: ${info.worldAbilities.join('、')}`);
    lines.push(`词条层级: ${lexicon?.hierarchy === 'tree' ? '树词条' : '叶子词条'}`);
    lines.push(`生成来源: 词条名${(lexicon?.nameAiGenerated ?? lexicon?.aiGenerated) ? 'AI生成' : '系统/用户给定'}，值${lexicon?.valueAiGenerated ? 'AI生成' : '系统/用户给定'}，变化方式${this.itemChangeMode(obj, lexicon)}`);
    lines.push(`变化原因: ${this.itemChangeReason(field, obj, lexicon)}`);
    lines.push(`当前依据: ${this.itemBasis(field, obj, kind, name)}`);
    return lines.join('\n');
  },

  rpgFieldDetail(field) {
    const lexicon = this.lexiconFor(field);
    const rawValue = field?.key === 'current_location' && field?.raw && typeof field.raw === 'object'
      ? (window.GameModules.characterQuery?.locationText?.(field.raw) || [field.raw.name, field.raw.worldTag, field.raw.reason].filter(Boolean).join('｜'))
      : (Array.isArray(field?.value) ? field.value.join('、') : (field?.value ?? field?.raw ?? '未记录'));
    const lines = [`完整内容: ${rawValue || '未记录'}`, `说明: ${lexicon?.description || lexicon?.summary || field?.desc || this.fallbackDesc(field)}`];
    if (field?.key === 'current_location' && field?.raw && typeof field.raw === 'object') {
      if (field.raw.updatedAt) lines.push(`更新时间: ${field.raw.updatedAt}`);
      if (field.raw.reason && !String(rawValue || '').includes(field.raw.reason)) lines.push(`登记依据: ${field.raw.reason}`);
    }
    if (field?.pendingAiInit) lines.push('初始化: 否，当前为模板占位，待AI初始化');
    if (field && Object.prototype.hasOwnProperty.call(field, 'initialMeeting')) lines.push(`初始见面: ${Array.isArray(field.initialMeeting) ? field.initialMeeting.join('、') || '无' : field.initialMeeting}`);
    lines.push(`变化原因: ${this.fieldChangeReason(field, lexicon)}`);
    lines.push(`当前依据: ${this.fallbackBasis(field)}`);
    lines.push(`所属世界: ${field?.worldTag || lexicon?.worldTag || '公共'}`);
    lines.push(`字段范围: ${(field?.commonField ?? lexicon?.meta?.commonField) ? '公共字段' : '世界专属字段'}`);
    lines.push(`词条类型: ${field?.targetType || lexicon?.meta?.targetType || '角色'}`);
    lines.push(`层级: ${lexicon?.hierarchy === 'tree' ? '树词条' : '叶子词条'}`);
    lines.push(`词条名AI生成: ${(lexicon?.nameAiGenerated ?? lexicon?.aiGenerated) ? '是' : '否'}`);
    lines.push(`值AI生成: ${lexicon?.valueAiGenerated ? '是' : '否'}`);
    lines.push(`变化方式: ${lexicon?.changeMode || '系统结算'}`);
    if (lexicon?.promptInstruction) lines.push(`提示词说明: ${lexicon.promptInstruction}`);
    if (field?.source) lines.push(`来源: 初始值(${field.source.initial || 0}) + 等级值(${field.source.level || 0}) + 分配值(${field.source.allocated || 0}) + 非玩家成长(${field.source.npc || 0}) = ${field.raw || 0}`);
    if (field?.limit) lines.push(`限制: ${field.limit}`);
    if (field?.key === 'free_attribute_points') lines.push('用途: 可分配到力量、敏捷、体质、智力、感知、意志、魅力；每次真实升级获得1点。');
    if (field?.key === 'charisma') lines.push('判定提示: 魅力含容貌长相（漂亮/可爱/清秀/英俊等）、气质仪态与社交影响力；仅性格内向或话少，不应单独把魅力压得过低。');
    if (field?.key === 'level_growth' && field.raw?.history?.length) lines.push(`最近升级: ${field.raw.history.map((x) => `${x.from}->${x.to} 自动${Object.entries(x.auto || {}).map(([k, v]) => `${k}+${v}`).join('/')} 自由+${x.free}`).join('；')}`);
    return lines.join('\n');
  },

  fieldByKey(fields, key) {
    return (fields || []).find((field) => field?.key === key) || null;
  },

  parsePoolMetric(field) {
    if (!field) return { current: 0, max: 100, percent: 0, display: '—' };
    const raw = field.raw;
    if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'current')) {
      const max = Math.max(1, Number(raw.max ?? raw.next) || 1);
      const current = Number(raw.current) || 0;
      return {
        current,
        max,
        percent: Math.max(0, Math.min(100, Math.round((current / max) * 100))),
        display: field.value || `${current}/${max}`,
      };
    }
    const text = String(field.value || '');
    const match = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?|max)/i);
    if (match) {
      const current = Number(match[1]) || 0;
      const max = String(match[2]).toLowerCase() === 'max' ? Math.max(current, 1) : Number(match[2]) || 100;
      return { current, max, percent: Math.max(0, Math.min(100, Math.round((current / max) * 100))), display: text };
    }
    const num = Number(String(text).replace(/[^\d.]/g, '')) || 0;
    return { current: num, max: 100, percent: Math.max(0, Math.min(100, num)), display: text || String(num) };
  },

  parseExpMetric(expField, levelField) {
    const level = Number(levelField?.raw ?? levelField?.value) || 1;
    const raw = expField?.raw;
    if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'current')) {
      const current = Number(raw.current) || 0;
      const next = Number(raw.next) || window.GameModules.progression.nextCharacterExp(level);
      const percent = next ? Math.max(0, Math.min(100, Math.round((current / next) * 100))) : 0;
      return { current, next, percent, display: expField.value || `${current}/${next}` };
    }
    const pool = this.parsePoolMetric(expField);
    return { current: pool.current, next: pool.max, percent: pool.percent, display: pool.display };
  },

  learnedTypeIcon(type = '') {
    return { 技能: '⚔️', 知识: '📚', 职业: '🎖️' }[type] || '📌';
  },

  learnedItemLinks(item = {}) {
    const sync = window.GameModules.progressionLearnedSync;
    const p = window.GameModules.progression;
    const keys = [
      ...(Array.isArray(item.linkedStats) ? item.linkedStats : []),
      ...(sync?.normalizeIntrinsicBase?.(item.requiredIntrinsicBase || []) || []),
    ];
    const unique = [...new Set(keys.filter(Boolean))];
    if (unique.length) return unique;
    const name = this.rpgItemName(item);
    return p?.linkedStats?.(name) || ['intelligence'];
  },

  personalAbilityLearnedGroups(fields = []) {
    const specs = [
      { listKey: 'knowledge', key: 'knowledge', label: '知识', type: '知识' },
      { listKey: 'skills', key: 'skills', label: '技能', type: '技能' },
      { listKey: 'professions', key: 'professions', label: '职业', type: '职业' },
    ];
    return specs.map(({ listKey, key, label, type }) => {
      const field = this.fieldByKey(fields, listKey);
      const items = this.rpgListItems(field).map((item, index) => {
        const name = this.rpgItemName(item);
        if (!name) return null;
        const level = Number(item?.level) > 0 ? item.level : null;
        return {
          type,
          field,
          item,
          index,
          name,
          level,
          icon: this.learnedTypeIcon(type),
          chipText: `${this.learnedTypeIcon(type)} ${name}${level ? ` lv.${level}` : ''}`,
        };
      }).filter(Boolean);
      return { key, label, icon: this.learnedTypeIcon(type), items };
    }).filter((group) => group.items.length);
  },

  personalAbilityLinkedGroups(fields = []) {
    return this.personalAbilityLearnedGroups(fields);
  },

  identityInfoValueText(field = {}) {
    if (Array.isArray(field?.value)) return field.value.join('、');
    if (field?.value != null && field.value !== '') return String(field.value).trim();
    if (Array.isArray(field?.raw)) return field.raw.map((item) => this.rpgItemSummary(item, field)).join('、');
    return String(field?.raw ?? '').trim();
  },

  identityInfoPreview(field = {}, max = 48) {
    const text = this.identityInfoValueText(field).replace(/\s+/g, ' ').trim();
    if (!text) return '未记录';
    return text.length > max ? `${text.slice(0, max)}…` : text;
  },

  identityInfoFieldMeta(field = {}) {
    const label = String(field?.label || '').trim();
    const key = String(field?.key || '').trim();
    const text = `${label} ${key}`;
    const match = (pattern) => pattern.test(text);
    if (match(/姓名|(^|[-_])name$/)) return { icon: '🪪', section: 'hero', tone: 'cyan' };
    if (match(/身份|(^|[-_])role$/)) return { icon: '🎭', section: 'hero', tone: 'violet' };
    if (match(/职业|(^|[-_])job$/)) return { icon: '⚒️', section: 'core', tone: 'gold' };
    if (match(/所属世界|world_tag|(^|[-_])work$/)) return { icon: '🌐', section: 'tag', tone: 'cyan' };
    if (match(/年龄|(^|[-_])age$/)) return { icon: '📆', section: 'tag', tone: 'gold' };
    if (match(/生日|(^|[-_])birthday$/)) return { icon: '🎂', section: 'tag', tone: 'pink' };
    if (match(/性别|(^|[-_])gender$/)) return { icon: '⚥', section: 'tag', tone: 'violet' };
    if (match(/思念度|longing/)) return { icon: '💞', section: 'tag', tone: 'pink' };
    if (match(/当前位置|current_location/)) return { icon: '📍', section: 'lore', tone: 'cyan' };
    if (match(/外貌|appearance/)) return { icon: '🧬', section: 'lore', tone: 'violet' };
    if (match(/喜好|preferences/)) return { icon: '🎀', section: 'lore', tone: 'pink' };
    if (match(/性格|personality/)) return { icon: '🧠', section: 'lore', tone: 'cyan' };
    if (match(/人物说明|detail|备注/)) return { icon: '📜', section: 'lore', tone: 'gold' };
    if (match(/社群角色|阵营|factions/)) return { icon: '🏘️', section: 'list', tone: 'cyan', itemIcon: '◈' };
    if (match(/人事归属|memberships/)) return { icon: '🪪', section: 'list', tone: 'gold', itemIcon: '✦' };
    return { icon: '✧', section: 'core', tone: 'violet' };
  },

  identityInfoListLabel(field = {}, item = {}) {
    const label = String(field?.label || '').trim();
    if (/社群角色|阵营|factions/.test(`${label} ${field?.key || ''}`)) {
      const community = item.community || item.faction || item.name || '未记录';
      const role = item.role || item.position || '';
      return role ? `${community} / ${role}` : community;
    }
    if (/人事归属|memberships/.test(`${label} ${field?.key || ''}`)) {
      const orgName = item.orgName || item.name || '未记录';
      const title = item.title || '';
      const department = item.department || '';
      return [orgName, department, title].filter(Boolean).join(' / ');
    }
    return this.rpgItemSummary(item, field);
  },

  identityInfoPresentation(fields = []) {
    const cards = (fields || []).filter(Boolean).map((field) => {
      const meta = this.identityInfoFieldMeta(field);
      const valueText = this.identityInfoValueText(field);
      return {
        field,
        meta,
        label: String(field?.label || field?.key || '未记录'),
        valueText,
        preview: this.identityInfoPreview(field, meta.section === 'lore' ? 120 : 36),
      };
    });
    const firstBy = (pattern) => cards.find((card) => pattern.test(`${card.label} ${card.field?.key || ''}`));
    const heroName = firstBy(/姓名|(^|[-_])name$/);
    const roleField = firstBy(/身份|(^|[-_])role$/);
    const jobField = firstBy(/职业|(^|[-_])job$/);
    const detailField = firstBy(/人物说明|detail|备注/);
    const personalityField = firstBy(/性格|personality/);
    const appearanceField = firstBy(/外貌|appearance/);
    const tagCards = cards.filter((card) => card.meta.section === 'tag' && card.valueText);
    const listCards = cards.filter((card) => card.meta.section === 'list' && this.isRpgListField(card.field)).map((card) => ({
      ...card,
      count: this.rpgListItems(card.field).length,
      items: this.rpgListItems(card.field).map((item, index) => ({
        field: card.field,
        item,
        index,
        icon: card.meta.itemIcon || '✦',
        label: this.identityInfoListLabel(card.field, item),
        preview: this.identityInfoPreview({ value: this.rpgItemSummary(item, card.field) }, 28),
      })),
    }));
    const usedHeroKeys = new Set([heroName?.field, roleField?.field, jobField?.field, ...tagCards.map((card) => card.field)].filter(Boolean));
    const core = cards.filter((card) => card.meta.section === 'core' && !usedHeroKeys.has(card.field));
    const lore = cards.filter((card) => card.meta.section === 'lore');
    const heroTitle = [roleField?.valueText, jobField?.valueText].filter(Boolean).join(' / ') || '基础档案';
    const heroNote = detailField?.preview || personalityField?.preview || appearanceField?.preview || '该角色的基础身份、外貌与性格档案。';
    const heroStats = listCards.map((card) => ({
      icon: card.meta.icon,
      label: card.label,
      value: `${card.count}项`,
    }));
    return {
      hero: {
        name: heroName?.valueText || '未命名角色',
        title: heroTitle,
        note: heroNote,
      },
      tags: tagCards.map((card) => ({
        field: card.field,
        icon: card.meta.icon,
        label: card.label,
        value: card.preview,
      })),
      stats: heroStats,
      core,
      lore,
      lists: listCards,
    };
  },

  preferenceBalanceTone(value = 50) {
    const num = Number(value) || 0;
    if (num <= 35) return 'cyan';
    if (num >= 65) return 'pink';
    return 'gold';
  },

  goalsFieldRole(field = {}) {
    if (field?.goalsRole) return field.goalsRole;
    const label = String(field?.label || '').trim();
    if (/^(?:人生取向总结|人生总结)$/u.test(label)) return 'portrait';
    if (/^(?:人生取向摘要|目标摘要)$/u.test(label)) return 'summary';
    if (/^(?:短期目标|近期目标)$/u.test(label)) return 'short';
    if (/^中期目标$/u.test(label)) return 'medium';
    if (/^长期目标$/u.test(label)) return 'long';
    if (/^阶段成果$/u.test(label)) return 'achievements';
    if (/^(?:目标|目标方向)$/u.test(label)) return 'goalBundle';
    return 'support';
  },

  extractGoalSection(text = '', labels = []) {
    const source = String(text || '');
    const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!escaped) return '';
    const match = source.match(new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:目标方向|目标摘要|近期方向|中期方向|长期方向|近期目标|中期目标|长期目标)\\s*[：:]|$)`));
    return String(match?.[1] || '').trim();
  },

  parseGoalDirection(text = '', role = 'short') {
    const label = { short: '近期方向', medium: '中期方向', long: '长期方向' }[role];
    const line = this.extractGoalSection(text, [label]);
    const metricLabels = ['权力', '财富', '感情', '欲望'];
    const metrics = metricLabels.map((name) => {
      const match = line.match(new RegExp(`${name}\\s*(\\d+)`));
      const value = Math.max(0, Math.min(100, Number(match?.[1]) || 0));
      return { name, value, icon: { 权力: '⚔️', 财富: '💰', 感情: '💞', 欲望: '🔥' }[name] };
    }).filter((item) => item.value > 0 || line.includes(item.name));
    const dominant = line.match(/主轴偏\s*([^；;，,\n]+)/)?.[1] || '';
    return { label, line, metrics, dominant };
  },

  goalCardField(sourceField = null, role = 'short', title = '', value = '', direction = null) {
    const directionText = direction?.line ? `${direction.label}：${direction.line}` : '';
    return {
      ...(sourceField || {}),
      key: `life_goal_${role}`,
      label: title,
      value: [directionText, value].filter(Boolean).join('\n'),
      desc: `${title}：人生取向确认后的阶段目标。`,
    };
  },

  lifeOrientationPresentation(fields = []) {
    const iconByLabel = {
      价值立场: '⚖️',
      决策风格: '🧠',
      人生六维: '🜂',
      底线锚点: '🛡️',
      心理偏好: '✨',
      人生总结: '📜',
      人生取向总结: '📜',
    };
    const toneByLabel = {
      价值立场: 'violet',
      决策风格: 'cyan',
      人生六维: 'gold',
      底线锚点: 'pink',
      心理偏好: 'violet',
      人生总结: 'violet',
      人生取向总结: 'violet',
    };
    const rows = (fields || []).filter(Boolean).map((field) => {
      const label = String(field?.label || '').trim();
      return {
        field,
        title: label || '补充信息',
        icon: iconByLabel[label] || '✦',
        tone: toneByLabel[label] || 'violet',
        preview: this.identityInfoPreview(field, label.includes('总结') ? 140 : 88),
        valueText: this.identityInfoValueText(field),
      };
    });
    const portrait = rows.find((row) => /总结/.test(row.title)) || null;
    const support = rows.filter((row) => row !== portrait);
    return {
      hero: {
        eyebrow: 'LIFE ORIENTATION',
        title: '人生取向',
        note: portrait?.preview || '价值立场、决策风格与心理偏好等长期取向。',
      },
      support: portrait ? [portrait, ...support] : support,
    };
  },

  goalsPresentation(fields = []) {
    const rows = (fields || []).filter(Boolean).map((field) => {
      const role = this.goalsFieldRole(field);
      const meta = {
        portrait: { icon: '📜', title: '人生取向总结', tone: 'violet' },
        summary: { icon: '🧭', title: '人生取向摘要', tone: 'cyan' },
        short: { icon: '⚔️', title: '短期目标', tone: 'cyan' },
        medium: { icon: '🏗️', title: '中期目标', tone: 'gold' },
        long: { icon: '👑', title: '长期目标', tone: 'pink' },
        achievements: { icon: '🏆', title: '阶段成果', tone: 'violet' },
        goalBundle: { icon: '🧭', title: '目标总览', tone: 'cyan' },
        support: { icon: '✦', title: String(field?.label || field?.key || '补充信息'), tone: 'violet' },
      }[role];
      return {
        field,
        role,
        ...meta,
        valueText: this.identityInfoValueText(field),
        preview: this.identityInfoPreview(field, role === 'portrait' ? 140 : 88),
      };
    });
    const byRole = (role) => rows.find((row) => row.role === role);
    const summary = byRole('summary');
    const bundle = byRole('goalBundle');
    const bundleText = bundle?.valueText || '';
    const goalText = (role) => {
      const direct = byRole(role);
      if (direct?.valueText) return direct.valueText;
      return this.extractGoalSection(bundleText, {
        short: ['短期目标', '近期目标'],
        medium: ['中期目标'],
        long: ['长期目标'],
      }[role]);
    };
    const cards = ['short', 'medium', 'long'].map((role) => {
      const row = byRole(role);
      const fallbackTitle = { short: '短期目标', medium: '中期目标', long: '长期目标' }[role];
      const direction = this.parseGoalDirection(bundleText, role);
      const valueText = goalText(role);
      let tier = row?.field?.goalTier || null;
      if ((!tier || !tier.content) && valueText && valueText !== '未记录') {
        const api = window.GameModules.characterGoalSystem;
        const extracted = api?.normalizeTier?.(valueText.split('\n')[0].replace(/^(?:短期|近期|中期|长期)目标\s*[：:]\s*/u, '')) || null;
        const plain = String(valueText || '').replace(/^(?:短期|近期|中期|长期)目标\s*[：:]\s*/u, '').split('\n')[0].trim();
        if (plain && plain !== '未记录') {
          tier = {
            content: plain,
            deadline: tier?.deadline || '',
            progress: Number.isFinite(Number(tier?.progress)) ? Number(tier.progress) : 0,
            detail: tier?.detail || '',
          };
        } else if (extracted?.content) {
          tier = extracted;
        }
      }
      if (!tier) {
        tier = { content: '', deadline: '', progress: 0, detail: '' };
      }
      const field = row?.field || this.goalCardField(bundle?.field, role, row?.title || fallbackTitle, valueText, direction);
      const progress = Math.max(0, Math.min(100, Number.isFinite(Number(tier.progress)) ? Number(tier.progress) : 0));
      const content = String(tier.content || '').trim();
      const preview = content
        ? (content.length > 96 ? `${content.slice(0, 96)}…` : content)
        : (valueText && valueText !== '未记录' ? (valueText.length > 96 ? `${valueText.slice(0, 96)}…` : valueText) : '未记录');
      return {
        role,
        tone: row?.tone || (role === 'short' ? 'cyan' : role === 'medium' ? 'gold' : 'pink'),
        icon: row?.icon || (role === 'short' ? '⚔️' : role === 'medium' ? '🏗️' : '👑'),
        title: row?.title || fallbackTitle,
        field,
        valueText,
        preview,
        deadline: tier.deadline || '',
        deadlineLabel: tier.deadline ? `期限 ${tier.deadline}` : '未设期限',
        progress,
        detail: String(tier.detail || '').trim(),
        direction,
      };
    });
    const achievementRow = byRole('achievements');
    const achievements = Array.isArray(achievementRow?.field?.goalAchievements)
      ? achievementRow.field.goalAchievements
      : String(achievementRow?.valueText || '')
        .split(/\n+/u)
        .map((line) => line.replace(/^成果\d+[：:]\s*/u, '').trim())
        .filter((line) => line && line !== '未记录')
        .map((text) => ({ text }));
    const summaryText = this.extractGoalSection(bundleText, ['目标摘要']);
    const hasContent = cards.some((card) => card.preview && card.preview !== '未记录') || achievements.length > 0;
    return {
      hero: {
        eyebrow: 'GOAL SYSTEM',
        title: summaryText || summary?.preview || '长期目标',
        note: hasContent ? '短期、中期与长期目标及阶段成果，用于驱动行为与完成度。' : '尚未建立长期目标；完成人生取向向导后自动生成。',
      },
      cards,
      achievements: achievements.slice(0, 5),
      achievementTotal: achievements.length,
      empty: !hasContent,
      support: [],
    };
  },

  essentialPreferencePresentation(fields = []) {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    const layerMeta = tool?.layerMeta || [
      { key: 'layer1', label: '价值立场偏好', prefix: '价值立场偏好' },
      { key: 'layer2', label: '决策风格偏好', prefix: '决策风格偏好' },
      { key: 'layer3', label: '人生六维偏好', prefix: '人生六维偏好' },
      { key: 'layer4', label: '底线锚点偏好', prefix: '底线锚点偏好' },
      { key: 'layer5', label: '心理偏好', prefix: '心理偏好' },
    ];
    const iconByKey = {
      layer1: '⚖️',
      layer2: '🧠',
      layer3: '🜂',
      layer4: '🛡️',
      layer5: '✨',
    };
    const toneByKey = {
      layer1: 'violet',
      layer2: 'cyan',
      layer3: 'gold',
      layer4: 'pink',
      layer5: 'violet',
    };
    const layers = {};
    const rows = (fields || []).filter(Boolean).map((field, index) => {
      const label = String(field?.label || '').trim();
      const valueText = this.identityInfoValueText(field);
      const meta = layerMeta.find((item) => label === item.label || valueText.startsWith(`${item.prefix}:`) || valueText.startsWith(`${item.label}:`)) || layerMeta[index] || null;
      if (meta && valueText) layers[meta.key] = valueText;
      return {
        field,
        key: meta?.key || `extra-${index}`,
        title: meta?.label || label || `偏好层 ${index + 1}`,
        icon: iconByKey[meta?.key] || '✦',
        tone: toneByKey[meta?.key] || 'violet',
        preview: this.identityInfoPreview(field, meta?.key === 'layer5' ? 120 : 90),
        body: meta ? (tool?.stripLayerPrefix?.(valueText, meta.prefix) || valueText) : valueText,
      };
    });
    const normalizedLayers = layerMeta.reduce((acc, item) => {
      if (layers[item.key]) acc[item.key] = layers[item.key];
      return acc;
    }, {});
    // Prefer profile layers (with layer5 repair) so 心理偏好簇 does not vanish when
    // section fields still carry a stale「未勾选」line.
    const stateLayers = this.essentialPreferenceLayersForState?.(this.identityTargetState?.() || null) || null;
    const mergedLayers = { ...normalizedLayers, ...(stateLayers || {}) };
    const stateLayer5 = String(stateLayers?.layer5 || '');
    if (stateLayer5 && !/未勾选/.test(stateLayer5)) mergedLayers.layer5 = stateLayer5;
    let view = tool?.viewFromLayers?.(mergedLayers) || tool?.viewFromLayers?.(normalizedLayers) || null;
    // Continue-game often has empty section fields; rebuild from state/aspiration view.
    if (!view?.alignmentLabel || !(view?.axes || []).length) {
      const stateView = this.essentialPreferenceViewForState?.(this.identityTargetState?.() || null) || null;
      if (stateView?.alignmentLabel) {
        view = {
          ...(view || {}),
          ...stateView,
          axes: (view?.axes || []).length ? view.axes : (stateView.axes || []),
          guiltLines: (view?.guiltLines || []).length ? view.guiltLines : (stateView.guiltLines || []),
          psychGroups: (view?.psychGroups || []).length ? view.psychGroups : (stateView.psychGroups || []),
        };
      }
    } else if (!(view?.psychGroups || []).length) {
      const aspirationView = this.essentialPreferenceViewFromPlayerAspiration?.() || null;
      if ((aspirationView?.psychGroups || []).length) {
        view = { ...(view || {}), psychGroups: aspirationView.psychGroups };
      }
    }
    const fieldByKey = (key) => rows.find((row) => row.key === key)?.field || null;
    const compact = (items = [], limit = 3) => items.map((item) => String(item || '').trim()).filter(Boolean).slice(0, limit).join(' · ');
    const layerPreview = (key, row = null) => {
      if (!view && !row) return '未记录';
      if (key === 'layer1') return view?.alignmentLabel || row?.body || row?.preview || '未记录';
      if (key === 'layer2') return `${view?.rationalityLabel || row?.body || '决策风格待整理'} · ${Number(view?.rationality) || 50}/100`;
      if (key === 'layer3') {
        return compact((view?.axes || []).map((item) => item.summary || `${item.title || '维度'} ${item.value ?? 50}/100`), 3) || row?.body || row?.preview || '未记录';
      }
      if (key === 'layer4') {
        return compact((view?.guiltLines || []).map((item) => item.summary || `${item.title || '底线'} ${item.value ?? 50}/100`), 2) || row?.body || row?.preview || '未记录';
      }
      if (key === 'layer5') {
        const groups = (view?.psychGroups || []).map((group) => {
          const tags = (group.tags || []).slice(0, 2).join(' / ');
          return tags ? `${group.groupLabel}: ${tags}` : group.groupLabel;
        });
        return compact(groups, 3) || row?.body || row?.preview || '未记录';
      }
      return row?.preview || row?.body || '未记录';
    };
    return {
      hero: {
        eyebrow: 'ESSENCE MATRIX',
        title: view?.alignmentLabel || '本质偏好',
        note: `${view?.rationalityLabel || '决策风格待整理'} · 核心价值与心理偏好被固化为长期行为底层。`,
        rationality: Number(view?.rationality) || 50,
      },
      layers: layerMeta.map((item) => {
        const row = rows.find((entry) => entry.key === item.key);
        return {
          key: item.key,
          title: String(item.label || '').replace(/偏好$/u, '') || item.label,
          icon: iconByKey[item.key],
          tone: toneByKey[item.key],
          field: row?.field || fieldByKey(item.key),
          preview: layerPreview(item.key, row),
        };
      }).filter((row) => row.field || row.preview !== '未记录'),
      axes: (view?.axes || []).map((item) => ({
        ...item,
        tone: this.preferenceBalanceTone(item.value),
        field: fieldByKey('layer3'),
      })),
      guiltLines: (view?.guiltLines || []).map((item) => ({
        ...item,
        tone: this.preferenceBalanceTone(item.value),
        field: fieldByKey('layer4'),
      })),
      psychGroups: (view?.psychGroups || []).map((item) => ({
        ...item,
        field: fieldByKey('layer5'),
      })),
    };
  },

  intimacyBodyPresentation(fields = []) {
    const byKey = (key) => this.fieldByKey(fields, key);
    const stateId = String(
      byKey('sexualStatus')?.stateId
      || byKey('sexualPartnerCount')?.stateId
      || byKey('sexualPartners')?.stateId
      || byKey('sexualExperienceCount')?.stateId
      || byKey('sexualExperienceParts')?.stateId
      || this.identityTargetId
      || ''
    ).trim();
    const targetState = stateId && stateId !== 'player-self'
      ? (this.rpgStates?.[stateId] || window.GameModules.characterStateStore?.get?.(stateId) || null)
      : null;
    const targetProfile = stateId === 'player-self'
      ? { ...(this.playerProfile || {}), isPlayer: true }
      : (targetState?.profile || null);
    const isMalePlayer = Boolean(targetProfile?.isPlayer) && /^(男|male)$/i.test(String(targetProfile?.gender || '').trim());
    const summaryRows = (isMalePlayer ? [
      { key: 'sexualPartnerCount', title: '性经历人数', icon: '🤝', tone: 'cyan' },
    ] : [
      { key: 'sexualStatus', title: '当前状态', icon: '💞', tone: 'pink' },
      { key: 'sexualPartnerCount', title: '经历人数', icon: '🤝', tone: 'cyan' },
      { key: 'sexualExperienceCount', title: '总次数', icon: '📎', tone: 'gold' },
    ]).map((meta) => {
      const field = byKey(meta.key);
      return {
        ...meta,
        field,
        valueText: this.identityInfoValueText(field) || '未记录',
        preview: this.identityInfoPreview(field, 48),
      };
    }).filter((row) => row.field);
    const partnersField = byKey('sexualPartners');
    const experienceField = byKey('sexualExperienceParts');
    const bodyField = byKey('bodyStatus');
    const partnerRows = this.rpgListItems(partnersField).map((item, index) => ({
      field: partnersField,
      item,
      index,
      icon: '◈',
      title: this.rpgItemSummary(item, partnersField),
    }));
    const experienceRows = this.rpgListItems(experienceField).map((item, index) => ({
      field: experienceField,
      item,
      index,
      icon: '✦',
      title: item?.name || this.rpgItemName(item),
      preview: this.rpgItemSummary(item, experienceField),
    }));
    const bodyRows = this.rpgListItems(bodyField).map((item, index) => {
      const row = this.initUiRow(bodyField, item) || {};
      const desc = item?.description || item?.['描述状态'] || '';
      return {
        field: bodyField,
        item,
        index,
        icon: this.bodyPartEmoji(item?.part || item?.partKey || row.name || item?.name || ''),
        title: row.name || item?.part || item?.partKey || item?.name || ('状态' + (index + 1)),
        value: row.value || item?.status || '未记录',
        preview: desc || row.value || '暂无额外说明',
      };
    });
    const visiblePartnerRows = isMalePlayer
      ? (partnerRows.length ? partnerRows : experienceRows.map((row, index) => ({
        field: row.field,
        item: row.item,
        index,
        icon: row.icon,
        title: row.title,
        preview: row.preview,
      })))
      : partnerRows;
    return {
      hero: {
        eyebrow: 'INTIMACY RECORD',
        title: isMalePlayer
          ? (summaryRows[0]?.valueText || '性经历档案')
          : (summaryRows.find((row) => row.key === 'sexualStatus')?.valueText || '身体状态'),
        note: isMalePlayer
          ? '男性玩家仅展示性经历人数与性经历列表。'
          : '按当前状态、经历脉络与身体部位记录现实推演中的亲密与体征信息。',
      },
      groups: {
        partner: isMalePlayer
          ? { title: '性经历列表', hint: '已记录对象' }
          : { title: '关联对象', hint: '经历名册' },
        experience: { title: '经历谱系', hint: '分类计数' },
        body: { title: '体征监测', hint: '部位状态' },
      },
      summaryRows,
      partnerRows: visiblePartnerRows,
      experienceRows: isMalePlayer ? [] : experienceRows,
      bodyRows: isMalePlayer ? [] : bodyRows,
    };
  },
  personalAbilityPresentation(fields = [], state = null) {
    const byKey = (key) => this.fieldByKey(fields, key);
    const levelField = byKey('level');
    const expField = byKey('exp');
    const exp = this.parseExpMetric(expField, levelField);
    const hero = {
      level: Number(levelField?.raw ?? levelField?.value) || 1,
      levelField,
      expField,
      exp,
      freePoints: Number(byKey('free_attribute_points')?.raw ?? byKey('free_attribute_points')?.value) || 0,
      freeField: byKey('free_attribute_points'),
      growthField: byKey('level_growth'),
      growthSummary: byKey('level_growth')?.value || '暂无升级记录',
    };
    const survivalKeys = [
      { key: 'vitality', label: '生命力', tone: 'hp' },
      { key: 'stamina_pool', label: '精力', tone: 'energy' },
      { key: 'satiety', label: '饱食', tone: 'food' },
      { key: 'hydration', label: '水分', tone: 'water' },
      { key: 'fatigue', label: '疲劳', tone: 'fatigue' },
    ];
    const survival = survivalKeys.map(({ key, label, tone }) => {
      const field = byKey(key);
      return { key, label, tone, field, ...this.parsePoolMetric(field) };
    });
    const growthKeys = [
      { key: 'learning_ability', label: '学习', pool: false },
      { key: 'mental_stability', label: '精神', pool: true },
      { key: 'growth_potential', label: '潜力', pool: false },
      { key: 'action_ability', label: '行动', pool: true },
    ];
    const growth = growthKeys.map(({ key, label, pool }) => {
      const field = byKey(key);
      const metric = pool ? this.parsePoolMetric(field) : null;
      const value = metric ? metric.current : Number(field?.raw ?? field?.value) || 0;
      const cap = metric?.max || 100;
      const percent = Math.max(0, Math.min(100, Math.round((value / cap) * 100)));
      return { key, label, field, value, cap, percent, display: field?.value || String(value) };
    });
    const collectionKeys = [
      { key: 'knowledge', label: '知识储备', unit: '知识' },
      { key: 'skills', label: '技能等级', unit: '技能' },
      { key: 'professions', label: '职业等级', unit: '职业' },
    ];
    const learnedCounts = Object.fromEntries(collectionKeys.map(({ key }) => {
      const field = byKey(key);
      return [key, this.rpgListItems(field).length];
    }));
    const learnedGroups = this.personalAbilityLearnedGroups(fields);
    const advancedKeys = ['control_experience', 'derived', 'combat_simulation'];
    const advanced = advancedKeys.map((key) => byKey(key)).filter(Boolean);
    const usedKeys = new Set([
      'level', 'exp', 'free_attribute_points', 'level_growth',
      ...survivalKeys.map((item) => item.key),
      ...growthKeys.map((item) => item.key),
      ...collectionKeys.map((item) => item.key),
      ...advancedKeys,
    ]);
    const misc = (fields || []).filter((field) => !usedKeys.has(field.key));
    return { hero, survival, growth, learnedGroups, linkedGroups: learnedGroups, learnedCounts, advanced, misc };
  },

  intrinsicStatMeta() {
    return [
      { key: 'strength', label: '力量', icon: '💪', tone: 'str', group: '体能', groupIcon: '🏋️' },
      { key: 'agility', label: '敏捷', icon: '⚡', tone: 'agi', group: '体能', groupIcon: '🏋️' },
      { key: 'constitution', label: '体质', icon: '🛡️', tone: 'con', group: '体能', groupIcon: '🏋️' },
      { key: 'intelligence', label: '智力', icon: '🧠', tone: 'int', group: '心智', groupIcon: '🎯' },
      { key: 'perception', label: '感知', icon: '👁️', tone: 'per', group: '心智', groupIcon: '🎯' },
      { key: 'willpower', label: '意志', icon: '🔥', tone: 'wil', group: '心智', groupIcon: '🎯' },
      { key: 'charisma', label: '魅力', icon: '✨', tone: 'cha', group: '气质', groupIcon: '🌟' },
    ];
  },

  intrinsicLinkedItems(values = {}) {
    const sync = window.GameModules.progressionLearnedSync;
    const labelByKey = sync?.intrinsicLabelByKey || {};
    const keys = window.GameModules.progression?.intrinsicKeys?.() || [];
    const map = Object.fromEntries(keys.map((key) => [key, { key, label: labelByKey[key] || key, items: [] }]));
    const collect = (list = [], type) => {
      for (const item of list || []) {
        if (!item || typeof item !== 'object') continue;
        const linked = [
          ...(Array.isArray(item.linkedStats) ? item.linkedStats : []),
          ...(sync?.normalizeIntrinsicBase?.(item.requiredIntrinsicBase || []) || []),
        ];
        for (const key of linked) {
          if (!map[key]) continue;
          const name = String(item.name || '').trim();
          if (!name || map[key].items.some((row) => row.name === name && row.type === type)) continue;
          map[key].items.push({ type, name, level: Number(item.level) > 0 ? item.level : null });
        }
      }
    };
    collect(values.skills, '技能');
    collect(values.knowledge, '知识');
    collect(values.professions, '职业');
    return keys.map((key) => map[key]).filter((row) => row.items.length);
  },

  intrinsicAbilityPresentation(fields = [], state = null) {
    const values = state?.values || {};
    const stats = this.intrinsicStatMeta().map((meta) => {
      const field = this.fieldByKey(fields, meta.key);
      const value = Number(field?.raw ?? field?.value) || 0;
      const percent = Math.max(0, Math.min(100, Math.round(value)));
      const src = field?.source || values.intrinsic_sources?.[meta.key] || null;
      const breakdown = src ? {
        initial: Number(src.initial) || 0,
        level: Number(src.level) || 0,
        allocated: Number(src.allocated) || 0,
        npc: Number(src.npc) || 0,
      } : null;
      const breakdownText = breakdown
        ? `初${breakdown.initial} + 级${breakdown.level} + 分${breakdown.allocated}${breakdown.npc ? ` + 成长${breakdown.npc}` : ''}`
        : '';
      return {
        ...meta,
        field,
        value,
        percent,
        display: field?.value || String(value),
        breakdown,
        breakdownText,
      };
    });
    const total = stats.reduce((sum, row) => sum + row.value, 0);
    const average = stats.length ? Math.round(total / stats.length) : 0;
    const peak = stats.reduce((best, row) => ((!best || row.value > best.value) ? row : best), null);
    const low = stats.reduce((worst, row) => ((!worst || row.value < worst.value) ? row : worst), null);
    const groups = ['体能', '心智', '气质'].map((name) => {
      const rows = stats.filter((row) => row.group === name);
      const groupIcon = rows[0]?.groupIcon || '📊';
      const subtotal = rows.reduce((sum, row) => sum + row.value, 0);
      return { name, icon: groupIcon, rows, subtotal, average: rows.length ? Math.round(subtotal / rows.length) : 0 };
    });
    return {
      stats,
      groups,
      links: this.intrinsicLinkedItems(values),
      summary: { total, average, peak, low },
    };
  },

  itemEmoji(itemOrName = '') {
    const item = itemOrName && typeof itemOrName === 'object' ? itemOrName : null;
    const name = item ? this.rpgItemName(item) : String(itemOrName || '');
    const explicit = String(item?.emoji || item?.icon || '').trim();
    if (explicit && !/^https?:/i.test(explicit)) {
      const chars = [...explicit];
      if (chars.length <= 4) return explicit;
    }
    const text = [name, item?.desc, item?.description, item?.source, ...(Array.isArray(item?.tags) ? item.tags : [])].filter(Boolean).join(' ');
    const n = text || name;
    if (/电脑|笔记本|laptop|平板|ipad/i.test(n)) return '💻';
    if (/手机|phone|通讯/i.test(n)) return '📱';
    if (/钥匙|key/i.test(n)) return '🔑';
    if (/钱包|皮夹|卡包/i.test(n)) return '👛';
    if (/眼镜|墨镜/i.test(n)) return '👓';
    if (/耳机|耳麦|airpod/i.test(n)) return '🎧';
    if (/手表|手环|watch/i.test(n)) return '⌚';
    if (/伞|雨具/i.test(n)) return '☂️';
    if (/书|笔记|文档|资料/i.test(n)) return '📚';
    if (/笔|文具|铅笔|钢笔/i.test(n)) return '✏️';
    if (/刀|剑|武器|枪/i.test(n)) return '🗡️';
    if (/药|胶囊|医疗|绷带/i.test(n)) return '💊';
    if (/食|餐|饭|零食|面包|果/i.test(n)) return '🍱';
    if (/水|饮|茶|咖啡|奶茶|瓶/i.test(n)) return '🥤';
    if (/包|袋|背包|手提/i.test(n)) return '🎒';
    if (/卡|证|身份证|会员/i.test(n)) return '🪪';
    if (/钱|现金|硬币|纸币/i.test(n)) return '💴';
    if (/充电|数据|线|电源|电池/i.test(n)) return '🔌';
    if (/衣|服|裙|裤|鞋|帽|袜|穿戴/i.test(n)) return '👕';
    if (/妆|护肤|香水|镜/i.test(n)) return '💄';
    if (/玩具|玩偶|模型/i.test(n)) return '🧸';
    if (/工具|螺丝|锤/i.test(n)) return '🛠️';
    return this.fallbackItemEmoji(name);
  },

  fallbackItemEmoji(name = '') {
    const pool = ['📦', '🎁', '🧰', '🛍️', '🏷️', '📎', '🧷', '🔖', '📌', '🗂️'];
    const seed = [...String(name || '物品')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return pool[seed % pool.length];
  },

  wearSlotEmoji(slot = '') {
    const map = {
      头部: '🧢', 颈部: '🧣', 内衣: '👕', 上衣: '👔', 外套: '🧥', 手套: '🧤',
      腰部: '🪢', 下装: '👖', 袜子: '🧦', 鞋子: '👟', 手腕: '⌚',
    };
    return map[String(slot || '').trim()] || '👕';
  },

  bodyPartEmoji(part = '') {
    const map = {
      头发: '💇', 脸部: '😊', 耳朵: '👂', 脖颈: '🦢', 胸部: '💗', 双臂: '💪',
      小腹: '🫃', 臀部: '🍑', 神秘花园: '🌸', 双大腿: '🦵', 双小腿: '🦶',
    };
    const key = Object.keys(map).find((name) => String(part || '').includes(name));
    return key ? map[key] : '📍';
  },

  inventoryPresentation(fields = []) {
    const itemsField = this.fieldByKey(fields, 'items');
    const wearingField = this.fieldByKey(fields, 'wearing');
    const items = this.rpgListItems(itemsField).map((item, index) => ({
      field: itemsField,
      item,
      index,
      icon: this.itemEmoji(item),
      name: this.rpgItemName(item),
    }));
    const wearSlots = this.rpgListItems(wearingField).map((item, index) => {
      const slot = item.clothing_position || item.slotLabel || '其他';
      const name = this.rpgItemName(item);
      const empty = !name || name === '--' || name === '—';
      return {
        field: wearingField,
        item,
        index,
        slot,
        icon: this.wearSlotEmoji(slot),
        label: slot,
        key: `${slot}-${index}`,
        display: empty ? '—' : name,
        empty,
      };
    });
    return {
      items,
      wearSlots,
      itemCount: items.length,
      wearingCount: wearSlots.filter((row) => !row.empty).length,
    };
  },

  bodyProfilePanel(section = {}, stateOverride = null) {
    const title = String(section?.title || '').trim();
    const field = section?.fields?.[0] || null;
    const state = stateOverride || (field ? this.activeDetailState?.(field) : null) || this.identityTargetState?.() || null;
    try {
      return this.bodyProfilePresentation(field, title, state);
    } catch (err) {
      console.error('[身体档案]', err);
      const silhouette = this.fallbackBodySilhouette(state?.profile || {}, {}, title);
      return { meta: '', rows: [], count: 0, icon: title === '盛装' ? '👗' : '🌿', silhouette };
    }
  },

  bodyFigureMaskKey(section = {}) {
    const title = String(section?.title || '').trim();
    return title === '盛装' ? 'dressed' : 'natural';
  },

  bodyFigureMaskEnabled(section = {}) {
    const key = this.bodyFigureMaskKey(section);
    return Boolean(this.bodyFigureMaskState?.[key]);
  },

  async setBodyFigureMask(section = {}, enabled = false) {
    const key = this.bodyFigureMaskKey(section);
    this.bodyFigureMaskState = { ...(this.bodyFigureMaskState || {}), [key]: Boolean(enabled) };
    if (enabled) {
      await window.GameModules.bodyFigure?.prefetchMask?.();
    } else {
      window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag: 'body-figure-mask-off', key } }));
    }
    try {
      await this.save?.();
    } catch (err) {
      console.warn('[body-figure] 遮罩状态保存失败:', err?.message || err);
    }
    return this.bodyFigureMaskEnabled(section);
  },

  toggleBodyFigureMask(section = {}) {
    return this.setBodyFigureMask(section, !this.bodyFigureMaskEnabled(section));
  },

  bodyFigureCharacterName(id = '', fallback = {}) {
    const key = String(id || '').trim();
    if (!key) return '';
    const state = this.rpgStates?.[key] || window.GameModules.characterStateStore?.get?.(key) || (key === 'player-self' ? this.playerIdentityState?.() : null) || {};
    const profile = state.profile || {};
    const contact = (this.wechatUsers || []).find((item) => String(item?.id || '') === key) || {};
    return String(fallback.characterName || fallback.ownerName || fallback.personName || profile.name || state.name || contact.name || (key === 'player-self' ? (this.playerName || this.playerProfile?.name) : '') || key).trim();
  },

  bodyFigurePickerContext(section = {}) {
    const title = String(section?.title || '').trim();
    const field = section?.fields?.[0] || null;
    const state = (field ? this.activeDetailState?.(field) : null) || this.identityTargetState?.() || this.playerIdentityState?.() || this.currentRpgState || null;
    const source = this.profileAppearanceSource?.(state || {}) || state?.profile || {};
    const profile = { ...(state?.profile || {}), ...source };
    const cfg = window.GameModules.appearanceProfileTags;
    const kind = this.bodyFigureMaskKey(section);
    const isDressed = kind === 'dressed';
    const meta = isDressed ? (source.dressedProfileMeta || {}) : (source.bodyProfileMeta || {});
    const rawList = isDressed ? (source.dressedProfile || []) : (source.bodyProfile || []);
    const listField = {
      ...(section?.fields?.[0] || {}),
      key: isDressed ? 'dressedProfile' : 'bodyProfile',
      stateId: state?.id || '',
      raw: rawList,
      meta,
    };
    const rows = this.rpgListItems(listField).map((item, index) => {
      const part = String(item.part || item.name || '').trim();
      const desc = String(item.description || item.detail || '').trim();
      const tags = Array.isArray(item.tags) && item.tags.length ? item.tags.join('、') : '';
      return {
        field: listField,
        item,
        index,
        icon: this.bodyPartEmoji(part),
        title: `${item.index || index + 1}. ${part}`,
        tags: tags ? `[${tags}]` : '',
        preview: desc.length > 52 ? `${desc.slice(0, 52)}…` : desc,
      };
    });
    const characterId = String(state?.id || this.identityTargetId || 'player-self').trim() || 'player-self';
    const characterName = this.bodyFigureCharacterName(characterId, profile);
    const normalizedMeta = isDressed
      ? (cfg?.normalizeDressedMeta?.(meta, profile) || meta || {})
      : (cfg?.normalizeNaturalMeta?.(meta, profile) || meta || {});
    return {
      title,
      kind,
      rows,
      characterId,
      characterName,
      figureMeta: { ...(normalizedMeta || {}), characterId, ownerId: characterId, personId: characterId, stateKind: kind },
    };
  },

  bodyFigurePickerLabel() {
    const target = this.bodyFigurePickerTarget || {};
    return `${target.characterName || target.characterId || '角色'}｜${target.kind === 'dressed' ? '盛装状态' : '自然状态'}`;
  },

  normalizeBodyFigurePickerItem(item = {}, target = this.bodyFigurePickerTarget || {}) {
    const boundOwnerId = String(item.boundOwnerId || '').trim();
    const active = Boolean(boundOwnerId && target.characterId && boundOwnerId === target.characterId);
    const boundOwnerName = boundOwnerId ? this.bodyFigureCharacterName(boundOwnerId, item) : '';
    return {
      ...item,
      active,
      boundOwnerName,
      disabled: Boolean(boundOwnerId && !active),
      scoreLabel: active ? '当前绑定' : `匹配 ${Math.max(0, Number(item.baseScore || item.score || 0))}`,
      sourceLabel: item.generated ? '生成图片' : '预设图片',
    };
  },

  async refreshBodyFigurePickerItems() {
    const target = this.bodyFigurePickerTarget;
    if (!target?.characterId) return;
    this.bodyFigurePickerLoading = true;
    this.bodyFigurePickerError = '';
    try {
      const choices = await window.GameModules.bodyFigure?.listFigureChoices?.(target.figureMeta, target.rows) || [];
      this.bodyFigurePickerItems = choices.map((item) => this.normalizeBodyFigurePickerItem(item, target));
    } catch (err) {
      this.bodyFigurePickerError = err?.message || String(err);
      this.bodyFigurePickerItems = [];
    } finally {
      this.bodyFigurePickerLoading = false;
    }
  },

  async openBodyFigurePicker(section = {}) {
    this.bodyFigurePickerTarget = this.bodyFigurePickerContext(section);
    this.bodyFigurePickerKind = this.bodyFigurePickerTarget.kind;
    this.bodyFigurePickerOpen = true;
    await this.refreshBodyFigurePickerItems();
  },

  closeBodyFigurePicker() {
    if (this.bodyFigurePickerLoading) return;
    this.bodyFigurePickerOpen = false;
    this.bodyFigurePickerError = '';
  },

  async setBodyFigurePickerCurrent(item = {}) {
    const target = this.bodyFigurePickerTarget;
    if (!target?.characterId || !item?.path || item.disabled || item.active) return;
    this.bodyFigurePickerLoading = true;
    this.bodyFigurePickerError = '';
    try {
      const result = await window.GameModules.bodyFigure?.bindCurrentFigure?.(item.path, target.characterId, target.characterName, { stateKind: target.kind });
      if (!result?.ok) throw new Error(result?.error || '设置形象图失败');
      const contact = this.wechatAlbumContact?.(target.characterId)
        || this.wechatContactFromState?.(target.characterId)
        || { id: target.characterId, name: target.characterName || target.characterId };
      await this.autoCaptureWechatAvatarFromUrl?.(item.imageSrc, contact);
      await this.refreshBodyFigurePickerItems();
    } catch (err) {
      this.bodyFigurePickerError = err?.message || String(err);
    } finally {
      this.bodyFigurePickerLoading = false;
    }
  },

  bodyProfilePresentation(field, sectionTitle = '', stateOverride = null) {
    const state = stateOverride || (field ? this.activeDetailState(field) : null) || this.identityTargetState?.() || this.currentRpgState || null;
    const source = this.profileAppearanceSource(state || {});
    const profile = { ...(state?.profile || {}), ...source };
    const cfg = window.GameModules.appearanceProfileTags;
    const isDressed = sectionTitle === '盛装';
    const meta = isDressed ? (source.dressedProfileMeta || {}) : (source.bodyProfileMeta || {});
    const rawList = isDressed ? (source.dressedProfile || []) : (source.bodyProfile || []);
    const listField = {
      ...(field || {}),
      key: isDressed ? 'dressedProfile' : 'bodyProfile',
      stateId: field?.stateId || state?.id || '',
      raw: rawList,
      meta,
      metaText: isDressed ? (cfg?.formatDressedMeta?.(meta) || '') : (cfg?.formatNaturalMeta?.(meta) || ''),
      kind: isDressed ? '盛装状态' : '身体原貌',
      type: isDressed ? '盛装状态' : '身体原貌',
    };
    const rows = this.rpgListItems(listField).map((item, index) => {
      const part = String(item.part || item.name || '').trim();
      const desc = String(item.description || item['部位描写'] || '').trim();
      const tags = Array.isArray(item.tags) && item.tags.length ? item.tags.join('、') : '';
      return {
        field: listField,
        item,
        index,
        icon: this.bodyPartEmoji(part),
        title: `${item.index || index + 1}. ${part}`,
        tags: tags ? `[${tags}]` : '',
        preview: desc.length > 52 ? `${desc.slice(0, 52)}…` : desc,
      };
    });
    const silhouetteBase = window.GameModules.bodySilhouette?.resolvePresentation?.(profile, meta, sectionTitle)
      || this.fallbackBodySilhouette(profile, meta, sectionTitle);
    const figureMeta = { ...(meta || {}), characterId: state?.id || '', ownerId: state?.id || '', personId: state?.id || '', stateKind: isDressed ? 'dressed' : 'natural' };
    const figureOptions = { mask: this.bodyFigureMaskEnabled?.({ title: sectionTitle }) };
    const figureRaw = window.GameModules.bodyFigure?.resolveSync?.(figureMeta, rows, sectionTitle, figureOptions) || null;
    if (figureRaw?.pending) {
      window.GameModules.bodyFigure?.resolve?.(figureMeta, rows, sectionTitle, figureOptions)
        ?.then?.((figure) => {
          if (figure) window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag: figure.tag, id: figure.id, sectionTitle } }));
        });
    }
    const figure = figureRaw && !figureRaw.pending ? figureRaw : null;
    const silhouette = figure ? null : silhouetteBase;
    return {
      meta: listField.metaText || '',
      rows,
      count: rows.length,
      icon: sectionTitle === '盛装' ? '👗' : '🌿',
      silhouette,
      figure,
      figurePending: Boolean(figureRaw?.pending),
    };
  },

  fallbackBodySilhouette(profile = {}, meta = {}, sectionTitle = '') {
    const gender = /男|male/i.test(String(profile.gender || '')) ? 'male' : 'female';
    const key = gender === 'male' ? 'male-youth' : 'female-shoujo';
    const hotspots = window.GameModules.bodySilhouette?.hotspots || [
      { part: '头发', x: 28, y: 1, w: 44, h: 14 },
      { part: '脸部', x: 30, y: 10, w: 40, h: 12 },
      { part: '耳朵', x: 22, y: 12, w: 56, h: 8 },
      { part: '脖颈', x: 36, y: 20, w: 28, h: 7 },
      { part: '胸部', x: 30, y: 26, w: 40, h: 14 },
      { part: '双臂', x: 14, y: 28, w: 72, h: 18 },
      { part: '小腹', x: 32, y: 40, w: 36, h: 12 },
      { part: '臀部', x: 30, y: 52, w: 40, h: 10 },
      { part: '神秘花园', x: 36, y: 61, w: 28, h: 9 },
      { part: '双大腿', x: 28, y: 70, w: 44, h: 14 },
      { part: '双小腿', x: 30, y: 84, w: 40, h: 14 },
    ];
    return {
      key,
      label: gender === 'male' ? '男 · 青年体型' : '女 · 少女体型',
      src: `assets/body-silhouettes/${key}.svg`,
      remote: false,
      sectionTitle,
      hotspots: hotspots.map((spot) => ({ ...spot })),
    };
  },

  openBodySilhouettePart(rows = [], part = '') {
    return window.GameModules.bodySilhouette?.openBodyPartDetail?.(rows, part) || false;
  },

  isBodySilhouettePartActive(rows = [], part = '') {
    return window.GameModules.bodySilhouette?.isBodyPartActive?.(rows, part) || false;
  },

  bodyFigureCalloutStyle(ann = {}) {
    return window.GameModules.bodyFigure?.calloutStyle?.(ann) || '';
  },

  bodyFigureAnchorStyle(ann = {}) {
    return window.GameModules.bodyFigure?.anchorStyle?.(ann) || '';
  },

  startBodyFigureAnchorDrag(event, figure = {}, ann = {}) {
    return window.GameModules.bodyFigure?.startAnchorDrag?.(event, figure, ann);
  },

  startBodyFigureLabelDrag(event, figure = {}, ann = {}) {
    return window.GameModules.bodyFigure?.startLabelDrag?.(event, figure, ann);
  },

  openBodyFigurePart(rows = [], part = '', event = null) {
    return window.GameModules.bodyFigure?.openAnnotationPart?.(rows, part, event) || false;
  },

  isBodyFigurePartActive(rows = [], part = '') {
    return window.GameModules.bodyFigure?.isAnnotationActive?.(rows, part) || false;
  },
};
