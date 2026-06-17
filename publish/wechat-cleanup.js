window.GameModules = window.GameModules || {};

window.GameModules.wechatCleanup = {
  version: 'clear-old-wechat-records-v2',

  run(store) {
    const save = window.GameModules.sqliteSave;
    if (!save?.db || save.getMetaJson?.(this.version)) return false;
    let changed = this.cleanWorldline(store);
    changed = this.cleanMemories(save) || changed;
    save.saveMetaJson(this.version, { cleanedAt: new Date().toISOString(), changed }).catch((err) => console.warn('[微信清理] 标记迁移失败:', err.message, err.stack));
    if (changed) window.GameModules.storage.put(window.GameModules.storage.snapshot(store)).catch((err) => console.warn('[微信清理] 保存清理结果失败:', err.message, err.stack));
    return changed;
  },

  migrateIds(store) {
    const users = Array.isArray(store.wechatUsers) ? store.wechatUsers : [];
    const messages = { ...(store.wechatMessagesByContact || {}) };
    const migrated = {};
    const byId = new Map();
    let changed = false;
    users.forEach((item) => {
      if (!item || item.group) return;
      const canonicalId = this.canonicalContactId(store, item);
      let next = item;
      if (canonicalId && item.id !== canonicalId) {
        this.moveMessages(messages, item.id, canonicalId);
        this.moveMemory(item.id, canonicalId);
        migrated[item.id] = canonicalId;
        const { profileId, stateId, oldId, ...rest } = item;
        next = { ...rest, id: canonicalId, characterId: canonicalId };
        changed = true;
      } else if (canonicalId && item.characterId !== canonicalId) {
        next = { ...item, characterId: canonicalId };
        changed = true;
      }
      if (byId.has(next.id)) {
        byId.set(next.id, this.mergeContact(byId.get(next.id), next));
        changed = true;
      } else byId.set(next.id, next);
    });
    if (store.wechatSelectedContact && migrated[store.wechatSelectedContact]) {
      store.wechatSelectedContact = migrated[store.wechatSelectedContact];
      changed = true;
    }
    if (changed) {
      store.wechatUsers = [...byId.values()];
      store.wechatMessagesByContact = messages;
    }
    return changed;
  },

  canonicalContactId(store, contact) {
    const stateFor = (id) => id && (store.rpgStates?.[id] || window.GameModules.sqliteSave?.getCharacterState?.(id));
    const direct = stateFor(contact.characterId) || stateFor(contact.id);
    if (direct?.id) return direct.id;
    const name = String(contact.name || '').trim();
    const states = this.allStates(store);
    const byName = states.find((state) => state?.name === name || state?.profile?.name === name);
    if (byName?.id) return byName.id;
    const cards = [...(store.roleCardSetup?.cards || []), ...(window.GameModules.predefinedRoleCards?.cache || [])];
    const card = cards.find((item) => item?.name === name);
    if (card?.id) return card.id;
    return contact.characterId || '';
  },

  allStates(store) {
    const map = new Map(Object.values(store.rpgStates || {}).filter(Boolean).map((state) => [state.id, state]));
    try { window.GameModules.sqliteSave?.listCharacterStates?.().forEach((state) => map.set(state.id, state)); } catch (_) { /* 忽略 */ }
    return [...map.values()];
  },

  mergeContact(a, b) {
    return { ...a, ...b, latest: b.latest || a.latest, unread: Math.max(Number(a.unread) || 0, Number(b.unread) || 0), characterId: b.characterId || a.characterId || b.id || a.id };
  },

  moveMessages(messages, oldId, characterId) {
    if (!oldId || !characterId || oldId === characterId) return false;
    const oldList = messages[oldId] || [];
    const newList = messages[characterId] || [];
    if (!oldList.length && !newList.length) return false;
    const seen = new Set();
    messages[characterId] = [...oldList, ...newList].map((msg) => (msg?.side === 'other' ? { ...msg, characterId } : msg)).filter((msg) => {
      const key = `${msg.side}|${msg.time || msg.at || ''}|${msg.text || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(-40);
    delete messages[oldId];
    return true;
  },

  moveMemory(oldId, characterId) {
    const save = window.GameModules.sqliteSave;
    if (!save?.db || !oldId || !characterId || oldId === characterId) return false;
    const oldMemory = save.getCharacterMemory(oldId);
    if (oldMemory) {
      const merged = this.mergeMemory(save.getCharacterMemory(characterId), oldMemory, characterId);
      save.db.run('INSERT OR REPLACE INTO character_memory(character_id,memory_json,updated_at) VALUES (?,?,?)', [characterId, JSON.stringify(merged), new Date().toISOString()]);
      save.db.run('DELETE FROM character_memory WHERE character_id=?', [oldId]);
    }
    save.db.run('UPDATE memory_archive SET character_id=? WHERE character_id=?', [characterId, oldId]);
    return Boolean(oldMemory);
  },

  mergeMemory(currentRaw, oldRaw, characterId) {
    const tool = window.GameModules.characterMemory;
    const current = { ...tool.normalize(currentRaw, characterId), characterId };
    const old = { ...tool.normalize(oldRaw, characterId), characterId };
    const merge = (a, b) => this.mergeMemoryList(a || [], b || []);
    return {
      ...current,
      characterId,
      shortTerm: {
        recent: merge(current.shortTerm.recent, old.shortTerm.recent),
        summaryBuffer: merge(current.shortTerm.summaryBuffer, old.shortTerm.summaryBuffer),
        summarized: merge(current.shortTerm.summarized, old.shortTerm.summarized),
        forgotten: merge(current.shortTerm.forgotten, old.shortTerm.forgotten),
      },
      longTerm: {
        vivid: merge(current.longTerm.vivid, old.longTerm.vivid),
        permanent: merge(current.longTerm.permanent, old.longTerm.permanent),
      },
      updatedAt: new Date().toISOString(),
    };
  },

  mergeMemoryList(a, b) {
    const seen = new Set();
    return [...a, ...b].filter((item) => {
      const key = item.id || `${item.time?.label || ''}|${item.text || item.summary || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  isOldWechatText(text = '') {
    return /来源：微信|玩家发送：|联系人回复：|联系人语气：|微信时间：/.test(String(text || ''));
  },

  cleanWorldline(store) {
    const state = store.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const events = state.events || [];
    const nextEvents = events.filter((event) => !(String(event.eventId || '').startsWith('wx_') || this.isOldWechatText(event.detail)));
    const changed = nextEvents.length !== events.length;
    if (changed) store.realWorldlineState = { ...state, events: nextEvents };
    return changed;
  },

  cleanMemories(save) {
    let changed = false;
    const stmt = save.db.prepare('SELECT character_id,memory_json FROM character_memory');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    rows.forEach((row) => {
      const memory = JSON.parse(row.memory_json);
      const next = this.cleanMemoryObject(memory);
      if (!next.changed) return;
      save.db.run('INSERT OR REPLACE INTO character_memory(character_id,memory_json,updated_at) VALUES (?,?,?)', [row.character_id, JSON.stringify(next.memory), new Date().toISOString()]);
      changed = true;
    });
    const archive = save.db.prepare('SELECT id,text FROM memory_archive');
    const archiveIds = [];
    while (archive.step()) {
      const row = archive.getAsObject();
      if (this.isOldWechatText(row.text)) archiveIds.push(row.id);
    }
    archive.free();
    archiveIds.forEach((id) => save.db.run('DELETE FROM memory_archive WHERE id=?', [id]));
    return archiveIds.length > 0 || changed;
  },

  cleanMemoryObject(memory) {
    const sections = ['recent', 'summaryBuffer', 'summarized', 'forgotten'];
    let changed = false;
    const shortTerm = { ...(memory.shortTerm || {}) };
    sections.forEach((key) => {
      const list = shortTerm[key] || [];
      const next = list.filter((item) => !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      shortTerm[key] = next;
    });
    const longTerm = { ...(memory.longTerm || {}) };
    ['vivid', 'permanent'].forEach((key) => {
      const list = longTerm[key] || [];
      const next = list.filter((item) => !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      longTerm[key] = next;
    });
    return { changed, memory: { ...memory, shortTerm, longTerm, updatedAt: changed ? new Date().toISOString() : memory.updatedAt } };
  },
};
