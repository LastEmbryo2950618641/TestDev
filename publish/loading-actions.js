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
    return view?.formatDuration ? view.formatDuration.call(this, ms) : '0s';
  },

  elapsedText(startedAt = 0, finishedAt = 0) {
    const view = resolveLoadingProgressView();
    return view?.elapsedText ? view.elapsedText.call(this, startedAt, finishedAt) : '';
  },

  stageElapsedLabel(startedAt = 0, finishedAt = 0) {
    const view = resolveLoadingProgressView();
    return view?.stageElapsedLabel ? view.stageElapsedLabel.call(this, startedAt, finishedAt) : '';
  },

  loadingProgressPercent() {
    const view = resolveLoadingProgressView();
    return view?.loadingProgressPercent ? view.loadingProgressPercent.call(this) : 0;
  },

  loadingProgressText() {
    const view = resolveLoadingProgressView();
    return view?.loadingProgressText ? view.loadingProgressText.call(this) : '';
  },

  homeLoadProgressText() {
    const view = resolveLoadingProgressView();
    return view?.homeLoadProgressText ? view.homeLoadProgressText.call(this) : '正在载入存档…';
  },

  homeLoadProgressDisplayPercent() {
    const view = resolveLoadingProgressView();
    return view?.homeLoadProgressDisplayPercent ? view.homeLoadProgressDisplayPercent.call(this) : 0;
  },

  roleCardLoadingProgressPercent() {
    const view = resolveLoadingProgressView();
    return view?.roleCardLoadingProgressPercent ? view.roleCardLoadingProgressPercent.call(this) : 0;
  },
};
