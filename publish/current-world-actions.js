window.GameModules = window.GameModules || {};

window.GameModules.currentWorldActions = {
  realWorldTag() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  normalizeCurrentWorldTag(worldTag = '') {
    const text = String(worldTag || '').trim();
    if (!text) return this.realWorldTag();
    if (window.GameModules.characterQuery?.isRealWorldTag?.(text) || ['现实世界', '现代都市现实世界', this.realWorldTag()].includes(text)) return this.realWorldTag();
    return text.slice(0, 40);
  },

  isRealCurrentWorld() {
    return this.normalizeCurrentWorldTag(this.currentWorldTag()) === this.realWorldTag();
  },

  currentWorldTag() {
    if (this.sharedControlActive && this.sharedControlState?.()) return this.realWorldTag();
    if ((this.started || this.entrySetupOpen) && this.character?.work) return this.normalizeCurrentWorldTag(this.character.work);
    return this.realWorldTag();
  },

  currentWorldLabel() {
    return this.isRealCurrentWorld() ? '现实世界' : this.currentWorldTag();
  },

  currentWorldBadgeText() {
    return `当前世界：${this.currentWorldLabel()}`;
  },

  currentWorldActionPlaceholder() {
    return this.isRealCurrentWorld() ? '输入你在现实世界的下一步行动...' : `输入你在${this.currentWorldLabel()}的下一步行动...`;
  },

  enforceCurrentWorldOnCharacter(character = {}) {
    const worldTag = this.currentWorldTag();
    const next = { ...character, work: worldTag, worldTag };
    if (next.profile) next.profile = { ...next.profile, work: worldTag };
    return next;
  },

  routeCurrentWorldAction() {
    if (this.isRealCurrentWorld()) return this.openRealWorldPanel?.();
    this.realWorldOpen = false;
    this.desktopUnlocked = true;
    this.closeDesktopApps?.();
    this.controlSelectOpen = false;
    this.entrySetupOpen = false;
    this.profileOpen = false;
    this.scrollLog?.();
  },
};
