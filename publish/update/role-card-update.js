window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'role-card', promptId: 'role-card-update', section: '角色卡字段',
  match: (change, text) => change.updateType !== 'relationship' && !/(^|\.)relationships?(\.|$)|人际关系/u.test(String(change.field || '')) && /角色卡|profile|identity|skill|职业|身份|外貌|性格|技能|wearing|穿着/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'role-card', subject: { type: 'player', id: 'player-self' }, field: 'profile.refinedRole', change: { mode: 'set', value: '新的现实身份' }, reasons: [{ trigger: '现实资料确认身份变化', evidence: '正文或资料明确确认新身份', confidence: 'confirmed' }] }],
});
