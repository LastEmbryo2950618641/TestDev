window.GameModules = window.GameModules || {};

/**
 * After Stage1: only reconcile participants with already-existing real ids.
 * Unknown pending participants keep 待建卡; Stage5 decides intro-card candidates and allocates ids.
 */
window.GameModules.characterIdEnsure = {
  pendingIdPattern: /^(?:pending|new|待建卡|\?)$/iu,

  isPendingId(id = '') {
    return this.pendingIdPattern.test(String(id || '').trim());
  },

  isRealCharacterId(id = '') {
    const text = String(id || '').trim();
    if (!text || this.isPendingId(text)) return false;
    if (/^(?:wx-|intro-|group-)/iu.test(text)) return false;
    return text === 'player-self' || /^rel-ai-[\w-]+$/iu.test(text) || /^[a-z][\w-]{3,64}$/iu.test(text);
  },

  allocateId(name = '', worldTag = '') {
    const seedApi = window.GameModules.rpgState;
    const seed = seedApi?.seed?.(`${name}|${worldTag}|${Date.now()}|${Math.random()}`) || Date.now();
    return `rel-ai-${Number(seed).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  },

  worldTag(store = null) {
    return store?.selectedWork
      || window.GameModules.realWorld2026?.label
      || '2026 现代都市现实世界';
  },

  existingIdByName(name = '', store = null) {
    const clean = String(name || '').trim();
    if (!clean) return '';
    const world = this.worldTag(store);
    const storeApi = window.GameModules.characterStateStore;
    const state = storeApi?.getByName?.(clean, world, store);
    if (state?.id && this.isRealCharacterId(state.id)) return state.id;
    const queryState = window.GameModules.characterQuery?.stateByName?.(store, clean, world);
    if (queryState?.id && this.isRealCharacterId(queryState.id)) return queryState.id;
    const introStore = window.GameModules.characterIntroStore;
    const intro = introStore?.get?.(clean, world) || null;
    if (intro?.id && this.isRealCharacterId(intro.id)) return intro.id;
    return '';
  },

  collectNeedEnsure(layers = {}, store = null) {
    const storeApi = window.GameModules.characterStateStore;
    const keys = ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'];
    const need = [];
    const seen = new Set();
    keys.forEach((key) => {
      (Array.isArray(layers?.[key]) ? layers[key] : []).forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const name = String(item.name || item.characterName || '').trim();
        if (!name || name === '玩家') return;
        const id = String(item.id || '').trim();
        if (id && this.isRealCharacterId(id) && storeApi?.get?.(id, store)) {
          item.id = id;
          item.idOrName = id;
          return;
        }
        const byName = this.existingIdByName(name, store);
        if (byName) {
          item.id = byName;
          item.idOrName = byName;
          return;
        }
        const dedupe = `${name}::${id || 'pending'}`;
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        need.push({ name, item, layer: key });
      });
    });
    return need;
  },

  async ensureOne(store, name = '') {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const world = this.worldTag(store);
    const existingId = this.existingIdByName(clean, store);
    if (existingId) {
      return {
        id: existingId,
        name: clean,
        worldTag: world,
        profile: {
          id: existingId,
          name: clean,
          work: world,
          presenceKind: window.GameModules.characterSocialDrive?.inferPresenceKind?.({ name: clean }) || 'individual',
        },
      };
    }
    return null;
  },

  /**
   * One batch after Stage1. Mutates only participants that match existing real ids.
   * Returns { ensured: [{name,id}], skipped: [] }.
   */
  async ensureBatch(store, layers = {}) {
    const need = this.collectNeedEnsure(layers, store);
    if (!need.length) return { ensured: [], skipped: [], count: 0 };
    const ensured = [];
    const skipped = [];
    for (const row of need) {
      try {
        const state = await this.ensureOne(store, row.name);
        if (!state?.id) {
          skipped.push({ name: row.name, layer: row.layer, reason: '待建卡保留到Stage5建介绍卡' });
          continue;
        }
        row.item.id = state.id;
        row.item.idOrName = state.id;
        row.item.name = state.profile?.name || state.name || row.name;
        ensured.push({ name: row.name, id: state.id, layer: row.layer });
      } catch (err) {
        console.warn('[characterIdEnsure] 批量分配ID异常:', row.name, err?.message || err);
      }
    }
    return { ensured, skipped, count: ensured.length };
  },
};
