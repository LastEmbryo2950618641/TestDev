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

  closeAppToDesktop(keepBackground = true, targetApp = '') {
    if (this.appClosing) return;
    const target = targetApp || this.appPausedName || this.activeAppName();
    this.appDragging = false;
    this.appGesturePointerId = null;
    this.appDragY = 0;
    this.appDragPeakY = 0;
    this.appGestureFromHomeZone = false;
    this.appExitChoiceOpen = false;
    this.appPausedName = '';
    this.desktopUnlocked = false;
    this.appBackgroundName = keepBackground ? target : '';
    this.appHasOpened = Boolean(this.appBackgroundName);
    this.appClosing = true;
    window.setTimeout(() => {
      this.appClosing = false;
      this.appSwitcherOpen = false;
      if (target === 'identity') this.identityAppOpen = false;
      if (target === 'wechat') this.wechatAppOpen = false;
    }, 260);
  },

  runAppInBackground() {
    this.closeAppToDesktop(true, this.appPausedName || this.activeAppName());
  },

  forceQuitApp(targetApp = '') {
    this.closeAppToDesktop(false, targetApp || this.appPausedName || this.activeAppName());
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
