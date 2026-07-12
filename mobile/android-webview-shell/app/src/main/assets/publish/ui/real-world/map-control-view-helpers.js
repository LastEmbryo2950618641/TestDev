window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.mapControlViewHelpers = {
  nodeControlLine(nodeId = '') {
    const map = this.realWorldMap || {};
    const node = (map.nodes || []).find((item) => item.id === nodeId);
    if (!node?.revealed) return '';
    return window.GameModules.orgTerritory?.resolveControlLabel?.(map, node, this) || '';
  },

  nodeControlCachedLine(nodeId = '') {
    if (this.realWorldMapInfoCache?.id === nodeId) return this.realWorldMapInfoCache.controlLine || '';
    return '';
  },

  nodeControlDisplayLine(nodeId = '') {
    return this.nodeControlLine(nodeId) || '控制信息待推演';
  },

  infoControlLine() {
    const node = this.realWorldMapInfoNode();
    if (!node?.revealed) return '';
    if (this.realWorldMapInfoCache?.id === node.id) return this.realWorldMapInfoCache.controlLine || '';
    const map = this.realWorldMap || {};
    return window.GameModules.orgTerritory?.resolveControlLabel?.(map, node, this) || '';
  },

  infoControlDisplayLine() {
    return this.infoControlLine() || '控制信息待推演';
  },

  infoControlHistory() {
    const node = this.realWorldMapInfoNode();
    if (!node?.revealed) return [];
    const map = this.realWorldMap || {};
    return window.GameModules.orgTerritory?.controlHistoryForNode?.(map, node, this) || [];
  },

  hasInfoControlHistory() {
    return this.infoControlHistory().length > 0;
  },

  infoControlHistoryEmptyText() {
    return this.hasInfoControlHistory() ? '' : '暂无控制历史记录';
  },

  infoControlHistoryKey(line = '', index = 0) {
    return `control-history-${index}-${String(line || '').slice(0, 24)}`;
  },

  infoControlHistoryText(line = '') {
    return String(line || '').trim();
  },
};

