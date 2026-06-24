window.GameModules = window.GameModules || {};
window.GameModules.updateRules = window.GameModules.updateRules || {};
window.GameModules.updateRules.sexualExperience = {
  partPrompts: {
    genital: '仅在成人身份且明确稳定事实确认该部位相关经历时计数；禁止过程描写。',
    chest: '仅记录成人抽象经历中胸部相关次数，不记录触碰细节或感官描写。',
    lips: '仅记录接吻或唇部相关抽象次数，不展开亲密过程。',
    mouth: '仅记录口部相关抽象次数；如会变成露骨过程，必须跳过。',
    oralAction: '仅记录成人抽象口部行为次数，不描述动作、过程或感官细节。',
    oralSex: '仅记录成人抽象口交次数，不描述动作、过程或感官细节。',
    oralInternalFinish: '仅记录成人抽象口交中出次数，只作计数，不写过程、体液或感官描写。',
    genitalEntry: '仅记录成人抽象阴部进入次数，不描述进入过程、姿势或感官细节。',
    vaginalInsertion: '仅记录成人抽象阴部插入次数，不描述进入过程、姿势或感官细节。',
    vaginalInternalFinish: '仅记录成人抽象阴部中出次数，只作计数，不写过程、体液或感官描写。',
    anus: '仅在成人身份且明确事实确认时记录肛门相关次数，不写具体行为。',
    analEntry: '仅记录成人抽象肛部进入次数，不描述进入过程、姿势或感官细节。',
    analSex: '仅记录成人抽象肛交次数，不描述动作、过程或感官细节。',
    analInternalFinish: '仅记录成人抽象肛交中出次数，只作计数，不写过程、体液或感官描写。',
    legs: '记录腿部相关亲密接触的抽象次数，保持中性统计。',
    hips: '记录臀部相关抽象次数，避免任何露骨描述。',
    hands: '记录手部相关次数，只作统计。',
    skin: '记录皮肤接触相关抽象次数，避免感官化描述。',
    other: '其他无法归类但合规的成人抽象经历次数。',
  },
};

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
