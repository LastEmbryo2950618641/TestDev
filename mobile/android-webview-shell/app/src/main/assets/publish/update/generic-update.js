window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'generic', promptId: 'generic-update', section: '通用固化',
  match: (change) => change.updateType === 'generic' || change.updateType === 'generic-update' || change.updateType === 'lexicon' || change.updateType === 'status-tag' || change.updateType === 'skill-or-profession',
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || subject.name || 'generic';
    const field = String(change.field || '');
    if (/^status_tags(?:\.|$)/u.test(field)) {
      const card = store?.resolveCharacterSettlementCard?.(id, subject.name || id);
      if (card) return card;
    }
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `generic:${id}`, title, section: '通用固化' };
  },
  examples: [{
    updateType: 'generic',
    subject: { type: 'character', id: '角色ID', name: '角色名' },
    field: 'status_tags',
    change: { mode: 'append', value: ['Master', '令咒3划', '供魔链稳定'] },
    reasons: [{ trigger: '正文或资料确认稳定状态', evidence: '已明确确认该角色具备这些状态标签', confidence: 'confirmed' }],
  }],
});
