window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.linkStatusHelpers = {
  buildControlLinkPatch(state = null) {
    const linked = this.controlLinkHasHighMetric(state) && this.controlLinkHasPlayerIntimacy(state);
    return {
      ...(state?.values?.control_link || {}),
      linked,
      checkedAt: this.phoneDateText?.() || '',
      reason: linked ? '关系与经历条件已达成。' : '链接条件未达成。',
    };
  },

  applyControlLinkPatch(state = null) {
    if (!state?.values) return false;
    const before = JSON.stringify(state.values.control_link || null);
    state.values.control_link = this.buildControlLinkPatch(state);
    return before !== JSON.stringify(state.values.control_link || null);
  },
};
