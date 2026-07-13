window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerUi?.('wearing-state', {
  row(update = {}, _store = null, row = {}) {
    return {
      ...row,
      uiTitle: '穿着/外观状态',
      uiName: update.subject?.name || row.cardTitle || row.name || '穿着',
      uiValue: window.GameModules.updateRegistry.displayValue(update.change?.value ?? update.value ?? ''),
    };
  },
});
