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
      const candidateName = this.normalizeKey(params.candidateName || params.sourceCandidate);
      if (id) set.add(id);
      if (name) set.add(name);
      if (candidateName) set.add(candidateName);
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

  buildCreatePrompt({ narration = '', action = '', factionIndex = '', pendingFactionCandidates = [], contextReview = '' } = {}) {
    const overviewContract = [
      'solid.overviewPanels 必须严格使用 UI 固定 schema；禁止中文 key、禁止 entries 里写“主要收入/支出结构”等非固定 key，禁止 `teritory` 拼写。',
      'ideology 固定字段：core、reason、description、base、legitimacy；每项都是对象，形如 `{ "value": "...", "reason": "..." }`，legitimacy.value 必须是数字。',
      'economy.entries 固定字段：gdp、income、expenditure、assets、resources、production、system、institutions、laws、works；每项都是 `{ "value": ..., "reason": "..." }`。',
      'politics.entries 固定字段：regime、powerStructure、rulemaking、adjudication、execution、participation、leadership、institutions、laws、works。',
      'military.entries 固定字段：posture、forces、personnel、quality、sustainment、projection、equipment、institutions、laws、works。',
      'diplomacy.entries 固定字段：posture、orientation、allies、rivals、memberships、treaties、presence、institutions、laws、works。',
      'territory.entries 固定字段：capital、area、population、adminDivision、regions。',
      '列表字段 value 形状：institutions/laws/works/memberships/treaties 为 `[{ "name": "...", "description": "..." }]`；allies/rivals 为 `[{ "name": "...", "description": "...", "viewOfSelf": "..." }]`；forces 为 `[{ "name": "...", "items": ["..."] }]`；regions 为 `[{ "name": "...", "capital": "...", "area": "...", "controlRate": "...", "population": "...", "description": "...", "garrison": "..." }]`。',
      '若某字段对该势力不适用，也必须给出基于上下文的保守说明，而不是留空或写“待推演补全”。',
    ].join('\n');
    return [
      '# Stage9-1 势力创建',
      '角色：势力识别与批量首建器。你这一阶段只负责 createFaction。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '你必须重新检查本轮完整上下文；只要稍微识别到可作为势力的组织线索，且尚未入库，就必须创建，并一次性批量返回完整势力 JSON。即使 Stage1 候选为空，也不能跳过这次上下文复查。',
      '',
      '## 规则',
      '1. 只允许输出 createFaction；禁止输出 patchFactionField。',
      '2. 先检查当前势力索引，再检查 Stage1 查询链、角色卡/介绍卡、已加载资料、场景锚定、行动、正文与前序结算；识别所有在这些上下文中成立、需要持久化、且索引尚未收录的势力线索。Stage1 候选是重要线索，但不是唯一来源。',
      '3. Stage1 待建候选若仍未入库必须创建；正文或完整上下文中新出现但 Stage1 漏记的势力线索也必须创建。不能因“本轮未互动/只是背景提及/候选为空”跳过。',
      '4. 候选称呼只是线索，不是最终势力名；必须基于完整上下文合理推演并补全正式名称。每个 op 的 params.candidateName 写对应的 Stage1 原候选名；若该势力来自重新检查而非 Stage1，则 candidateName 写识别到的原始称呼。',
      '5. 若 Stage1 待建候选已带 `id`，createFaction 必须沿用该 id；不要自行改 ID、不要把候选 ID 丢掉。若是 Stage9-1 重新检查发现的新势力，才自行生成稳定唯一ID。',
      '6. 首次 createFaction 必须一次补全完整，不得建空壳：id、candidateName、name、type、kind、classification、worldTag、parentId、parentName、level、location、domain、scale、stance、influence、description、structure、rules、resources、relations、solid.overviewPanels、reason。',
      '7. structure 必须包含可稳定推演的部门/层级与 roles；solid.overviewPanels 必须包含 ideology、economy、politics、military、diplomacy、territory 六个面板及其可稳定推演字段。禁止“未知”“某公司”“某中学”“暂无说明”等占位。',
      '8. 同一响应中把全部待创建势力分别写成 createFaction op，一次性批量返回；不要逐个等待下一轮，不要返回重试请求。',
      '9. 若重新检查完整上下文后确实没有任何未入库势力，才返回 { "ops": [], "done": true }。',
      '',
      '## overviewPanels 严格字段契约',
      overviewContract,
      '',
      '## Stage1 待建势力候选',
      (Array.isArray(pendingFactionCandidates) && pendingFactionCandidates.length ? JSON.stringify(pendingFactionCandidates, null, 2).slice(0, 4000) : '无'),
      '',
      '## 当前势力索引',
      factionIndex || '暂无势力。',
      '',
      '## 本轮完整上下文复查材料',
      String(contextReview || '无').slice(0, 36000),
      '',
      '## 本次行动',
      String(action || '').slice(0, 800),
      '',
      '## 本轮正文（摘要）',
      String(narration || '').slice(0, 4000),
      '',
      '## 输出合约',
      '顶层必须是：{ "ops": [ { "method": "createFaction", "params": { ...完整首建字段... } } ], "done": true }',
      'params 必须包含：candidateName、id、name、type、kind、classification、worldTag、parentId、parentName、level、location、domain、scale、stance、influence、description、structure、rules、resources、relations、solid、reason。',
      'solid.overviewPanels 必须按上方“overviewPanels 严格字段契约”把 ideology、economy、politics、military、diplomacy、territory 的全部固定字段都写满；禁止输出空对象 `{}` 或省略字段。',
    ].join('\n');
  },

  validateCreateFactionPayload(params = {}) {
    const overview = params?.solid?.overviewPanels;
    if (!overview || typeof overview !== 'object' || Array.isArray(overview)) return '缺少 solid.overviewPanels';
    if (overview.teritory) return 'overviewPanels 使用了错误 key teritory，必须是 territory';
    const requiredPanels = ['ideology', 'economy', 'politics', 'military', 'diplomacy', 'territory'];
    const missingPanel = requiredPanels.find((key) => !overview[key] || typeof overview[key] !== 'object' || Array.isArray(overview[key]));
    if (missingPanel) return `缺少 overviewPanels.${missingPanel}`;
    const ideologyKeys = ['core', 'reason', 'description', 'base', 'legitimacy'];
    const missingIdeology = ideologyKeys.find((key) => !overview.ideology[key] || typeof overview.ideology[key] !== 'object' || !Object.prototype.hasOwnProperty.call(overview.ideology[key], 'value'));
    if (missingIdeology) return `overviewPanels.ideology.${missingIdeology} 必须是包含 value 的对象`;
    const schema = {
      economy: ['gdp', 'income', 'expenditure', 'assets', 'resources', 'production', 'system', 'institutions', 'laws', 'works'],
      politics: ['regime', 'powerStructure', 'rulemaking', 'adjudication', 'execution', 'participation', 'leadership', 'institutions', 'laws', 'works'],
      military: ['posture', 'forces', 'personnel', 'quality', 'sustainment', 'projection', 'equipment', 'institutions', 'laws', 'works'],
      diplomacy: ['posture', 'orientation', 'allies', 'rivals', 'memberships', 'treaties', 'presence', 'institutions', 'laws', 'works'],
      territory: ['capital', 'area', 'population', 'adminDivision', 'regions'],
    };
    for (const [panelKey, fields] of Object.entries(schema)) {
      const entries = overview[panelKey]?.entries;
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) return `overviewPanels.${panelKey}.entries 必须存在`;
      const missingField = fields.find((field) => !entries[field] || typeof entries[field] !== 'object' || !Object.prototype.hasOwnProperty.call(entries[field], 'value'));
      if (missingField) return `overviewPanels.${panelKey}.entries.${missingField} 必须是包含 value 的对象`;
    }
    return '';
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
        const invalidReason = this.validateCreateFactionPayload(params);
        if (invalidReason) {
          const text = `势力Stage9：拒绝不完整 createFaction（${params?.name || params?.candidateName || '未命名'}）：${invalidReason}`;
          console.warn('[Stage9势力] createFaction 首建 JSON 不符合 UI schema，已拒绝落库:', { reason: invalidReason, id: params?.id, name: params?.name });
          lines.push(text);
          applied.push({ method, params, text });
          continue;
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

  async requestStage9(loop, store, config, logId, prompt, phaseTitle, reasoningStep = 0) {
    return await loop.completeCachedJsonPrompt(store, {
      prompt,
      logId,
      ...config,
      sourceTitle: `${config?.label || ''}${phaseTitle}`,
      promptId: 'inference-stage6-faction-update',
      reasoningPhase: 'stage9',
      reasoningStep,
      reasoningKey: reasoningStep > 0 ? `stage9-${reasoningStep}` : 'stage9',
      jsonMode: true,
      outputLimitKind: 'stage4',
    });
  },

  async runAfterSettlement({ store, action, narration, updates, participants, logId, config, loop, materialSession = null, contextReview = '' }) {
    if (config?.mode === 'story') return { ops: [], lines: [], skipped: true };
    const ctx = window.GameModules.realWorldAgentContext;
    store?.initFactionSystem?.();
    const pendingFactionCandidates = window.GameModules.realWorldMaterials?.pendingFactionCandidates?.(materialSession) || [];
    const factionIndexBeforeCreate = ctx?.factionList?.(store) || '暂无势力。';
    const unresolvedBeforeCreate = this.unresolvedPendingCandidates(store, pendingFactionCandidates, []);
    console.log('[Stage9-1势力创建] 待建候选=', pendingFactionCandidates, '未入库候选=', unresolvedBeforeCreate);

    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage9-1 势力创建…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage9-1 势力创建：重新检查本轮完整上下文，并一次性批量创建全部未入库势力。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'stage9-1-status',
      settlementThinkingLabel: 'Stage9-1 势力创建',
      livePatch: true,
    });

    let createRaw = '';
    try {
      createRaw = await this.requestStage9(
        loop,
        store,
        config,
        logId,
        this.buildCreatePrompt({ narration, action, factionIndex: factionIndexBeforeCreate, pendingFactionCandidates, contextReview }),
        'Stage9-1 势力创建',
        1,
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
      settlementThinkingKey: 'stage9-2-status',
      settlementThinkingLabel: 'Stage9-2 势力更新',
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
        2,
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

