window.GameModules = window.GameModules || {};

window.GameModules.rpgFieldUi = {
  rpgFieldKey(field) {
    return `${field?.key || ''}:${field?.label || ''}`;
  },

  toggleRpgField(field) {
    const key = this.rpgFieldKey(field);
    if (!key) return;
    this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key;
  },

  isRpgFieldOpen(field) {
    return this.expandedRpgFieldKey === this.rpgFieldKey(field);
  },

  canExpandRpgField(field) {
    return Boolean(field && this.rpgFieldDetail(field));
  },

  lexiconFor(field, item = null) {
    const worldTag = this.currentRpgState?.worldTag || this.character?.work || '原创世界';
    const kind = item?.type || (field?.key === 'equipment' ? '装备' : '属性');
    const name = item?.name || field?.label;
    return window.GameModules.rpgLexicon.get(worldTag, kind, name) || null;
  },

  fallbackDesc(field) {
    const worldTag = this.currentRpgState?.worldTag || this.character?.work || '';
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    const sections = this.currentRpgState?.schema?.sections || window.GameModules.progression.schemaSections(attrs);
    return sections.flatMap((section) => section.fields || []).find((item) => item.key === field?.key)?.desc || '暂无说明。';
  },

  rpgFieldDetail(field) {
    const item = Array.isArray(field.raw) ? field.raw[0] : null;
    const lexicon = this.lexiconFor(field, item);
    const lines = [`说明: ${lexicon?.description || lexicon?.summary || field?.desc || this.fallbackDesc(field)}`];
    if (field?.source) lines.push(`来源: 初始值(${field.source.initial || 0}) + 等级值(${field.source.level || 0}) + 分配值(${field.source.allocated || 0}) + 非玩家成长(${field.source.npc || 0}) = ${field.raw || 0}`);
    if (field?.key === 'free_attribute_points') lines.push('用途: 可分配到力量、敏捷、体质、智力、感知、意志、魅力；每次真实升级获得1点。');
    if (field?.key === 'level_growth' && field.raw?.history?.length) lines.push(`最近升级: ${field.raw.history.map((x) => `${x.from}->${x.to} 自动${Object.entries(x.auto || {}).map(([k, v]) => `${k}+${v}`).join('/')} 自由+${x.free}`).join('；')}`);
    if (!item || item.type !== '职业') return lines.join('\n');
    const info = lexicon?.meta?.info || item.info || {};
    const exp = item.exp || {};
    lines.push(
      `经验值/升级所需经验值: ${exp.current || 0}/${exp.next || 'max'}`,
      `职业简介: ${info.summary || lexicon?.summary || item.source || '暂无'}`,
      `决定该职业的身内能力: ${(info.intrinsicStats || item.linkedStats || []).join('、') || '暂无'}`,
      `决定该职业的习得能力: ${(info.learnedAbilities || []).join('、') || '暂无'}`,
      `决定该职业的世界专属能力: ${(info.worldAbilities || []).join('、') || '暂无'}`,
      `详细说明: ${info.description || lexicon?.description || item.source || '暂无'}`,
    );
    return lines.join('\n');
  },
};
