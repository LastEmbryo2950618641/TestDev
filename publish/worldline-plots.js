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
    if (plot.textLength < 5000) return;
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
        maxTokens: 7000,
        outputLengthThreshold: 6200,
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
    const body = events.map((event) => `记录编号:${event.eventId}\n时间:${event.time || ''}\n标题:${event.name || ''}\n状态:${event.status || ''}\n详细:${event.detail || ''}`).join('\n---\n');
    return [
      '你是世界线记录员。只输出一个合法 JSON 对象，不要 Markdown、代码块或解释。',
      '必须复制下方 JSON 骨架的字段，情节标题不超过10个汉字，情节总结为5000字以内的完整归纳，重要片段必须来自记录原文。',
      '重要记录编号必须是一个字符串，用顿号连接记录编号；不要输出数组。',
      JSON.stringify({ 情节标题: '十字以内', 情节编号: plot.情节编号, 情节时间段: '开始时间 - 结束时间', 情节总结: '五千字以内完整归纳', 重要记录编号: 'record_id', 重要片段: '来自原文的关键片段' }),
      `情节编号固定为${plot.情节编号}。`,
      body,
    ].join('\n');
  },

  normalize(raw, fallback) {
    const title = String(raw?.情节标题 || fallback.情节标题).slice(0, 10);
    const brief = String(raw?.情节总结 || fallback.情节总结).slice(0, 5000);
    const ids = Array.isArray(raw?.重要记录编号) ? raw.重要记录编号.join('、') : raw?.重要记录编号;
    return { ...fallback, 情节标题: title, 情节总结: brief, 重要记录编号: String(ids || fallback.重要记录编号), 重要片段: String(raw?.重要片段 || fallback.重要片段).slice(0, 240) };
  },

  compactText(text, limit) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  },

  fallback(plot, events) {
    const first = events[0] || {}, last = events[events.length - 1] || first;
    const ids = events.map((event) => event.eventId).filter(Boolean).join('、');
    const details = events.map((event) => this.compactText(event.detail || event.name || '世界线记录', 80)).filter(Boolean);
    const important = details.slice(-3).join('\n');
    return {
      情节标题: String(last.name || first.name || '情节记录').slice(0, 10),
      情节编号: plot.情节编号,
      情节时间段: [first.time, last.time].filter(Boolean).join(' - ') || '时间未知',
      情节总结: this.compactText(details.join('；'), 5000) || '世界线记录',
      重要记录编号: ids || String(last.eventId || first.eventId || ''),
      重要片段: important.slice(0, 240) || this.compactText(last.detail || first.detail || '世界线记录', 240),
    };
  },

  items(line = {}) {
    return [...(line.plots || []), line.pendingPlot ? { ...line.pendingPlot, 情节标题: '记录中', 情节时间段: [line.pendingPlot.startedAt, line.pendingPlot.endedAt].filter(Boolean).join(' - '), 情节总结: '累计记录尚未超过5000字，暂不归纳。', 重要记录编号: line.pendingPlot.recordIds?.join('、') || '', 重要片段: '继续如实记录中。' } : null].filter(Boolean);
  },
};
