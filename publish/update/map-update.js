window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'map', promptId: 'map-update', section: '地点地图',
  match: (change, text) => /location|map|地点|地图|路线|parentLocation|descriptionFacts/u.test(text),
  card() { return { id: 'map:real-world', title: '地图', section: '地图卡' }; },
  examples: [{ updateType: 'map', subject: { type: 'location', id: '地点名' }, field: 'descriptionFacts', change: { mode: 'append', value: '玩家新确认的地点事实' }, reasons: [{ trigger: '玩家到达或观察地点', evidence: '正文确认新地点事实', confidence: 'confirmed' }] }],
});
