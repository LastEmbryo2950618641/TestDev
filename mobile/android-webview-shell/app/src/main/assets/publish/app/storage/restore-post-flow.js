window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.storage = window.GameModules.app.storage || {};

window.GameModules.app.storage.restorePostFlow = {
  schedulePostRestoreSideEffects(store) {
    if (!store || store._postRestoreSideEffectsScheduled) return;
    store._postRestoreSideEffectsScheduled = true;
    const jobs = [
      () => window.GameModules.wechatCleanup?.run?.(store),
      () => store.initEventSystem?.(),
      () => store.initFactionSystem?.(),
      () => window.GameModules.orgTerritory?.validateWorldConsistency?.(store),
      () => store.initTaobaoApp?.(),
    ];
    const runNext = () => {
      const job = jobs.shift();
      if (!job) {
        store._postRestoreSideEffectsScheduled = false;
        return;
      }
      try {
        job();
      } catch (err) {
        console.warn('[读档] 后台初始化失败:', err?.message || err);
      }
      const schedule = store.scheduleIdleLoad?.bind(store) || ((callback) => setTimeout(callback, 80));
      schedule(runNext, 1200);
    };
    const schedule = store.scheduleIdleLoad?.bind(store) || ((callback) => setTimeout(callback, 80));
    schedule(runNext, 800);
  },

  applyNonFieldSideEffects(store) {
    window.GameModules.runtimeConfig?.applyToStore?.(store);
    window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {});
    if ((window.GameModules.realWorldLogStore?.count?.() || 0) <= 0 && (store.realWorldLog || []).length) {
      window.GameModules.realWorldLogStore?.saveAll?.(store.realWorldLog).catch((err) => {
        console.warn('[现实日志] 旧日志迁移失败:', err.message, err.stack);
      });
    }
    window.GameModules.app.storage.restorePostFlow.schedulePostRestoreSideEffects(store);
  },
};

