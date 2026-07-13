window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'faction-structure', promptId: 'faction-structure-update', section: '组织架构',
  match: (change, text) => /faction.*structure|structure|组织架构|职位|部门|岗位|成员/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.id || subject.name || 'faction';
    const title = subject.name || subject.id || '势力卡';
    return { id: `faction:${id}`, title, section: '势力卡' };
  },
  examples: [{ updateType: 'faction-structure', subject: { type: 'faction', id: '势力ID', factionId: '势力ID' }, field: 'structure.department.roles', change: { mode: 'upsert', value: { title: '职位', characters: ['角色名'] } }, reasons: [{ trigger: '确认组织内职位或成员变化', evidence: '正文或资料确认组织架构调整', confidence: 'confirmed' }] }],
});
