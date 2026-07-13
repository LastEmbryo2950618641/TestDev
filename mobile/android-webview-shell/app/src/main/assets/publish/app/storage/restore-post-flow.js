window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.storage = window.GameModules.app.storage || {};

window.GameModules.app.storage.restorePostFlow = {
  applyNonFieldSideEffects(store) {
    window.GameModules.runtimeConfig?.applyToStore?.(store);
    window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {});
    window.GameModules.realWorldLogStore?.saveAll?.(store.realWorldLog).catch((err) => {
      console.warn('[现实日志] 旧日志迁移失败:', err.message, err.stack);
    });
    window.GameModules.wechatCleanup?.run?.(store);
    store.initEventSystem?.();
    store.initFactionSystem?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(store);
    store.initTaobaoApp?.();
  },
};

