window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'vital', promptId: 'vital-update', section: '生命体征',
  match: (change, text) => /vital|vitals|生命体征|生命力|vitality|stamina_pool|satiety|hydration|fatigue|mental_stability/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'vital', subject: { type: 'player', id: 'player-self' }, field: 'vitals.fatigue', change: { mode: 'delta', value: 4, unit: '%' }, reasons: [{ trigger: '长时间行动或缺乏休息', evidence: '正文确认疲劳累积', confidence: 'confirmed' }] }],
});
