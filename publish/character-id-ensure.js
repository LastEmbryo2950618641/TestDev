window.GameModules = window.GameModules || {};

/**
 * After Stage1: one batch ensure for participants missing a real character id.
 * Live registry is always rpgStates[id] via characterStateStore.
 */
window.GameModules.characterIdEnsure = {
  pendingIdPattern: /^(?:pending|new|待建卡|\?)$/iu,

  isPendingId(id = '') {
    return this.pendingIdPattern.test(String(id || '').trim());
  },

  isRealCharacterId(id = '') {
    const text = String(id || '').trim();
    if (!text || this.isPendingId(text)) return false;
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
        let id = String(item.id || '').trim();
        if (id && this.isRealCharacterId(id) && storeApi?.get?.(id, store)) {
          item.id = id;
          item.idOrName = id;
          return;
        }
        const byName = storeApi?.getByName?.(name, this.worldTag(store), store);
        if (byName?.id) {
          item.id = byName.id;
          item.idOrName = byName.id;
          return;
        }
        const dedupe = `${name}::${id || 'pending'}`;
        if (seen.has(name)) return;
        seen.add(name);
        need.push({ name, item, layer: key });
      });
    });
    return need;
  },

  async ensureOne(store, name = '') {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const storeApi = window.GameModules.characterStateStore;
    const world = this.worldTag(store);
    const existing = storeApi?.getByName?.(clean, world, store);
    if (existing?.id) return existing;
    const id = this.allocateId(clean, world);
    const card = {
      id,
      name: clean,
      work: world,
      worldTag: world,
      role: '新登场人物',
      detail: `Stage1 批量建卡：${clean}`,
      appearance: '',
      preferences: '',
      personality: '',
    };
    const created = await window.GameModules.predefinedRoleCards?.createState?.(card, store, id);
    if (created?.id) {
      storeApi?.adopt?.(created, store);
      await storeApi?.save?.(created, store);
      return created;
    }
    const minimal = {
      id,
      name: clean,
      worldTag: world,
      profile: { id, name: clean, work: world, role: '新登场人物', detail: card.detail },
      values: {},
    };
    store.rpgStates = { ...(store.rpgStates || {}), [id]: minimal };
    storeApi?.adopt?.(minimal, store);
    await storeApi?.save?.(minimal, store);
    return minimal;
  },

  /**
   * One batch after Stage1. Mutates layer participant objects to real ids.
   * Returns { ensured: [{name,id}], skipped: [] }.
   */
  async ensureBatch(store, layers = {}) {
    const need = this.collectNeedEnsure(layers, store);
    if (!need.length) return { ensured: [], skipped: [], count: 0 };
    const ensured = [];
    for (const row of need) {
      try {
        const state = await this.ensureOne(store, row.name);
        if (!state?.id) {
          console.warn('[characterIdEnsure] 批量建卡失败:', row.name);
          continue;
        }
        row.item.id = state.id;
        row.item.idOrName = state.id;
        row.item.name = state.profile?.name || state.name || row.name;
        ensured.push({ name: row.name, id: state.id, layer: row.layer });
      } catch (err) {
        console.warn('[characterIdEnsure] 批量建卡异常:', row.name, err?.message || err);
      }
    }
    return { ensured, skipped: [], count: ensured.length };
  },
};
