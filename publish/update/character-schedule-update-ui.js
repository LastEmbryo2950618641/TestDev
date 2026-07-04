window.GameModules = window.GameModules || {};

(function installCharacterScheduleUi() {
  const registry = window.GameModules.updateRegistry;
  if (!registry) return;

  const scheduleKey = (update = {}, raw = {}) => {
    const trigger = String((Array.isArray(update.reasons) ? update.reasons.find(Boolean) : null)?.trigger || '');
    const fromTrigger = trigger.match(/^人事安排(.+)$/u)?.[1];
    if (fromTrigger) return fromTrigger;
    if (raw.currentLocation) return '当前地点';
    if (raw.currentAction) return '当前行动';
    if (raw.availability) return '可用状态';
    return '状态';
  };

  const scheduleDisplay = (store = {}, subjectId = '', raw = {}, key = '', value = '', evidence = '') => {
    const norm = (text) => registry.normalizeSettlementText(String(text || ''));
    const stored = store?.characterSchedules?.[subjectId] || {};
    const merged = { ...stored, ...raw };
    const parts = [];
    if (merged.currentLocation) parts.push(`地点：${norm(merged.currentLocation)}`);
    const action = merged.currentAction || (key === '当前行动' ? value : '');
    if (action && !/^(?:按角色日常安排活动|由玩家当前行动决定)$/u.test(action)) parts.push(`行动：${norm(action)}`);
    else if (key === '可用状态' && evidence && evidence.length >= 4 && !/^(?:正文|证据|明确)/u.test(evidence)) parts.push(`行动：${norm(evidence)}`);
    const availability = merged.availability || (key === '可用状态' ? value : '');
    if (availability) parts.push(`可用：${norm(availability)}`);
    return parts.join('｜') || norm(value) || norm(evidence);
  };

  registry.registerUi?.('character-schedule', {
    row(update = {}, store = {}, row = {}, entry = null) {
      const subject = update.subject || {};
      const subjectId = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
      const subjectName = store?.realWorldSettlementTargetGroup?.(subjectId, subject.name || '') || subject.name || subjectId;
      const raw = update.change?.value && typeof update.change.value === 'object' ? update.change.value : {};
      const key = scheduleKey(update, raw);
      const value = key === '当前地点' ? raw.currentLocation || '' : key === '当前行动' ? raw.currentAction || '' : key === '可用状态' ? raw.availability || '' : raw.currentAction || raw.currentLocation || raw.availability || '';
      const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
      const evidence = registry.normalizeSettlementText(first.evidence || raw.reason || update.reason || row.reason || '');
      const norm = (text) => registry.normalizeSettlementText(String(text || ''));
      const timeLabel = norm(raw.updatedAt || update.settlementAt || row.settlementAt || entry?.time?.label || '');
      const composite = scheduleDisplay(store, subjectId, raw, key, value, evidence);
      return {
        field: '人事安排',
        uiTitle: '人事安排',
        name: subjectName,
        uiName: subjectName,
        value: norm(value),
        uiValue: composite,
        reason: evidence,
        settlementAt: timeLabel,
        detailLines: [
          timeLabel ? `时间：${timeLabel}` : '',
          first.trigger ? `触发：${norm(first.trigger)}` : '',
          first.confidence ? `确认：${norm(first.confidence)}` : '',
        ].filter(Boolean),
      };
    },
  });
}());
