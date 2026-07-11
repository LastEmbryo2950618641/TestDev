window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.loading = window.GameModules.app.loading || {};

window.GameModules.app.loading.startupWarmup = {
  start() {
    if (this.startupWarmupPromise || !window.GameModules.platform.core.storage.capabilities.isReady?.()) return this.startupWarmupPromise;
    this.startLoadingTimer();
    this.startupWarmupDone = false;
    this.startupWarmupPromise = this.runStartupWarmup().finally(() => {
      this.startupWarmupDone = true;
      this.stopLoadingTimerIfIdle();
    });
    return this.startupWarmupPromise;
  },

  async run() {
    console.log('[启动预热] 开始全量异步生成');
    const tasks = [];
    if (this.phoneSetupDone) {
      await this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
      tasks.push(this.warmupTask('玩家身份', () => this.ensurePlayerRpgState?.()));
    }
    const contacts = (this.wechatUsers || []).filter((item) => item && !item.group);
    for (const contact of contacts) tasks.push(this.warmupTask(`微信联系人:${contact.name || contact.id}`, () => this.reuseWechatCharacterProfile?.(contact)));
    await Promise.all(tasks.map((task) => task()));
    console.log('[启动预热] 全量异步生成完成', { tasks: tasks.length });
    if (tasks.length) await this.save?.();
  },

  task(name, fn) {
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
