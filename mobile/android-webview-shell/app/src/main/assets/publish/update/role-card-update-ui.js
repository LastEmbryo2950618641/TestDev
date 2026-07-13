window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('role-card', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const field = String(update.field || row.field || '');
    const rawValue = change.value ?? row.value ?? '';
    const isStatusTags = field === 'status_tags' || /^status_tags(?:\.|$)/u.test(field);
    const displayValue = (() => {
      if (!isStatusTags || !rawValue || typeof rawValue !== 'object') {
        return rawValue && typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue;
      }
      const tag = String(rawValue.value || rawValue.label || '').trim();
      const result = String(rawValue.result || change.mode || '').trim();
      return [tag, result ? `（${result}）` : ''].filter(Boolean).join('');
    })();
    return {
      field: isStatusTags ? '状态标签' : '角色卡字段',
      uiTitle: isStatusTags ? '状态标签' : (row.uiTitle || row.field || '角色卡字段'),
      name: isStatusTags ? '当前状态' : (row.name || window.GameModules.updateRegistry.leafName(update.field)),
      value: displayValue,
      uiValue: displayValue,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
