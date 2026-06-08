/**
 * 存档管理 — 保存/恢复游戏设置和进度
 */
window.GameModules.storage = {
  /**
   * 保存玩家设置到 KV
   */
  async saveSettings(store) {
    try {
      await window.dzmm.kv.put('galgame-settings', {
        player_name: store.player_name,
        relationship: store.relationship,
        initial_affection: store.initial_affection,
      });
    } catch (e) { console.warn('[SDK] kv.put settings failed:', e.message); }
  },

  /**
   * 从 KV 恢复玩家设置
   */
  async loadSettings(store) {
    try {
      const saved = await window.dzmm.kv.get('galgame-settings');
      if (saved?.value) {
        if (saved.value.relationship) store.relationship = saved.value.relationship;
        if (typeof saved.value.initial_affection === 'number') {
          store.initial_affection = saved.value.initial_affection;
        }
      }
    } catch (e) { console.warn('[SDK] kv.get settings failed:', e.message); }
  },

  /**
   * 从聊天记录恢复游戏进度
   */
  async restoreProgress(store) {
    try {
      const messages = await window.dzmm.chat.list();

      if (messages && messages.length > 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            const parsed = window.GameModules.ai.parseAIResponse(messages[i].content);
            if (parsed.ready) {
              window.GameModules.ai.updateGameState(store, parsed.state);
              store.chat_content = parsed.dialogue;
              store.started = true;
              break;
            }
          }
        }

        if (!store.started && messages.length > 0) {
          store.started = true;
        }
      }
    } catch (error) {
      console.warn('读取存档失败:', error.message);
    }
  },
};
