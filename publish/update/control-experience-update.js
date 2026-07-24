window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'control-experience',
  promptId: 'control-experience-update',
  section: '上线体验',
  match: (change, text) => /control-experience|control_experience|操控体验|上线体验|适应度|controllerAwareness/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{
    updateType: 'control-experience',
    subject: { type: 'character', id: '角色ID', name: '角色名' },
    field: 'values.control_experience',
    change: {
      mode: 'merge',
      value: {
        needUpdate: true,
        updateFields: ['feeling', 'adaptation', 'summary', 'controllerAwarenessLevel', 'controllerAwareness'],
        feeling: '紧绷抗拒',
        adaptation: '+5',
        summary: '被迫旁观身体失控。',
        controllerAwarenessLevel: 'traitKnown',
        controllerAwareness: '感到操控者冷静强势但不知是谁',
        reason: '正文明确被控体验证据',
      },
    },
    reasons: [{ trigger: '操控体验变化', evidence: '正文明确被控体验证据', confidence: 'confirmed' }],
  }],
});
