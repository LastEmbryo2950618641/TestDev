window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'feeling', promptId: 'feeling-update', section: '感觉',
  match: (change, text) => /playerFeelings|feeling|感觉|对玩家/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['characterMetricUpdates'])
      .filter((item) => /(^|\.)playerFeelings\./u.test(String(item.field || '')) || item.updateType === 'feeling');
    const legacy = (Array.isArray(raw.characterMetricUpdates) ? raw.characterMetricUpdates : []).flatMap((item) => {
      const subject = item.subject || { type: 'character', id: item.target || item.targetId || item.characterId || item.name };
      return (Array.isArray(item.playerFeelings) ? item.playerFeelings : []).map((feeling) => {
        const key = feeling.key || feeling.field || feeling.name;
        return {
          updateType: 'feeling', subject, field: String(key || '').startsWith('metrics.') ? key : `metrics.playerFeelings.${key}`,
          change: feeling.change && typeof feeling.change === 'object' ? feeling.change : { mode: 'delta', value: Number(feeling.delta) || 0 },
          reasons: Array.isArray(feeling.reasons) ? feeling.reasons : [{ trigger: feeling.reason || feeling.status || '感觉变化', evidence: feeling.reason || '', confidence: 'confirmed' }],
        };
      }).filter((update) => update.field !== 'metrics.playerFeelings.');
    });
    return [...direct, ...legacy];
  },
  examples: [{ updateType: 'feeling', subject: { type: 'character', id: '角色ID' }, field: 'metrics.playerFeelings.信任', change: { mode: 'delta', value: 2 }, reasons: [{ trigger: '玩家兑现承诺或提供帮助', evidence: '正文确认角色因此更信任玩家', confidence: 'confirmed' }] }],
});
