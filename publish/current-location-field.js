window.GameModules = window.GameModules || {};

window.GameModules.currentLocationField = {
  separator: '·',

  normalize(value = '') {
    return String(value || '').replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  },

  parts(value = '') {
    return this.normalize(value).split(this.separator).map((part) => part.trim()).filter(Boolean);
  },

  fromProfile(profile = {}) {
    return this.normalize(profile?.currentLocation || '');
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

  stateValue(profile = {}, store = null, reason = '') {
    const currentLocation = this.fromProfile(profile);
    const mapNodeName = this.mapNodeName(currentLocation);
    return {
      name: mapNodeName || currentLocation || '当前位置未知',
      currentLocation,
      mapNodeName,
      interiorPosition: this.interiorPosition(currentLocation),
      worldTag: window.GameModules.realWorld2026?.label || store?.selectedWork || profile?.work || '未知世界',
      updatedAt: store?.phoneDateText?.() || '',
      reason: reason || '玩家当前位置字段同步。',
    };
  },

  display(profile = {}) {
    return this.fromProfile(profile) || '当前位置未登记';
  },
};
