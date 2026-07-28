window.GameModules = window.GameModules || {};

/**
 * Stage9：正文与 Stage4–8 之后的势力创建/字段更新（串行）。
 * 强制 JSON，只追加 user 消息到主 KV 会话，避免中途插入 system / 切深度思考导致缓存 miss。
 * 写库只走 faction.query skill：createFaction（完整）/ patchFactionField（增量）。
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

  applyOps(store, ops = []) {
    const ctx = window.GameModules.realWorldAgentContext;
    const lines = [];
    const applied = [];
    for (const op of (Array.isArray(ops) ? ops : []).slice(0, 24)) {
      const method = String(op?.method || op?.skillMethod || '').trim();
      const params = op?.params && typeof op.params === 'object' ? op.params : {};
      if (!method || !ctx?.faction) continue;
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

  buildPrompt({ narration = '', action = '', factionIndex = '' } = {}) {
    return [
      '# Stage9 势力更新',
      '角色：势力写库器。只返回合法 JSON ops，通过 skill 创建或补丁更新势力。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '本阶段串行接在上文推演上下文之后；请利用上文正文与结算上下文。',
      '',
      '## 规则',
      '判定以「本轮正文是否出现势力/组织/公司正式名」为准（含 <force> 标签与裸写名称）；对照下方势力索引。',
      '1. 出现且未入库 → 必须 createFaction：正文出现现实组织/公司/学校/机关/社群等势力名，且索引中无同名势力时创建。按正文与上下文补全可知字段；不得以“本轮未互动/未拜访/未改字段/只是背景提及”为由跳过。',
      '   - params 尽量给完整势力对象（id/name/type/classification/worldTag/structure/solid.overviewPanels 等已知字段）。',
      '2. 已入库且正文有事实变化 → patchFactionField：正文明确说明该势力相关数据变化（人事、架构、归属、资源、立场、控势、规则等）时更新。',
      '   - params: { id, panel?, field, op, value?, index?, reason }',
      '   - panel: ideology|economy|politics|military|diplomacy|territory；顶层字段可不写 panel',
      '   - op=set：覆盖字符串/数值/整个字段值',
      '   - op=append：向列表字段末尾追加一项（value 为一项对象或字符串）',
      '   - op=delete：按 index（从 0 起）删除列表某一项',
      '   - reason 须点明正文事实依据。',
      '3. 仅出现、无事实变化：已入库势力只被提及、正文未给出可写入的数据变化时，不要为该势力写 patch。',
      '4. 本轮既无未入库出现、也无可写入变化时返回 { "ops": [], "done": true }。',
      '5. 禁止批量编造与正文无关的势力；只处理正文实际出现的条目。',
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
      '{ "ops": [ { "method": "createFaction|patchFactionField", "params": {} } ], "done": true }',
    ].join('\n');
  },

  async runAfterSettlement({ store, action, narration, updates, participants, logId, config, loop }) {
    if (config?.mode === 'story') return { ops: [], lines: [], skipped: true };
    const ctx = window.GameModules.realWorldAgentContext;
    store?.initFactionSystem?.();
    const factionIndex = ctx?.factionList?.(store) || '暂无势力。';
    // 只追加 user，不中途插 system，才能命中主会话前缀缓存。
    const prompt = this.buildPrompt({ narration, action, factionIndex });
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage9 势力更新…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage9 势力更新：按势力 ID/字段创建或更新。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    let raw = '';
    try {
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        ...config,
        sourceTitle: `${config?.label || ''}Stage9 势力更新`,
        promptId: 'inference-stage6-faction-update',
        reasoningPhase: 'stage9',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
    } catch (err) {
      console.warn('[Stage9势力] 生成失败:', err?.message || err);
      return { ops: [], lines: [`势力Stage9失败：${err?.message || '未知错误'}`], skipped: true, error: err?.message };
    }
    const parsed = this.parseOpsPayload(raw);
    const applied = this.applyOps(store, parsed.ops);
    return { ops: parsed.ops, lines: applied.lines, applied: applied.applied, raw };
  },
};

