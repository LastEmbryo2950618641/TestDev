/**
 * 启动加载阶段：无依赖任务并行，有依赖任务串行。
 */
window.GameModules = window.GameModules || {};

function resolveLoadingProgressView() {
  return window.GameModules?.ui?.loading?.progressView || null;
}

window.GameModules.loadingActions = {
  resetLoadingStages() {
    const now = Date.now();
    this.loadingStartedAt = now;
    this.loadingNow = now;
    this.loadingStages = [
      { key: 'sdk', name: '平台连接', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'catalog', name: '角色目录', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'user', name: '玩家配置', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'slots', name: '存档扫描', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'db', name: '当前存档', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'rpg', name: 'RPG 缓存', status: 'waiting', startedAt: 0, finishedAt: 0 },
    ];
    this.startLoadingTimer();
  },

  startLoadingTimer() {
    if (this.loadingTimer) return;
    const tick = () => {
      this.loadingNow = Date.now();
      this.loadingClockTick = (Number(this.loadingClockTick) || 0) + 1;
      if (this.loading || this.roleCardLoadingState?.open) {
        this.syncLoadingStepHeadline?.();
      }
    };
    tick();
    this.loadingTimer = setInterval(tick, 1000);
  },

  stopLoadingTimerIfIdle() {
    const roleOpen = Boolean(this.roleCardLoadingState?.open);
    if ((this.loading || roleOpen) && this.loadingTimer) return;
    clearInterval(this.loadingTimer);
    this.loadingTimer = null;
  },

  setStage(key, status, detail = '') {
    const now = Date.now();
    this.loadingStages = this.loadingStages.map((x) => {
      if (x.key !== key) return x;
      return { ...x, status, startedAt: x.startedAt || (status === 'running' ? now : 0), finishedAt: ['done', 'error'].includes(status) ? now : x.finishedAt };
    });
    if (detail) this.loadingDetail = detail;
    this.syncLoadingStepHeadline();
  },

  syncLoadingStepHeadline() {
    const running = (this.loadingStages || []).find((stage) => stage.status === 'running');
    if (running) {
      this.loadingStep = `${running.name}·${this.stageText(running.status)}`;
      return;
    }
    const latest = [...(this.loadingStages || [])].reverse().find((stage) => stage.status === 'done' || stage.status === 'error');
    this.loadingStep = latest ? `${latest.name}·${this.stageText(latest.status)}` : this.loadingStep;
  },

  stageText(status) {
    const view = resolveLoadingProgressView();
    return view?.stageText ? view.stageText.call(this, status) : (status || '');
  },

  formatDuration(ms = 0) {
    const view = resolveLoadingProgressView();
    if (view?.formatDuration) return view.formatDuration.call(this, ms);
    const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    return `${total}s`;
  },

  elapsedText(startedAt = 0, finishedAt = 0) {
    const view = resolveLoadingProgressView();
    if (view?.elapsedText) return view.elapsedText.call(this, startedAt, finishedAt);
    if (!startedAt) return '';
    const end = finishedAt || this.loadingNow || Date.now();
    return this.formatDuration(Math.max(0, end - startedAt));
  },

  stageElapsedLabel(startedAt = 0, finishedAt = 0) {
    const view = resolveLoadingProgressView();
    return view?.stageElapsedLabel ? view.stageElapsedLabel.call(this, startedAt, finishedAt) : this.elapsedText(startedAt, finishedAt);
  },

  loadingProgressPercent() {
    const view = resolveLoadingProgressView();
    if (view?.loadingProgressPercent) return view.loadingProgressPercent.call(this);
    const total = (this.loadingStages || []).length || 1;
    const done = (this.loadingStages || []).filter((x) => x.status === 'done').length;
    return Math.min(100, Math.round((done / total) * 100));
  },

  loadingProgressText() {
    const view = resolveLoadingProgressView();
    if (view?.loadingProgressText) return view.loadingProgressText.call(this);
    const total = (this.loadingStages || []).length || 0;
    const done = (this.loadingStages || []).filter((x) => x.status === 'done').length;
    return `${done}/${total} 阶段`;
  },

  roleCardLoadingProgressPercent() {
    const view = resolveLoadingProgressView();
    if (view?.roleCardLoadingProgressPercent) return view.roleCardLoadingProgressPercent.call(this);
    return 0;
  },
};
