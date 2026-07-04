window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'character-schedule',
  section: '人事安排',
  match: (change, text) => change.updateType === 'character-schedule' || /characterSchedules?|人事安排/u.test(text),
  card() {
    return { id: 'schedule:real-world', title: '人事安排', section: '人事安排' };
  },
  examples: [{
    updateType: 'character-schedule',
    subject: { type: 'character', id: '角色id', name: '角色名' },
    field: 'characterSchedules',
    change: { mode: 'merge', value: { currentAction: '正在做的事', reason: '正文明确行动证据' } },
    reasons: [{ trigger: '人事安排当前行动', evidence: '正文明确行动证据', confidence: 'confirmed' }],
  }],
});
