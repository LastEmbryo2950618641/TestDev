window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.linkStateHelpers = {
  controlLinkLocationText(state = null) {
    const locField = window.GameModules.currentLocationField;
    const full = locField?.fromCharacterState?.(state) || '';
    if (locField?.isRecordedLocation?.(full)) return full;
    const location = state?.values?.current_location;
    if (typeof location === 'string' && locField?.isRecordedLocation?.(location)) return locField.normalize(location);
    if (location?.currentLocation && locField?.isRecordedLocation?.(location.currentLocation)) {
      return locField.normalize(location.currentLocation);
    }
    if (location?.name && locField?.isRecordedLocation?.(location.name)) {
      return location.name + (location.worldTag ? '｜' + location.worldTag : '');
    }
    return '当前位置未登记';
  },

  ensureControlRoleLocation(state = null, reason = '') {
    if (!state?.values) return false;
    const before = JSON.stringify(state.values.current_location || null);
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const isPlayer = state.id === 'player-self';
    const locField = window.GameModules.currentLocationField;
    const store = this;
    // Prefer repairing missing NPC/player location from scene/player chain instead of leaving「当前位置未知」.
    const existingFull = locField?.fromCharacterState?.(state) || '';
    if (!locField?.isValidProfileFormat?.(existingFull)) {
      const healed = locField?.buildSceneProfileLocation?.(store, state) || '';
      if (locField?.isValidProfileFormat?.(healed)) {
        state.profile = state.profile && typeof state.profile === 'object' ? state.profile : {};
        state.profile.currentLocation = healed;
        state.values.current_location = locField.stateValueFromText(
          healed,
          store,
          reason || '控制链接时从场景回填当前位置。',
          isPlayer ? realWorld : (state.worldTag || state.profile?.work || '未知世界'),
        );
        window.GameModules.characterStateStore?.mergeOntoLive?.(state, store);
        return before !== JSON.stringify(state.values.current_location || null);
      }
    }
    const profileLocation = state.profile?.currentLocation && locField?.stateValue
      ? locField.stateValue(state.profile, this, reason)
      : null;
    const prev = state.values.current_location && typeof state.values.current_location === 'object'
      ? state.values.current_location
      : null;
    const invalid = window.GameModules.rpgState?.isInvalidLocationName?.bind(window.GameModules.rpgState) || ((name) => !String(name || '').trim());
    const currentName = typeof state.values.current_location === 'string' ? state.values.current_location : state.values.current_location?.name;
    const fallback = isPlayer
      ? (profileLocation?.name || this.realWorldLocationName || this.realWorldMap?.current || '现实当前位置')
      : (profileLocation?.name || prev?.name || '当前位置未知');
    const name = invalid(currentName) ? fallback : currentName;
    const fullLocation = locField?.isValidProfileFormat?.(profileLocation?.currentLocation)
      ? profileLocation.currentLocation
      : (locField?.isValidProfileFormat?.(prev?.currentLocation) ? prev.currentLocation : existingFull);
    state.values.current_location = {
      ...(prev || {}),
      ...(profileLocation || {}),
      name: locField?.isValidProfileFormat?.(fullLocation) ? (locField.mapNodeName(fullLocation) || name) : name,
      ...(fullLocation ? { currentLocation: fullLocation } : {}),
      worldTag: isPlayer ? realWorld : (state.worldTag || state.profile?.work || '未知世界'),
      updatedAt: this.phoneDateText?.() || '',
      reason: reason || (isPlayer ? '玩家现实当前位置。' : '角色当前位置登记；具体地点不足时保持未知。'),
    };
    if (fullLocation && state.profile) state.profile.currentLocation = fullLocation;
    const section = (state.schema?.sections || []).find((item) => item.title === '身份信息' || item.fields?.some((field) => field.key === 'world_tag')) || state.schema?.sections?.[0];
    if (section && !section.fields.some((field) => field.key === 'current_location')) section.fields.push({ key: 'current_location', label: '当前位置', type: 'text', desc: '玩家位置字段同步；完整值为“[势力层级...]·地点·地点内位置”。' });
    return before !== JSON.stringify(state.values.current_location || null);
  },
};
