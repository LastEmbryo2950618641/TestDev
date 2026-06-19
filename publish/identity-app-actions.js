window.GameModules = window.GameModules || {};
window.GameModules.identityAppActions = {
  async openIdentityApp(targetId = 'player-self', returnTo = '') {
    this.identityReturnTo = returnTo;
    this.wechatAppOpen = false; this.saveAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false; if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.identityTargetId = targetId || 'player-self'; this.identityAppOpen = true;
    this.desktopUnlocked = true;
    this.ensureIdentityMetricSources(this.identityTargetId);
  },
  closeIdentityApp() { this.identityReturnTo = ''; this.closeAppToDesktop(); },
  backFromIdentityApp() {
    if (this.identityReturnTo !== 'wechat') return this.closeIdentityApp();
    this.identityAppOpen = false;
    this.identityReturnTo = '';
    this.wechatAppOpen = true;
    this.desktopUnlocked = true;
  },
  ensureWechatId() {
    if (!this.playerProfile.wechatId) {
      this.playerProfile.wechatId = `wx${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
      this.save?.();
    }
    return this.playerProfile.wechatId;
  },
};
