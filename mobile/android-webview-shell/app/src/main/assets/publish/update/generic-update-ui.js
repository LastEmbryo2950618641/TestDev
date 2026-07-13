window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('generic', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const field = String(update.field || row.field || '');
    const isStatusTags = /^status_tags(?:\.|$)/u.test(field);
    const displayValue = (() => {
      if (!isStatusTags) return value && typeof value === 'object' ? JSON.stringify(value) : value;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return String(value.value || value.label || JSON.stringify(value));
      }
      return value;
    })();
    return {
      field: isStatusTags ? '状态标签' : (row.field || update.field || '通用固化'),
      uiTitle: isStatusTags ? '状态标签' : (row.uiTitle || row.field || update.field || '通用固化'),
      name: isStatusTags ? (window.GameModules.updateRegistry.leafName(field) || '状态标签') : (row.name || update.name || window.GameModules.updateRegistry.leafName(update.field) || update.updateType || '通用固化'),
      value: displayValue,
      uiValue: displayValue,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
