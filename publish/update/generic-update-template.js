window.GameModules = window.GameModules || {};

window.GameModules.genericUpdateTemplate = {
  patchLoop(loop) {
    if (!loop || loop.updateRegistryPatched) return;
    const basePrompt = loop.buildUpdateJsonPrompt;
    const baseSchema = loop.updateJsonSchema;
    const baseProse = loop.proseFinal;
    const baseMerge = loop.mergeNarrationAndUpdates;
    loop.buildUpdateSkillSelectPrompt = async function buildUpdateSkillSelectPrompt({ action, base, loaded, materialSession = null, narration }) {
      const loadedText = window.GameModules.realWorldAgentContext.buildLoadedText(loaded);
      const materialText = window.GameModules.realWorldMaterials?.summary?.(materialSession) || '';
      const summaries = window.GameModules.updateRegistry?.skillSummaries?.() || '';
      const initSummaries = window.GameModules.initPromptRegistry?.skillSummaries?.(this) || '';
      return [
        '# 现实推演阶段3：只选择更新与初始化 Skills',
        '你不是正文作者，不要续写剧情，不要输出旁白，不要输出行动结果。',
        '你只做分类选择，只输出一个 JSON 对象；第一个字符必须是 {，最后一个字符必须是 }。',
        `本次行动：${action || '继续观察现实世界'}`,
        `基础上下文摘要：\n${String(base || '').slice(0, 1200)}`,
        `已动态载入资料摘要：\n${[loadedText, materialText].filter(Boolean).join('\n\n').slice(0, 1600) || '无'}`,
        `已生成正文事实：\n${String(narration || '').slice(0, 2200)}`,
        `可选更新 Skills：\n${summaries || '无'}`,
        `可选初始化 Skills：\n${initSummaries || '无'}`,
        '任务：仅根据“已生成正文事实”和资料摘要，选择需要进入下一阶段处理的 skill 名称。只选择有明确变化证据的 skill。',
        '禁止输出正文、分析过程、Markdown、代码块、额外说明。',
        '输出格式：{"skillNames":["skill-name"],"initSkillNames":["skill-name"],"reason":"选择原因"}。如果没有需要的通用更新或初始化，数组返回空。',
      ].join('\n\n');
    };

    loop.selectUpdateSkills = async function selectUpdateSkills({ store, action, base, loaded, materialSession, narration, narrationPrompt = '', logId }) {
      const registry = window.GameModules.updateRegistry;
      if (!registry?.skillSummaries?.()) return [];
      try {
        const prompt = await this.buildUpdateSkillSelectPrompt({ store, action, base, loaded, materialSession, narration, narrationPrompt });
        this.markStep(store, logId, '现实正文已完成，正在选择更新技能…', { keepNarration: true });
        const raw = await this.completeStep(store, prompt, logId, false);
        if (!String(raw || '').includes('{')) return { updateSkillIds: null, initSkillIds: [] };
        const data = window.GameModules.jsonUtils.parseLoose(raw);
        const names = Array.isArray(data?.skillNames) ? data.skillNames : [];
        const initNames = Array.isArray(data?.initSkillNames) ? data.initSkillNames : [];
        return { updateSkillIds: registry.selectByNames(names).map((type) => type.id), initSkillIds: initNames };
      } catch (err) {
        console.warn('现实更新 skill 选择失败，退回全部更新 skill:', err.message);
        return { updateSkillIds: null, initSkillIds: [] };
      }
    };

    loop.buildUpdateJsonPrompt = async function patchedBuildUpdateJsonPrompt(...args) {
      const options = args[0] || {};
      const registry = window.GameModules.updateRegistry;
      const selected = Array.isArray(options.updateSkillIds) ? options.updateSkillIds : null;
      const initSelected = Array.isArray(options.initSkillIds) ? options.initSkillIds : [];
      const prompt = await basePrompt.apply(this, args);
      const skillText = registry?.skillText?.(selected) || '';
      const initText = window.GameModules.initPromptRegistry?.skillText?.(initSelected, options.store) || '';
      const examples = JSON.stringify({
        type: 'final', sceneTitle: '标题', locationName: '具体地点', elapsedSeconds: 300, status: '状态', quest: '目标',
        choices: ['行动一', '行动二', '行动三', '行动四'],
        ...(registry?.schemaFor?.(selected) || { genericUpdates: [] }),
        ...(window.GameModules.initPromptRegistry?.schema?.(initSelected, options.store) || {}),
      });
      const phaseTitle = selected?.length || initSelected.length ? '# 现实推演阶段4：按已选 Skills 生成更新JSON' : '# 现实推演阶段4：生成更新JSON';
      const strictPrompt = prompt
        .replace('# 现实推演阶段3：只生成更新JSON', phaseTitle)
        .replace('输出最小补丁 JSON：必须包含 type、sceneTitle、locationName、elapsedSeconds、status、quest、choices、vitalUpdates。其他字段只有明确变化才输出，否则省略或用空数组。', '输出最小补丁 JSON：必须包含 type、sceneTitle、locationName、elapsedSeconds、status、quest、choices、genericUpdates。除 initUpdates 外，禁止输出 vitalUpdates、metricUpdates、characterMetricUpdates、lexiconUpdates、itemActions、factionUpdates、wechatActions 等旧字段。')
        .replace('vitalUpdates 必须覆盖 stamina_pool、satiety、hydration、fatigue、mental_stability。choices 必须4个。所有 reason/status 不超过24个汉字。characterMetricUpdates 最多3个角色，每个角色最多2条 emotions 和2条 playerFeelings。lexiconUpdates/itemActions/factionUpdates 只写稳定事实变化。', '生命体征、情绪、感觉、物品、势力、地图、系统等变化全部写入 genericUpdates；choices 必须4个；所有 reason/status 不超过24个汉字；每个主体同类变化最多4条；没有明确变化则 genericUpdates 返回空数组。')
        .replace(/最小示例：\{[\s\S]*$/, `最小示例：${examples}`);
      return [strictPrompt, skillText ? `## 已加载更新 Skills 全文\n\n${skillText}` : '', initText ? `## 已加载初始化 Skills 全文\n\n${initText}` : ''].filter(Boolean).join('\n\n');
    };

    loop.generatePhasedFinal = async function patchedGeneratePhasedFinal(options) {
      const narrationPrompt = await this.buildNarrationPrompt(options);
      this.markStep(options.store, options.logId, '现实资料已足够，正在生成正文…');
      const narrationRaw = await this.completeStep(options.store, narrationPrompt, options.logId, true);
      const narration = this.cleanPhasedNarration(narrationRaw);
      if (!narration) throw new Error('现实推演正文为空');
      this.showFinalNarration(options.store, options.logId, narration);
      const selectedSkills = await this.selectUpdateSkills({ ...options, narration, narrationPrompt });
      const updateSkillIds = selectedSkills?.updateSkillIds ?? null;
      const initSkillIds = selectedSkills?.initSkillIds || [];
      const jsonPrompt = await this.buildUpdateJsonPrompt({ ...options, narration, updateSkillIds, initSkillIds });
      this.markStep(options.store, options.logId, '现实更新与初始化技能已加载，正在生成状态更新…', { keepNarration: true });
      const jsonRaw = await this.completeUpdateJson(options.store, jsonPrompt, options.logId);
      const updates = this.parseUpdateJson(jsonRaw) || {};
      const result = this.mergeNarrationAndUpdates(options.store, narration, updates);
      return { result, prompt: `---NARRATION---\n${narrationPrompt}\n\n---UPDATE_SKILLS---\n${Array.isArray(updateSkillIds) ? updateSkillIds.join(', ') : 'ALL_FALLBACK'}\n\n---INIT_SKILLS---\n${initSkillIds.join(', ')}\n\n---UPDATE_JSON---\n${jsonPrompt}`, loaded: options.loaded, raw: `${narrationRaw}\n\n${jsonRaw}`, trace: options.trace };
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
      const store = args[0] || null, updates = args[2] || {};
      result.genericUpdates = window.GameModules.updateRegistry?.normalizeUpdates?.(updates, store) || (Array.isArray(updates.genericUpdates) ? updates.genericUpdates : []);
      return result;
    };
    loop.updateRegistryPatched = true;
  },

  patchAi(ai) {
    if (!ai || ai.updateRegistryPatched) return;
    const baseParse = ai.parse;
    ai.parse = function patchedParse(...args) {
      const result = baseParse.apply(this, args);
      const data = args[0] && typeof args[0] === 'object' ? args[0] : {}, store = args[1] || null;
      result.genericUpdates = window.GameModules.updateRegistry?.normalizeUpdates?.(data, store) || result.genericUpdates || [];
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
