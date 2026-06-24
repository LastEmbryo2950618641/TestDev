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
  examples: [{
    updateType: 'sexual-history',
    subject: { type: 'player', id: 'player-self' },
    field: 'intimacy.sexualPartners',
    change: { mode: 'append', value: { sexualStatus: '非处女', partnerName: '姓名', vaginalInsertionConfirmed: true } },
    reasons: [{ trigger: '成人身份且稳定事实确认阴部插入经历', evidence: '只记录当前状态、经历人数与经历人列表', confidence: 'confirmed' }],
  }],
});
