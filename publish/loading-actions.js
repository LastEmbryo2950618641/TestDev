/**
 * 启动加载阶段：无依赖任务并行，有依赖任务串行。
 */
window.GameModules = window.GameModules || {};

window.GameModules.loadingActions = {
  resetLoadingStages() {
    this.loadingStages = [
      { key: 'sdk', name: '平台连接', status: 'waiting' },
      { key: 'catalog', name: '角色目录', status: 'waiting' },
      { key: 'user', name: '玩家与模型', status: 'waiting' },
      { key: 'slots', name: '存档扫描', status: 'waiting' },
      { key: 'db', name: '当前存档', status: 'waiting' },
      { key: 'rpg', name: 'RPG 与记忆', status: 'waiting' },
    ];
  },

  setStage(key, status, detail = '') {
    this.loadingStages = this.loadingStages.map((x) => (x.key === key ? { ...x, status } : x));
    const current = this.loadingStages.find((x) => x.key === key);
    this.loadingStep = current ? `${current.name}：${this.stageText(status)}` : this.loadingStep;
    if (detail) this.loadingDetail = detail;
  },

  stageText(status) {
    return { waiting: '等待中', running: '加载中', done: '完成', error: '失败' }[status] || status;
  },

  async runStage(key, detail, fn) {
    this.setStage(key, 'running', detail);
    try {
      const result = await fn();
      this.setStage(key, 'done');
      return result;
    } catch (err) {
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
    });
    await this.runStage('rpg', '正在恢复世界观、角色属性和记忆索引。', async () => {
      this.ensureCatalogSelection();
      this.loadSavedRpgStates();
      await this.ensureRpgForCurrentCharacter();
    });
    this.loading = false;
  },
};
