window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'emotion', promptId: 'emotion-update', section: '情绪',
  match: (change, text) => /emotion|emotions|情绪/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'emotion', subject: { type: 'player', id: 'player-self' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 3 }, reasons: [{ trigger: '受到现实压力刺激', evidence: '正文确认紧张反应', confidence: 'confirmed' }] }],
});
