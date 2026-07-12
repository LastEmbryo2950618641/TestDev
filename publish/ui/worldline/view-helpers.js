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

  timelineItems(lore) {
    const worldline = this.loreWorldline(lore) || {};
    const events = this.worldlineEventsNewestFirst(worldline.events || []).map((event, index) => ({ ...event, kind: 'event', order: index }));
    const indexes = (worldline.storyIndexes || []).map((text, index) => ({ kind: 'story', order: events.length + index, time: '原著剧情', name: `剧情索引 ${index + 1}`, summary: text }));
    return [...events, ...indexes];
  },

  worldlineEventsNewestFirst(events = []) {
    return (Array.isArray(events) ? events : []).map((event, index) => ({ ...event, order: index })).sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')) || b.order - a.order);
  },

  summarizedPlots() {
    return this.realWorldline().plots || [];
  },

  selectRealWorldPlot(plotId) {
    this.selectedRealWorldPlotId = plotId || '';
  },

  selectedPlot() {
    const plots = this.realWorldSummarizedPlots();
    return plots.find((plot) => plot.情节编号 === this.selectedRealWorldPlotId) || plots[0] || null;
  },

  selectedPlotEvents(plot = null) {
    const selected = plot || this.realWorldSelectedPlot();
    const id = selected?.情节编号 || '';
    if (!id) return [];
    const recordIds = String(selected?.重要记录编号 || '').split(/[、,，\s]+/).filter(Boolean);
    return this.worldlineEventsNewestFirst(this.realWorldline().events || []).filter((event) => (event.plotId || event.summary) === id || recordIds.includes(event.eventId));
  },

  recordingEvents() {
    const ids = this.realWorldline().pendingPlot?.recordIds || [];
    if (!ids.length) return [];
    return this.worldlineEventsNewestFirst(this.realWorldline().events || []).filter((event) => ids.includes(event.eventId));
  },

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
