window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.event = window.GameModules.ui.event || {};

window.GameModules.ui.event.viewHelpers = {
  eventsByType(type = this.eventState?.tab || 'random') {
    this.initEventSystem();
    const normalized = window.GameModules.eventSystem.normalizeType(type);
    return (this.eventState.events || [])
      .filter((event) => event.type === normalized)
      .sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')) || String(a.title || '').localeCompare(String(b.title || '')));
  },

  eventName(event = {}) {
    return window.GameModules.eventSystem.eventDisplayName(event);
  },

  eventTypeTabs() {
    return window.GameModules.eventSystem.EVENT_TYPES.map((type) => ({ type, label: window.GameModules.eventSystem.typeLabel(type), count: this.eventsByType(type).length }));
  },

  currentEventList() {
    return this.eventsByType(this.eventState?.tab || 'random');
  },

  selectedEvent() {
    this.initEventSystem();
    const id = this.eventState.selectedId || this.currentEventList()[0]?.id || '';
    return (this.eventState.events || []).find((event) => event.id === id) || null;
  },

  eventMeta(event = {}) {
    const dates = `${event.startDate || '未知'} - ${event.endDate || event.startDate || '未知'}`;
    const people = (event.people || []).join('、') || '无相关人';
    const tags = (event.tags || []).join('、') || '无标签';
    return `${dates}｜${event.location || '地点未定'}｜${people}｜${tags}`;
  },

  eventStatusLabel(event = {}) {
    if (event.type !== 'periodic' && window.GameModules.eventSystem.isExpired(event, this.phoneDate?.() || new Date())) return '已结束';
    if (window.GameModules.eventSystem.dateInRange(this.phoneDate?.() || new Date(), event)) return '可触发';
    return '未到时间';
  },

  eventRandomProbability() {
    this.initEventSystem();
    return Math.max(0, Math.min(100, Math.round(Number(this.eventState.randomProbability ?? 10) || 0)));
  },

  selectedEventDetailView() { return window.GameModules.ui.event.panelViewHelpers.selectedEventDetailView.call(this); },

  eventPanelView() { return window.GameModules.ui.event.panelViewHelpers.eventPanelView.call(this); },
};

window.GameModules.ui.event.viewHelpers = Object.assign(window.GameModules.ui.event.viewHelpers || {}, {
  eventListEmptyText() {
    return '暂无该类型事件。';
  },

  eventStatusFieldLabel() {
    return '状态：';
  },

  eventTriggeredCountFieldLabel() {
    return '触发：';
  },

  eventHeaderDescription() {
    return '随机事件、推演事件、周期事件';
  },

  eventProbabilityFieldLabel() {
    return '随机事件发生概率';
  },

  eventBackButtonText() {
    return '回到桌面';
  },

  selectedEventEmptyText() {
    return '选择左侧事件查看详情。';
  },
});
