window.GameModules = window.GameModules || {};

window.GameModules.rpgFieldUi = {
  rpgFieldKey(field) { return `${field?.key || ''}:${field?.label || ''}`; },
  rpgItemKey(field, index) { return `${this.rpgFieldKey(field)}:item:${index}`; },
  toggleRpgField(field) { const key = this.rpgFieldKey(field); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  toggleRpgItem(field, index) { const key = this.rpgItemKey(field, index); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  isRpgFieldOpen(field) { return this.expandedRpgFieldKey === this.rpgFieldKey(field); },
  isRpgItemOpen(field, index) { return this.expandedRpgFieldKey === this.rpgItemKey(field, index); },
  isRpgListField(field) { return ['knowledge', 'skills', 'professions', 'factions', 'force_positions', 'equipment', 'items', 'wearing', 'status_tags'].includes(field?.key) && Array.isArray(field.raw); },
  rpgFieldSummary(field) {
    if (!this.isRpgListField(field)) return `${field.label}：${Array.isArray(field.value) ? field.value.join('、') || '无' : field.value}`;
    const unit = { knowledge: '知识', skills: '技能', professions: '职业' }[field.key] || '项';
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
    const usable = (text, label) => !/^错误：.*缺少AI给出的具体变化原因/.test(String(text || '').trim()) && !wrongSubject(text, label) && !window.GameModules.characterProfile?.abstractReason?.(text) && String(text || '').trim();
    return (label, key) => usable(reasons[label], label) || usable(reasons[key], label) || usable(log[label], label) || usable(log[key], label) || this.missingReasonText(`${profile?.name || '个人资料'}-${label}`);
  },

  missingReasonText(name = '词条') { return `错误：${name}缺少AI给出的具体变化原因，请重新生成个人资料或重新触发AI更新。`; },
  rpgListItems(field) { return Array.isArray(field?.raw) ? field.raw : []; },

  profileIdentityFields(state, provided = []) {
    if (Array.isArray(provided) && provided.length) return provided;
    const p = state?.profile || {};
    const worldTag = p.work || state?.worldTag || '原创世界';
    const reasonFor = this.roleCardReasonGetter(p);
    const row = (key, label, value, desc) => ({ key: `profile-${state?.id || 'target'}-${key}`, label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: key !== 'work' });
    return [
      row('name', '姓名', p.name || state?.name, '角色卡固化姓名。'), row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('role', '身份', p.role || p.job, '角色当前身份。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
      row('gender', '性别', p.gender, '角色性别资料。'), row('birthday', '生日', p.birthday, '角色生日资料。'),
      row('relationships', '人际关系', p.relationships, '关系必须使用“关系：姓名”的格式。'), row('appearance', '外貌', p.appearance, '角色卡固化外貌。'),
      row('personality', '性格', p.personality, '角色卡固化性格。'), row('detail', '人物说明', p.detail, '角色卡补充说明。'),
    ];
  },

  profileSections(state, identityFields = []) {
    const entries = this.rpgEntries?.(state) || [];
    const all = entries.flatMap((section) => section.fields || []);
    const byKey = (key) => all.find((field) => field.key === key);
    const take = (keys) => keys.map(byKey).filter(Boolean);
    const identity = this.profileIdentityFields(state, identityFields);
    const relations = identity.filter((field) => field.label === '人际关系' || /relationships|人际关系/.test(field.key));
    const identityRest = identity.filter((field) => !relations.includes(field));
    const used = new Set(['world_tag', 'age', 'factions', 'force_positions', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma', 'equipment', 'items', 'wearing', 'status_tags']);
    const personal = all.filter((field) => !used.has(field.key));
    const groups = [
      { title: '个人能力', fields: personal },
      { title: '身内能力', fields: take(['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']) },
      { title: '装备与物品', fields: take(['equipment', 'items', 'wearing']) },
      { title: '状态标签', fields: take(['status_tags']) },
      { title: '人际关系', fields: relations },
      { title: '身份信息', fields: [...identityRest, ...take(['world_tag', 'age', 'factions', 'force_positions'])] },
    ];
    return groups.filter((group) => group.fields.length);
  },

  lexiconKind(field, item = null) {
    if (item?.type) return item.type;
    if (field?.key && !item) return { knowledge: '知识树', skills: '技能树', professions: '职业树', factions: '社群角色', force_positions: '势力地位', equipment: '装备', items: '物品', wearing: '穿着', status_tags: '状态' }[field.key] || field.kind || '属性';
    if (field?.kind) return field.kind;
    return { factions: '社群角色', force_positions: '势力地位', equipment: '装备', items: '物品', wearing: '穿着', status_tags: '状态' }[field?.key] || '属性';
  },

  lexiconFor(field, item = null) {
    const worldTag = field?.worldTag || this.currentRpgState?.worldTag || this.character?.work || '原创世界';
    const kind = this.lexiconKind(field, item);
    const name = this.rpgItemSummary(item) || field?.label;
    return window.GameModules.rpgLexicon.get(worldTag, kind, name) || null;
  },

  fallbackDesc(field) {
    const worldTag = this.currentRpgState?.worldTag || this.character?.work || '';
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    const sections = this.currentRpgState?.schema?.sections || window.GameModules.progression.schemaSections(attrs);
    const found = sections.flatMap((section) => section.fields || []).find((item) => item.key === field?.key)?.desc;
    return found || `${field?.label || '该词条'}用于记录可被剧情判定和成长系统引用的具体状态。`;
  },

  activeDetailState() {
    return this.identityTargetState?.() || this.currentRpgState || this.playerIdentityState?.() || null;
  },

  usableChangeReason(reason, blocked = []) {
    const text = String(reason || '').trim();
    if (/^错误：.*缺少AI给出的具体变化原因/.test(text)) return '';
    if (window.GameModules.characterProfile?.abstractReason?.(text)) return '';
    if (/性别：|年龄：|生日：|具体地址：|势力地位：|社群角色：|居住：|父母：|关系：|备注：|关系为.*备注为|居住在.*生活状态.*家庭状态/.test(text)) return '';
    if (/^(AI演算|系统结算|系统词条调整|用户主动)$/.test(text) || /词条说明|当前作用|用于记录|暂无详细说明/.test(text)) return '';
    if (/依据.*(当前值|上限|已落库|经验曲线)|当前为.*依据|被记录为当前|后续(获得|使用|消耗|转让|遗失|损坏|穿戴|由明确行动|状态变化)时会更新|当前属于.*词条/.test(text)) return '';
    return blocked.some((item) => item && text === String(item).trim()) ? '' : text;
  },

  fallbackBasis(field, obj = null, kind = '', name = '') {
    const state = this.activeDetailState?.() || this.currentRpgState || this.playerIdentityState?.() || null;
    const profile = state?.profile || {};
    const generated = window.GameModules.characterReasonFallback?.rpgReasons?.(profile, profile.worldAttributes || { fields: state?.schema?.sections?.find((section) => section.title === '世界固有属性')?.fields || [] }) || {};
    if (!obj && generated[field?.key]) return generated[field.key];
    const finalKind = kind || (obj ? this.lexiconKind(field, obj) : (field?.kind || this.lexiconKind(field)));
    const finalName = name || (obj ? this.rpgItemSummary(obj) : (field?.label || field?.key || '该词条'));
    if (obj) return `${profile.name || '该人物'}持有${finalName}，是其${finalKind}、当前处境或既有生活经历的一部分，后续会随明确剧情事件更新。`;
    if (field?.source) return `${profile.name || '该人物'}的${finalName}由初始经历、等级成长、自由分配和非玩家成长共同形成。`;
    return `${profile.name || '该人物'}的${finalName}按其当前身份、处境、过去经历和可支配资源固化。`;
  },

  explicitFieldChangeReason(field, lexicon = null) {
    const state = this.activeDetailState(), values = state?.values || {}, profile = state?.profile || {};
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

  itemChangeReason(field, obj = {}, lexicon = null) {
    const raw = lexicon?.meta?.modifyReason || obj.reason || '';
    const cleaned = String(raw).replace(/([：:])(?=(妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长|朋友|同学|同事)[：:])/g, '；');
    const explicit = this.usableChangeReason(cleaned, [lexicon?.description, lexicon?.summary, obj.description, obj.desc, obj.source, obj.changeMode]);
    return explicit || this.missingReasonText(this.rpgItemSummary(obj) || field?.label || '词条');
  },

  rpgItemSummary(item) {
    if (typeof item === 'string') return item;
    const name = item?.name || (item?.force ? `${item.force} / ${item.position || '成员'}` : (item?.faction ? `${item.faction} / ${item.role || item.position || '成员'}` : '未命名'));
    return Number(item?.level) > 0 ? `${name} lv.${item.level}` : name;
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
    const kind = obj?.type || this.lexiconKind(field, obj);
    const name = this.rpgItemSummary(obj) || field?.label || '未知';
    const hasLevel = Number(obj?.level) > 0;
    const lines = [`名称: ${name}`, `定义: ${this.learnedDefinition(kind, name, obj, lexicon, info)}`, `类型: ${kind}`, `所属世界: ${field?.worldTag || lexicon?.worldTag || '公共'}`, `词条类型: ${field?.targetType || lexicon?.meta?.targetType || '角色'}`];
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
    lines.push(`生成来源: 词条名${(lexicon?.nameAiGenerated ?? lexicon?.aiGenerated) ? 'AI生成' : '系统/用户给定'}，值${lexicon?.valueAiGenerated ? 'AI生成' : '系统/用户给定'}，变化方式${lexicon?.changeMode || '系统结算'}`);
    lines.push(`变化原因: ${this.itemChangeReason(field, obj, lexicon)}`);
    lines.push(`当前依据: ${this.fallbackBasis(field, obj, kind, name)}`);
    if (obj?.type === '职业' && ((info.learnedAbilities || []).length || (info.worldAbilities || []).length)) lines.push(`职业关联: ${(info.learnedAbilities || []).concat(info.worldAbilities || []).join('、')}`);
    return lines.join('\n');
  },

  rpgFieldDetail(field) {
    const lexicon = this.lexiconFor(field);
    const lines = [`说明: ${lexicon?.description || lexicon?.summary || field?.desc || this.fallbackDesc(field)}`];
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
    if (field?.key === 'free_attribute_points') lines.push('用途: 可分配到力量、敏捷、体质、智力、感知、意志、魅力；每次真实升级获得1点。');
    if (field?.key === 'level_growth' && field.raw?.history?.length) lines.push(`最近升级: ${field.raw.history.map((x) => `${x.from}->${x.to} 自动${Object.entries(x.auto || {}).map(([k, v]) => `${k}+${v}`).join('/')} 自由+${x.free}`).join('；')}`);
    return lines.join('\n');
  },
};
