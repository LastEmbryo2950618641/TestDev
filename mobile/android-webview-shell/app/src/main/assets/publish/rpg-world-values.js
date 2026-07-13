window.GameModules = window.GameModules || {};
window.GameModules.rpgState = window.GameModules.rpgState || {};

Object.assign(window.GameModules.rpgState, {
  normalizeWorldValues(state) {
    let changed = false;
    const worldFields = state.schema?.sections?.find((section) => section.title === '世界固有属性')?.fields || [];
    worldFields.forEach((field) => {
      if (field.type !== 'number') return;
      const value = state.values[field.key];
      if (typeof value === 'number') return;
      const ranks = { EX: 100, A: 85, B: 70, C: 55, D: 35, E: 15 };
      const parsed = ranks[String(value || '').toUpperCase()] ?? Number(value);
      state.values[field.key] = Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
      changed = true;
    });
    return changed;
  },
});
