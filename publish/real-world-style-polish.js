window.GameModules = window.GameModules || {};

window.GameModules.realWorldStylePolish = {
  async polish(store, result = {}, action = '') {
    const style = String(store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '').trim();
    const narration = String(result.narration || '').trim();
    if (!style || !narration) return result;
    try {
      const prompt = this.prompt(style, result, action);
      const raw = await window.GameModules.aiRequest.complete({
        source: 'real-world-final-style',
        model: store.modelId,
        prompt,
        timeoutMs: 90000,
        requireDone: true,
        maxAttempts: 2,
      });
      const data = this.parse(raw);
      if (!data.narration) return result;
      return { ...result, narration: data.narration };
    } catch (err) {
      console.warn('现实推演笔风润色失败:', err.code, err.message, err.stack);
      return result;
    }
  },

  prompt(style, result, action) {
    const count = (String(result.narration || '').match(/[\u3400-\u9fff]/gu) || []).length;
    return `你只负责润色现实推演 final 的 narration 字段，不改变事实、时间、地点、人物、物品、数值、choices 或 JSON 结构。\n\n## 小说笔风\n${style}\n\n## 本次行动\n${action || '继续观察现实世界'}\n\n## 原始 final\n${JSON.stringify(result)}\n\n## 要求\n1. 只输出合法 JSON：{"narration":"润色后的正文"}。\n2. narration 必须保持第二人称现实描写。\n3. 不新增原始 final 没有的关键事实，不改地点和结果。\n4. 保留现实克制感，并体现原始正文中的身体状态影响。\n5. 不要缩写、摘要或删减原文事件，润色后正文不得少于 ${Math.max(200, Math.floor(count * 0.9))} 个汉字。`;
  },

  parse(raw = '') {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(raw);
      const text = String(data?.narration || '').trim();
      return { narration: text ? window.GameModules.realWorldAi.formatNarration(text, 120) : '' };
    } catch (err) {
      console.warn('现实推演笔风润色解析失败:', err.message, err.stack);
      return { narration: '' };
    }
  },
};
