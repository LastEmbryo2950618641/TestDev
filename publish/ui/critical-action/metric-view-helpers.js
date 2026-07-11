window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.criticalAction = window.GameModules.ui.criticalAction || {};

window.GameModules.ui.criticalAction.metricViewHelpers = {
  novelLogEntries() {
    return (this.log || []).filter((entry) => entry.kind === 'novel');
  },
  loreNames(list, key) {
    return (Array.isArray(list) ? list : []).map((item) => item?.[key] || '').filter(Boolean).join('、') || '无';
  },

  promptDialogText() {
    const pack = this.promptDialogEntry?.promptPack || {};
    return this.promptDialogTab === 'user' ? pack.userPrompt : pack.systemPrompt;
  },
  feedbackText() {
    return this.feedbackSource === 'ai' ? (this.mindText || '--') : '--';
  },

  feedbackPlan() {
    return this.feedbackSource === 'ai' ? (this.characterIntent || '--') : '--';
  },

  feedbackSourceText() {
    return this.feedbackSource === 'ai' ? 'AI生成' : '本地兜底';
  },

  feedbackSummary() {
    const text = this.feedbackText();
    return `【${this.feedbackSourceText()}】${text.length > 18 ? `${text.slice(0, 18)}…` : text} / ${this.feedbackPlan()}`;
  },
  metricGroups(state = null) {
    if (!state || state.id === this.character?.id) {
      window.GameModules.metrics.ensure(this);
      return [
        { title: '情绪', type: 'emotion', values: this.emotions, ready: this.metricsReady },
        { title: '感觉', type: 'player', values: this.playerFeelings, ready: this.metricsReady },
        { title: '临时情绪', type: 'emotion:temporary', values: this.temporaryEmotions || {}, ready: this.metricsReady },
        { title: '临时感觉', type: 'player:temporary', values: this.temporaryPlayerFeelings || {}, ready: this.metricsReady },
      ];
    }
    const metrics = this.ensureStateMetrics ? this.ensureStateMetrics(state) : (state.metrics || {});
    return [
      { title: '情绪', type: 'emotion', values: metrics.emotions || {}, ready: true },
      { title: '感觉', type: 'player', values: metrics.playerFeelings || {}, ready: true },
      { title: '临时情绪', type: 'emotion:temporary', values: metrics.temporaryEmotions || {}, ready: true },
      { title: '临时感觉', type: 'player:temporary', values: metrics.temporaryPlayerFeelings || {}, ready: true },
    ];
  },

  metricEntries(group = {}) {
    return Object.entries(group.values || {}).map(([key, value]) => ({
      key,
      value,
      text: this.metricValueText ? this.metricValueText(value, group.ready) : value,
    }));
  },

  metricValueText(value, ready = this.metricsReady) {
    return ready && Number.isFinite(Number(value)) ? value : '--';
  },

  metricCollapsedItems() {
    window.GameModules.metrics.ensure(this);
    return window.GameModules.metrics.emotionKeys
      .map((key) => ({ key, value: this.emotions[key], text: this.metricValueText(this.emotions[key]) }))
      .slice(0, Math.max(1, this.metricSummaryLimit || 3));
  },

  installMetricSummaryObserver() {},
  toggleMetric(type, key) {
    const id = `${type}:${key}`;
    this.expandedMetricKey = this.expandedMetricKey === id ? '' : id;
  },

  isMetricOpen(type, key) {
    return this.expandedMetricKey === `${type}:${key}`;
  },

  metricNote(type, key) {
    return window.GameModules.metrics?.descriptions?.[key] || key;
  },
};
