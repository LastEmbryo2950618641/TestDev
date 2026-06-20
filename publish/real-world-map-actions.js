window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapActions = {
  realWorldMapRows() {
    return window.GameModules.realWorldMap.visibleNodes(window.GameModules.realWorldMap.ensure(this, this.playerProfile || {}));
  },

  toggleRealWorldMapNode(id) {
    window.GameModules.realWorldMap.toggle(this, id);
  },

  showRealWorldMapInfo(id) {
    window.GameModules.realWorldMap.showInfo(this, id);
  },

  closeRealWorldMapInfo() {
    window.GameModules.realWorldMap.closeInfo(this);
  },

  realWorldMapInfoNode() {
    return window.GameModules.realWorldMap.infoNode(this.realWorldMap);
  },

  realWorldMapInfoFacts() {
    const node = this.realWorldMapInfoNode();
    if (!node) return [];
    return window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, window.GameModules.realWorldMapFacts.nowLabel(this)) || [];
  },

  realWorldMapFactText(fact, index) {
    return window.GameModules.realWorldMapFacts?.formatFact?.(fact, index) || '';
  },
};
