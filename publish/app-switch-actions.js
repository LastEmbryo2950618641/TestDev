window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  activeAppName() {
    if (this.identityAppOpen) return 'identity';
    if (this.wechatAppOpen) return 'wechat';
    if (this.desktopUnlocked) return 'main';
    return this.appActiveName || 'main';
  },

  appLabel(name = this.appBackgroundName || this.activeAppName()) {
    return { identity: '身份证', wechat: '微信', main: '我要狠狠操控' }[name] || 'APP';
  },

  showAppExitChoices() {
    this.appPausedName = this.activeAppName();
    this.appDragging = false;
    this.appGesturePointerId = null;
    this.appDragY = 0;
    this.appDragPeakY = 0;
    this.appGestureFromHomeZone = false;
    this.appExitChoiceOpen = true;
  },

  closeAppToDesktop(_keepBackground = false, _targetApp = '') {
    this.appDragging = false;
    this.appGesturePointerId = null;
    this.appDragY = 0;
    this.appDragPeakY = 0;
    this.appGestureFromHomeZone = false;
    this.appExitChoiceOpen = false;
    this.appPausedName = '';
    this.appClosing = false;
    this.appSwitcherOpen = false;
    this.desktopUnlocked = false;
    this.appActiveName = 'main';
    this.appBackgroundName = '';
    this.appHasOpened = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
  },

  runAppInBackground() {
    this.closeAppToDesktop(false);
  },

  forceQuitApp() {
    this.closeAppToDesktop(false);
  },

  restoreBackgroundApp() {
    const target = this.appBackgroundName || 'main';
    this.appSwitcherOpen = false;
    this.appBackgroundName = '';
    this.appHasOpened = false;
    if (target === 'identity') return this.openIdentityApp('player-self');
    if (target === 'wechat') return this.openWechatApp();
    return this.openDesktopApp();
  },

  openDesktopApp() {
    this.appActiveName = 'main';
    this.appClosing = false;
    this.appExitChoiceOpen = false;
    this.appSwitcherOpen = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.desktopUnlocked = true;
  },

  hasBackgroundApp() {
    return Boolean(this.appBackgroundName || this.started || this.entrySetupOpen);
  },
};
