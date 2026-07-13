window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('relationship', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const relation = value && typeof value === 'object' ? (value.relation || row.name || window.GameModules.updateRegistry.leafName(update.field)) : (row.name || window.GameModules.updateRegistry.leafName(update.field));
    const targetName = value && typeof value === 'object' ? value.name : value;
    return {
      field: '人际关系',
      name: relation,
      value: targetName && typeof targetName === 'object' ? JSON.stringify(targetName) : targetName,
      detailLines: [change.mode ? `方式：${change.mode}` : '', value?.detail ? `设定：${value.detail}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
