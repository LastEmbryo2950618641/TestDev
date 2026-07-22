/**
 * 启动加载阶段：无依赖任务并行，有依赖任务串行。
 */
window.GameModules = window.GameModules || {};

function resolveLoadingProgressView() {
  return window.GameModules?.ui?.loading?.progressView || null;
}

function callLoadingFlow(flowName, method, context, ...args) {
  const flow = window.GameModules?.app?.loading?.[flowName];
  const action = flow?.[method];
  if (typeof action !== 'function') throw new Error(`Loading flow unavailable: ${flowName}.${method}`);
  return action.call(context, ...args);
}

function resolveStageStatusText(context, status) {
  const view = resolveLoadingProgressView();
  return view?.stageText ? view.stageText.call(context, status) : (status || '');
}

window.GameModules.loadingActions = {
  stageText(status = '') {
    const view = resolveLoadingProgressView();
    return view?.stageText ? view.stageText.call(this, status) : (status || '');
  },

  elapsedText(startedAt = 0, finishedAt = 0) {
    const view = resolveLoadingProgressView();
    return view?.elapsedText ? view.elapsedText.call(this, startedAt, finishedAt) : '';
  },

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
      this.loadingStep = `${running.name}·${resolveStageStatusText(this, running.status)}`;
      return;
    }
    const latest = [...(this.loadingStages || [])].reverse().find((stage) => stage.status === 'done' || stage.status === 'error');
    this.loadingStep = latest ? `${latest.name}·${resolveStageStatusText(this, latest.status)}` : this.loadingStep;
  },


  homeLoadOverlayView() {
    const view = resolveLoadingProgressView();
    return view?.homeLoadOverlayView ? view.homeLoadOverlayView.call(this) : { progressText: '正在载入存档…', progressPercent: 0 };
  },

  loadingScreenView() {
    const view = resolveLoadingProgressView();
    return view?.loadingScreenView ? view.loadingScreenView.call(this) : { stepText: this.loadingStep || '', detailText: this.loadingDetail || '', progressText: '', progressPercent: 0, stageRows: [] };
  },

  roleCardLoadingPanelView() {
    const view = resolveLoadingProgressView();
    return view?.roleCardLoadingPanelView ? view.roleCardLoadingPanelView.call(this) : { summaryText: '', expanded: true, progressText: '', progressPercent: 0, cards: [] };
  },

  async ensureGameplayAssetsReady() {
    await window.GameModules.assetLoader?.ensureGameplayReady?.(this);
    window.GameModules.remergeGameStore?.();
  },

  async loadGameplayAssetsWithHomeProgress(start = 0, end = 100, options = {}) {
    const loader = window.GameModules.assetLoader;
    if (!loader) return;
    const names = window.GameModules.bootManifest?.gameplayReady || [];
    const span = Math.max(0, Number(end) - Number(start));
    const showOverlay = options.showOverlay === true || this.phoneDesktopBooting;
    await loader.loadChunks?.(names, {
      onProgress: (progress = {}) => {
        const percent = Number.isFinite(Number(progress.percent)) ? Number(progress.percent) : 0;
        const mapped = Math.round(Number(start) + (percent / 100) * span);
        this.backgroundLoadPercent = percent;
        if (showOverlay || typeof this.setHomeLoadProgress === 'function') {
          this.setHomeLoadProgress?.(mapped, progress.label || '加载玩法模块…');
        }
      },
    });
    window.GameModules.remergeGameStore?.();
  },

  runDeferredInits() {
    return callLoadingFlow('deferredInitFlow', 'run', this);
  },

  ensureDesktopModulesReady(options = {}) {
    return callLoadingFlow('desktopModuleFlow', 'ensureReady', this, options);
  },

  scheduleIdleLoad(callback, timeout = 1200) {
    return callLoadingFlow('desktopModuleFlow', 'scheduleIdle', this, callback, timeout);
  },

  scheduleDesktopModulesReady() {
    return callLoadingFlow('desktopModuleFlow', 'scheduleReady', this);
  },

  scheduleGameplayAssetsReady() {
    return callLoadingFlow('desktopModuleFlow', 'scheduleGameplayReady', this);
  },

  schedulePhoneWarmup() {
    return callLoadingFlow('desktopModuleFlow', 'schedulePhoneWarmup', this);
  },

  startStartupWarmup() {
    return callLoadingFlow('startupWarmup', 'start', this);
  },

  runStartupWarmup() {
    return callLoadingFlow('startupWarmup', 'run', this);
  },

  warmupTask(name, fn) {
    return callLoadingFlow('startupWarmup', 'task', this, name, fn);
  },
};
