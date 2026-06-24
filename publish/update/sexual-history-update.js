window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'sexual-history',
  promptId: 'sexual-history-update',
  section: '角色卡字段',
  match: (change, text) => /sexual-history|sexualStatus|sexualPartnerCount|sexualPartners|性经历|经历人数|经历人列表|处女/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualStatus', change: { mode: 'set', value: '非处女' }, reasons: [{ trigger: '成人身份且稳定事实确认阴部插入经历', evidence: '只记录当前状态', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualPartners', change: { mode: 'append', value: '姓名' }, reasons: [{ trigger: '成人身份且稳定事实确认阴部插入经历', evidence: '记录已确认经历对象', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualPartnerCount', change: { mode: 'set', value: 1 }, reasons: [{ trigger: '成人身份且稳定事实确认阴部插入经历', evidence: '与已确认经历人列表保持一致', confidence: 'confirmed' }] },
  ],
});
