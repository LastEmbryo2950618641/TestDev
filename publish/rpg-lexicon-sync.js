window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  collectFromState(state) {
    const worldTag = state?.worldTag || '原创世界';
    const values = state?.values || {};
    const entries = [];
    for (const section of state?.schema?.sections || []) {
      for (const field of section.fields || []) {
        const treeKind = { knowledge: '知识树', skills: '技能树', professions: '职业树' }[field.key];
        entries.push({ worldTag, kind: treeKind || '属性', name: field.label, value: values[field.key], desc: field.desc, nameAiGenerated: false, valueAiGenerated: false, changeMode: '代码计算', hierarchy: treeKind ? 'tree' : 'leaf', source: 'schema', meta: { key: field.key, type: field.type, grade: Boolean(field.grade) } });
      }
    }
    this.collectLearned(entries, worldTag, '知识', values.knowledge);
    this.collectLearned(entries, worldTag, '技能', values.skills);
    this.collectLearned(entries, worldTag, '职业', values.professions);
    this.collectLearned(entries, worldTag, '装备', values.equipment);
    for (const name of values.factions || []) entries.push({ worldTag, kind: '阵营', name, desc: `${name}相关势力、组织或社会位置。`, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: 'AI演算', source: 'state' });
    for (const name of values.status_tags || []) entries.push({ worldTag, kind: '状态', name, desc: `${name}表示角色当前处境、身份或剧情状态。`, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: 'AI演算', source: 'state' });
    return entries;
  },

  isAiStateName(name, state) {
    return ![state?.name, state?.worldTag, state?.profile?.role, '路人', '可被操控', '玩家本人', '手机主人'].includes(name);
  },

  collectLearned(entries, worldTag, kind, list) {
    for (const item of list || []) {
      const name = typeof item === 'string' ? item : item?.name;
      if (!name) continue;
      entries.push({
        worldTag, kind, name,
        summary: item.summary || item.effect || item.desc || item.source,
        description: item.info?.description || item.effect || item.desc || item.source || `${name}的资料。`,
        value: typeof item === 'string' ? item : item,
        nameAiGenerated: true,
        valueAiGenerated: true,
        changeMode: 'AI演算',
        related: [...(item.linkedStats || []), ...(item.info?.learnedAbilities || []), ...(item.info?.worldAbilities || [])],
        meta: { info: { ...(item.info || {}), levelDescription: item.levelDescription, effect: item.effect } },
        source: item.info ? 'ai' : 'state',
      });
    }
  },

  async syncState(state) {
    await this.saveMany(this.collectFromState(state));
  },
});
