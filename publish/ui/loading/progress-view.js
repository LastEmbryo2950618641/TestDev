window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.loading = window.GameModules.ui.loading || {};

function loadingProgressView() {
  return window.GameModules.ui.loading.progressView || {};
}

window.GameModules.ui.loading.progressView = {
  stageText(status) {
    return { waiting: '等待中', running: '加载中', done: '完成', error: '失败' }[status] || status;
  },

  formatDuration(ms = 0) {
    const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h}h${m}m${s}s`;
    if (m) return `${m}m${s}s`;
    return `${s}s`;
  },

  elapsedText(startedAt = 0, finishedAt = 0) {
    if (!startedAt) return '';
    const end = finishedAt || this.loadingNow || Date.now();
    const ms = Math.max(0, end - startedAt);
    if (ms < 1000) return '<1s';
    return loadingProgressView().formatDuration.call(this, ms);
  },

  stageElapsedLabel(startedAt = 0, finishedAt = 0) {
    void this.loadingClockTick;
    return loadingProgressView().elapsedText.call(this, startedAt, finishedAt);
  },

  loadingProgressPercent() {
    const total = (this.loadingStages || []).length || 1;
    const done = (this.loadingStages || []).filter((x) => x.status === 'done').length;
    const running = (this.loadingStages || []).filter((x) => x.status === 'running').length * 0.35;
    return Math.min(100, Math.round(((done + running) / total) * 100));
  },

  loadingProgressText() {
    void this.loadingClockTick;
    const total = (this.loadingStages || []).length || 0;
    const done = (this.loadingStages || []).filter((x) => x.status === 'done').length;
    return `${done}/${total} 阶段 · ${loadingProgressView().elapsedText.call(this, this.loadingStartedAt)}`;
  },

  homeLoadProgressText() {
    return this.homeLoadLabel || '正在载入存档…';
  },

  homeLoadProgressDisplayPercent() {
    return Math.max(0, Math.min(100, Math.round(Number(this.homeLoadPercent) || 0)));
  },

  homeLoadOverlayView() {
    return {
      progressText: loadingProgressView().homeLoadProgressText.call(this),
      progressPercent: loadingProgressView().homeLoadProgressDisplayPercent.call(this),
    };
  },

  roleCardLoadingProgressPercent() {
    const cards = this.roleCardLoadingState?.cards || [];
    const totals = cards.flatMap((card) => card.steps || []).reduce((acc, step) => ({ done: acc.done + (Number(step.done) || 0), total: acc.total + (Number(step.total) || 0) }), { done: 0, total: 0 });
    return totals.total ? Math.min(100, Math.round((totals.done / totals.total) * 100)) : 0;
  },
};

window.GameModules.ui.loading.progressView = Object.assign(window.GameModules.ui.loading.progressView || {}, {
  roleCardLoadingSummary() {
    const cards = this.roleCardLoadingState?.cards || [];
    const identity = cards.filter((card) => card.type === '身份补全');
    const player = cards.filter((card) => card.type === '玩家卡');
    const role = cards.filter((card) => card.type !== '玩家卡' && card.type !== '身份补全');
    const done = (items) => items.filter((card) => card.status === 'done').length;
    const identityText = identity.length ? `${done(identity)}/${identity.length} 身份补全` : '';
    const playerText = player.length ? `${done(player)}/${player.length} 玩家卡` : '';
    const roleText = role.length ? `${done(role)}/${role.length} 角色卡` : '';
    const parts = [identityText, playerText, roleText].filter(Boolean).join(', ');
    const elapsed = loadingProgressView().elapsedText.call(this, this.roleCardLoadingState?.startedAt) || '';
    return `正在加载(${parts})${elapsed ? ` · ${elapsed}` : ''} ${loadingProgressView().roleCardLoadingProgressText.call(this)}`;
  },

  roleCardLoadingProgressText() {
    const cards = this.roleCardLoadingState?.cards || [];
    const totals = cards.flatMap((card) => card.steps || []).reduce((acc, step) => ({ done: acc.done + (Number(step.done) || 0), total: acc.total + (Number(step.total) || 0) }), { done: 0, total: 0 });
    return totals.total ? `(${totals.done}/${totals.total})` : '';
  },

  roleCardLoadingCardProgress(card = {}) {
    const totals = (card.steps || []).reduce((acc, step) => ({ done: acc.done + (Number(step.done) || 0), total: acc.total + (Number(step.total) || 0) }), { done: 0, total: 0 });
    return totals.total ? `(${totals.done}/${totals.total})` : '';
  },

  roleCardLoadingStepProgress(step = {}) {
    return `(${Number(step.done) || 0}/${Number(step.total) || 0})`;
  },

  roleCardLoadingStatusText(status) {
    return { waiting: '等待', running: '加载中', done: '完成', error: '失败' }[status] || status;
  },
});


window.GameModules.ui.loading.progressView = Object.assign(window.GameModules.ui.loading.progressView || {}, {
  loadingStageRow(stage = {}) {
    return {
      key: stage.key || '',
      name: stage.name || '',
      status: stage.status || 'waiting',
      statusText: loadingProgressView().stageText.call(this, stage.status),
      elapsedText: loadingProgressView().elapsedText.call(this, stage.startedAt, stage.finishedAt) || '0s',
    };
  },

  loadingScreenView() {
    return {
      stepText: this.loadingStep || '加载中',
      detailText: this.loadingDetail || '首次进入或存档较大时会更慢，这是正常现象。',
      progressText: loadingProgressView().loadingProgressText.call(this),
      progressPercent: loadingProgressView().loadingProgressPercent.call(this),
      stageRows: (this.loadingStages || []).map((stage) => loadingProgressView().loadingStageRow.call(this, stage)),
    };
  },

  roleCardLoadingPanelView() {
    const state = this.roleCardLoadingState || { open: false, expanded: true, cards: [] };
    return {
      summaryText: loadingProgressView().roleCardLoadingSummary.call(this),
      expanded: Boolean(state.expanded),
      progressText: loadingProgressView().roleCardLoadingProgressText.call(this),
      progressPercent: loadingProgressView().roleCardLoadingProgressPercent.call(this),
      cards: (state.cards || []).map((card = {}) => ({
        id: card.id,
        name: card.name || '',
        type: card.type || '',
        status: card.status || 'waiting',
        expanded: Boolean(card.expanded),
        progressText: loadingProgressView().roleCardLoadingCardProgress.call(this, card),
        statusText: loadingProgressView().roleCardLoadingStatusText.call(this, card.status),
        elapsedText: loadingProgressView().elapsedText.call(this, card.startedAt, card.finishedAt) || '0s',
        steps: (card.steps || []).map((step = {}) => ({
          key: step.key,
          text: step.text || '',
          status: step.status || 'waiting',
          retrying: Boolean(step.retrying),
          progressText: loadingProgressView().roleCardLoadingStepProgress.call(this, step),
          statusText: loadingProgressView().roleCardLoadingStatusText.call(this, step.status),
          elapsedText: loadingProgressView().elapsedText.call(this, step.startedAt, step.finishedAt) || '0s',
          canRetry: Boolean(this.roleCardStepCanRetry && this.roleCardStepCanRetry(card, step)),
        })),
      })),
    };
  },
});
