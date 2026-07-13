window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'item', promptId: 'item-update', section: '物品与穿着',
  match: (change, text) => /item|inventory|物品|装备|穿着|购买|转交|丢弃|消耗/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'item', subject: { type: 'inventory', id: 'player-self' }, field: 'inventory.wallet.quantity', change: { mode: 'delta', value: -1 }, reasons: [{ trigger: '确认消耗或转移物品', evidence: '正文确认物品数量变化', confidence: 'confirmed' }] }],
});
