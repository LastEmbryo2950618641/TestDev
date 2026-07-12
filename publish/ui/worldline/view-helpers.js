window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

window.GameModules.ui.worldline.viewHelpers = {
  selectDebugSection(name) {
    this.worldlineDebugSection = name || '世界线APP主面板';
  },

  isDebugSection(name) {
    return this.worldlineDebugSection === name;
  },

  toggleLore(lore) { return window.GameModules.ui.worldline.loreViewHelpers.toggleLore.call(this, lore); },

  isLoreOpen(lore) { return window.GameModules.ui.worldline.loreViewHelpers.isLoreOpen.call(this, lore); },

  controlLores() { return window.GameModules.ui.worldline.loreViewHelpers.controlLores.call(this); },

  realTag() { return window.GameModules.ui.worldline.loreViewHelpers.realTag.call(this); },

  realLore() { return window.GameModules.ui.worldline.loreViewHelpers.realLore.call(this); },

  timelineItems(lore) { return window.GameModules.ui.worldline.timelineViewHelpers.timelineItems.call(this, lore); },

  worldlineEventsNewestFirst(events = []) { return window.GameModules.ui.worldline.timelineViewHelpers.worldlineEventsNewestFirst.call(this, events); },

  summarizedPlots() { return window.GameModules.ui.worldline.plotViewHelpers.summarizedPlots.call(this); },

  selectRealWorldPlot(plotId) {
    this.selectedRealWorldPlotId = plotId || '';
  },

  selectedPlot() { return window.GameModules.ui.worldline.plotViewHelpers.selectedPlot.call(this); },

  selectedPlotEvents(plot = null) { return window.GameModules.ui.worldline.plotViewHelpers.selectedPlotEvents.call(this, plot); },

  recordingEvents() { return window.GameModules.ui.worldline.plotViewHelpers.recordingEvents.call(this); },

  timelineMeta(item) {
    const parts = [];
    if (item.status) parts.push(item.status);
    if (item.kind === 'event' && (item.plotId || item.summary)) parts.push(`情节:${item.plotId || item.summary}`);
    if (item.storyIndexes?.length) parts.push(`剧情:${item.storyIndexes.join('、')}`);
    if (item.factionIds?.length) parts.push(`势力:${item.factionIds.join('、')}`);
    return parts.join('｜') || (item.kind === 'story' ? '原著剧情索引' : '世界线事件');
  },

  timelineRow(item = {}) {
    return {
      key: [item.kind || 'item', item.eventId || item.order || item.name || 'row'].join('-'),
      kind: item.kind || 'event',
      time: item.time || '时间未知',
      name: item.name || '未命名记录',
      detail: item.kind === 'event' ? (item.detail || '') : (item.summary || ''),
      meta: this.timelineMeta(item),
    };
  },

  realWorldTimelineRow(item = {}) {
    return {
      key: ['real', item.eventId || item.order || item.name || 'row'].join('-'),
      kind: 'event',
      time: item.time || '现实时间',
      name: item.name || '未命名记录',
      detail: item.kind === 'event' ? (item.detail || '') : (item.summary || ''),
      meta: (item.status || '现实记录') + '｜情节:' + (item.plotId || item.summary),
    };
  },

  loreTimelinePanelView(lore = null) {
    const current = lore || this.realWorldLore?.();
    const line = this.loreWorldline(current) || {};
    return {
      timelineTitle: '世界线',
      timeRange: line.timeRange || '时间未知',
      rows: this.timelineItems(current).map((item) => this.timelineRow(item)),
      emptyText: '暂无世界线记录。',
    };
  },

  realWorldTimelinePanelView() {
    const lore = this.realWorldLore?.();
    const line = this.realWorldline?.() || {};
    return {
      timelineTitle: '现实世界线',
      timeRange: line.timeRange || '时间未知',
      rows: this.timelineItems(lore).map((item) => this.realWorldTimelineRow(item)),
      emptyText: '暂无现实世界记录。收起手机并进行现实行动后会写入这里。',
    };
  },
};
