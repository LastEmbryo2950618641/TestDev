window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'relationship', promptId: 'relationship-update', section: '人际关系',
  match: (change, text) => /relationship|relationships|人际关系|关系名|亲属|恋人|朋友|同事|师生|雇佣|敌对|同居/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['relationshipUpdates'])
      .filter((item) => item.updateType === 'relationship' || /(^|\.)relationships?\./u.test(String(item.field || '')));
    const legacy = (Array.isArray(raw.relationshipUpdates) ? raw.relationshipUpdates : []).map((item) => {
      if (item?.field && item?.change) return { ...item, updateType: item.updateType || 'relationship' };
      const subject = item.subject || { type: item.target === 'player-self' ? 'player' : 'character', id: item.target || item.targetId || item.characterId || 'player-self' };
      const relation = item.relation || item.relationship || item.name || '关系';
      return {
        updateType: 'relationship',
        subject,
        field: item.field || `relationships.${relation}`,
        change: item.change && typeof item.change === 'object' ? item.change : { mode: item.mode || 'upsert', value: { relation, name: item.personName || item.to || item.value || '', detail: item.detail || item.reason || '' } },
        reasons: Array.isArray(item.reasons) ? item.reasons : [{ trigger: item.reason || '关系变化', evidence: item.detail || item.reason || '', confidence: 'confirmed' }],
      };
    });
    return [...direct, ...legacy];
  },
  examples: [{ updateType: 'relationship', subject: { type: 'character', id: '角色ID' }, field: 'relationships.恋人', change: { mode: 'upsert', value: { relation: '恋人', name: '玩家姓名', detail: '双方确认稳定恋爱关系' } }, reasons: [{ trigger: '双方确认关系', evidence: '正文明确确认双方以恋人身份相处', confidence: 'confirmed' }] }],
});
