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
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['characterMetricUpdates'])
      .filter((item) => /(^|\.)emotions\./u.test(String(item.field || '')) || item.updateType === 'emotion');
    const legacy = (Array.isArray(raw.characterMetricUpdates) ? raw.characterMetricUpdates : []).flatMap((item) => {
      const subject = item.subject || { type: 'character', id: item.target || item.targetId || item.characterId || item.name };
      return (Array.isArray(item.emotions) ? item.emotions : []).map((emotion) => ({
        updateType: 'emotion', subject, field: `metrics.emotions.${emotion.key}`,
        change: { mode: 'delta', value: Number(emotion.delta) || 0 },
        reasons: [{ trigger: emotion.reason || emotion.status || '情绪变化', evidence: emotion.reason || '', confidence: 'confirmed' }],
      }));
    });
    return [...direct, ...legacy];
  },
  examples: [{ updateType: 'emotion', subject: { type: 'player', id: 'player-self' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 3 }, reasons: [{ trigger: '受到现实压力刺激', evidence: '正文确认紧张反应', confidence: 'confirmed' }] }],
});
