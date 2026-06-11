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

  fallbackDesc(field) {
    return {
      exp: '当前经验与升到下一级所需经验。', magic_circuit_quality: '魔术回路单条质量、转换效率与稳定性。',
      magic_circuit_quantity: '魔术回路的数量。', mana_capacity: '当前可调用魔力储备。',
    }[field?.key] || `${field?.label || '该属性'}的固化数值、状态或记录。`;
  },

  rpgFieldDetail(field) {
    const lines = [`说明: ${field?.desc || this.fallbackDesc(field)}`];
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
