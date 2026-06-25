window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('body-status', {
  row(update = {}, store = {}, row = {}) {
    const value = update.change?.value || {};
    const part = value.part || value.partKey || row.name || window.GameModules.updateRegistry.leafName(update.field);
    const status = value.status || value['状态'] || '状态更新';
    const desc = value.description || value['描述状态'] || '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '身体状态',
      name: part,
      value: desc ? `${status}｜${desc}` : status,
      detailLines: [first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
