window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'sexual-experience', promptId: 'sexual-experience-update', section: '角色卡字段',
  match: (change, text) => /sexual-experience|sexualExperienceCount|sexualExperienceParts|intimacy|性经验|经历次数/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'sexual-experience', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualExperienceParts.lips', change: { mode: 'delta', value: { totalDelta: 1, parts: { lips: 1, oralSex: 1, vaginalInsertion: 1, analInternalFinish: 1 } } }, reasons: [{ trigger: '成人身份且稳定事实确认抽象经历次数变化', evidence: '只记录总数与分类次数，不记录过程', confidence: 'confirmed' }] }],
});
