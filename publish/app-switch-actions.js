window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  closeAppToDesktop() {
    this.desktopUnlocked = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
  },

  openDesktopApp() {
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    this.desktopUnlocked = true;
  },
};
