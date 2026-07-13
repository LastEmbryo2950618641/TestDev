window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'membership',
  promptId: 'membership-update',
  section: '人事归属',
  match: (change, text) => /membership|人事归属|入职|任职/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.id || subject.name || 'character';
    const title = subject.name || subject.characterName || '角色';
    return { id: `membership:${id}`, title, section: '人事归属' };
  },
  examples: [{
    updateType: 'membership',
    subject: { type: 'character', id: 'player-self', name: '角色名' },
    field: 'values.memberships',
    change: {
      mode: 'upsert',
      value: {
        orgId: 'company-main',
        orgName: '成都星河云栈科技有限公司',
        title: '高级后端工程师',
        department: '产品研发部',
        departmentFog: false,
        state: 'sketch',
      },
    },
    reasons: [{ trigger: '正文确认角色在某组织的职位或部门', evidence: 'Stage2 硬事实', confidence: 'confirmed' }],
  }],
});
