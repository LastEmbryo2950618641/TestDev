window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  collectFromState(state) {
    const worldTag = state?.worldTag || '原创世界';
    const values = state?.values || {};
    const entries = [];
    for (const section of state?.schema?.sections || []) {
      for (const field of section.fields || []) {
        const treeKind = { knowledge: '知识树', skills: '技能树', professions: '职业树' }[field.key];
        entries.push({ worldTag, kind: treeKind || '属性', name: field.label, value: values[field.key], desc: field.desc, nameAiGenerated: false, valueAiGenerated: false, changeMode: '代码计算', hierarchy: treeKind ? 'tree' : 'leaf', source: 'schema', meta: { key: field.key, type: field.type, grade: Boolean(field.grade), targetType: state?.profile?.isPlayer ? '非角色' : '角色', commonField: section.title !== '世界固有属性' && field.key !== 'world_tag' } });
      }
    }
    this.collectLearned(entries, worldTag, '知识', values.knowledge);
    this.collectLearned(entries, worldTag, '技能', values.skills);
    this.collectLearned(entries, worldTag, '职业', values.professions);
    this.collectLearned(entries, worldTag, '装备', values.equipment);
    for (const item of values.factions || []) {
      const entry = this.factionEntry(worldTag, item, state);
      if (entry) entries.push(entry);
    }
    for (const item of values.force_positions || []) {
      const entry = this.forcePositionEntry(worldTag, item, state);
      if (entry) entries.push(entry);
    }
    for (const name of values.status_tags || []) entries.push({ worldTag, kind: '状态', name, desc: `${name}表示角色当前处境、身份或剧情状态。`, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: 'AI演算', source: 'state' });
    return entries;
  },

  isAiStateName(name, state) {
    return ![state?.name, state?.worldTag, state?.profile?.role, '路人', '可被操控', '玩家本人', '手机主人'].includes(name);
  },

  factionEntry(worldTag, item, state) {
    const obj = typeof item === 'string' ? { faction: item, role: '成员' } : item;
    const faction = String(obj?.faction || obj?.name || '').trim();
    const role = String(obj?.role || obj?.position || obj?.rank || '成员').trim();
    if (!faction) return null;
    const name = obj.name && obj.name.includes('/') ? obj.name : `${faction} / ${role}`;
    const description = obj.description || `阵营：${faction}；角色：${role}。该词条表示角色所属组织、地点或群体，以及其在其中承担的社会角色。`;
    return { worldTag, kind: '阵营', name, summary: `${faction}中的${role}`, description, value: { ...obj, name, faction, role, position: role, level: -1 }, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: obj.changeMode || 'AI演算', source: 'state', meta: { info: { faction, role, level: -1 } } };
  },

  forcePositionEntry(worldTag, item, state) {
    const obj = typeof item === 'string' ? { force: item, position: '成员' } : item;
    const force = String(obj?.force || obj?.faction || obj?.name || '').trim();
    const position = String(obj?.position || obj?.rank || '成员').trim();
    if (!force) return null;
    const name = obj.name && obj.name.includes('/') ? obj.name : `${force} / ${position}`;
    const description = obj.description || `势力：${force}；地位：${position}。该词条表示角色在有层级结构势力中的等级、职级或职位。`;
    return { worldTag, kind: '势力地位', name, summary: `${force}中的${position}`, description, value: { ...obj, name, force, faction: force, position, level: -1 }, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: obj.changeMode || 'AI演算', source: 'state', meta: { info: { force, faction: force, position, level: -1 } } };
  },

  learnedDescription(kind, name, item) {
    const explicit = [item.info?.description, item.description, item.desc, item.source].find((x) => x && !/暂无|资料|当前作用/.test(String(x)));
    if (explicit) return explicit;
    if (name === '世界常识') return '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。';
    if (name === '手机操作') return '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。';
    if (name === '现实观察' || name === '观察') return '通过细节、环境变化和他人反应判断局势的能力。';
    if (kind === '知识') return `对“${name}”这一知识领域的概念、规则、背景和应用范围的理解程度。`;
    if (kind === '职业') return `以“${name}”为核心的内化职业能力、经验与胜任资格；不等同当前雇佣单位或岗位，失业也不直接失去该职业。`;
    if (kind === '阵营') return `阵营角色词条，说明角色所属组织、地点或群体，以及其在其中承担的社会角色。`;
    if (kind === '势力地位') return `势力地位词条，说明角色在有层级结构势力中的等级、职级或职位。`;
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },

  collectLearned(entries, worldTag, kind, list) {
    for (const item of list || []) {
      const name = typeof item === 'string' ? item : item?.name;
      if (!name) continue;
      entries.push({
        worldTag, kind, name,
        summary: item.description || item.info?.description || item.desc || item.source,
        description: this.learnedDescription(kind, name, item),
        value: typeof item === 'string' ? item : item,
        nameAiGenerated: true,
        valueAiGenerated: true,
        changeMode: 'AI演算',
        related: [...(item.linkedStats || []), ...(item.info?.learnedAbilities || []), ...(item.info?.knowledgeAreas || []), ...(item.info?.worldAbilities || [])],
        meta: { info: { ...(item.info || {}), levelDescription: Number(item.level) > 0 ? item.levelDescription : undefined, effect: Number(item.level) > 0 ? item.effect : undefined } },
        source: item.info ? 'ai' : 'state',
      });
    }
  },

  async syncState(state) {
    await this.saveMany(this.collectFromState(state));
  },
});
