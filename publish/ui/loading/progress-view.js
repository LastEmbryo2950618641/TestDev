window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.loading = window.GameModules.ui.loading || {};

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
    return this.formatDuration(ms);
  },

  stageElapsedLabel(startedAt = 0, finishedAt = 0) {
    void this.loadingClockTick;
    return this.elapsedText(startedAt, finishedAt);
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
    return `${done}/${total} 阶段 · ${this.elapsedText(this.loadingStartedAt)}`;
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
    return `正在加载(${parts}) ${this.roleCardLoadingProgressText()}`;
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
