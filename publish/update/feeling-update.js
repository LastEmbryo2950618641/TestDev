window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'feeling', promptId: 'feeling-update', section: '感觉',
  match: (change, text) => /playerFeelings|feeling|感觉|对玩家/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || 'player-self');
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    return window.GameModules.updateRegistry.genericLike(raw, ['characterMetricUpdates'])
      .filter((item) => /(^|\.)playerFeelings\./u.test(String(item.field || '')) || item.updateType === 'feeling');
  },
  examples: [{ updateType: 'feeling', subject: { type: 'character', id: '角色ID' }, field: 'metrics.playerFeelings.信任', change: { mode: 'delta', value: 2 }, reasons: [{ trigger: '玩家兑现承诺或提供帮助', evidence: '正文确认角色因此更信任玩家', confidence: 'confirmed' }] }],
});
