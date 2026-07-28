window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'wearing-state', promptId: 'wearing-state-update', section: '角色卡字段',
  match: (change, text) => /wearing-state|values\.wearing|profile\.wearing|穿着|衣物|胸罩|衬衫|裙子|连裤袜/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['wearingUpdates'])
      .map((item) => ({ ...item, updateType: 'wearing-state', field: item.field || 'profile.wearingItems' }));
    return direct;
  },
  examples: [{
    updateType: 'wearing-state',
    subject: { type: 'character', id: '角色id', name: '姓名' },
    field: 'profile.wearingItems',
    change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开，胸部外露' }] },
    reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认衣物被推开但未脱下', confidence: 'confirmed' }],
  }, {
    updateType: 'wearing-state',
    subject: { type: 'character', id: '角色id', name: '姓名' },
    field: 'profile.wearingItems',
    change: { mode: 'merge', value: { outerwear: '衬衫仍穿着但纽扣解开' } },
    reasons: [{ trigger: '衣物细节变化', evidence: '正文确认衬衫纽扣被解开', confidence: 'confirmed' }],
  }],
});
