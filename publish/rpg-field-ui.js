window.GameModules = window.GameModules || {};

window.GameModules.rpgFieldUi = {
  rpgFieldKey(field) { return `${field?.stateId || 'state'}:${field?.key || ''}:${field?.label || ''}`; },
  rpgItemKey(field, index) { return `${this.rpgFieldKey(field)}:item:${index}`; },
  toggleRpgField(field) { const key = this.rpgFieldKey(field); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  toggleRpgItem(field, index) { const key = this.rpgItemKey(field, index); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  isRpgFieldOpen(field) { return this.expandedRpgFieldKey === this.rpgFieldKey(field); },
  isRpgItemOpen(field, index) { return this.expandedRpgFieldKey === this.rpgItemKey(field, index); },
  isRpgListField(field) { return ['knowledge', 'skills', 'professions', 'factions', 'force_positions', 'items', 'wearing', 'bodyProfile', 'dressedProfile', 'bodyStatus', 'sexualExperienceParts', 'sexualPartners', 'status_tags'].includes(field?.key) && Array.isArray(field.raw); },
  rpgFieldSummary(field) {
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
    const row = (key, label, value, desc) => ({ key: `profile-${state?.id || 'target'}-${key}`, stateId: state?.id || '', label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: key !== 'work' });
    return [
      row('name', '姓名', p.name || state?.name, '角色卡固化姓名。'), row('work', '所属世界', worldTag, '角色出身作品或世界。'),
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

  profileSections(state, identityFields = []) {
    const displayState = this.profileDisplayState(state, identityFields);
    const entries = this.rpgEntries?.(displayState) || [];
    const all = entries.flatMap((section) => section.fields || []);
    const byKey = (key) => all.find((field) => field.key === key);
    const take = (keys) => keys.map(byKey).filter(Boolean);
    const identity = this.profileIdentityFields(displayState, identityFields);
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
    const used = new Set(['world_tag', 'age', 'factions', 'force_positions', 'current_location', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma', 'items', 'wearing', 'bodyProfile', 'dressedProfile', 'bodyStatus', 'intimacy', 'status_tags']);
    const personal = all.filter((field) => !used.has(field.key));
    const groups = [
      { title: '个人能力', fields: personal },
      { title: '身内能力', fields: take(['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']) },
      { title: '装备与物品', fields: take(['items', 'wearing']) },
      { title: '当前自然状态', fields: naturalState ? [naturalState] : [] },
      { title: '盛装', fields: dressedState ? [dressedState] : [] },
      { title: '状态标签', fields: take(['status_tags']) },
      { title: '人际关系', fields: relations },
      { title: '身份信息', fields: [...identityRest, ...(longing ? [longing] : []), ...take(['world_tag', 'age', 'current_location', 'factions', 'force_positions'])] },
    ];
    return this.placeProfileSection(groups, { title: intimacyUi.sectionTitle || '身体状态', fields: intimacyFields }, intimacyUi).filter((group) => group.fields.length);
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
    const p = state?.profile || {};
    return this.profileBodyStateField(state, p.bodyProfile, {
      key: 'bodyProfile', label: '当前自然状态', kind: '身体原貌', type: '身体原貌',
      desc: '角色未经衣物遮掩、未作人工修饰时的原本身体状态。',
      reason: `${p.name || '该人物'}的自然状态来自角色卡 Part5 身体原貌生成结果。`,
    });
  },

  profileDressedStateField(state = {}) {
    const p = state?.profile || {};
    return this.profileBodyStateField(state, p.dressedProfile, {
      key: 'dressedProfile', label: '盛装', kind: '盛装状态', type: '盛装状态',
      desc: '角色盛装或打扮完全后各身体部位的造型、修饰与衣物包裹状态。',
      reason: `${p.name || '该人物'}的盛装状态来自角色卡 Part6 盛装状态生成结果。`,
    });
  },

  profileBodyStateField(state = {}, source = [], meta = {}) {
    const p = state?.profile || {};
    const list = Array.isArray(source) ? source : [];
    const rows = list.map((item, index) => {
      const part = String(item?.part || item?.部位 || '').trim();
      const description = String(item?.description || item?.部位描写 || '').trim();
      if (!part || !description) return null;
      return { index: Number(item?.index || item?.序号) || index + 1, part, description, name: part, type: meta.type };
    }).filter(Boolean).sort((a, b) => a.index - b.index);
    if (!rows.length) return null;
    return {
      key: meta.key, stateId: state?.id || '', label: meta.label, kind: meta.kind, value: rows.map((item) => `${item.part}：${item.description}`), raw: rows,
      desc: meta.desc, reason: meta.reason,
      worldTag: p.work || state?.worldTag || '原创世界', targetType: p.isPlayer ? '非角色' : '角色', commonField: true,
    };
  },

  lexiconKind(field, item = null) {
    if (item?.type) return item.type;
    if (field?.key && !item) return { knowledge: '知识树', skills: '技能树', professions: '职业树', factions: '社群角色', force_positions: '势力地位', items: '物品', wearing: '穿着', bodyProfile: '身体原貌', dressedProfile: '盛装状态', status_tags: '状态' }[field.key] || field.kind || '属性';
    if (field?.kind) return field.kind;
    return { factions: '社群角色', force_positions: '势力地位', items: '物品', wearing: '穿着', bodyProfile: '身体原貌', dressedProfile: '盛装状态', status_tags: '状态' }[field?.key] || '属性';
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
    if (/性别：|年龄：|生日：|具体地址：|势力地位：|社群角色：|居住：|父母：|关系：|备注：|关系为.*备注为|居住在.*生活状态.*家庭状态/.test(text)) return '';
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
    if (item?.type === '身体原貌' || item?.type === '盛装状态') return `${item.index || ''}.${item.part || name}`;
    if (item?.type === '性经验分类') return `${item.name || name}：${item.initialCount || 0}(初次见面) + ${item.laterCount || 0} (后续次数)`;
    if (item?.type === '当前身体状态') {
      const desc = item.description || item['描述状态'] || '';
      return `${item.part || name}：${item.status || '稳定'}${desc ? `｜${desc}` : ''}`;
    }
    const levelName = Number(item?.level) > 0 ? `${name} lv.${item.level}` : name;
    if (item?.type === '穿着' && item?.slot && item?.clothing_position) return `${item.clothing_position}｜${levelName}`;
    return levelName;
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
    if (kind === '势力地位') {
      const force = obj.force || obj.faction || info.force || info.faction || name.split('/')[0]?.trim();
      const position = obj.position || info.position || name.split('/')[1]?.trim() || '成员';
      return `势力：${force}；地位：${position}。该词条说明角色在有层级制度势力中的等级、职级、年级或职位。`;
    }
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },

  rpgItemDetail(field, item) {
    const lexicon = this.lexiconFor(field, item);
    const obj = typeof item === 'string' ? { name: item, type: this.lexiconKind(field, item) } : item;
    const info = lexicon?.meta?.info || obj?.info || {};
    const exp = obj?.exp || {};
    const statName = { strength: '力量', agility: '敏捷', constitution: '体质', intelligence: '智力', perception: '感知', willpower: '意志', charisma: '魅力' };
    const linkedStats = (info.intrinsicStats || obj?.linkedStats || []).map((x) => statName[x] || x);
    const kind = field?.key === 'sexualExperienceParts' ? '性经验分类' : (obj?.type || this.lexiconKind(field, obj));
    const name = this.rpgItemName(obj) || field?.label || '未知';
    if (kind === '身体原貌' || kind === '盛装状态') return [`部位: ${name}`, `序号: ${obj.index || '未记录'}`, `所属世界: ${field?.worldTag || '公共'}`, `词条类型: ${field?.targetType || '角色'}`, `当前依据: ${field?.reason || (kind === '盛装状态' ? '来自角色卡 Part6 盛装状态生成结果。' : '来自角色卡 Part5 身体原貌生成结果。')}`].join('\n');
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
    if (kind === '势力地位' && (obj?.force || obj?.faction || info.force || info.faction)) lines.push(`势力: ${obj.force || obj.faction || info.force || info.faction}`, `地位: ${obj.position || info.position || '成员'}`);
    if (hasLevel) {
      lines.push(`等级: lv${obj.level}`);
      lines.push(`当前等级含义: ${obj?.levelDescription || info.levelDescription || window.GameModules.progression.levelDescription(kind, obj.level)}`);
      lines.push(`完整等级含义: ${window.GameModules.progression.levelDescriptionList(kind)}`);
      lines.push(`等级效果: ${obj?.effect || info.effect || window.GameModules.progression.levelEffect(name, kind, obj.level)}`);
      lines.push(`经验值/升级所需经验值: ${exp.current || 0}/${exp.next || 'max'}`);
    }
    lines.push(`关联身内能力: ${linkedStats.join('、') || '无直接关联'}`);
    lines.push(`词条层级: ${lexicon?.hierarchy === 'tree' ? '树词条' : '叶子词条'}`);
    lines.push(`生成来源: 词条名${(lexicon?.nameAiGenerated ?? lexicon?.aiGenerated) ? 'AI生成' : '系统/用户给定'}，值${lexicon?.valueAiGenerated ? 'AI生成' : '系统/用户给定'}，变化方式${this.itemChangeMode(obj, lexicon)}`);
    lines.push(`变化原因: ${this.itemChangeReason(field, obj, lexicon)}`);
    lines.push(`当前依据: ${this.itemBasis(field, obj, kind, name)}`);
    if (obj?.type === '职业' && ((info.learnedAbilities || []).length || (info.worldAbilities || []).length)) lines.push(`职业关联: ${(info.learnedAbilities || []).concat(info.worldAbilities || []).join('、')}`);
    return lines.join('\n');
  },

  rpgFieldDetail(field) {
    const lexicon = this.lexiconFor(field);
    const rawValue = Array.isArray(field?.value) ? field.value.join('、') : (field?.value ?? field?.raw ?? '未记录');
    const lines = [`完整内容: ${rawValue || '未记录'}`, `说明: ${lexicon?.description || lexicon?.summary || field?.desc || this.fallbackDesc(field)}`];
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
    if (field?.key === 'level_growth' && field.raw?.history?.length) lines.push(`最近升级: ${field.raw.history.map((x) => `${x.from}->${x.to} 自动${Object.entries(x.auto || {}).map(([k, v]) => `${k}+${v}`).join('/')} 自由+${x.free}`).join('；')}`);
    return lines.join('\n');
  },
};
