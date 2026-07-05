/**
 * 启动加载阶段：无依赖任务并行，有依赖任务串行。
 */
window.GameModules = window.GameModules || {};

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
      this.loadingStep = `${running.name}：${this.stageText(running.status)}`;
      return;
    }
    const latest = [...(this.loadingStages || [])].reverse().find((stage) => stage.status === 'done' || stage.status === 'error');
    this.loadingStep = latest ? `${latest.name}：${this.stageText(latest.status)}` : this.loadingStep;
  },

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

  async runStage(key, detail, fn) {
    console.log('[启动流程] 阶段开始:', key, detail);
    this.setStage(key, 'running', detail);
    try {
      const result = await fn();
      console.log('[启动流程] 阶段完成:', key);
      this.setStage(key, 'done');
      return result;
    } catch (err) {
      console.warn('[启动流程] 阶段失败:', key, err.message, err.stack);
      this.setStage(key, 'error', `${detail}失败：${err.message || '未知错误'}`);
      throw err;
    }
  },

  async initGame() {
    this.resetLoadingStages();
    await this.runStage('sdk', '正在连接 Gamefy SDK。', () => dzmmReady);
    await Promise.all([
      this.runStage('catalog', '正在读取作品、角色和本地设定库入口。', () => this.loadCatalog()),
      this.runStage('user', '正在准备本地玩家与模型默认值。', () => this.loadStartupPlayerConfig()),
      this.runStage('slots', '正在并行检查 10 个存档位。', () => this.refreshSaveMetas()),
    ]);
    await this.runStage('db', '正在打开当前 SQLite 存档。', async () => {
      await window.GameModules.storage.open(this.selectedSlot);
      const save = await window.GameModules.storage.get();
      window.GameModules.storage.restore(this, save);
      await window.GameModules.localSettings?.prepareActivation?.(this);
      await this.migrateCurrentSaveWealthToOneHundredMillion?.();
      await this.loadWritingStyles();
    });
    await this.runStage('rpg', '正在从当前存档数据库恢复已保存的角色状态。', async () => {
      this.ensureCatalogSelection();
      this.loadSavedRpgStates();
      await this.initPredefinedRoleCards?.();
    });
    this.loading = false;
    this.homeScreenView = 'menu';
    this.startStartupWarmup?.();
    this.startBackgroundAssetLoad?.();
    this.stopLoadingTimerIfIdle();
  },

  startBackgroundAssetLoad() {
    return window.GameModules.assetLoader?.prefetchAfterHome?.(this);
  },

  runDeferredInits() {
    if (this._deferredInitsDone) return;
    this._deferredInitsDone = true;
    this.initCompanySystem?.();
    this.initBossRecruitment?.();
    this.initCalendar?.();
    this.initFactionSystem?.();
    this.ensureAllCompanyFactions?.();
    this.initSkillsApp?.();
    this.initKnownProfessionApp?.();
    this.initTaobaoApp?.();
    this.initPromptApp?.();
    this.initTokenStatsApp?.();
  },

  ensureGameplayAssetsReady() {
    return window.GameModules.assetLoader?.ensureGameplayReady?.(this);
  },

  ensureNewGameAssetsReady() {
    return window.GameModules.assetLoader?.ensureNewGameReady?.(this);
  },

  yieldHomeLoadUi() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  },

  setHomeLoadProgress(percent, label, options = {}) {
    if (options.silent || (this.loading && !options.force)) return;
    this.homeLoadActive = true;
    this.homeLoadPercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    if (label) this.homeLoadLabel = label;
  },

  clearHomeLoadProgress() {
    this.homeLoadActive = false;
    this.homeLoadPercent = 0;
    this.homeLoadLabel = '';
    this.homeLoadSlot = '';
  },

  homeLoadProgressText() {
    return this.homeLoadLabel || '正在载入存档…';
  },

  homeLoadProgressDisplayPercent() {
    if (!this.homeLoadActive) return 0;
    const base = this.homeLoadPercent || 0;
    const assetPct = this.backgroundLoadPercent || 0;
    if (base <= 28 && assetPct > 0) {
      return Math.min(100, Math.round(8 + (assetPct * 20) / 100));
    }
    return base;
  },

  ensureDesktopModulesReady(options = {}) {
    if (this._desktopModulesReady) return Promise.resolve();
    if (this._desktopModulesLoadingPromise) return this._desktopModulesLoadingPromise;
    this._desktopModulesLoadingPromise = this.loadGameplayAssetsWithHomeProgress(0, 0, {
      showOverlay: options.showOverlay === true,
    }).then(() => {
      window.GameModules.remergeGameStore?.();
      this.runDeferredInits?.();
      this._desktopModulesReady = true;
    }).finally(() => {
      this._desktopModulesLoadingPromise = null;
    });
    return this._desktopModulesLoadingPromise;
  },

  async loadGameplayAssetsWithHomeProgress(basePct = 8, spanPct = 22, options = {}) {
    const showOverlay = options.showOverlay !== false;
    const progress = (pct, label) => {
      if (showOverlay) this.setHomeLoadProgress(pct, label);
    };
    const loader = window.GameModules.assetLoader;
    if (!loader) return;
    if (loader._prefetchPromise) {
      progress(basePct + spanPct, '玩法模块已就绪');
      await loader._prefetchPromise;
      return;
    }
    const names = window.GameModules.bootManifest?.prefetchAfterHome || [];
    if (!names.length) {
      progress(basePct + spanPct, '玩法模块已就绪');
      return;
    }
    await loader.loadChunks(names, {
      onProgress: (p) => {
        const sub = p.percent ?? 0;
        const mapped = basePct + Math.round((spanPct * sub) / 100);
        progress(mapped, p.label || '加载微信、公司等应用模块…');
      },
    });
    this.runDeferredInits?.();
  },

  startStartupWarmup() {
    if (this.startupWarmupPromise || !window.GameModules.sqliteSave.db) return this.startupWarmupPromise;
    this.startLoadingTimer();
    this.startupWarmupDone = false;
    this.startupWarmupPromise = this.runStartupWarmup().finally(() => { this.startupWarmupDone = true; this.stopLoadingTimerIfIdle(); });
    return this.startupWarmupPromise;
  },

  async runStartupWarmup() {
    console.log('[启动预热] 开始全量异步生成');
    const tasks = [];
    if (this.phoneSetupDone) {
      await this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
      tasks.push(this.warmupTask('玩家身份', () => this.ensurePlayerRpgState?.()));
    }
    const contacts = (this.wechatUsers || []).filter((item) => item && !item.group);
    for (const contact of contacts) tasks.push(this.warmupTask(`微信联系人:${contact.name || contact.id}`, () => this.ensureWechatUserProfile?.(contact)));
    await Promise.all(tasks.map((task) => task()));
    console.log('[启动预热] 全量异步生成完成', { tasks: tasks.length });
    if (tasks.length) await this.save?.();
  },

  warmupTask(name, fn) {
    return async () => {
      try {
        console.log('[启动预热] 开始:', name);
        const result = await fn();
        console.log('[启动预热] 完成:', name);
        return result;
      } catch (err) {
        console.warn('[启动预热] 失败:', name, err?.message || 'unknown', err?.stack || '');
        return null;
      }
    };
  },
};
