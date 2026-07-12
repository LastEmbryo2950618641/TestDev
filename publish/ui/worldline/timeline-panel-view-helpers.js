window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

function buildTimelineMeta(item = {}) {
  const parts = [];
  if (item.status) parts.push(item.status);
  if (item.kind === 'event' && (item.plotId || item.summary)) parts.push(`情节:${item.plotId || item.summary}`);
  if (item.storyIndexes?.length) parts.push(`剧情:${item.storyIndexes.join('、')}`);
  if (item.factionIds?.length) parts.push(`势力:${item.factionIds.join('、')}`);
  return parts.join('｜') || (item.kind === 'story' ? '原著剧情索引' : '世界线事件');
}

function buildTimelinePanelBaseView({ timelineTitle, timeRange, rows, emptyText }) {
  return {
    timelineTitle,
    timeRange,
    rows,
    emptyText,
  };
}

window.GameModules.ui.worldline.timelinePanelViewHelpers = {
  timelineMeta(item) {
    return buildTimelineMeta(item);
  },

  timelineRow(item = {}) {
    return {
      key: [item.kind || 'item', item.eventId || item.order || item.name || 'row'].join('-'),
      kind: item.kind || 'event',
      time: item.time || '时间未知',
      name: item.name || '未命名记录',
      detail: item.kind === 'event' ? (item.detail || '') : (item.summary || ''),
      meta: buildTimelineMeta(item),
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

  buildLoreTimelineRows(lore = null) {
    return this.timelineItems(lore).map((item) => this.timelineRow(item));
  },

  buildRealWorldTimelineRows(lore = null) {
    return this.timelineItems(lore).map((item) => this.realWorldTimelineRow(item));
  },

  buildRealWorldRecordingRows() {
    return this.realWorldRecordingEvents().map((entry) => this.realWorldTimelineRow(entry));
  },

  loreTimelinePanelView(lore = null) {
    const current = lore || this.realWorldLore?.();
    const line = this.loreWorldline(current) || {};
    return buildTimelinePanelBaseView({
      timelineTitle: '世界线',
      timeRange: line.timeRange || '时间未知',
      rows: this.buildLoreTimelineRows(current),
      emptyText: '暂无世界线记录。',
    });
  },

  realWorldTimelinePanelView() {
    const lore = this.realWorldLore?.();
    const line = this.realWorldline?.() || {};
    return {
      ...buildTimelinePanelBaseView({
        timelineTitle: '现实世界线',
        timeRange: line.timeRange || '时间未知',
        rows: this.buildRealWorldTimelineRows(lore),
        emptyText: '暂无现实世界记录。收起手机并进行现实行动后会写入这里。',
      }),
      recordingRows: this.buildRealWorldRecordingRows(),
      recordingEmptyText: '暂无现实记录，收起手机并进行现实行动后会写入这里。',
    };
  },
};
