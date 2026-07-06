window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  collectFromState(state) {
    const worldTag = state?.worldTag || '原创世界';
    const values = state?.values || {};
    const entries = [];
    for (const section of state?.schema?.sections || []) {
      for (const field of section.fields || []) {
        const treeKind = { knowledge: '知识树', skills: '技能树', professions: '职业树' }[field.key];
        const reason = state?.profile?.rpgFieldReasons?.[field.key];
        entries.push({ worldTag, kind: treeKind || '属性', name: field.label, value: values[field.key], desc: field.desc, reason, nameAiGenerated: false, valueAiGenerated: false, changeMode: reason, hierarchy: treeKind ? 'tree' : 'leaf', source: 'schema', meta: { key: field.key, type: field.type, grade: Boolean(field.grade), targetType: state?.profile?.isPlayer ? '非角色' : '角色', commonField: section.title !== '世界固有属性' && field.key !== 'world_tag' } });
      }
    }
    this.collectLearned(entries, worldTag, '知识', values.knowledge, state?.profile?.rpgFieldReasons?.knowledge, state);
    this.collectLearned(entries, worldTag, '技能', values.skills, state?.profile?.rpgFieldReasons?.skills, state);
    this.collectLearned(entries, worldTag, '职业', values.professions, state?.profile?.rpgFieldReasons?.professions, state);
    this.collectLearned(entries, worldTag, '物品', values.items, state?.profile?.rpgFieldReasons?.items, state);
    this.collectLearned(entries, worldTag, '穿着', values.wearing, state?.profile?.rpgFieldReasons?.wearing, state);
    for (const item of values.factions || []) {
      const entry = this.factionEntry(worldTag, item, state);
      if (entry) entries.push(entry);
    }
    for (const item of values.memberships || []) {
      const entry = this.membershipEntry(worldTag, item, state);
      if (entry) entries.push(entry);
    }
    for (const name of values.status_tags || []) entries.push({ worldTag, kind: '状态', name, desc: `${name}表示角色当前处境、身份或剧情状态。`, reason: state?.profile?.rpgFieldReasons?.status_tags, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: state?.profile?.rpgFieldReasons?.status_tags, source: 'state' });
    return entries;
  },

  isAiStateName(name, state) {
    return ![state?.name, state?.worldTag, state?.profile?.role, '路人', '可被操控', '玩家本人', '手机主人'].includes(name);
  },

  concreteSocialReason(text, fallback) {
    const value = String(text || '').trim();
    const abstract = /^(AI演算|系统结算|系统词条调整|用户主动)$/.test(value) || window.GameModules.characterProfile?.abstractReason?.(value);
    return (value && !abstract ? value : fallback).slice(0, 120);
  },

  factionEntry(worldTag, item, state) {
    const obj = typeof item === 'string' ? { faction: item, role: '成员' } : item;
    const faction = String(obj?.faction || obj?.name || '').trim();
    const role = String(obj?.role || obj?.position || obj?.rank || '成员').trim();
    if (!faction) return null;
    const name = obj.name && obj.name.includes('/') ? obj.name : `${faction} / ${role}`;
    const description = obj.description || `社群：${faction}；角色：${role}。该词条表示角色所属居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`;
    const actor = state?.profile?.name || state?.name || '该人物';
    const reason = this.concreteSocialReason(obj.reason || obj.changeMode || state?.profile?.rpgFieldReasons?.factions, `${faction}来自${actor}当前住址、家庭、社交圈或临时群体资料，${role}是其在该社群中的社会角色。`);
    return { worldTag, kind: '社群角色', name, summary: `${faction}中的${role}`, description, reason, value: { ...obj, name, faction, community: faction, role, position: role, level: -1, reason, changeMode: reason }, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: reason, source: 'state', meta: { info: { faction, community: faction, role, level: -1 } } };
  },

  membershipEntry(worldTag, item, state) {
    const obj = typeof item === 'string' ? { orgName: item, title: '成员' } : item;
    const orgName = String(obj?.orgName || obj?.name || '').trim();
    const title = String(obj?.title || '成员').trim();
    const department = String(obj?.department || '').trim();
    if (!orgName) return null;
    const name = obj.name && obj.name.includes('/') ? obj.name : [orgName, department, title].filter(Boolean).join(' / ');
    const description = obj.description || `组织：${orgName}；身份：${title}。该词条表示角色在势力或社群组织架构中的部门、职位、身份或成员关系。`;
    const actor = state?.profile?.name || state?.name || '该人物';
    const reason = this.concreteSocialReason(obj.reason || obj.changeMode || state?.profile?.rpgFieldReasons?.memberships, `${orgName}是${actor}资料中可确认的组织归属，${title}是其在该组织中的当前人事身份。`);
    return { worldTag, kind: '人事归属', name, summary: `${orgName}中的${title}`, description, reason, value: { ...obj, name, orgName, title, department, level: -1, reason, changeMode: reason }, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: reason, source: 'state', meta: { info: { orgName, title, department, level: -1 } } };
  },

  learnedDescription(kind, name, item) {
    const explicit = [item.info?.description, item.description, item.desc, item.source].find((x) => x && !/暂无|资料|当前作用/.test(String(x)));
    if (explicit) return explicit;
    if (name === '世界常识') return '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。';
    if (name === '手机操作') return '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。';
    if (name === '现实观察' || name === '观察') return '通过细节、环境变化和他人反应判断局势的能力。';
    if (kind === '知识') return `对“${name}”这一知识领域的概念、规则、背景和应用范围的理解程度。`;
    if (kind === '职业') return `以“${name}”为核心的内化职业能力、经验与胜任资格；不等同当前雇佣单位或岗位，失业也不直接失去该职业。`;
    if (kind === '装备') return `装备词条，说明“${name}”的当前状态、效果、持有者、可调用方式和是否可穿戴。`;
    if (kind === '物品') return `物品词条，说明“${name}”的数量、用途、所在位置和消耗或转让条件。`;
    if (kind === '穿着') return `穿着词条，说明“${name}”占用的槽位、外观、状态和对现实行动的影响。`;
    if (kind === '社群角色' || kind === '阵营') return `社群角色词条，说明角色所属居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`;
    if (kind === '人事归属') return `人事归属词条，说明角色在有层级制度势力中的等级、职级、年级或职位。`;
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },

  learnedReason(kind, name, item = {}, parentReason = '', state = null) {
    const explicit = item.reason || item.changeMode;
    if (explicit && !window.GameModules.characterProfile?.abstractReason?.(explicit)) return explicit;
    const actor = state?.profile?.name || state?.name || '该人物';
    if (parentReason && !window.GameModules.characterProfile?.abstractReason?.(parentReason)) return `${actor}拥有“${name}”这一${kind}，因为${parentReason}`.slice(0, 120);
    if (name === '世界常识') return `${actor}长期生活在${state?.worldTag || '当前世界'}，日常交流、出行和判断都需要理解当地社会规则与常识。`;
    if (kind === '知识') return `${actor}在学习、工作或日常生活中接触过“${name}”，所以能够把它作为可调用知识。`;
    if (kind === '技能') return `${actor}的经历中已经反复使用“${name}”，因此它成为可执行技能。`;
    if (kind === '职业') return `${actor}围绕“${name}”形成过长期职责、训练或胜任经验，因此记录为职业能力。`;
    if (kind === '装备') return `${actor}当前处境允许调用“${name}”，它会影响行动选择和判定。`;
    if (kind === '物品') return `${actor}随身或生活场景中持有“${name}”，后续可被消耗、转让或使用。`;
    if (kind === '穿着') return `${actor}此刻穿戴“${name}”，它符合当前身份、环境和行动状态。`;
    return `${actor}的当前经历支持记录“${name}”这一${kind}。`;
  },

  collectLearned(entries, worldTag, kind, list, parentReason = '', state = null) {
    for (const item of list || []) {
      const name = typeof item === 'string' ? item : item?.name;
      if (!name) continue;
      const reason = this.learnedReason(kind, name, item, parentReason, state);
      entries.push({
        worldTag, kind, name,
        summary: item.description || item.info?.description || item.desc || item.source,
        description: this.learnedDescription(kind, name, item),
        value: typeof item === 'string' ? item : item,
        nameAiGenerated: true,
        valueAiGenerated: true,
        reason,
        changeMode: reason,
        related: [...(item.linkedStats || []), ...(item.info?.learnedAbilities || []), ...(item.info?.knowledgeAreas || []), ...(item.info?.worldAbilities || [])],
        meta: { info: { ...(item.info || {}), levelDescription: Number(item.level) > 0 ? item.levelDescription : undefined, effect: Number(item.level) > 0 ? item.effect : undefined } },
        source: item.info ? 'ai' : 'state',
      });
    }
  },

  async syncState(state) {
    window.GameModules.characterProfile.requireRpgFieldReasons(state?.profile, state?.profile?.worldAttributes, state?.profile?.name || state?.name || '个人资料');
    await this.saveMany(this.collectFromState(state));
  },
});
