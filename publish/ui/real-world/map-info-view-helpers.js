window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.mapInfoViewHelpers = {
  infoNode() {
    return window.GameModules.realWorldMap.infoNode(this.realWorldMap);
  },

  infoFacts() {
    const node = this.realWorldMapInfoNode();
    if (!node) return [];
    return window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, window.GameModules.realWorldMapFacts.nowLabel(this)) || [];
  },

  hasInfoFacts() {
    return this.realWorldMapInfoFacts().length > 0;
  },

  infoTitleText() {
    const node = this.realWorldMapInfoNode();
    return String(node?.name || '').trim() || '未命名地点';
  },

  infoSubtitleText() {
    const node = this.realWorldMapInfoNode();
    const facts = this.realWorldMapInfoFacts();
    if (!node) return '';
    if (facts.length) return `已记录 ${facts.length} 条地点事实`;
    const description = String(node.description || '').trim();
    if (description) return '已生成地点说明';
    return '等待地点信息展开';
  },

  infoDescriptionText() {
    const node = this.realWorldMapInfoNode();
    return String(node?.description || '').trim();
  },

  infoFactsSummaryText() {
    const facts = this.realWorldMapInfoFacts();
    if (!facts.length) return '暂无事实记录';
    return `共 ${facts.length} 条事实记录`;
  },

  infoFactsJoinedText() {
    const facts = this.realWorldMapInfoFacts();
    if (!facts.length) return '';
    return facts.map((fact, index) => this.realWorldMapFactText(fact, index)).filter(Boolean).join('');
  },

  infoFactsEmptyText() {
    if (this.realWorldMapHasInfoFacts()) return '';
    const description = this.realWorldMapInfoDescriptionText();
    if (description) return '当前地点已生成基础说明，更多事实将在后续推演中补全。';
    return '该地点暂未生成可展示的说明与事实。';
  },

  infoEmptyStateText() {
    const node = this.realWorldMapInfoNode();
    if (!node) return '当前没有可展示的地点信息';
    return this.realWorldMapInfoFactsEmptyText();
  },

  infoPanelView() {
    const controlHistoryRows = this.realWorldMapInfoControlHistoryRows();
    const factRows = this.realWorldMapInfoFactRows();
    const interiorActionLabel = this.realWorldMapInfoInteriorActionLabel();
    const targetNodeId = this.realWorldMapInfoInteriorTargetNodeId();
    const canOpenInterior = this.realWorldMapCanOpenInfoInterior();
    return {
      title: this.realWorldMapInfoTitleText(),
      subtitle: this.realWorldMapInfoSubtitleText(),
      controlDisplayLine: this.realWorldMapInfoControlDisplayLine(),
      controlHistoryRows,
      hasControlHistory: controlHistoryRows.length > 0,
      controlHistoryEmptyText: this.realWorldMapInfoControlHistoryEmptyText(),
      factsSummaryText: this.realWorldMapInfoFactsSummaryText(),
      descriptionText: this.realWorldMapInfoDescriptionText(),
      factRows,
      hasFactRows: factRows.length > 0,
      factsEmptyText: this.realWorldMapInfoFactsEmptyText(),
      canOpenInterior,
      interiorActionLabel,
      interiorTargetNodeId: targetNodeId,
      hasInteriorAction: !!(canOpenInterior && interiorActionLabel && targetNodeId),
    };
  },

  factRows() {
    return this.realWorldMapInfoFacts().map((fact, index) => ({
      key: this.realWorldMapFactKey(fact, index),
      text: this.realWorldMapFactText(fact, index),
    })).filter((row) => row.text);
  },

  factKey(fact, index) {
    return fact?.id || `fact-${index}`;
  },

  factText(fact, index) {
    return window.GameModules.realWorldMapFacts?.formatFact?.(fact, index) || '';
  },
};
