/**
 * 世界线情节归纳：事件如实记录，summary 仅保存所属情节编号。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldlinePlots = {
  textOf(event = {}) {
    return [event.eventId, event.name, event.time, event.detail, event.status].filter(Boolean).join('\n');
  },

  ensureState(line, prefix = '情节') {
    line.plots = Array.isArray(line.plots) ? line.plots : [];
    line.pendingPlot = line.pendingPlot && typeof line.pendingPlot === 'object' ? line.pendingPlot : null;
    if (!line.pendingPlot) {
      const id = `${prefix}${line.plots.length + 1}`;
      line.pendingPlot = { 情节编号: id, recordIds: [], textLength: 0, startedAt: '', endedAt: '' };
    }
    return line.pendingPlot;
  },

  async assign(store, line, event, prefix = '情节') {
    const plot = this.ensureState(line, prefix);
    const text = this.textOf(event);
    event.summary = plot.情节编号;
    event.plotId = plot.情节编号;
    plot.startedAt = plot.startedAt || event.time || '';
    plot.endedAt = event.time || plot.endedAt || '';
    if (!plot.recordIds.includes(event.eventId)) plot.recordIds.push(event.eventId);
    plot.textLength += text.length;
    if (plot.textLength < 2400) return;
    await this.finalize(store, line, plot);
    line.pendingPlot = null;
  },

  async finalize(store, line, plot) {
    const events = (line.events || []).filter((event) => plot.recordIds.includes(event.eventId));
    if (!events.length) return;
    const fallback = this.fallback(plot, events);
    let summary = fallback;
    try {
      summary = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'worldline-plot',
        model: store.modelId,
        timeoutMs: 90000,
        maxTokens: 1800,
        outputLengthThreshold: 1600,
        prompt: this.prompt(plot, events),
        format: this.prompt(plot, events),
        max: 2,
        parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
        validate: (raw) => this.normalize(raw, fallback),
        repairHint: '必须输出单个合法 JSON 对象；重要记录编号必须是字符串，不要数组；不要 Markdown 代码块。',
      });
    } catch (err) {
      console.warn('世界线情节归纳失败，已使用本地兜底:', err.code, err.message);
    }
    line.plots = [...(line.plots || []).filter((item) => item.情节编号 !== plot.情节编号), summary];
  },

  prompt(plot, events) {
    const body = events.map((event) => [
      `记录编号:${event.eventId}`,
      `时间:${event.time || ''}`,
      `标题:${event.name || ''}`,
      `状态:${event.status || ''}`,
      `详细:${this.compactText(event.detail || '', 900)}`,
    ].join('\n')).join('\n---\n');
    return [
      '你是世界线索引员。只输出一个合法 JSON 对象，不要 Markdown、代码块或解释。',
      '目标：为后续现实推演动态检索生成短结构索引，不写长篇总结，不改写事实。',
      '情节标题不超过10个汉字；短摘要300-600字；关键事实最多12条，每条不超过80字；检索标签最多16个；重要片段必须来自记录原文。',
      '重要记录编号必须是一个字符串，用顿号连接记录编号；不要输出数组。',
      JSON.stringify({ 情节标题: '十字以内', 情节编号: plot.情节编号, 情节时间段: '开始时间 - 结束时间', 短摘要: '300-600字短摘要', 情节总结: '同短摘要，兼容旧字段', 关键事实: ['事实1'], 检索标签: ['人物/地点/关系/物品/状态关键词'], 重要记录编号: 'record_id', 重要片段: '来自原文的关键片段' }),
      `情节编号固定为${plot.情节编号}。`,
      body,
    ].join('\n');
  },

  normalize(raw, fallback) {
    const title = String(raw?.情节标题 || fallback.情节标题).slice(0, 10);
    const shortSummary = this.compactText(raw?.短摘要 || raw?.情节总结 || fallback.短摘要 || fallback.情节总结, 600) || '世界线记录';
    const ids = Array.isArray(raw?.重要记录编号) ? raw.重要记录编号.join('、') : raw?.重要记录编号;
    const facts = this.normalizeList(raw?.关键事实 || fallback.关键事实, 12, 80);
    const tags = this.normalizeList(raw?.检索标签 || fallback.检索标签, 16, 24);
    return { ...fallback, 情节标题: title, 短摘要: shortSummary, 情节总结: shortSummary, 关键事实: facts, 检索标签: tags, 重要记录编号: String(ids || fallback.重要记录编号), 重要片段: String(raw?.重要片段 || fallback.重要片段).slice(0, 240) };
  },

  normalizeList(value, maxItems, itemLimit) {
    const list = Array.isArray(value) ? value : String(value || '').split(/[、,，\n]/u);
    return [...new Set(list.map((item) => this.compactText(item, itemLimit)).filter(Boolean))].slice(0, maxItems);
  },

  compactText(text, limit) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  },

  fallback(plot, events) {
    const first = events[0] || {}, last = events[events.length - 1] || first;
    const ids = events.map((event) => event.eventId).filter(Boolean).join('、');
    const details = events.map((event) => this.compactText(event.detail || event.name || '世界线记录', 120)).filter(Boolean);
    const important = details.slice(-3).join('\n');
    const shortSummary = this.compactText(details.join('；'), 600) || '世界线记录';
    const tags = events.flatMap((event) => [event.name, event.status]).filter(Boolean);
    return {
      情节标题: String(last.name || first.name || '情节记录').slice(0, 10),
      情节编号: plot.情节编号,
      情节时间段: [first.time, last.time].filter(Boolean).join(' - ') || '时间未知',
      短摘要: shortSummary,
      情节总结: shortSummary,
      关键事实: details.slice(-12),
      检索标签: this.normalizeList(tags, 16, 24),
      重要记录编号: ids || String(last.eventId || first.eventId || ''),
      重要片段: important.slice(0, 240) || this.compactText(last.detail || first.detail || '世界线记录', 240),
    };
  },

  items(line = {}) {
    return [...(line.plots || []), line.pendingPlot ? { ...line.pendingPlot, 情节标题: '记录中', 情节时间段: [line.pendingPlot.startedAt, line.pendingPlot.endedAt].filter(Boolean).join(' - '), 短摘要: '累计记录尚未超过2400字，暂不归纳。', 情节总结: '累计记录尚未超过2400字，暂不归纳。', 关键事实: [], 检索标签: [], 重要记录编号: line.pendingPlot.recordIds?.join('、') || '', 重要片段: '继续如实记录中。' } : null].filter(Boolean);
  },
};
