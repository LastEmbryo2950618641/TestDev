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
      { key: 'user', name: '玩家与模型', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'slots', name: '存档扫描', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'db', name: '当前存档', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'rpg', name: 'RPG 缓存', status: 'waiting', startedAt: 0, finishedAt: 0 },
    ];
    this.startLoadingTimer();
  },

  startLoadingTimer() {
    if (this.loadingTimer) return;
    this.loadingNow = Date.now();
    this.loadingTimer = setInterval(() => { this.loadingNow = Date.now(); }, 1000);
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
    const current = this.loadingStages.find((x) => x.key === key);
    this.loadingStep = current ? `${current.name}：${this.stageText(status)}` : this.loadingStep;
    if (detail) this.loadingDetail = detail;
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
    return this.formatDuration((finishedAt || this.loadingNow || Date.now()) - startedAt);
  },

  loadingProgressPercent() {
    const total = (this.loadingStages || []).length || 1;
    const done = (this.loadingStages || []).filter((x) => x.status === 'done').length;
    const running = (this.loadingStages || []).filter((x) => x.status === 'running').length * 0.35;
    return Math.min(100, Math.round(((done + running) / total) * 100));
  },

  loadingProgressText() {
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
      this.runStage('user', '正在读取玩家信息并选择 AI 模型。', () => this.loadModelAndUser()),
      this.runStage('slots', '正在并行检查 10 个存档位。', () => this.refreshSaveMetas()),
    ]);
    await this.runStage('db', '正在打开当前 SQLite 存档。', async () => {
      await window.GameModules.storage.open(this.selectedSlot);
      const save = await window.GameModules.storage.get();
      window.GameModules.storage.restore(this, save);
      await this.migrateCurrentSaveWealthToOneHundredMillion?.();
      await this.loadWritingStyles();
    });
    await this.runStage('rpg', '正在从当前存档数据库恢复已保存的角色状态。', async () => {
      this.ensureCatalogSelection();
      this.loadSavedRpgStates();
      await this.initPredefinedRoleCards?.();
    });
    this.loading = false;
    this.startStartupWarmup?.();
    this.stopLoadingTimerIfIdle();
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
