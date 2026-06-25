window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('role-card', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const value = change.value ?? row.value ?? '';
    return {
      field: '角色卡字段',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
