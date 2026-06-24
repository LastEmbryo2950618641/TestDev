window.GameModules = window.GameModules || {};

window.GameModules.genericUpdateTemplate = {
  patchLoop(loop) {
    if (!loop || loop.updateRegistryPatched) return;
    const basePrompt = loop.buildUpdateJsonPrompt;
    const baseSchema = loop.updateJsonSchema;
    const baseProse = loop.proseFinal;
    const baseMerge = loop.mergeNarrationAndUpdates;

    loop.buildUpdateJsonPrompt = async function patchedBuildUpdateJsonPrompt(...args) {
      const prompt = await basePrompt.apply(this, args);
      const registryPrompt = window.GameModules.updateRegistry?.promptText?.() || '';
      return [prompt, registryPrompt].filter(Boolean).join('\n\n');
    };
    loop.updateJsonSchema = function patchedUpdateJsonSchema(...args) {
      return { ...baseSchema.apply(this, args), ...(window.GameModules.updateRegistry?.schema?.() || { genericUpdates: [] }) };
    };
    loop.proseFinal = function patchedProseFinal(...args) {
      const result = baseProse.apply(this, args);
      if (result && !Array.isArray(result.genericUpdates)) result.genericUpdates = [];
      return result;
    };
    loop.mergeNarrationAndUpdates = function patchedMergeNarrationAndUpdates(...args) {
      const result = baseMerge.apply(this, args);
      const updates = args[2] || {};
      result.genericUpdates = Array.isArray(updates.genericUpdates) ? updates.genericUpdates : [];
      return result;
    };
    loop.updateRegistryPatched = true;
  },

  patchAi(ai) {
    if (!ai || ai.updateRegistryPatched) return;
    const baseParse = ai.parse;
    ai.parse = function patchedParse(...args) {
      const result = baseParse.apply(this, args);
      const data = args[0] && typeof args[0] === 'object' ? args[0] : {};
      result.genericUpdates = Array.isArray(data.genericUpdates) ? data.genericUpdates.slice(0, 80) : [];
      return result;
    };
    ai.updateRegistryPatched = true;
  },

  install() {
    this.patchLoop(window.GameModules.realWorldAgentLoop);
    this.patchAi(window.GameModules.realWorldAi);
  },
};

window.GameModules.genericUpdateTemplate.install();
