window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.loading = window.GameModules.app.loading || {};

window.GameModules.app.loading.deferredInitFlow = {
  run() {
    if (this._deferredInitsDone) return;
    this._deferredInitsDone = true;
    const jobs = [
      () => this.initCompanySystem?.(),
      () => this.initBossRecruitment?.(),
      () => this.initCalendar?.(),
      () => this.initSkillsApp?.(),
      () => this.initKnownProfessionApp?.(),
      () => this.initTaobaoApp?.(),
      () => this.initPromptApp?.(),
      () => this.initTokenStatsApp?.(),
      () => this.initFactionSystem?.(),
      () => this.ensureAllCompanyFactions?.(),
      () => window.GameModules.bodySilhouette?.prefetchManifest?.(),
      () => window.GameModules.bodyFigure?.prefetchAll?.(),
    ];
    const runNext = () => {
      const job = jobs.shift();
      if (!job) return;
      try {
        job();
      } catch (err) {
        console.warn('[desktop] deferred init failed', err?.message || err);
      }
      if (jobs.length) this.scheduleIdleLoad?.(runNext, 1800);
    };
    this.scheduleIdleLoad?.(runNext, 1200);
  },
};
