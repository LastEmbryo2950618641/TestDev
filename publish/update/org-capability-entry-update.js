window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'org-capability-entry',
  promptId: 'org-capability-entry-update',
  section: '组织能力',
  match: (change, text) => /org-capability|capability-entry|能力条目|兵种|科室|产线|资产包/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.id || subject.name || 'faction';
    const title = subject.name || subject.id || '势力卡';
    return { id: `faction:${id}`, title, section: '势力能力' };
  },
  examples: [{
    updateType: 'org-capability-entry',
    subject: { type: 'faction', id: '势力ID', factionId: '势力ID', name: '势力名' },
    field: 'solid.capabilities.military.entries',
    change: {
      mode: 'upsert',
      value: {
        name: '黑盾特遣队',
        kind: '兵种',
        state: 'fog',
        parentRef: { fog: true, label: '迷雾' },
        sketchNote: '正文仅确认存在该单位，隶属未明',
      },
    },
    reasons: [{ trigger: '正文确认新设组织内具体能力条目', evidence: 'Stage2 硬事实 + 同轮结算', confidence: 'confirmed' }],
  }],
});
