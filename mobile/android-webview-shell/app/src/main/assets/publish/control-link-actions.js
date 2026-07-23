window.GameModules = window.GameModules || {};

window.GameModules.controlLinkActions = {
  controlLinkMetricKeys: window.GameModules.domain?.control?.linkRules?.controlLinkMetricKeys || ['好感', '信任', '依赖', '爱情', '亲情', '友情', '肉欲', '服从'],

  controlLinkState(idOrState) { return window.GameModules.domain.control.linkRules.controlLinkState.call(this, idOrState); },
  controlLinkId(item = {}) { return window.GameModules.domain.control.linkRules.controlLinkId.call(this, item); },
  controlLinkLocationText(state = null) { return window.GameModules.domain.control.linkStateHelpers.controlLinkLocationText.call(this, state); },
  ensureControlRoleLocation(state = null, reason = '') { return window.GameModules.domain.control.linkStateHelpers.ensureControlRoleLocation.call(this, state, reason); },
  controlLinkHasHighMetric(state = null) { return window.GameModules.domain.control.linkRules.controlLinkHasHighMetric.call(this, state); },
  controlLinkHasPlayerIntimacy(state = null) { return window.GameModules.domain.control.linkRules.controlLinkHasPlayerIntimacy.call(this, state); },
  isControlRoleLinked(state = null) { return window.GameModules.domain.control.linkRules.isControlRoleLinked.call(this, state); },
  buildControlLinkPatch(state = null) { return window.GameModules.domain.control.linkStatusHelpers.buildControlLinkPatch.call(this, state); },
  applyControlLinkPatch(state = null) { return window.GameModules.domain.control.linkStatusHelpers.applyControlLinkPatch.call(this, state); },
  buildSummonLocationPatch() { return window.GameModules.domain.control.controlPatchHelpers.buildSummonLocationPatch.call(this); },
  buildSummonControlLinkPatch(state = null) { return window.GameModules.domain.control.controlPatchHelpers.buildSummonControlLinkPatch.call(this, state); },
  buildOfflineControlLinkPatch(state = null, narration = '') { return window.GameModules.domain.control.controlPatchHelpers.buildOfflineControlLinkPatch.call(this, state, narration); },
  buildSummonLogText(state = null) { return window.GameModules.domain.control.controlPatchHelpers.buildSummonLogText.call(this, state); },
  buildOnlineControlLinkPatch(state = null) { return window.GameModules.domain.control.onlineControlHelpers.buildOnlineControlLinkPatch.call(this, state); },
  buildOnlineControlLogText(state = null) { return window.GameModules.domain.control.onlineControlHelpers.buildOnlineControlLogText.call(this, state); },

  async refreshControlLinkStates() {
    const save = window.GameModules.characterStateStore;
    for (const state of Object.values(this.rpgStates || {})) {
      if (!state?.values) continue;
      let changed = this.ensureControlRoleLocation(state);
      if (state.id !== 'player-self') {
        changed = this.applyControlLinkPatch(state) || changed;
      }
      if (changed) await save.save?.(state);
    }
  },

  toggleControlLinkMenu(id) {
    this.controlLinkMenuId = this.toggleControlLinkMenuState(id);
  },

  isSameWorldControlTarget(state = null) { return window.GameModules.domain.control.linkRules.isSameWorldControlTarget.call(this, state); },
  sharedControlTargetName(state = null) { return window.GameModules.domain.control.linkRules.sharedControlTargetName.call(this, state); },
  canDirectlyOnlineControl(state = null) { return window.GameModules.domain.control.linkRules.canDirectlyOnlineControl.call(this, state); },
  sharedControlStatusLabel(state = null) { return window.GameModules.domain.control.linkRules.sharedControlStatusLabel.call(this, state); },
  controlLinkPrimaryLabel(state = null) { return window.GameModules.domain.control.linkRules.controlLinkPrimaryLabel.call(this, state); },
  controlLinkPrimaryDisabled(state = null) { return window.GameModules.domain.control.linkRules.controlLinkPrimaryDisabled.call(this, state); },
  controlLinkMenuOpenable(state = null) { return window.GameModules.domain.control.linkRules.controlLinkMenuOpenable.call(this, state); },
  controlLinkSummonDisabled(state = null) { return window.GameModules.domain.control.linkRules.controlLinkSummonDisabled.call(this, state); },
  controlLinkOnlineDisabled(state = null) { return window.GameModules.domain.control.linkRules.controlLinkOnlineDisabled.call(this, state); },
  hasAnotherActiveControlTarget(state = null) { return window.GameModules.domain.control.linkRules.hasAnotherActiveControlTarget.call(this, state); },
  canSwitchControlTarget(state = null) { return window.GameModules.domain.control.linkRules.canSwitchControlTarget.call(this, state); },
  toggleControlLinkMenuState(id = '') { return window.GameModules.domain.control.state.toggleControlLinkMenuState.call(this, id); },
  closeControlLinkMenu() { return window.GameModules.domain.control.state.closeControlLinkMenu.call(this); },

  async summonControlRole(id) {
    const state = this.controlLinkState(id);
    if (!state || !this.isControlRoleLinked(state)) return;
    state.values.current_location = this.buildSummonLocationPatch();
    state.values.control_link = this.buildSummonControlLinkPatch(state);
    await window.GameModules.characterStateStore?.save?.(state);
    this.closeControlLinkMenu();
    this.realWorldLog = [...(this.realWorldLog || []), { id: `summon-${Date.now()}`, type: 'system', text: this.buildSummonLogText(state), time: this.phoneTimeText?.() || '' }];
    await window.GameModules.realWorldLogStore?.saveAll?.(this.realWorldLog);
    await this.save?.();
  },

  async onlineControlRole(id) {
    const state = this.controlLinkState(id);
    this.closeControlLinkMenu();
    if (state && this.canDirectlyOnlineControl(state)) {
      this.sharedControlTargetId = state.id;
      this.sharedControlActive = true;
      state.values.control_link = this.buildOnlineControlLinkPatch(state);
      await window.GameModules.characterStateStore?.save?.(state);
      this.realWorldOpen = true;
      this.desktopUnlocked = false;
      this.controlSelectOpen = false;
      await this.appendSharedControlSystemNarration(this.buildOnlineControlLogText(state), state);
      await this.save?.();
      return;
    }
    await this.connectControlRole(id);
  },

  sharedControlOfflineNarration(state = null) {
    const name = this.sharedControlTargetName(state);
    return `你意识从${name}的肉体深处缓缓抽离，原本重叠在一起的呼吸、心跳、触感和视野像退潮一样分开。那具身体短暂地停顿了一瞬，随后控制权重新回到${name}自己的意识里；你仍能记得刚才附身时残留的感官余温，却已经不再驱使她的手脚。`;
  },

  async appendSharedControlSystemNarration(text = '', state = null) {
    const now = this.phoneDate?.() || new Date();
    const entry = {
      id: `real-system-offline-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'ai',
      systemGenerated: true,
      narration: String(text || '').trim(),
      sceneTitle: this.realWorldSceneTitle || '现实世界',
      locationName: this.realWorldLocationLabel?.() || this.realWorldLocationName || this.realWorldMap?.current || '',
      status: this.realWorldStatus || '',
      quest: this.realWorldQuest || '',
      choices: Array.isArray(this.realWorldChoices) ? this.realWorldChoices : [],
      characterCardChanges: [],
      genericUpdates: [],
      thinking: '',
      thinkingSections: [],
      streamTrace: [],
      agentTrace: [],
      promptPack: null,
      streaming: false,
      time: { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), iso: now.toISOString() },
      createdAt: now.toISOString(),
      controlledCharacterId: state?.id || '',
      controlledCharacterName: state?.name || state?.profile?.name || '',
    };
    await this.assignRealWorldlineEntry?.(entry);
    await window.GameModules.realWorldLogStore?.append?.(entry);
    this.realWorldLog = this.normalizeRealWorldLog?.([...(this.realWorldLog || []), entry]).slice(-Math.max(1, Number(this.realWorldLogPageSize) || 12)) || [...(this.realWorldLog || []), entry];
    this.realWorldLogTotal = window.GameModules.realWorldLogStore?.count?.() || Math.max(this.realWorldLogTotal || 0, this.realWorldLog.length);
    this.refreshRealWorldLogPage?.(this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1);
    this.scrollRealWorldLogBottom?.();
    return entry;
  },

  async offlineSharedControlRole() {
    const state = this.sharedControlState?.();
    if (!state || this.realWorldBusy) return;
    this.realWorldFunctionOpen = false;
    this.realWorldFunctionView = 'menu';
    const narration = this.sharedControlOfflineNarration(state);
    await this.appendSharedControlSystemNarration(narration, state);
    this.sharedControlActive = false;
    state.values = state.values || {};
    state.values.control_link = this.buildOfflineControlLinkPatch(state, narration);
    await window.GameModules.characterStateStore?.save?.(state);
    await this.refreshControlLinkStates?.();
    await this.save?.();
  },

  sharedControlState() { return window.GameModules.domain.control.linkRules.sharedControlState.call(this); },
  sharedControlLabel() { return window.GameModules.domain.control.linkRules.sharedControlLabel.call(this); },
  realWorldDisplayState() { return window.GameModules.domain.control.linkRules.realWorldDisplayState.call(this); },
  realWorldDisplayCharacter() { return window.GameModules.domain.control.linkRules.realWorldDisplayCharacter.call(this); },
};
