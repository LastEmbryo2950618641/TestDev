window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'faction-overview', promptId: 'faction-overview-update', section: '势力总览',
  match: (change, text) => /faction_overview|faction_parent|parentFaction|势力总览|上层势力|新增势力|势力增加/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.parentFactionId || subject.factionId || subject.id || 'faction-overview';
    const title = subject.name || '势力总览';
    return { id: `faction-overview:${id}`, title, section: '势力总览卡' };
  },
  examples: [{ updateType: 'faction-overview', subject: { type: 'faction_parent', id: '上层势力ID', parentFactionId: '上层势力ID' }, field: 'children.factions', change: { mode: 'append', value: { name: '新增势力名', type: '公司/学校/组织' } }, reasons: [{ trigger: '现实确认新势力存在', evidence: '正文或资料明确出现新组织', confidence: 'confirmed' }] }],
});
