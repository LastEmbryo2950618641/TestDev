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
    if (plot.textLength < 1000) return;
    await this.finalize(store, line, plot);
    line.pendingPlot = null;
  },

  async finalize(store, line, plot) {
    const events = (line.events || []).filter((event) => plot.recordIds.includes(event.eventId));
    if (!events.length) return;
    const fallback = this.fallback(plot, events);
    let summary = fallback;
    try {
      const raw = await window.GameModules.aiRequest.complete({
        source: 'worldline-plot',
        model: store.modelId,
        maxTokens: 500,
        messages: [
          { role: 'system', content: '你是世界线记录员。只输出JSON，不要解释。情节标题不超过10个汉字，情节总结不超过60个汉字，重要片段必须来自记录原文。' },
          { role: 'user', content: this.prompt(plot, events) },
        ],
      });
      summary = this.normalize(window.GameModules.jsonUtils.parseLoose(raw), fallback);
    } catch (err) {
      console.warn('世界线情节归纳失败:', err.code, err.message);
    }
    line.plots = [...(line.plots || []).filter((item) => item.情节编号 !== plot.情节编号), summary];
  },

  prompt(plot, events) {
    const body = events.map((event) => `记录编号:${event.eventId}\n时间:${event.time || ''}\n标题:${event.name || ''}\n状态:${event.status || ''}\n详细:${event.detail || ''}`).join('\n---\n');
    return `请把以下记录归纳为一个情节对象。必须保留这些字段：情节标题、情节编号、情节时间段、情节总结、重要记录编号、重要片段。情节编号固定为${plot.情节编号}。\n${body}`;
  },

  normalize(raw, fallback) {
    const title = String(raw?.情节标题 || fallback.情节标题).slice(0, 10);
    const brief = String(raw?.情节总结 || fallback.情节总结).slice(0, 60);
    return { ...fallback, 情节标题: title, 情节总结: brief, 重要记录编号: String(raw?.重要记录编号 || fallback.重要记录编号), 重要片段: String(raw?.重要片段 || fallback.重要片段).slice(0, 120) };
  },

  fallback(plot, events) {
    const first = events[0] || {}, last = events[events.length - 1] || first;
    const detail = String(last.detail || first.detail || '世界线记录');
    return {
      情节标题: String(last.name || first.name || '情节记录').slice(0, 10),
      情节编号: plot.情节编号,
      情节时间段: [first.time, last.time].filter(Boolean).join(' - ') || '时间未知',
      情节总结: detail.slice(0, 60),
      重要记录编号: String(last.eventId || first.eventId || ''),
      重要片段: detail.slice(0, 120),
    };
  },

  items(line = {}) {
    return [...(line.plots || []), line.pendingPlot ? { ...line.pendingPlot, 情节标题: '记录中', 情节时间段: [line.pendingPlot.startedAt, line.pendingPlot.endedAt].filter(Boolean).join(' - '), 情节总结: '累计记录尚未超过1000字，暂不归纳。', 重要记录编号: line.pendingPlot.recordIds?.join('、') || '', 重要片段: '继续如实记录中。' } : null].filter(Boolean);
  },
};
