window.GameModules = window.GameModules || {};

window.GameModules.currentLocationField = {
  separator: '·',

  normalize(value = '') {
    return String(value || '')
      .replace(/[・‧•∙⋅･．。]/gu, '·')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280);
  },

  parts(value = '') {
    return this.normalize(value).split(this.separator).map((part) => part.trim()).filter(Boolean);
  },

  isPlaceholderPart(part = '') {
    return /^(?:未知|某处|附近|普通地点|当前位置未知|未知地点|现实地点|当前位置|未登记|无)$/u.test(String(part || '').trim());
  },

  /**
   * Profile location chain:
   * 所在世界 · 势力 · 层级1 · 层级2 · 地点 · 详细的具体位置
   * Fix common model/card mistakes like「武侯区锦苑小区3栋」(missing · between district and POI).
   */
  coerceToProfileFormat(value = '') {
    let text = this.normalize(value);
    text = text.replace(
      /(特别行政区|自治区|自治州|地区|盟|区|县|市|旗|州)(?=[\u4e00-\u9fff]{0,12}(?:小区|大厦|广场|公园|中学|小学|医院|地铁|机场|车站|港口|街道|路|巷|弄|苑|里|村|栋|号楼))/gu,
      '$1·',
    );
    text = text.replace(/·{2,}/g, '·');
    return text;
  },

  /** Valid when >=6 parts: world + force chain + map node + interior. */
  isValidProfileFormat(value = '') {
    const parts = this.parts(this.coerceToProfileFormat(value));
    if (parts.length < 6) return false;
    if (parts.some((part) => !part || this.isPlaceholderPart(part))) return false;
    return true;
  },

  fromProfile(profile = {}) {
    // Persist/display AI text as stored; do not coerce or require map-chain validity.
    return this.normalize(profile?.currentLocation || '');
  },

  isRecordedLocation(text = '') {
    const value = this.normalize(text);
    if (!value) return false;
    if (this.isPlaceholderPart(value)) return false;
    return !/^(?:当前位置未知|未知地点|现实地点|当前位置|未登记|未知)$/u.test(value);
  },

  fromCharacterState(character = null) {
    if (!character) return '';
    const fromProfile = this.fromProfile(character.profile || {});
    if (this.isRecordedLocation(fromProfile)) return fromProfile;
    return '';
  },

  displayFromCharacterState(character = null) {
    if (!character) return '';
    return this.fromProfile(character.profile || {});
  },

  roleProfile(store = null) {
    return store?.playerIdentityState?.()?.profile || {};
  },

  mapNodeName(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object'
      ? this.fromProfile(valueOrProfile)
      : this.normalize(valueOrProfile);
    const parts = this.parts(value);
    if (parts.length < 2) return '';
    return this.normalize(parts[parts.length - 2] || '').slice(0, 28);
  },

  interiorPosition(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object'
      ? this.fromProfile(valueOrProfile)
      : this.normalize(valueOrProfile);
    const parts = this.parts(value);
    if (!parts.length) return '';
    return this.normalize(parts[parts.length - 1] || '').slice(0, 120);
  },

  forceChain(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object'
      ? this.fromProfile(valueOrProfile)
      : this.normalize(valueOrProfile);
    const parts = this.parts(value);
    if (parts.length < 3) return '';
    return parts.slice(0, -2).join(this.separator);
  },

  /**
   * Build a valid profile chain for a character from scene context when AI write is missing.
   * Uses player/profile force chain + map node + interior (player interior or schedule hint).
   */
  buildSceneProfileLocation(store = null, character = null) {
    if (!store) return '';
    const id = String(character?.id || character?.profile?.id || '').trim();
    const schedule = (id && store.characterSchedules?.[id]) || {};
    const existing = this.fromCharacterState(character)
      || this.normalize(schedule.profileCurrentLocation || '');
    if (this.isValidProfileFormat(existing)) return existing;

    const player = store.rpgStates?.['player-self']
      || store.playerIdentityState?.()
      || null;
    const playerFull = this.fromCharacterState(player)
      || this.normalize(store.playerProfile?.currentLocation || '');
    let force = this.forceChain(playerFull);
    const mapNode = this.normalize(
      schedule.currentLocation
      || store.realWorldMap?.current
      || store.realWorldLocationName
      || this.mapNodeName(playerFull)
      || '',
    ).slice(0, 28);
    if (!mapNode || this.isPlaceholderPart(mapNode)) return '';

    if (!force) {
      const nodes = Array.isArray(store.realWorldMap?.nodes) ? store.realWorldMap.nodes : [];
      const anchor = nodes.find((node) => (
        node?.id === store.realWorldMap?.mapAnchorId
        || node?.id === store.realWorldMap?.currentId
        || node?.name === mapNode
      )) || null;
      const factionFact = (Array.isArray(anchor?.descriptionFacts) ? anchor.descriptionFacts : [])
        .map((item) => String(item || '').trim())
        .find((item) => item.startsWith('势力：') || item.startsWith('势力:'));
      if (factionFact) {
        force = this.normalize(factionFact.replace(/^势力\s*[:：]\s*/u, ''));
      }
    }
    if (!force || this.parts(force).some((part) => this.isPlaceholderPart(part))) return '';

    let interior = this.normalize(
      schedule.interiorPosition
      || this.interiorPosition(playerFull)
      || '',
    ).slice(0, 120);
    if (!interior || this.isPlaceholderPart(interior)) interior = '同场景室内';
    const full = [force, mapNode, interior].join(this.separator);
    return this.isValidProfileFormat(full) ? full : '';
  },

  stateValueFromText(text = '', store = null, reason = '', worldTag = '') {
    // Store AI / card text as-is (normalize separators only). Map-node parsing is optional.
    const currentLocation = this.normalize(text);
    const mapOk = this.isValidProfileFormat(currentLocation);
    const mapNodeName = mapOk ? this.mapNodeName(currentLocation) : '';
    return {
      name: mapNodeName || currentLocation || '当前位置未知',
      currentLocation,
      mapNodeName,
      interiorPosition: mapOk ? this.interiorPosition(currentLocation) : '',
      forceChain: mapOk ? this.forceChain(currentLocation) : '',
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
