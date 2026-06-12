window.GameModules = window.GameModules || {};

window.GameModules.rpgFieldUi = {
  rpgFieldKey(field) { return `${field?.key || ''}:${field?.label || ''}`; },
  rpgItemKey(field, index) { return `${this.rpgFieldKey(field)}:item:${index}`; },
  toggleRpgField(field) { const key = this.rpgFieldKey(field); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  toggleRpgItem(field, index) { const key = this.rpgItemKey(field, index); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  isRpgFieldOpen(field) { return this.expandedRpgFieldKey === this.rpgFieldKey(field); },
  isRpgItemOpen(field, index) { return this.expandedRpgFieldKey === this.rpgItemKey(field, index); },
  isRpgListField(field) { return ['knowledge', 'skills', 'professions'].includes(field?.key) && Array.isArray(field.raw); },
  canExpandRpgField(field) { return Boolean(field && !this.isRpgListField(field) && this.rpgFieldDetail(field)); },

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

  rpgItemSummary(item) {
    return `${item?.name || '未命名'} lv.${item?.level || 1}`;
  },

  rpgItemDetail(field, item) {
    const lexicon = this.lexiconFor(field, item);
    const info = lexicon?.meta?.info || item?.info || {};
    const exp = item?.exp || {};
    const statName = { strength: '力量', agility: '敏捷', constitution: '体质', intelligence: '智力', perception: '感知', willpower: '意志', charisma: '魅力' };
    const linkedStats = (info.intrinsicStats || item?.linkedStats || []).map((x) => statName[x] || x);
    const lines = [
      `名称: ${item?.name || field?.label || '未知'}`,
      `类型/等级: ${item?.type || field?.label || '能力'} lv${item?.level || 1}`,
      `经验值/升级所需经验值: ${exp.current || 0}/${exp.next || 'max'}`,
      `等级说明: ${item?.levelDescription || info.levelDescription || '暂无'}`,
      `当前作用: ${item?.effect || info.effect || '暂无'}`,
      `来源: ${item?.source || info.summary || lexicon?.summary || '暂无'}`,
      `关联身内能力: ${linkedStats.join('、') || '暂无'}`,
    ];
    if (item?.type === '职业') {
      lines.push(`关联习得能力: ${(info.learnedAbilities || []).join('、') || '暂无'}`);
      lines.push(`世界专属能力: ${(info.worldAbilities || []).join('、') || '暂无'}`);
    }
    lines.push(`详细说明: ${info.description || lexicon?.description || item?.description || item?.source || '暂无'}`);
    return lines.join('\n');
  },

  rpgFieldDetail(field) {
    const lexicon = this.lexiconFor(field);
    const lines = [`说明: ${lexicon?.description || lexicon?.summary || field?.desc || this.fallbackDesc(field)}`];
    if (field?.source) lines.push(`来源: 初始值(${field.source.initial || 0}) + 等级值(${field.source.level || 0}) + 分配值(${field.source.allocated || 0}) + 非玩家成长(${field.source.npc || 0}) = ${field.raw || 0}`);
    if (field?.key === 'free_attribute_points') lines.push('用途: 可分配到力量、敏捷、体质、智力、感知、意志、魅力；每次真实升级获得1点。');
    if (field?.key === 'level_growth' && field.raw?.history?.length) lines.push(`最近升级: ${field.raw.history.map((x) => `${x.from}->${x.to} 自动${Object.entries(x.auto || {}).map(([k, v]) => `${k}+${v}`).join('/')} 自由+${x.free}`).join('；')}`);
    return lines.join('\n');
  },
};
