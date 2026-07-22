window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.linkStateHelpers = {
  controlLinkLocationText(state = null) {
    const location = state?.values?.current_location;
    if (typeof location === 'string') return location;
    if (location?.currentLocation) return location.currentLocation;
    if (location?.name) return location.name + (location.worldTag ? '｜' + location.worldTag : '');
    return '当前位置未登记';
  },

  ensureControlRoleLocation(state = null, reason = '') {
    if (!state?.values) return false;
    const before = JSON.stringify(state.values.current_location || null);
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const isPlayer = state.id === 'player-self';
    const profileLocation = isPlayer && state.profile?.currentLocation && window.GameModules.currentLocationField?.stateValue
      ? window.GameModules.currentLocationField.stateValue(state.profile, this, reason)
      : null;
    const invalid = window.GameModules.rpgState?.isInvalidLocationName?.bind(window.GameModules.rpgState) || ((name) => !String(name || '').trim());
    const currentName = typeof state.values.current_location === 'string' ? state.values.current_location : state.values.current_location?.name;
    const fallback = isPlayer ? (profileLocation?.name || this.realWorldLocationName || this.realWorldMap?.current || '现实当前位置') : '当前位置未知';
    const name = invalid(currentName) ? fallback : currentName;
    state.values.current_location = {
      ...(isPlayer ? profileLocation : {}),
      name,
      worldTag: isPlayer ? realWorld : (state.worldTag || state.profile?.work || '未知世界'),
      updatedAt: this.phoneDateText?.() || '',
      reason: reason || (isPlayer ? '玩家现实当前位置。' : '角色当前位置登记；具体地点不足时保持未知。'),
    };
    const section = (state.schema?.sections || []).find((item) => item.title === '身份信息' || item.fields?.some((field) => field.key === 'world_tag')) || state.schema?.sections?.[0];
    if (section && !section.fields.some((field) => field.key === 'current_location')) section.fields.push({ key: 'current_location', label: '当前位置', type: 'text', desc: '玩家位置字段同步；完整值为“势力·势力层级1·势力层级2·地点·地点内位置”。' });
    return before !== JSON.stringify(state.values.current_location || null);
  },
};
