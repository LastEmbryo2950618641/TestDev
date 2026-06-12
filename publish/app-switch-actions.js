window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  closeAppToDesktop() {
    this.desktopUnlocked = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
  },

  openDesktopApp() {
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.desktopUnlocked = true;
  },
};
