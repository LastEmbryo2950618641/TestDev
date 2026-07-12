window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

window.GameModules.ui.worldline.realPlotSummaryViewHelpers = {
  pendingRealPlotSummaryView() {
    const pending = this.realWorldline()?.pendingPlot || null;
    const hasPending = Boolean(pending);
    return {
      hasPending,
      title: pending?.情节编号 || '暂无进行中的现实情节',
      timeRange: hasPending
        ? `${pending.startedAt || '时间未知'} - ${pending.endedAt || '进行中'}`
        : '当前没有进行中的现实情节记录。',
      statsText: hasPending
        ? `记录数：${pending.recordIds?.length || 0} 条｜文本长度：${pending.textLength || 0}`
        : '等待新的现实行动写入后再生成情节摘要。',
    };
  },
};
