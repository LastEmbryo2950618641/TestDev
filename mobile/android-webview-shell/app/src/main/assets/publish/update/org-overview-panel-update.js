window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'org-overview-panel',
  promptId: 'org-overview-panel-update',
  section: '组织总览五面板',
  match: (change, text) => change.updateType === 'org-overview-panel' || /overviewPanels|五面板|意识形态|凝聚原因|经济|政治|军事|外交|联谊/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.orgId || subject.factionId || subject.id || subject.name || 'org';
    return { id: `org-overview:${id}`, title: subject.name || '组织总览', section: '五面板总览' };
  },
  examples: [{
    updateType: 'org-overview-panel',
    subject: { type: 'faction', id: '组织ID', name: '组织名', panel: 'economy' },
    field: 'overviewPanels.economy.entries.money',
    change: {
      mode: 'upsert',
      value: { key: 'money', value: 1200, unit: '元', state: 'sketch', reason: '正文确认可用资金' },
    },
    reasons: [{ trigger: '正文确认组织总览面板事实', evidence: '只写已确立事实，不补齐未知总量', confidence: 'confirmed' }],
  }],
});
