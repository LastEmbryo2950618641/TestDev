window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.loading = window.GameModules.app.loading || {};

window.GameModules.app.loading.desktopModuleFlow = {
  ensureReady(options = {}) {
    if (this._desktopModulesReady) return Promise.resolve();
    if (this._desktopModulesLoadingPromise) return this._desktopModulesLoadingPromise;
    this._desktopModulesLoadingPromise = this.loadGameplayAssetsWithHomeProgress(0, 0, {
      showOverlay: options.showOverlay === true,
    }).then(() => {
      window.GameModules.remergeGameStore?.();
      this.refreshPhoneClockLabels?.();
      this.runDeferredInits?.();
      this._desktopModulesReady = true;
    }).finally(() => {
      this._desktopModulesLoadingPromise = null;
    });
    return this._desktopModulesLoadingPromise;
  },

  scheduleIdle(callback, timeout = 1200) {
    if (typeof callback !== 'function') return;
    const run = () => callback();
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout });
      return;
    }
    setTimeout(run, 80);
  },

  scheduleReady() {
    if (this._desktopModulesReady || this._desktopModulesScheduled || this._desktopModulesLoadingPromise) return;
    this._desktopModulesScheduled = true;
    this.scheduleIdleLoad?.(() => {
      this._desktopModulesScheduled = false;
      if (this._desktopModulesReady || this._desktopModulesLoadingPromise) return;
      void this.ensureDesktopModulesReady?.({ showOverlay: false }).catch((err) => {
        console.warn('[桌面] 后台预加载应用模块失败:', err?.message || err);
      });
    });
  },

  scheduleGameplayReady() {
    const loader = window.GameModules.assetLoader;
    if (!loader || this._gameplayAssetsReady || this._gameplayAssetsScheduled || this._gameplayAssetsLoadingPromise) return;
    const names = window.GameModules.bootManifest?.gameplayReady || [];
    if (names.length && names.every((name) => loader.isLoaded?.(name))) {
      this._gameplayAssetsReady = true;
      return;
    }
    this._gameplayAssetsScheduled = true;
    this.scheduleIdleLoad?.(() => {
      this._gameplayAssetsScheduled = false;
      if (this._gameplayAssetsReady || this._gameplayAssetsLoadingPromise) return;
      void this.ensureGameplayAssetsReady?.().catch((err) => {
        console.warn('[现实推演] 后台预加载玩法模块失败:', err?.message || err);
      });
    }, 1600);
  },

  schedulePhoneWarmup() {
    this.scheduleDesktopModulesReady?.();
    this.scheduleGameplayAssetsReady?.();
  },
};
