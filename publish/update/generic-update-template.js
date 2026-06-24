window.GameModules = window.GameModules || {};

window.GameModules.genericUpdateTemplate = {
  patchLoop(loop) {
    if (!loop || loop.updateRegistryPatched) return;
    const basePrompt = loop.buildUpdateJsonPrompt;
    const baseSchema = loop.updateJsonSchema;
    const baseProse = loop.proseFinal;
    const baseMerge = loop.mergeNarrationAndUpdates;
    loop.buildUpdateSkillSelectPrompt = async function buildUpdateSkillSelectPrompt({ action, base, loaded, materialSession = null, narration, narrationPrompt = '' }) {
      const loadedText = window.GameModules.realWorldAgentContext.buildLoadedText(loaded);
      const materialText = window.GameModules.realWorldMaterials?.summary?.(materialSession) || '';
      const summaries = window.GameModules.updateRegistry?.skillSummaries?.() || '';
      return [
        '# 现实推演阶段3：选择更新 Skills',
        '你只输出合法 JSON，不要 Markdown，不要解释。',
        `本次行动：${action || '继续观察现实世界'}`,
        `基础上下文：\n${base}`,
        `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
        `阶段2提示词：\n${narrationPrompt || '未记录'}`,
        `阶段2正文：\n${narration}`,
        `可用更新 Skills：\n${summaries || '无'}`,
        '任务：结合阶段2提示词、阶段2正文和已载入资料，判断哪些更新 skill 可能需要处理。只选择有明确变化证据的 skill。',
        '输出格式：{"skillNames":["skill-name"],"reason":"选择原因"}。如果没有需要的通用更新，skillNames 返回空数组。',
      ].join('\n\n');
    };

    loop.selectUpdateSkills = async function selectUpdateSkills({ store, action, base, loaded, materialSession, narration, narrationPrompt = '', logId }) {
      const registry = window.GameModules.updateRegistry;
      if (!registry?.skillSummaries?.()) return [];
      try {
        const prompt = await this.buildUpdateSkillSelectPrompt({ store, action, base, loaded, materialSession, narration, narrationPrompt });
        this.markStep(store, logId, '现实正文已完成，正在选择更新技能…', { keepNarration: true });
        const raw = await this.completeStep(store, prompt, logId, false);
        const data = window.GameModules.jsonUtils.parseLoose(raw);
        const names = Array.isArray(data?.skillNames) ? data.skillNames : [];
        return registry.selectByNames(names).map((type) => type.id);
      } catch (err) {
        console.warn('现实更新 skill 选择失败，退回全部更新 skill:', err.message, err.stack);
        return null;
      }
    };

    loop.buildUpdateJsonPrompt = async function patchedBuildUpdateJsonPrompt(...args) {
      const options = args[0] || {};
      const registry = window.GameModules.updateRegistry;
      const selected = Array.isArray(options.updateSkillIds) ? options.updateSkillIds : null;
      const prompt = await basePrompt.apply(this, args);
      const skillText = registry?.skillText?.(selected) || '';
      const baseExamples = baseSchema.apply(this, []);
      const examples = JSON.stringify({ ...baseExamples, ...(registry?.schemaFor?.(selected) || { genericUpdates: [] }) });
      const phaseTitle = selected?.length ? '# 现实推演阶段4：按已选 Skills 生成更新JSON' : '# 现实推演阶段4：生成更新JSON';
      return [prompt.replace('# 现实推演阶段3：只生成更新JSON', phaseTitle).replace(/最小示例：\{[\s\S]*$/, `最小示例：${examples}`), skillText ? `## 已加载更新 Skills 全文\n\n${skillText}` : ''].filter(Boolean).join('\n\n');
    };

    loop.generatePhasedFinal = async function patchedGeneratePhasedFinal(options) {
      const narrationPrompt = await this.buildNarrationPrompt(options);
      this.markStep(options.store, options.logId, '现实资料已足够，正在生成正文…');
      const narrationRaw = await this.completeStep(options.store, narrationPrompt, options.logId, true);
      const narration = this.cleanPhasedNarration(narrationRaw);
      if (!narration) throw new Error('现实推演正文为空');
      this.showFinalNarration(options.store, options.logId, narration);
      const updateSkillIds = await this.selectUpdateSkills({ ...options, narration, narrationPrompt });
      const jsonPrompt = await this.buildUpdateJsonPrompt({ ...options, narration, updateSkillIds });
      this.markStep(options.store, options.logId, '现实更新技能已加载，正在生成状态更新…', { keepNarration: true });
      const jsonRaw = await this.completeUpdateJson(options.store, jsonPrompt, options.logId);
      const updates = this.parseUpdateJson(jsonRaw) || {};
      const result = this.mergeNarrationAndUpdates(options.store, narration, updates);
      return { result, prompt: `${options.prompt || ''}\n\n---NARRATION---\n${narrationPrompt}\n\n---UPDATE_SKILLS---\n${Array.isArray(updateSkillIds) ? updateSkillIds.join(', ') : 'ALL_FALLBACK'}\n\n---UPDATE_JSON---\n${jsonPrompt}`, loaded: options.loaded, raw: `${narrationRaw}\n\n${jsonRaw}`, trace: options.trace };
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
