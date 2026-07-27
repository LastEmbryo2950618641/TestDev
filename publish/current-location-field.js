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

  parse(value = '') {
    const normalized = this.normalize(value);
    const parts = this.parts(normalized);
    const valid = parts.length >= 4 && !parts.some((part) => this.isPlaceholderPart(part));
    if (!valid) {
      return {
        valid: false,
        value: normalized,
        currentWorld: '',
        currentFaction: '',
        hierarchyParts: [],
        mapNodeName: '',
        detailPosition: '',
      };
    }
    return {
      valid: true,
      value: normalized,
      currentWorld: parts[0],
      currentFaction: parts[1],
      hierarchyParts: parts.slice(2, -2),
      mapNodeName: parts.at(-2),
      detailPosition: parts.at(-1),
    };
  },

  isPlaceholderPart(part = '') {
    return /^(?:未知|某处|附近|普通地点|当前位置未知|未知地点|现实地点|当前位置|未登记|无)$/u.test(String(part || '').trim());
  },

  /**
   * Profile location chain:
   * [势力层级链...] · 地点 · 地点内位置
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

  /** World + faction + optional local hierarchy + map node + detailed position. */
  isValidProfileFormat(value = '') {
    return this.parse(value).valid;
  },

  currentWorld(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object' ? this.fromProfile(valueOrProfile) : valueOrProfile;
    return this.parse(value).currentWorld;
  },

  currentFaction(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object' ? this.fromProfile(valueOrProfile) : valueOrProfile;
    return this.parse(value).currentFaction;
  },

  hierarchyParts(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object' ? this.fromProfile(valueOrProfile) : valueOrProfile;
    return this.parse(value).hierarchyParts.slice();
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
    return this.normalize(this.parse(value).mapNodeName).slice(0, 28);
  },

  interiorPosition(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object'
      ? this.fromProfile(valueOrProfile)
      : this.normalize(valueOrProfile);
    return this.normalize(this.parse(value).detailPosition).slice(0, 120);
  },

  forceChain(valueOrProfile = '') {
    const value = typeof valueOrProfile === 'object'
      ? this.fromProfile(valueOrProfile)
      : this.normalize(valueOrProfile);
    const parsed = this.parse(value);
    if (!parsed.valid) return '';
    return [parsed.currentWorld, parsed.currentFaction, ...parsed.hierarchyParts].join(this.separator);
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
        const currentWorld = this.normalize(
          store.selectedWork
          || window.GameModules.realWorld2026?.label
          || character?.profile?.worldTag
          || '',
        );
        if (currentWorld && this.parts(force)[0] !== currentWorld) force = `${currentWorld}${this.separator}${force}`;
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
    const parsed = this.parse(currentLocation);
    const mapNodeName = parsed.mapNodeName;
    return {
      name: mapNodeName || currentLocation || '当前位置未知',
      currentLocation,
      mapNodeName,
      interiorPosition: parsed.detailPosition,
      detailPosition: parsed.detailPosition,
      currentWorld: parsed.currentWorld,
      currentFaction: parsed.currentFaction,
      hierarchyParts: parsed.hierarchyParts.slice(),
      forceChain: parsed.valid ? this.forceChain(currentLocation) : '',
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
