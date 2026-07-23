window.GameModules = window.GameModules || {};

window.GameModules.currentLocationField = {
  separator: '·',

  normalize(value = '') {
    return String(value || '').replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  },

  parts(value = '') {
    return this.normalize(value).split(this.separator).map((part) => part.trim()).filter(Boolean);
  },

  isPlaceholderPart(part = '') {
    return /^(?:未知|某处|附近|普通地点|当前位置未知|未知地点|现实地点|当前位置|未登记|无)$/u.test(String(part || '').trim());
  },

  /** Profile card location must be exactly: 势力·层级1·层级2·地点·地点内位置 */
  isValidProfileFormat(value = '') {
    const parts = this.parts(value);
    if (parts.length !== 5) return false;
    if (parts.some((part) => !part || this.isPlaceholderPart(part))) return false;
    return true;
  },

  fromProfile(profile = {}) {
    return this.normalize(profile?.currentLocation || '');
  },

  fromCharacterState(character = null) {
    if (!character) return '';
    const fromProfile = this.fromProfile(character.profile || {});
    if (fromProfile) return fromProfile;
    const raw = character.values?.current_location;
    if (typeof raw === 'string') return this.normalize(raw);
    return this.normalize(raw?.currentLocation || raw?.name || '');
  },

  roleProfile(store = null) {
    return store?.playerIdentityState?.()?.profile || {};
  },

  mapNodeName(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object' ? this.fromProfile(valueOrProfile) : this.normalize(valueOrProfile);
    const parts = this.parts(value);
    return this.normalize(parts[3] || '').slice(0, 28);
  },

  interiorPosition(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object' ? this.fromProfile(valueOrProfile) : this.normalize(valueOrProfile);
    const parts = this.parts(value);
    return this.normalize(parts[4] || '').slice(0, 40);
  },

  stateValueFromText(text = '', store = null, reason = '', worldTag = '') {
    const currentLocation = this.normalize(text);
    const mapNodeName = this.mapNodeName(currentLocation);
    return {
      name: mapNodeName || currentLocation || '当前位置未知',
      currentLocation,
      mapNodeName,
      interiorPosition: this.interiorPosition(currentLocation),
      worldTag: worldTag
        || window.GameModules.realWorld2026?.label
        || store?.selectedWork
        || '未知世界',
      updatedAt: store?.phoneDateText?.() || '',
      reason: reason || '当前位置字段同步。',
    };
  },

  stateValue(profile = {}, store = null, reason = '') {
    return this.stateValueFromText(
      this.fromProfile(profile),
      store,
      reason || '玩家当前位置字段同步。',
      window.GameModules.realWorld2026?.label || store?.selectedWork || profile?.work || '未知世界',
    );
  },

  display(profile = {}) {
    return this.fromProfile(profile) || '当前位置未登记';
  },
};
