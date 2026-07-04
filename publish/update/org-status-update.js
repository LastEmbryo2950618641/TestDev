window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'org-status',
  promptId: 'org-status-update',
  section: '政体状态',
  match: (change, text) => /org-status|政体|独立|起义|解散|合并|rebel|merged|dissolved/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.orgId || subject.id || 'faction';
    return { id: `faction:${id}`, title: subject.name || id, section: '势力政体' };
  },
  examples: [{
    updateType: 'org-status',
    subject: { type: 'faction', id: 'force-rebel-1', name: '某某自治会' },
    field: 'status',
    change: {
      mode: 'set',
      value: {
        status: 'rebel',
        legitimacy: 'contested',
        reason: '正文确认局部起义成立',
      },
    },
    reasons: [{ trigger: '正文确认独立、起义、解散、合并', evidence: 'Stage2 硬事实', confidence: 'confirmed' }],
  }],
});
