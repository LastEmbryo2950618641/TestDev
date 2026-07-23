window.GameModules = window.GameModules || {};
window.GameModules.identityAppActions = {
  async openIdentityApp(targetId = 'player-self', returnTo = '') {
    if ((targetId || 'player-self') === 'player-self') await this.repairSelectedPlayerRoleCardState?.();
    const id = targetId || 'player-self';
    const storeApi = window.GameModules.characterStateStore;
    const locField = window.GameModules.currentLocationField;
    // Always prefer live registry; hydrate from store when missing.
    let live = storeApi?.get?.(id, this) || this.rpgStates?.[id] || null;
    if (!live && id !== 'player-self') {
      live = storeApi?.resolve?.(id, this) || null;
    }
    if (live?.id) {
      this.rpgStates = { ...(this.rpgStates || {}), [live.id]: live };
      // Prefer any recorded AI/card text. Only fill blanks from appearing/schedule/scene.
      const recorded = locField?.fromCharacterState?.(live)
        || locField?.normalize?.(live.profile?.currentLocation || '')
        || '';
      let healed = '';
      if (locField?.isRecordedLocation?.(recorded)) {
        healed = recorded;
      } else {
        const appearing = locField?.normalize?.(this.appearingLocationById?.[live.id] || '')
          || String(this.appearingLocationById?.[live.id] || '').trim();
        const scheduleFull = locField?.normalize?.(
          this.characterSchedules?.[live.id]?.profileCurrentLocation || '',
        ) || String(this.characterSchedules?.[live.id]?.profileCurrentLocation || '').trim();
        if (locField?.isRecordedLocation?.(appearing)) healed = appearing;
        else if (locField?.isRecordedLocation?.(scheduleFull)) healed = scheduleFull;
        else healed = locField?.buildSceneProfileLocation?.(this, live) || '';
      }
      if (healed && locField?.isRecordedLocation?.(healed) && healed !== recorded) {
        window.GameModules.realWorldMapFog?.writeCharacterProfileLocation?.(this, live, healed, {
          characterId: live.id,
          reason: '打开身份证时回填并固化当前位置到角色卡库。',
          source: '身份证打开回填',
        });
        this.appearingLocationById = this.appearingLocationById && typeof this.appearingLocationById === 'object'
          ? this.appearingLocationById
          : {};
        this.appearingLocationById[live.id] = healed;
        storeApi?.mergeOntoLive?.(live, this);
        await storeApi?.save?.(live, this);
        if (typeof this.save === 'function') {
          try { await Promise.resolve(this.save()); } catch (_) { /* ignore */ }
        }
      }
    }
    this.identityReturnTo = returnTo;
    this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false; if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.identityTargetId = id; this.identityAppOpen = true;
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
