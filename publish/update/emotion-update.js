window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'emotion', promptId: 'emotion-update', section: '情绪',
  match: (change, text) => /emotion|emotions|情绪/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || 'player-self');
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    return window.GameModules.updateRegistry.genericLike(raw, ['characterMetricUpdates'])
      .filter((item) => /(^|\.)emotions\./u.test(String(item.field || '')) || item.updateType === 'emotion')
      .map((item) => ({ ...item, updateType: 'emotion' }));
  },
  examples: [{ updateType: 'emotion', subject: { type: 'player', id: 'player-self' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 3 }, reasons: [{ trigger: '受到现实压力刺激', evidence: '正文确认紧张反应', confidence: 'confirmed' }] }],
});
