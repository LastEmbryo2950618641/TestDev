window.GameModules = window.GameModules || {};

window.GameModules.realWorldStylePolish = {
  async polish(store, result = {}, action = '') {
    const style = String(store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '').trim();
    const narration = String(result.narration || '').trim();
    if (!style || !narration) return result;
    try {
      const prompt = await this.prompt(style, result, action);
      const raw = await window.GameModules.aiRequest.complete({
        source: 'real-world-final-style',
        model: store.modelId,
        prompt,
        timeoutMs: 90000,
        requireDone: true,
        maxAttempts: 2,
        ...(window.GameModules.promptSkills?.completionOptions?.('real-world-final-style-polish') || { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'other' }),
      });
      const data = this.parse(raw);
      if (!data.narration) return result;
      return { ...result, narration: data.narration };
    } catch (err) {
      console.warn('现实推演笔风润色失败:', err.code, err.message, err.stack);
      return result;
    }
  },

  async prompt(style, result, action) {
    const count = (String(result.narration || '').match(/[\u3400-\u9fff]/gu) || []).length;
    return window.GameModules.renderPrompt('real-world-final-style-polish', {
      style,
      action: action || '继续观察现实世界',
      finalJson: JSON.stringify(result),
      minChineseChars: Math.max(200, Math.floor(count * 0.9)),
    });
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
