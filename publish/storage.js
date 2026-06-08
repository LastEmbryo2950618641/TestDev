/**
 * 存档管理：dzmm.kv 优先，localStorage 防御性兜底。
 */
window.GameModules = window.GameModules || {};

window.GameModules.storage = {
  key: 'control-rpg-save',

  async put(value) {
    try {
      if (window.dzmm?.kv) {
        await window.dzmm.kv.put(this.key, value);
        return;
      }
    } catch (err) {
      console.warn('KV 保存失败:', err.code, err.message);
    }

    try {
      localStorage.setItem(this.key, JSON.stringify(value));
    } catch (_) {
      // 沙箱环境可能禁用 localStorage，忽略即可。
    }
  },

  async get() {
    try {
      if (window.dzmm?.kv) {
        const data = await window.dzmm.kv.get(this.key);
        if (data?.value) return data.value;
      }
    } catch (err) {
      console.warn('KV 读取失败:', err.code, err.message);
    }

    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  async remove() {
    try {
      if (window.dzmm?.kv) await window.dzmm.kv.delete(this.key);
    } catch (err) {
      console.warn('KV 删除失败:', err.code, err.message);
    }

    try {
      localStorage.removeItem(this.key);
    } catch (_) {
      // 忽略。
    }
  },

  snapshot(store) {
    return {
      started: store.started,
      playerName: store.playerName,
      selectedWork: store.selectedWork,
      selectedCharacterId: store.selectedCharacterId,
      online: store.online,
      turn: store.turn,
      sceneTitle: store.sceneTitle,
      mood: store.mood,
      trust: store.trust,
      resistance: store.resistance,
      quest: store.quest,
      mindText: store.mindText,
      choices: store.choices,
      log: store.log.slice(-30),
      characterStats: store.character.stats,
    };
  },

  restore(store, save) {
    if (!save?.started) return false;
    store.playerName = save.playerName || store.playerName;
    store.selectedWork = save.selectedWork || store.selectedWork;
    store.selectedCharacterId = save.selectedCharacterId || store.selectedCharacterId;
    store.online = save.online ?? store.online;
    store.turn = save.turn || 1;
    store.sceneTitle = save.sceneTitle || store.sceneTitle;
    store.mood = save.mood || store.mood;
    store.trust = save.trust ?? store.trust;
    store.resistance = save.resistance ?? store.resistance;
    store.quest = save.quest || store.quest;
    store.mindText = save.mindText || store.mindText;
    store.choices = save.choices || store.choices;
    store.log = save.log || store.log;
    store.started = true;

    if (save.characterStats) {
      Object.assign(store.character.stats, save.characterStats);
    }
    return true;
  },
};
