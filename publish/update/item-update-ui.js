window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('item', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '物品与穿着',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
