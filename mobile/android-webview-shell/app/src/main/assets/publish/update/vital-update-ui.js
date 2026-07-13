window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('vital', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = Number(change.value ?? update.value) || 0;
    const sign = value > 0 ? '+' : '';
    return {
      field: '生命体征',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `变化${sign}${value}${change.unit || ''}` : (change.value ?? ''),
    };
  },
});
