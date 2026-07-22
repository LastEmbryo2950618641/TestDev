window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.state = {
  activeControlTargetState() {
    if (this.sharedControlActive && this.sharedControlTargetId) {
      return this.rpgStates?.[this.sharedControlTargetId] || null;
    }
    if (this.started && this.online && this.character?.id && this.character.id !== 'player-self') {
      return this.rpgStates?.[this.character.id] || null;
    }
    return null;
  },

  hasActiveControlTarget() {
    return Boolean(this.activeControlTargetState?.());
  },

  activeControlTargetName() {
    const state = this.activeControlTargetState?.();
    return state?.name || state?.profile?.name || this.character?.name || '被控制者';
  },

  activeControlTargetRole() {
    const state = this.activeControlTargetState?.();
    return String(state?.profile?.role || state?.role || '').trim();
  },

  isControlRoleCurrentlyActive(idOrState = null) {
    const state = typeof idOrState === 'string'
      ? (this.rpgStates?.[idOrState] || null)
      : (idOrState || null);
    return Boolean(this.sharedControlActive && state?.id && state.id === this.sharedControlTargetId);
  },

  desktopTaskEyebrow() {
    return this.hasActiveControlTarget?.() ? '当前目标' : '今日任务';
  },

  desktopTaskTitle() {
    return this.hasActiveControlTarget?.() ? this.activeControlTargetName?.() : '选择目标';
  },

  desktopTaskSubtitle() {
    if (!this.hasActiveControlTarget?.()) return '等待操控者接入';
    const role = this.activeControlTargetRole?.();
    return role
      ? '当前被控制者：' + this.activeControlTargetName?.() + '｜' + role
      : '当前被控制者：' + this.activeControlTargetName?.();
  },

  realWorldPanelSectionTitle() {
    return this.hasActiveControlTarget?.() ? '被控制角色状态栏' : '玩家本人状态栏';
  },

  realWorldRoleLabel() {
    if (this.hasActiveControlTarget?.()) return this.sharedControlLabel?.() || '附身控制中';
    return this.playerProfile?.refinedRole || this.playerProfile?.dailyRole || '现实世界居民';
  },

  realWorldLocationLabel() {
    if (this.hasActiveControlTarget?.()) return this.controlLinkLocationText?.(this.sharedControlState?.()) || '现实位置未登记';
    return this.controlLinkLocationText?.(this.playerIdentityState?.()) || '现实位置未登记';
  },

  realWorldProfileHeading() {
    return '现实身份 / 记忆系统｜' + (this.realWorldDisplayCharacter?.().name || '当前目标');
  },

  realWorldProfileExtraFields() {
    return this.hasActiveControlTarget?.() ? [] : (this.playerProfileLexiconFields?.() || []);
  },

  realWorldProfileSections() {
    return this.profileSections?.(this.realWorldDisplayState?.(), this.realWorldProfileExtraFields?.()) || [];
  },

  canOfflineSharedControl() {
    return Boolean(this.sharedControlState?.());
  },

  prepareControlCharacterSelection(id = '') {
    if (!id) return { selectedWork: this.selectedWork || '', selectedCharacterId: this.selectedCharacterId || '' };
    const found = window.GameModules.catalog.find?.(id);
    if (found) {
      return {
        selectedWork: found.work || this.selectedWork || '',
        selectedCharacterId: found.id || id,
      };
    }
    return {
      selectedWork: this.selectedWork || '',
      selectedCharacterId: id,
    };
  },

  enterControlSelectionView() {
    this.controlSelectOpen = true;
    this.entrySetupOpen = false;
  },

  leaveControlSelectionView() {
    this.controlSelectOpen = false;
  },

  resetControlEntryDraft() {
    this.started = false;
    this.entryCurrentAction = '';
  },

  toggleControlLinkMenuState(id = '') {
    if (!id || this.busy) return this.controlLinkMenuId || '';
    return this.controlLinkMenuId === id ? '' : id;
  },

  closeControlLinkMenu() {
    this.controlLinkMenuId = '';
  },
};
