/**
 * 启动加载阶段文案。
 */
window.GameModules = window.GameModules || {};

window.GameModules.loadingActions = {
  setLoading(step, detail) {
    this.loadingStep = step;
    this.loadingDetail = detail;
  },

  async initGame() {
    this.setLoading('正在等待 Gamefy SDK…', '正在连接平台能力，请稍等。');
    await dzmmReady;
    this.setLoading('正在加载角色目录…', '正在读取作品、角色与原作资料索引。');
    await this.loadCatalog();
    this.setLoading('正在读取玩家与模型…', '正在选择可用 AI 模型，可能需要几秒。');
    await this.loadModelAndUser();
    this.setLoading('正在扫描存档位…', '正在检查 10 个存档的最近保存时间。');
    await this.refreshSaveMetas();
    this.setLoading('正在打开当前存档…', '正在加载 SQLite 存档、人物资料与记忆库。');
    await window.GameModules.storage.open(this.selectedSlot);
    const save = await window.GameModules.storage.get();
    window.GameModules.storage.restore(this, save);
    this.setLoading('正在恢复 RPG 状态…', '正在恢复世界观、角色固化属性和记忆索引。');
    this.ensureCatalogSelection();
    this.loadSavedRpgStates();
    await this.ensureRpgForCurrentCharacter();
    this.loading = false;
  },
};
