window.GameModules = window.GameModules || {};

window.GameModules.rpgFieldUi = {
  toggleRpgField(field) {
    const key = `${field.key}:${field.label}`;
    this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key;
  },

  isRpgFieldOpen(field) {
    return this.expandedRpgFieldKey === `${field.key}:${field.label}`;
  },

  canExpandRpgField(field) {
    return Boolean(field?.desc || field?.key === 'professions');
  },

  rpgFieldDetail(field) {
    const lines = [];
    if (field.desc) lines.push(`说明: ${field.desc}`);
    const item = Array.isArray(field.raw) ? field.raw[0] : null;
    if (!item || item.type !== '职业') return lines.join('\n');
    const info = item.info || {};
    const exp = item.exp || {};
    lines.push(
      `经验值/升级所需经验值: ${exp.current || 0}/${exp.next || 'max'}`,
      `职业简介: ${info.summary || item.source || '暂无'}`,
      `决定该职业的身内能力: ${(info.intrinsicStats || item.linkedStats || []).join('、') || '暂无'}`,
      `决定该职业的习得能力: ${(info.learnedAbilities || []).join('、') || '暂无'}`,
      `决定该职业的世界专属能力: ${(info.worldAbilities || []).join('、') || '暂无'}`,
      `详细说明: ${info.description || item.source || '暂无'}`,
    );
    return lines.join('\n');
  },
};
