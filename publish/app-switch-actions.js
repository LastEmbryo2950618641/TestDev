window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  closeAppToDesktop() {
    this.desktopUnlocked = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
  },

  openDesktopApp() {
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    this.desktopUnlocked = true;
  },
};
