window.GameModules = window.GameModules || {};

window.GameModules.controlState = {
  activeControlTargetState() {
    if (this.sharedControlActive && this.sharedControlTargetId) {
      return this.rpgStates?.[this.sharedControlTargetId] || null;
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
    return role ? `当前被控制者：${this.activeControlTargetName?.()}｜${role}` : `当前被控制者：${this.activeControlTargetName?.()}`;
  },
};
