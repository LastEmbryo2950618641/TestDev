window.GameModules = window.GameModules || {};

/**
 * Stage9：正文与 Stage4–8 之后的势力创建/字段更新（串行）。
 * Stage9-1 只负责 createFaction；Stage9-2 只负责 patchFactionField。
 * 强制 JSON，只追加 user 消息到主 KV 会话，避免中途插入 system / 切深度思考导致缓存 miss。
 */
window.GameModules.inferenceFactionStageUpdate = {
  parseOpsPayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { ops: [], done: true };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const ops = Array.isArray(data.ops) ? data.ops : (Array.isArray(data.operations) ? data.operations : []);
      return { ops, done: data.done !== false, raw: data };
    } catch (_) {
      return { ops: [], done: true };
    }
  },

  normalizeKey(value = '') {
    return String(value || '').trim();
  },

  existingFactionKeys(store) {
    const set = new Set();
    const factions = Array.isArray(store?.factionState?.factions) ? store.factionState.factions : [];
    factions.forEach((item) => {
      const id = this.normalizeKey(item?.id);
      const name = this.normalizeKey(item?.name);
      if (id) set.add(id);
      if (name) set.add(name);
    });
    return set;
  },

  createFactionKeysFromOps(ops = []) {
    const set = new Set();
    (Array.isArray(ops) ? ops : []).forEach((op) => {
      const method = this.normalizeKey(op?.method || op?.skillMethod);
      if (method !== 'createFaction') return;
      const params = op?.params && typeof op.params === 'object' ? op.params : {};
      const id = this.normalizeKey(params.id);
      const name = this.normalizeKey(params.name);
      if (id) set.add(id);
      if (name) set.add(name);
    });
    return set;
  },

  unresolvedPendingCandidates(store, pendingFactionCandidates = [], ops = []) {
    const existing = this.existingFactionKeys(store);
    const creating = this.createFactionKeysFromOps(ops);
    return (Array.isArray(pendingFactionCandidates) ? pendingFactionCandidates : []).filter((item) => {
      const id = this.normalizeKey(item?.id);
      const name = this.normalizeKey(item?.name);
      if (!id && !name) return false;
      if ((id && existing.has(id)) || (name && existing.has(name))) return false;
      if ((id && creating.has(id)) || (name && creating.has(name))) return false;
      return true;
    });
  },

  pickOps(ops = [], allowedMethods = []) {
    const allow = new Set((Array.isArray(allowedMethods) ? allowedMethods : []).map((item) => this.normalizeKey(item)));
    const picked = [];
    const skipped = [];
    (Array.isArray(ops) ? ops : []).forEach((op) => {
      const method = this.normalizeKey(op?.method || op?.skillMethod);
      if (!method) return;
      if (allow.has(method)) picked.push(op);
      else skipped.push(op);
    });
    return { picked, skipped };
  },

  buildCreatePrompt({ narration = '', action = '', factionIndex = '', pendingFactionCandidates = [] } = {}) {
    return [
      '# Stage9-1 势力创建',
      '角色：势力首建器。你这一阶段只负责 createFaction。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '若 Stage1 待建势力候选里仍有未入库项，本阶段必须为其输出 createFaction。',
      '',
      '## 规则',
      '1. 只允许输出 createFaction；禁止输出 patchFactionField。',
      '2. Stage1 待建势力候选优先：若下方候选中某条当前仍不在势力索引里，必须创建。不能因“本轮未互动/只是先登记/只是背景提及”而跳过。',
      '3. 正文里若出现新的现实组织/公司/学校/机关/社群正式名，且当前势力索引没有，也应在本阶段 createFaction。',
      '4. 首次 createFaction 必须尽量补全完整：id、name、type、classification、worldTag、structure、solid.overviewPanels 等所有可稳定推断字段。不要只建空壳。',
      '5. 若没有任何未入库势力需要创建，返回 { "ops": [], "done": true }。',
      '',
      '## Stage1 待建势力候选',
      (Array.isArray(pendingFactionCandidates) && pendingFactionCandidates.length ? JSON.stringify(pendingFactionCandidates, null, 2).slice(0, 4000) : '无'),
      '',
      '## 当前势力索引',
      factionIndex || '暂无势力。',
      '',
      '## 本次行动',
      String(action || '').slice(0, 800),
      '',
      '## 本轮正文（摘要）',
      String(narration || '').slice(0, 4000),
      '',
      '## 输出合约',
      '{ "ops": [ { "method": "createFaction", "params": {} } ], "done": true }',
    ].join('\n');
  },

  factionSnapshot(store, maxChars = 6000) {
    const rows = Array.isArray(store?.factionState?.factions) ? store.factionState.factions : [];
    if (!rows.length) return '无';
    const slim = rows.slice(0, 12).map((item) => ({
      id: item.id || '',
      name: item.name || '',
      type: item.type || '',
      classification: item.classification || '',
      worldTag: item.worldTag || '',
      level: item.level || '',
      location: item.location || '',
      domain: item.domain || '',
      description: item.description || '',
      structure: Array.isArray(item.structure) ? item.structure : [],
      solid: item.solid && typeof item.solid === 'object' ? item.solid : {},
    }));
    return JSON.stringify(slim, null, 2).slice(0, Math.max(800, Number(maxChars) || 6000));
  },
  buildUpdatePrompt({ narration = '', action = '', factionIndex = '', factionSnapshot = '', pendingFactionCandidates = [] } = {}) {
    return [
      '# Stage9-2 势力更新',
      '角色：势力字段更新器。你这一阶段只负责 patchFactionField。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '本阶段在 Stage9-1 创建之后执行。',
      '',
      '## 规则',
      '1. 只允许输出 patchFactionField；禁止输出 createFaction。',
      '2. 若当前势力某些字段明显不合理、空白、占位、壳化或过于模糊（如“未知”“暂无说明”“空结构”“缺少应有 overviewPanels”），且下方上下文/候选参数/正文能提供稳定推断，你可以用 patchFactionField 对这些字段做补齐更新。',
      '3. 若当前字段已经具体、合理、成型，则必须有正文或上下文中的明确事实变化依据，才允许更新；不要无依据改写一个已经合理的字段。',
      '4. 仅被提及、没有事实变化、且当前字段本身也并不明显不合理的势力，不要 patch。',
      '5. 对补齐型 patch，reason 要写清楚是依据哪个上下文事实、候选参数或稳定背景推断完成补齐。',
      '6. 若没有任何可更新的势力字段，返回 { "ops": [], "done": true }。',
      '',
      '## Stage1 待建势力候选 / 上下文补齐线索',
      (Array.isArray(pendingFactionCandidates) && pendingFactionCandidates.length ? JSON.stringify(pendingFactionCandidates, null, 2).slice(0, 4000) : '无'),
      '',
      '## 当前势力索引',
      factionIndex || '暂无势力。',
      '',
      '## 当前势力完整快照',
      factionSnapshot || '无',
      '',
      '## 本次行动',
      String(action || '').slice(0, 800),
      '',
      '## 本轮正文（摘要）',
      String(narration || '').slice(0, 4000),
      '',
      '## 输出合约',
      '{ "ops": [ { "method": "patchFactionField", "params": {} } ], "done": true }',
    ].join('\n');
  },

  applyOps(store, ops = []) {
    const ctx = window.GameModules.realWorldAgentContext;
    const lines = [];
    const applied = [];
    for (const op of (Array.isArray(ops) ? ops : []).slice(0, 24)) {
      const method = String(op?.method || op?.skillMethod || '').trim();
      const params = op?.params && typeof op.params === 'object' ? op.params : {};
      if (!method || !ctx?.faction) continue;
      if (method === 'createFaction') {
        const overview = params?.solid?.overviewPanels;
        const missingOverview = !overview || typeof overview !== 'object';
        const ideologyCore = String(overview?.ideology?.core?.value || '').trim();
        if (missingOverview || !ideologyCore) {
          console.warn('[Stage9势力] createFaction 可能仍是不完整首建:', { id: params?.id, name: params?.name, hasOverview: !missingOverview, ideologyCore });
        }
      }
      if (!['createFaction', 'patchFactionField', 'getFactionField'].includes(method)) {
        lines.push(`势力Stage9：跳过未知 method ${method}`);
        continue;
      }
      const text = typeof ctx.faction === 'function'
        ? ctx.faction(store, method, params)
        : '势力查询模块未加载。';
      applied.push({ method, params, text: String(text || '').slice(0, 400) });
      if (text) lines.push(String(text).split('\n')[0]);
    }
    return { lines, applied };
  },

  async requestStage9(loop, store, config, logId, prompt, phaseTitle) {
    return await loop.completeCachedJsonPrompt(store, {
      prompt,
      logId,
      ...config,
      sourceTitle: `${config?.label || ''}${phaseTitle}`,
      promptId: 'inference-stage6-faction-update',
      reasoningPhase: 'stage9',
      jsonMode: true,
      outputLimitKind: 'stage4',
    });
  },

  async runAfterSettlement({ store, action, narration, updates, participants, logId, config, loop, materialSession = null }) {
    if (config?.mode === 'story') return { ops: [], lines: [], skipped: true };
    const ctx = window.GameModules.realWorldAgentContext;
    store?.initFactionSystem?.();
    const pendingFactionCandidates = window.GameModules.realWorldMaterials?.pendingFactionCandidates?.(materialSession) || [];
    const factionIndexBeforeCreate = ctx?.factionList?.(store) || '暂无势力。';
    const unresolvedBeforeCreate = this.unresolvedPendingCandidates(store, pendingFactionCandidates, []);
    console.log('[Stage9-1势力创建] 待建候选=', pendingFactionCandidates, '未入库候选=', unresolvedBeforeCreate);

    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage9-1 势力创建…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage9-1 势力创建：先消费待建势力候选并创建未入库势力。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });

    let createRaw = '';
    try {
      createRaw = await this.requestStage9(
        loop,
        store,
        config,
        logId,
        this.buildCreatePrompt({ narration, action, factionIndex: factionIndexBeforeCreate, pendingFactionCandidates }),
        'Stage9-1 势力创建',
      );
    } catch (err) {
      console.warn('[Stage9-1势力创建] 生成失败:', err?.message || err);
      return { ops: [], lines: [`势力Stage9-1失败：${err?.message || '未知错误'}`], skipped: true, error: err?.message };
    }

    const parsedCreate = this.parseOpsPayload(createRaw);
    const createSelection = this.pickOps(parsedCreate.ops, ['createFaction']);
    if (createSelection.skipped.length) console.warn('[Stage9-1势力创建] 已忽略非 createFaction ops:', createSelection.skipped);
    const unresolvedAfterCreate = this.unresolvedPendingCandidates(store, pendingFactionCandidates, createSelection.picked);
    console.log('[Stage9-1势力创建] create ops=', createSelection.picked, '未消费候选=', unresolvedAfterCreate);
    const appliedCreate = this.applyOps(store, createSelection.picked);

    const factionIndexBeforeUpdate = ctx?.factionList?.(store) || '暂无势力。';
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage9-2 势力更新…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage9-2 势力更新：只根据正文事实变化 patch 已存在势力字段。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });

    let updateRaw = '';
    try {
      updateRaw = await this.requestStage9(
        loop,
        store,
        config,
        logId,
        this.buildUpdatePrompt({ narration, action, factionIndex: factionIndexBeforeUpdate, factionSnapshot: this.factionSnapshot(store), pendingFactionCandidates }),
        'Stage9-2 势力更新',
      );
    } catch (err) {
      console.warn('[Stage9-2势力更新] 生成失败:', err?.message || err);
      return {
        ops: createSelection.picked,
        lines: [...appliedCreate.lines, `势力Stage9-2失败：${err?.message || '未知错误'}`],
        applied: appliedCreate.applied,
        createRaw,
        error: err?.message,
      };
    }

    const parsedUpdate = this.parseOpsPayload(updateRaw);
    const updateSelection = this.pickOps(parsedUpdate.ops, ['patchFactionField']);
    if (updateSelection.skipped.length) console.warn('[Stage9-2势力更新] 已忽略非 patchFactionField ops:', updateSelection.skipped);
    console.log('[Stage9-2势力更新] patch ops=', updateSelection.picked);
    const appliedUpdate = this.applyOps(store, updateSelection.picked);

    const lines = [];
    if (unresolvedAfterCreate.length) {
      lines.push(`势力Stage9-1未完成：仍有 ${unresolvedAfterCreate.length} 个待建势力候选未被 createFaction。`);
    }
    lines.push(...appliedCreate.lines, ...appliedUpdate.lines);

    return {
      ops: [...createSelection.picked, ...updateSelection.picked],
      lines,
      applied: [...appliedCreate.applied, ...appliedUpdate.applied],
      createRaw,
      updateRaw,
      unresolvedPendingCandidates: unresolvedAfterCreate,
    };
  },
};

