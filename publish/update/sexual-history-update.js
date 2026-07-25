window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'sexual-history',
  promptId: 'sexual-history-update',
  section: '角色卡字段',
  match: (change, text) => /sexual-history|sexualHistory|sexualStatus|sexualPartnerCount|sexualPartners|virginityStatus|firstVaginalPartner|defloweredPartners|性经历|经历人数|经历人列表|处女|非处女|破处|初体验/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { virginityStatus: '非处女', virginityEvidence: '角色卡身份为妻子且无相反特殊背景' } }, reasons: [{ trigger: '身份推定非处女', evidence: '妻子身份', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { virginityStatus: '处女', virginityEvidence: '正文明确建立此前处女事实' } }, reasons: [{ trigger: '此前处女事实确认', evidence: '正文明确建立此前处女事实', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { virginityStatus: '非处女', partner: { type: 'character', id: '角色id', name: '姓名' }, firstVaginalPartner: { type: 'character', id: '角色id', name: '姓名' }, firstVaginalAt: '当前回合', firstVaginalEvidence: '正文明确确认首次事实' } }, reasons: [{ trigger: '首次阴道插入或处女膜破裂事实确认', evidence: '正文明确确认', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualPartners', change: { mode: 'append', value: '姓名' }, reasons: [{ trigger: '阴部插入经历对象确认', evidence: '正文明确确认', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory.defloweredPartners', change: { mode: 'append', value: { type: 'character', id: '角色id', name: '姓名', at: '当前回合' } }, reasons: [{ trigger: '成为对方初体验对象', evidence: '正文明确确认', confidence: 'confirmed' }] },
  ],
});
