window.GameModules = window.GameModules || {};

window.GameModules.realWorldFactionActions = {
  async applyRealWorldFactionUpdates(updates = []) {
    if (!Array.isArray(updates) || !updates.length) return [];
    this.initFactionSystem?.();
    const ctx = window.GameModules.realWorldAgentContext;
    const settlementActions = window.GameModules.app?.orgTerritory?.settlementActions;
    const out = [];
    for (const item of updates.slice(0, 8)) {
      const action = String(item?.action || item?.method || '').trim();
      if (action === 'updateStructure') {
        const result = settlementActions?.applyLegacyStructure?.(this, item);
        if (result?.text) out.push(result.text);
        continue;
      }
      if (action === 'addFactionPosition') out.push(ctx.addFactionPosition(this, item));
      else out.push(ctx.upsertFaction(this, item));
    }
    return out;
  },
};
