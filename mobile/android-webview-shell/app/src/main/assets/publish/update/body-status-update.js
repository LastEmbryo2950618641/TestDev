window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'body-status', promptId: 'body-status-update', section: '角色卡字段',
  match: (change, text) => /body-status|bodyStatus|身体状态|部位状态|口部|胸部|阴部|肛部|臀部/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['bodyStatusUpdates'])
      .filter((item) => String(item.field || '').startsWith('bodyStatus.') || item.updateType === 'body-status');
    const nested = raw.bodyStatus && typeof raw.bodyStatus === 'object' ? raw.bodyStatus : {};
    const converted = [];
    Object.entries(nested).forEach(([target, parts]) => {
      if (!parts || typeof parts !== 'object') return;
      Object.entries(parts).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') return;
        converted.push({
          updateType: 'body-status', subject: { type: target === 'player-self' ? 'player' : 'character', id: target },
          field: `bodyStatus.${value.partKey || key}`, change: { mode: 'set', value },
          reasons: [{ trigger: '身体状态变化', evidence: value.reason || value['变化原因'] || value['描述状态'] || value.description || value.status || '', confidence: 'confirmed' }],
        });
      });
    });
    return [...direct, ...converted];
  },
  examples: [{ updateType: 'body-status', subject: { type: 'player', id: 'player-self' }, field: 'bodyStatus.mouth', change: { mode: 'set', value: { partKey: 'mouth', part: '口部', status: '稳定', '描述状态': '口部清洁，状态稳定' } }, reasons: [{ trigger: '明确护理、受伤、疾病或恢复事实', evidence: '只记录中性短状态与描述状态', confidence: 'confirmed' }] }],
});
