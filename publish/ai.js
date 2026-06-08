/**
 * AI 交互 — 请求、解析响应、更新游戏状态
 */
window.GameModules.ai = {
  /**
   * 请求 AI 回复
   */
  async requestAIResponse(store, userMessage) {
    let content = '';

    const chatHistory = await window.dzmm.chat.list();

    const messages = [
      { role: 'user', content: window.GameModules.createSystemPrompt(store) },
      ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
    ];

    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    await window.dzmm.completions(
      { model: store.modelId, messages, maxTokens: 1500 },
      async (newContent, done) => {
        content = newContent;
        const parsed = window.GameModules.ai.parseAIResponse(content);

        if (parsed.ready) {
          window.GameModules.ai.updateGameState(store, parsed.state);
          store.chat_content = parsed.dialogue;
        }

        if (done && content) {
          const messagesToSave = [];
          if (userMessage) {
            messagesToSave.push({ role: 'user', content: userMessage });
          }
          messagesToSave.push({ role: 'assistant', content });
          await window.dzmm.chat.insert(null, messagesToSave);
        }
      },
    );
  },

  /**
   * 解析 AI 回复中的 STATE 块
   */
  parseAIResponse(content) {
    const stateMarker = '###STATE';
    const endMarker = '###END';
    const stateIndex = content.indexOf(stateMarker);
    const endIndex = content.indexOf(endMarker, stateIndex + stateMarker.length);

    if (stateIndex === -1 || endIndex === -1) {
      return { ready: false };
    }

    const jsonRaw = content.slice(stateIndex + stateMarker.length, endIndex).trim();

    try {
      const state = JSON.parse(jsonRaw);
      const dialogue = content.slice(endIndex + endMarker.length).trim();
      return { ready: true, state, dialogue };
    } catch (error) {
      console.warn('状态解析失败:', error.message);
      return { ready: false };
    }
  },

  /**
   * 根据 AI 返回的 state 更新游戏变量
   */
  updateGameState(store, state) {
    if (typeof state.affection === 'number') {
      store.current_affection = Math.max(0, Math.min(100, state.affection));
    }
    if (state.mood) store.current_mood = state.mood;
    if (state.time) store.current_time = state.time;
  },
};
