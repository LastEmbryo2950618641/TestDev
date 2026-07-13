window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'system', promptId: 'system-update', section: '系统记录',
  match: (change, text) => /company|calendar|worldline|wechat|system|公司|日历|世界线|微信/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const name = subject.name || subject.type || '系统记录';
    return { id: `system:${subject.type || name}`, title: name, section: '系统卡' };
  },
  examples: [{ updateType: 'system', subject: { type: 'calendar', id: 'calendar' }, field: 'events', change: { mode: 'append', value: '新增日程或世界线记录' }, reasons: [{ trigger: '现实确认系统级记录变化', evidence: '正文或资料确认应写入系统记录', confidence: 'confirmed' }] }],
});
