window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

window.GameModules.ui.worldline.plotViewHelpers = {
  summarizedPlots() {
    return this.realWorldline().plots || [];
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
};
