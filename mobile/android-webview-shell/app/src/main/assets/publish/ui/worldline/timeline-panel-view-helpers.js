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
    const recordingRows = this.realWorldRecordingEvents().map((entry) => this.realWorldTimelineRow(entry));
    return {
      timelineTitle: '现实世界线',
      timeRange: line.timeRange || '时间未知',
      rows: this.timelineItems(lore).map((item) => this.realWorldTimelineRow(item)),
      recordingRows,
      recordingEmptyText: '暂无现实记录，收起手机并进行现实行动后会写入这里。',
      emptyText: '暂无现实世界记录。收起手机并进行现实行动后会写入这里。',
    };
  },
};
