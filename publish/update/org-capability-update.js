window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'org-capability',
  promptId: 'org-capability-update',
  section: '组织维度',
  match: (change, text) => /org-capability(?!-entry)|组织(政治|经济|资产|军事)能力/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.id || subject.name || 'faction';
    return { id: `faction:${id}`, title: subject.name || '势力卡', section: '势力能力' };
  },
  examples: [{
    updateType: 'org-capability',
    subject: { type: 'faction', id: '势力ID', name: '势力名' },
    field: 'solid.capabilities.economic',
    change: {
      mode: 'merge',
      value: { dimension: 'economic', note: '涉及经营与雇佣事实', entries: [] },
    },
    reasons: [{ trigger: '正文确认该势力在经济维度的稳定事实', evidence: '结算依据', confidence: 'confirmed' }],
  }],
});
