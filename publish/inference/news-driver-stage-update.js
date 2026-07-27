window.GameModules = window.GameModules || {};

window.GameModules.inferenceNewsDriverStageUpdate = {
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

  newsIndex(store = {}) {
    store?.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    const items = system?.promptItems?.(store.newsDriverState, { limit: 30 }) || [];
    if (!items.length) return '暂无新闻。';
    return items.map((item) => [
      `id:${item.id}`,
      `频道:${system.channelLabel(item.channelId)}`,
      `排名:#${item.rank}`,
      `热度:${item.heat}`,
      `范围:${system.SCOPE_LABELS[item.scope] || item.scope}`,
      item.location ? `地点:${item.location}` : '',
      item.orgName ? `组织:${item.orgName}` : '',
      `任务潜力:${system.TASK_LABELS[item.taskPotential] || item.taskPotential}`,
      `标签:${(item.tags || []).join('、')}`,
      `标题:${item.title}`,
      `摘要:${item.summary}`,
    ].filter(Boolean).join('；')).join('\n');
  },

  buildPrompt({ store, action = '', narration = '' } = {}) {
    const system = window.GameModules.newsDriverSystem;
    const channelList = (system?.CHANNELS || []).map((item) => `${item.id}=${item.label}`).join('；');
    const template = window.GameModules.promptTemplates?.inline?.['inference-stage11-world-news-update'] || '';
    const values = {
      固定频道: channelList,
      当前新闻热榜: this.newsIndex(store),
      本次行动: String(action || '').slice(0, 800),
      本轮正文: String(narration || '').slice(0, 4200),
    };
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, value), template);
  },

  async runAfterSettlement({ store, action, narration, updates, participants, logId, config, loop }) {
    if (config?.mode === 'story') return { ops: [], lines: [], skipped: true };
    if (!store?.newsDriverState?.enabled && store?.newsDriverState) return { ops: [], lines: [], skipped: true };
    store?.initNewsDriver?.();
    const prompt = this.buildPrompt({ store, action, narration });
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage12 世界新闻热榜结算…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage12：根据正文与时间推进调整新闻排名、替换或升格少量新闻。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    let raw = '';
    try {
      raw = await loop.completeConfiguredStep(store, prompt, logId, false, {
        ...config,
        sourceTitle: `${config?.label || ''}Stage12 世界新闻热榜`,
        promptId: 'inference-stage11-world-news-update',
        reasoningPhase: 'stage12',
        streamToUi: false,
        jsonMode: true,
        responseFormat: { type: 'json_object' },
        outputLimitKind: 'stage4',
      });
    } catch (err) {
      console.warn('[Stage12新闻] 生成失败:', err?.message || err);
      return { ops: [], lines: [`新闻热榜失败：${err?.message || '未知错误'}`], skipped: true, error: err?.message };
    }
    const parsed = this.parseOpsPayload(raw);
    const applied = store?.applyNewsDriverOps?.(parsed.ops, { logId }) || { applied: [], promotedEvents: [] };
    const lines = [];
    if (applied.applied?.length) lines.push(`新闻热榜：已应用${applied.applied.length}条调整。`);
    if (applied.promotedEvents?.length) lines.push(`新闻事件：已升格${applied.promotedEvents.length}条大地图事件。`);
    return { ops: parsed.ops, lines, applied, raw };
  },
};
