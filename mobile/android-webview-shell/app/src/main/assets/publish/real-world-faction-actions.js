window.GameModules = window.GameModules || {};

window.GameModules.realWorldFactionActions = {
  async applyRealWorldFactionUpdates(updates = []) {
    if (!Array.isArray(updates) || !updates.length) return [];
    this.initFactionSystem?.();
    const ctx = window.GameModules.realWorldAgentContext;
    const orgActions = window.GameModules.orgTerritoryActions;
    const out = [];
    for (const item of updates.slice(0, 8)) {
      const action = String(item?.action || item?.method || '').trim();
      if (action === 'updateStructure') {
        const result = orgActions?.applyLegacyStructure?.(this, item);
        if (result?.text) out.push(result.text);
        continue;
      }
      if (action === 'addFactionPosition') out.push(ctx.addFactionPosition(this, item));
      else out.push(ctx.upsertFaction(this, item));
    }
    return out;
  },
};
