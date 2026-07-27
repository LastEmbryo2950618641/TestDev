window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.linkStateHelpers = {
  controlLinkLocationText(state = null) {
    const locField = window.GameModules.currentLocationField;
    const full = locField?.fromCharacterState?.(state) || '';
    if (locField?.isRecordedLocation?.(full)) return full;
    return '当前位置未登记';
  },

  ensureControlRoleLocation(state = null, reason = '') {
    if (!state) return false;
    if (state.values && Object.prototype.hasOwnProperty.call(state.values, 'current_location')) {
      delete state.values.current_location;
      return true;
    }
    return false;
  },
};
