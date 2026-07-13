window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.orgTerritory = window.GameModules.domain.orgTerritory || {};

window.GameModules.domain.orgTerritory.updateRules = {
  parseStructurePath(field = '') {
    const parts = String(field || '').split('.').filter(Boolean);
    const index = parts.indexOf('structure');
    if (index < 0) return { nodeName: '', tail: parts };
    return { nodeName: parts[index + 1] || '', tail: parts.slice(index + 2) };
  },

  parseOverviewPanel(update = {}, patch = {}) {
    const explicit = String(patch.panel || update.panel || update.subject?.panel || '').trim();
    if (['ideology', 'economy', 'politics', 'military', 'diplomacy'].includes(explicit)) return explicit;
    const field = String(update.field || '').trim();
    const match = field.match(/overviewPanels\.(ideology|economy|politics|military|diplomacy)/u);
    return match?.[1] || '';
  },

  settlementRank(updateType = '') {
    if (updateType === 'org-status') return 0;
    if (updateType === 'territory-control') return 1;
    return 2;
  },
};
