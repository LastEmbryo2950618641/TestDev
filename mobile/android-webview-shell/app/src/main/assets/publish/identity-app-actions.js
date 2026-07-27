window.GameModules = window.GameModules || {};
window.GameModules.identityAppActions = {
  showIdentityAppShell(targetId = 'player-self', returnTo = '') {
    const id = targetId || 'player-self';
    this.identityReturnTo = returnTo;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.characterRosterState) this.characterRosterState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.identityTargetId = id;
    this.identityAppOpen = true;
    this.desktopUnlocked = true;
    try {
      this.ensureIdentityMetricSources(this.identityTargetId);
    } catch (err) {
      console.warn('[身份证] 指标源初始化失败：', err?.message || err, err?.stack || '');
    }
    return id;
  },

  async hydrateIdentityTargetForApp(targetId = 'player-self') {
    const id = targetId || 'player-self';
    try {
      if (id === 'player-self') await this.repairSelectedPlayerRoleCardState?.();
      const storeApi = window.GameModules.characterStateStore;
      const locField = window.GameModules.currentLocationField;
      let live = storeApi?.get?.(id, this) || this.rpgStates?.[id] || null;
      if (!live && id !== 'player-self') {
        live = storeApi?.resolve?.(id, this) || null;
      }
      if (!live?.id) return null;

      this.rpgStates = { ...(this.rpgStates || {}), [live.id]: live };
      const poolsChanged = Boolean(window.GameModules.progression?.ensureStateMechanics?.(live, live.profile || {}));
      if (poolsChanged) {
        storeApi?.mergeOntoLive?.(live, this);
        this.rpgStates = { ...(this.rpgStates || {}), [live.id]: live };
        await storeApi?.save?.(live, this);
        if (typeof this.save === 'function') {
          try { await Promise.resolve(this.save()); } catch (_) { /* ignore */ }
        }
      }

      if (live.values && Object.prototype.hasOwnProperty.call(live.values, 'current_location')) {
        delete live.values.current_location;
        storeApi?.mergeOntoLive?.(live, this);
        await storeApi?.save?.(live, this);
      }
      return live;
    } catch (err) {
      console.warn('[身份证] 打开前预处理失败，已跳过：', err?.message || err, err?.stack || '');
      return null;
    }
  },

  async openIdentityApp(targetId = 'player-self', returnTo = '') {
    const id = this.showIdentityAppShell(targetId, returnTo);
    void Promise.resolve().then(() => this.hydrateIdentityTargetForApp(id));
  },

  closeIdentityApp() { this.identityReturnTo = ''; this.closeAppToDesktop(); },
  backFromIdentityApp() {
    if (this.identityReturnTo === 'character-roster') {
      this.identityAppOpen = false;
      this.identityReturnTo = '';
      this.openCharacterRosterApp?.();
      return;
    }
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
