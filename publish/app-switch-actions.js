window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  setDesktopPage(page) { this.desktopPage = Math.max(0, Math.min(1, Number(page) || 0)); },
  startDesktopSwipe(event) { this.desktopSwipeStart = { x: event.clientX, y: event.clientY }; },
  cancelDesktopSwipe() { this.desktopSwipeStart = null; },
  endDesktopSwipe(event) {
    const start = this.desktopSwipeStart;
    this.desktopSwipeStart = null;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    this.setDesktopPage(this.desktopPage + (dx < 0 ? 1 : -1));
  },

  closeAppToDesktop() {
    this.desktopUnlocked = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
  },

  openDesktopApp() {
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.desktopUnlocked = true;
  },
};
