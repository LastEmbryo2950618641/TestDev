window.GameModules = window.GameModules || {};
window.GameModules.wechatAppActions = {
  openWechatApp() {
    this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
    this.identityAppOpen = false; this.saveAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false; if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.wechatAppOpen = true; this.desktopUnlocked = true;
    if (this.syncWechatContactsFromRpgStates?.()) this.save?.();
    this.wechatTab = this.wechatTab || 'chats';
    this.wechatView = this.wechatView || 'home';
    setTimeout(() => this.debugWechatMemory?.(), 0);
  },
  closeWechatApp() { this.closeAppToDesktop(); },
  async openWechatIdentity() {
    const contact = this.wechatSelected?.();
    const id = contact?.group ? 'player-self' : (contact?.id || this.wechatSelectedContact || 'player-self');
    await this.openIdentityApp(id);
  },
};
