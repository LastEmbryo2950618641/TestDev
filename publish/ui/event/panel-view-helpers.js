window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.event = window.GameModules.ui.event || {};

window.GameModules.ui.event.panelViewHelpers = {
  eventListView() {
    return {
      events: this.currentEventList().map((event) => ({
        id: event.id,
        name: this.eventName(event),
        meta: this.eventMeta(event),
      })),
      emptyText: this.eventListEmptyText(),
    };
  },

  selectedEventDetailView() {
    const event = this.selectedEvent();
    if (!event) {
      return {
        hasEvent: false,
        emptyText: this.selectedEventEmptyText(),
      };
    }
    const tags = Array.isArray(event.tags) ? event.tags.filter(Boolean) : [];
    return {
      hasEvent: true,
      emptyText: this.selectedEventEmptyText(),
      title: this.eventName(event),
      meta: this.eventMeta(event),
      content: String(event.content || '').trim(),
      tags,
      hasTags: tags.length > 0,
      statusFieldLabel: this.eventStatusFieldLabel(),
      statusLabel: this.eventStatusLabel(event),
      showTriggeredCount: event.type === 'random',
      triggeredCountFieldLabel: this.eventTriggeredCountFieldLabel(),
      triggeredCountText: `${event.triggeredCount || 0} 次`,
    };
  },

  eventPanelView() {
    return {
      title: '日常驱动与事件系统',
      description: this.eventHeaderDescription(),
      probabilityFieldLabel: this.eventProbabilityFieldLabel(),
      probabilityValue: this.eventRandomProbability(),
      backButtonText: this.eventBackButtonText(),
      tabs: this.eventTypeTabs(),
      listEmptyText: this.eventListEmptyText(),
    };
  },
};
