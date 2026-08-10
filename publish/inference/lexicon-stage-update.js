window.GameModules = window.GameModules || {};

window.GameModules.inferenceLexiconStageUpdate = {
  parsePayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const objectStart = source.indexOf('{');
    const objectEnd = source.lastIndexOf('}');
    const arrayStart = source.indexOf('[');
    const arrayEnd = source.lastIndexOf(']');
    try {
      if (objectStart >= 0 && objectEnd > objectStart) {
        const data = JSON.parse(source.slice(objectStart, objectEnd + 1));
        const terms = data.terms || data.lexiconUpdates || data['术语更新'] || data['专用术语'] || [];
        return { terms: Array.isArray(terms) ? terms : [], done: data.done !== false, raw: data };
      }
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        return { terms: JSON.parse(source.slice(arrayStart, arrayEnd + 1)), done: true, raw: null };
      }
    } catch (error) {
      return { terms: [], done: true, raw: null, error: error?.message || 'JSON 解析失败' };
    }
    return { terms: [], done: true, raw: null, error: '未找到专用术语结算 JSON' };
  },

  currentWorldTag(store = null) {
    return String(store?.currentWorldTag?.() || store?.character?.work || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界').trim();
  },

  knownTermsText(store = null) {
    const worldTag = this.currentWorldTag(store);
    const rows = [
      ...(window.GameModules.lexiconStore?.list?.(worldTag, '专用术语') || []),
      ...(window.GameModules.lexiconStore?.list?.('', '专用术语') || []),
    ];
    const unique = rows.filter((entry, index, arr) => arr.findIndex((item) => `${item.worldTag}:${item.kind}:${item.name}` === `${entry.worldTag}:${entry.kind}:${entry.name}`) === index);
    return unique.slice(0, 30).map((entry) => `- ${entry.name}：${entry.summary || entry.description || '暂无定义'}`).join('\n') || '暂无已持久化专用术语。';
  },

  buildPrompt({ store, action = '', narration = '', updates = {}, participants = [] } = {}) {
    const worldTag = this.currentWorldTag(store);
    return [
      '# Stage4-16 专用术语结算',
      '你是现实推演的本地术语卡结算器。只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '',
      '目标：把本轮正文和上下文中已经出现、且后续理解会依赖其定义的专有名词/世界规则/系统概念/能力名/组织内称谓/道具概念，写入本地持久化术语库。',
      '这不是静态作品资料库，不要求穷举作品设定；只处理本轮上下文实际需要沉淀的术语卡。',
      '不要过滤或打回已有 AI 结果；这里只负责根据上下文进行二次判断并输出可落库术语。',
      '',
      '写入规则：',
      '- 已有术语定义足够准确时，不要重复输出。',
      '- 新术语必须是可长期复用的概念，不要把普通地点、人名、角色关系、一次性行动或普通物品写成术语。',
      '- 术语可以来自现实世界、作品世界或跨世界能力；worldTag 写术语所属世界，无法判断时写当前世界。',
      '- summary 写一句短摘要；description 写稳定定义；aliases 可写别名；promptInstruction 写后续 AI 遇到该词时应如何理解。',
      '- 允许根据已加载上下文克制补全定义，但不得编造与正文或已知设定冲突的规则。',
      '- 不写固定枚举，不列临时事件库；根据本轮上下文自由判断。',
      '',
      `当前世界：${worldTag}`,
      `本回合参与者：${JSON.stringify(participants || []).slice(0, 3000)}`,
      `本次行动：${String(action || '').slice(0, 1200)}`,
      `本轮正文：${String(narration || '').slice(0, 7000)}`,
      `前序结算摘要：${JSON.stringify(updates || {}).slice(0, 9000)}`,
      '',
      '已持久化专用术语：',
      this.knownTermsText(store),
      '',
      '输出格式：',
      '{"terms":[{"worldTag":"世界名","name":"悲叹之种","summary":"魔女掉落并可净化灵魂宝石的核心资源","description":"在对应世界规则中，悲叹之种是魔女被击败后留下的资源，可用于净化灵魂宝石，并会影响魔法少女的行动动机与资源竞争。","aliases":["Grief Seed"],"promptInstruction":"遇到“悲叹之种”时按该世界的魔法少女资源与净化规则理解。","reason":"本轮正文或资料涉及该术语，后续推演需要稳定定义。"}],"done":true}',
      '没有需要新增或更新的术语时输出：{"terms":[],"done":true}',
    ].join('\n');
  },

  normalizeTerm(term = {}, store = null) {
    const name = String(term.name || term.term || '').trim().slice(0, 32);
    if (!name) return null;
    const description = String(term.description || term.definition || term.summary || '').trim().slice(0, 240);
    const summary = String(term.summary || term.definition || term.description || '').trim().slice(0, 80);
    return {
      worldTag: String(term.worldTag || term.world || this.currentWorldTag(store)).trim().slice(0, 40),
      kind: '专用术语',
      name,
      summary: summary || `${name}的专用术语定义`,
      description: description || `${name}由当前上下文确认为需要持久化的专用术语。`,
      value: term.value || { definition: description || summary || name },
      aliases: Array.isArray(term.aliases || term.synonyms) ? (term.aliases || term.synonyms).map((alias) => String(alias).trim()).filter(Boolean).slice(0, 6) : [],
      promptInstruction: String(term.promptInstruction || `遇到“${name}”时按本地专用术语定义理解：${description || summary || name}`).slice(0, 260),
      reason: String(term.reason || '本轮上下文确认该术语需要持久化。').trim().slice(0, 120),
      source: 'ai',
      aiGenerated: true,
      meta: { termType: String(term.type || term.termType || 'special-term').slice(0, 32), scope: 'runtime-persistent' },
    };
  },

  async applyTerms(store, terms = []) {
    const normalized = (Array.isArray(terms) ? terms : []).map((term) => this.normalizeTerm(term, store)).filter(Boolean).slice(0, 20);
    if (!normalized.length) return { terms: [], applied: [], lines: ['专用术语结算：本轮没有需要新增或更新的术语。'] };
    const applied = await window.GameModules.rpgLexicon?.applyLexiconSkill?.(normalized) || [];
    return {
      terms: normalized,
      applied,
      lines: applied.length
        ? applied.map((entry) => `专用术语结算：${entry.name} 已写入本地术语库。`)
        : ['专用术语结算：候选术语与现有本地术语一致，无需更新。'],
    };
  },

  async runAfterStage4({ store, action, narration, updates, participants, logId, config, loop } = {}) {
    if (config?.mode === 'story' || !window.GameModules.lexiconStore?.isAvailable?.()) return { terms: [], applied: [], lines: [], skipped: true };
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage4-16 专用术语结算…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage4-16：根据本轮上下文新增或更新本地持久化专用术语。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    const prompt = this.buildPrompt({ store, action, narration, updates, participants });
    let raw = '';
    try {
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        ...config,
        sourceTitle: `${config?.label || ''}Stage4-16 专用术语结算`,
        promptId: 'inference-stage4-settlement-window',
        reasoningPhase: 'stage4-16',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
    } catch (error) {
      console.warn('[Stage4-16术语] 生成失败:', error?.message || error);
      return { terms: [], applied: [], lines: [`专用术语结算失败：${error?.message || '未知错误'}`], skipped: true, error: error?.message || '未知错误' };
    }
    const parsed = this.parsePayload(raw);
    const applied = await this.applyTerms(store, parsed.terms);
    return {
      ...applied,
      lines: parsed.error ? [`专用术语结算解析失败：${parsed.error}`] : applied.lines,
      raw,
      parsed,
      participants,
      skipped: false,
    };
  },
};
