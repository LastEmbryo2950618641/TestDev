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
  canExpandRpgField(field) { return Boolean(field && this.rpgFieldDetail(field)); },
  isLexiconField(field) { return Boolean(field); },

  profileIdentityFields(state, provided = []) {
    if (Array.isArray(provided) && provided.length) return provided;
    const p = state?.profile || {};
    const worldTag = p.work || state?.worldTag || '原创世界';
    const reasonFor = (label) => p.roleCardFieldReasons?.[label] || (p.roleCardChangeLog || []).slice().reverse().find((item) => item.field === label || item.name === label)?.reason || '';
    const row = (key, label, value, desc) => ({ key: `profile-${state?.id || 'target'}-${key}`, label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label), worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: key !== 'work' });
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
    if (!text || /^(AI演算|系统结算|系统词条调整|用户主动)$/.test(text)) return '';
    if (/词条说明|当前作用|用于记录|暂无详细说明/.test(text)) return '';
    return blocked.some((item) => item && text === String(item).trim()) ? '' : text;
  },

  fieldChangeReason(field, lexicon = null) {
    const state = this.activeDetailState(), values = state?.values || {}, profile = state?.profile || {};
    const explicit = this.usableChangeReason(field?.reason || lexicon?.meta?.modifyReason, [lexicon?.description, lexicon?.summary, field?.desc]);
    if (explicit) return explicit;
    const evidence = this.profileEvidence(profile, state);
    if (field?.key === 'level' && values.level_growth?.history?.length) {
      const latest = values.level_growth.history.at(-1);
      return `${evidence}最近成长记录显示个人等级从${latest.from}升到${latest.to}，说明这些经历已经转化为稳定成长。`;
    }
    if (field?.key === 'level') return this.fieldExperienceReason(field, profile, state, `${evidence}普通现代人通常约4级；当前${field.value}级需要由其过往学习、工作、训练、创伤或特殊经历解释。`);
    if (field?.key === 'level_growth' && values.level_growth?.history?.length) return `${evidence}升级记录来自已发生的训练、行动和剧情成长，而不是单纯系统初始化。`;
    if (field?.source) return this.fieldExperienceReason(field, profile, state, `${evidence}${field.label}当前为${field.raw}，由初始经历${field.source.initial || 0}、升级成长${field.source.level || 0}、自由分配${field.source.allocated || 0}和非玩家成长${field.source.npc || 0}共同形成。`);
    return `${evidence}${field?.label || '该词条'}当前值需要按角色过去经历、职业训练、生活压力和近期事件解释，不能只写抽象系统来源。`;
  },

  fieldExperienceReason(field, profile = {}, state = null, fallback = '') {
    const text = [profile.role || profile.refinedRole, profile.job, profile.detail || profile.worldbuildingNote, profile.personality, profile.relationships].filter(Boolean).join('；');
    const label = field?.label || '该能力';
    const value = field?.value || field?.raw || 0;
    if (/985|硕士|研究生|博士|大学|学习|程序|工程师|教师|医生|学者|研究|分析/.test(text) && /等级|智力|学习/.test(label)) return `${label}为${value}，因为其经历包含高等教育、专业学习或分析型工作；例如研究生/工程师背景会把理解、学习和综合成长推到普通人之上。`;
    if (/士兵|骑士|战士|军人|杀手|运动|训练|战斗|从者|英灵/.test(text) && /等级|力量|敏捷|体质|感知|行动/.test(label)) return `${label}为${value}，因为其经历包含战斗训练、体能锻炼或高风险行动，身体与反应能力高于普通生活水平。`;
    if (/病弱|受伤|囚禁|疲惫|饥饿|创伤|虐|压力/.test(text) && /体质|生命|精力|精神|疲劳|行动/.test(label)) return `${label}为${value}，因为其过去经历过病弱、伤害、囚禁或长期压力，身体储备与精神状态受到具体经历影响。`;
    if (/王|领袖|经理|队长|贵族|公主|皇帝|统率|支配/.test(text) && /等级|魅力|意志|感知/.test(label)) return `${label}为${value}，因为其长期处在领导、管理或支配性身份中，决断、表达和抗压能力由这些经历支撑。`;
    if (/同居|家人|妹妹|姐姐|哥哥|弟弟|父母|父母已故|相依为命/.test(text) && /精神|意志|成长|等级/.test(label)) return `${label}为${value}，因为其家庭处境和长期共同生活经历塑造了心理承受力、依赖关系和成长阶段。`;
    return fallback;
  },

  profileEvidence(profile = {}, state = null) {
    const text = [profile.name || state?.name, profile.role || profile.refinedRole, profile.job, profile.detail || profile.worldbuildingNote, profile.personality, profile.relationships].filter(Boolean).join('；');
    return text ? `依据角色经历：${String(text).slice(0, 90)}。` : '依据当前角色已知经历。';
  },

  itemChangeReason(field, obj = {}, lexicon = null) {
    const explicit = this.usableChangeReason(lexicon?.meta?.modifyReason || obj.reason || obj.changeMode, [lexicon?.description, lexicon?.summary, obj.description, obj.desc, obj.source]);
    if (explicit) return explicit;
    const evidence = this.profileEvidence(this.activeDetailState()?.profile, this.activeDetailState());
    return `${evidence}${obj.name || field?.label || '该词条'}应由具体学习、训练、持有、穿戴或社会身份经历解释，不能只写通用资料来源。`;
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
    const kind = obj?.type || field?.label || '能力';
    const name = obj?.name || field?.label || '未知';
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
    if (obj?.type === '职业' && ((info.learnedAbilities || []).length || (info.worldAbilities || []).length)) lines.push(`职业关联: ${(info.learnedAbilities || []).concat(info.worldAbilities || []).join('、')}`);
    return lines.join('\n');
  },

  rpgFieldDetail(field) {
    const lexicon = this.lexiconFor(field);
    const lines = [`说明: ${lexicon?.description || lexicon?.summary || field?.desc || this.fallbackDesc(field)}`];
    lines.push(`变化原因: ${this.fieldChangeReason(field, lexicon)}`);
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
