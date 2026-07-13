window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'territory-control',
  promptId: 'territory-control-update',
  section: '领土控势',
  match: (change, text) => /territory.*control|控势|夺控|占领|解放|移交/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.locationName || subject.id || subject.name || 'map-node';
    const title = subject.locationName || subject.name || '地图地点';
    return { id: `map-control:${id}`, title, section: '地图控势' };
  },
  examples: [{
    updateType: 'territory-control',
    subject: { type: 'map', id: 'loc_xxx', locationName: '地点名' },
    field: 'control',
    change: {
      mode: 'set',
      value: {
        effectiveOrgId: 'country-china',
        claimOrgId: 'country-china',
        status: 'stable',
        reason: '正文确认控势变化',
        inherit: false,
      },
    },
    reasons: [{ trigger: '正文确认夺控、解放或行政归属变化', evidence: '结算依据来自 Stage2 正文硬事实', confidence: 'confirmed' }],
  }],
});
