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

  closeDesktopApps() {
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.savePanelOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) Object.assign(this.skillsState, { open: false, detailOpen: false });
    if (this.knownProfessionState) Object.assign(this.knownProfessionState, { open: false, detailOpen: false });
    if (this.promptState) Object.assign(this.promptState, { open: false, selectedId: '', selectedText: '', loading: false });
    if (this.tokenStatsState) Object.assign(this.tokenStatsState, { open: false, selectedId: '' });
  },

  closeAppToDesktop() {
    this.desktopUnlocked = false;
    this.closeDesktopApps();
  },

  openDesktopApp() {
    this.closeDesktopApps();
    this.desktopUnlocked = true;
  },

  openSaveApp() {
    this.closeDesktopApps();
    this.saveAppOpen = true;
    this.desktopUnlocked = true;
    this.refreshSaveMetas?.();
  },

  closeSaveApp() {
    this.saveAppOpen = false;
    this.closeAppToDesktop();
  },
};
