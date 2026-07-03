window.GameModules = window.GameModules || {};

window.GameModules.aiProvider.register('dzmm', {
  id: 'dzmm',

  async listTextModels() {
    const result = await window.dzmm?.models?.list?.();
    return result || { models: [], defaultModel: window.GameModules.aiProvider.providerDefaultModel('dzmm') };
  },

  async getUserInfo() {
    return window.dzmm?.user?.info?.();
  },

  async complete(options = {}) {
    if (!window.dzmm?.completions) {
      throw window.GameModules.aiProvider.createError('dzmm.completions unavailable', 'AI_PROVIDER_UNAVAILABLE');
    }
    let buffer = '';
    await window.dzmm.completions({
      model: options.model,
      messages: options.messages || [],
      maxTokens: options.maxTokens,
      deepThinking: options.deepThinking,
    }, async (chunk, done) => {
      const text = String(chunk || '');
      if (text) buffer = window.GameModules.jsonUtils?.mergeStreamText?.(buffer, text) ?? (buffer + text);
      const info = { buffer, chunkCount: 0, done: Boolean(done), doneSeen: Boolean(done) };
      await options.onChunk?.(text, Boolean(done), info);
      if (done) await options.onDone?.(info);
    });
    return buffer;
  },
});
