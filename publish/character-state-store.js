window.GameModules = window.GameModules || {};

/**
 * Character state access: ONE live object per character id for the whole session.
 *
 * Canonical source while the game is running:
 *   game.rpgStates[id]  (bound via bindLiveHost / Alpine store)
 *
 * SQLite character_state is only a cold-start snapshot / persistence target.
 * Templates under predefined-role-cards/*.js are seed data, not a second live card.
 *
 * Rules:
 * - get / getByName / resolve / list / save always return the live rpgStates[id] object
 * - DB/template clones may fill blanks on live; they must never replace the live reference
 * - valid profile.currentLocation must not be overwritten by empty/placeholder/invalid values
 */
window.GameModules.characterStateStore = {
  _liveHost: null,

  source() {
    return window.GameModules.platform?.storage?.characterStateSource
      || window.GameModules.platform?.core?.storage?.characterStateSource
      || null;
  },

  bindLiveHost(host = null) {
    this._liveHost = host || null;
    return this;
  },

  liveHost(explicit = null) {
    return explicit
      || this._liveHost
      || window.Alpine?.store?.('game')
      || null;
  },

  liveMap(explicitHost = null) {
    const host = this.liveHost(explicitHost);
    if (!host) return null;
    if (!host.rpgStates || typeof host.rpgStates !== 'object') host.rpgStates = {};
    return host.rpgStates;
  },

  characterId(state = null) {
    return String(state?.id || state?.profile?.id || '').trim();
  },

  sameName(a = '', b = '') {
    const left = String(a || '').trim();
    const right = String(b || '').trim();
    return Boolean(left && right && left === right);
  },

  worldMatches(state = null, worldTag = '') {
    const query = String(worldTag || '').trim();
    if (!query) return true;
    const normalize = window.GameModules.sqliteSave?.normalizeQueryWorldTag?.bind(window.GameModules.sqliteSave)
      || ((value) => String(value || '').trim());
    return normalize(state?.worldTag || state?.profile?.work || '') === normalize(query);
  },

  isBlank(value) {
    return value === undefined || value === null || value === '';
  },

  isUsableLocation(text = '') {
    const locField = window.GameModules.currentLocationField;
    const value = String(text || '').trim();
    if (!value) return false;
    if (locField?.isRecordedLocation) return locField.isRecordedLocation(value);
    return !/^(?:当前位置未知|未知地点|现实地点|当前位置|未登记|未知)$/u.test(value);
  },

  pickLocation(...candidates) {
    const locField = window.GameModules.currentLocationField;
    for (const item of candidates) {
      const text = locField?.normalize?.(item) || String(item || '').trim();
      if (this.isUsableLocation(text)) return text;
    }
    return '';
  },

  /** Put state into live registry by id; if id already live, merge onto that object. */
  adopt(state = null, explicitHost = null) {
    if (!state || typeof state !== 'object') return null;
    const id = this.characterId(state);
    if (!id) return state;
    state.id = id;
    const map = this.liveMap(explicitHost);
    if (!map) return state;
    if (map[id] && map[id] !== state) return this.mergeOntoLive(state, explicitHost);
    map[id] = state;
    return map[id];
  },

  /**
   * Merge a possibly-stale clone onto the single live object for this id.
   * Always returns the live reference (never the clone) when a host map exists.
   */
  mergeOntoLive(state = null, explicitHost = null) {
    if (!state || typeof state !== 'object') return null;
    const id = this.characterId(state);
    if (!id) return state;
    state.id = id;
    const map = this.liveMap(explicitHost);
    if (!map) return state;
    const live = map[id];
    if (!live) {
      map[id] = state;
      return state;
    }
    if (live === state) return live;

    // Keep ONE object identity. Incoming clone may only fill blanks / upgrade location.
    Object.keys(state).forEach((key) => {
      if (key === 'id' || key === 'profile' || key === 'values') return;
      if (this.isBlank(live[key]) && !this.isBlank(state[key])) live[key] = state[key];
    });

    const liveProfile = live.profile && typeof live.profile === 'object' ? live.profile : {};
    const nextProfile = state.profile && typeof state.profile === 'object' ? state.profile : {};
    const profile = { ...liveProfile };
    Object.keys(nextProfile).forEach((key) => {
      if (key === 'currentLocation') return;
      if (this.isBlank(profile[key]) && !this.isBlank(nextProfile[key])) profile[key] = nextProfile[key];
    });
    const chosenLocation = this.pickLocation(
      liveProfile.currentLocation,
      nextProfile.currentLocation,
      state.values?.current_location?.currentLocation,
      live.values?.current_location?.currentLocation,
    );
    if (chosenLocation) profile.currentLocation = chosenLocation;
    else if (!this.isBlank(liveProfile.currentLocation)) profile.currentLocation = liveProfile.currentLocation;

    const liveValues = live.values && typeof live.values === 'object' ? live.values : {};
    const nextValues = state.values && typeof state.values === 'object' ? state.values : {};
    const values = { ...liveValues };
    Object.keys(nextValues).forEach((key) => {
      if (key === 'current_location') return;
      if (this.isBlank(values[key]) && !this.isBlank(nextValues[key])) values[key] = nextValues[key];
    });
    const liveLocObj = liveValues.current_location && typeof liveValues.current_location === 'object'
      ? liveValues.current_location
      : null;
    const nextLocObj = nextValues.current_location && typeof nextValues.current_location === 'object'
      ? nextValues.current_location
      : null;
    if (chosenLocation) {
      const locField = window.GameModules.currentLocationField;
      values.current_location = {
        ...(liveLocObj || {}),
        ...(nextLocObj || {}),
        ...(locField?.stateValueFromText
          ? locField.stateValueFromText(
            chosenLocation,
            this.liveHost(explicitHost),
            '合并到 live 角色卡时保留合法当前位置。',
            profile.work || live.worldTag || '',
          )
          : {}),
        currentLocation: chosenLocation,
        name: locField?.mapNodeName?.(chosenLocation)
          || liveLocObj?.name
          || nextLocObj?.name
          || chosenLocation,
      };
    } else if (liveLocObj) {
      values.current_location = liveLocObj;
    }

    live.id = id;
    live.profile = profile;
    live.values = values;
    if (!live.name) live.name = state.name || profile.name || id;
    map[id] = live;
    return live;
  },

  get(id = '', explicitHost = null) {
    const key = String(id || '').trim();
    if (!key) return null;
    const map = this.liveMap(explicitHost);
    if (map?.[key]) return map[key];
    const loaded = this.source()?.get?.(key) || null;
    return loaded ? this.adopt(loaded, explicitHost) : null;
  },

  getByName(name = '', worldTag = '', explicitHost = null) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const map = this.liveMap(explicitHost);
    if (map) {
      const live = Object.values(map).find((item) => (
        this.sameName(item?.profile?.name || item?.name, clean)
        && this.worldMatches(item, worldTag)
      ));
      if (live) return live;
    }
    const loaded = this.source()?.getByName?.(clean, worldTag) || null;
    return loaded ? this.adopt(loaded, explicitHost) : null;
  },

  getWorld(id = '') {
    return this.source()?.getWorld?.(id) || null;
  },

  resolve(target = '', explicitHost = null) {
    const key = String(target || '').trim();
    if (!key) return null;
    return this.get(key, explicitHost) || this.getByName(key, '', explicitHost) || null;
  },

  /**
   * Canonical live list for a session.
   * When a host/state is available: rpgStates only (id → one object).
   * DB rows not yet loaded are adopted into live once, then returned as live refs.
   */
  list(explicitHost = null) {
    const map = this.liveMap(explicitHost);
    if (!map) return this.source()?.list?.() || [];
    const liveIds = new Set(Object.keys(map));
    const rows = Object.values(map).filter((item) => item && this.characterId(item));
    const persisted = this.source()?.list?.() || [];
    persisted.forEach((row) => {
      const id = this.characterId(row);
      if (!id || liveIds.has(id)) return;
      rows.push(this.adopt(row, explicitHost));
      liveIds.add(id);
    });
    return rows;
  },

  /** Session-only live characters (no DB hydrate). Used by map/graph lookups. */
  listLive(explicitHost = null) {
    const map = this.liveMap(explicitHost);
    if (map) return Object.values(map).filter((item) => item && this.characterId(item));
    if (explicitHost?.rpgStates && typeof explicitHost.rpgStates === 'object') {
      return Object.values(explicitHost.rpgStates).filter((item) => item && this.characterId(item));
    }
    return [];
  },

  /** Always persist the live object; never write a detached clone as canonical. */
  save(state = null, explicitHost = null) {
    if (!state) return null;
    const live = this.mergeOntoLive(state, explicitHost);
    const viaSource = this.source()?.save?.(live);
    if (viaSource && typeof viaSource.then === 'function') {
      return viaSource.then(() => live).catch((err) => {
        console.warn('[character-state-store] source.save failed, fallback sqlite:', live?.id, err?.message || err);
        return this.persistFallback(live);
      });
    }
    if (viaSource) return live;
    // Source missing (boot race / platform not wired): still hit SQLite so surround-unlock locations survive.
    return this.persistFallback(live);
  },

  persistFallback(live = null) {
    if (!live) return null;
    const sqlite = window.GameModules.sqliteSave;
    if (!sqlite?.saveCharacterState) {
      console.warn('[character-state-store] no persistence backend for', live.id);
      return live;
    }
    const done = sqlite.saveCharacterState(live);
    return done && typeof done.then === 'function'
      ? done.then(() => live).catch((err) => {
        console.warn('[character-state-store] sqlite save failed:', live.id, err?.message || err);
        return live;
      })
      : live;
  },
};
