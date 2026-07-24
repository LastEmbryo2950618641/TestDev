window.GameModules = window.GameModules || {};

(function installCharacterScheduleUi() {
  const registry = window.GameModules.updateRegistry;
  if (!registry) return;

  const asObject = (raw) => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    if (typeof raw !== 'string') return {};
    const text = raw.trim();
    if (!text.startsWith('{')) return {};
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  };

  const shortLocation = (text = '') => {
    const full = String(text || '').trim();
    if (!full) return '';
    const parts = full.split(/[·•．.／/]/u).map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 2) return full;
    return parts.slice(-2).join('·');
  };

  const scheduleDisplay = (store = {}, subjectId = '', raw = {}, key = '', value = '', evidence = '') => {
    const norm = (text) => registry.normalizeSettlementText(String(text || ''));
    const stored = store?.characterSchedules?.[subjectId] || {};
    const merged = { ...stored, ...raw };
    const parts = [];
    const location = merged.currentLocation || (key === '当前地点' ? value : '');
    if (location) parts.push(`地点：${norm(shortLocation(location))}`);
    const action = merged.currentAction || (key === '当前行动' ? value : '');
    if (action && !/^(?:按角色日常安排活动|由玩家当前行动决定)$/u.test(action)) {
      parts.push(`行动：${norm(action)}`);
    } else if (key === '可用状态' && evidence && evidence.length >= 4 && !/^(?:正文|证据|明确|人事安排)/u.test(evidence)) {
      parts.push(`行动：${norm(evidence)}`);
    }
    const availability = merged.availability || (key === '可用状态' ? value : '');
    if (availability) parts.push(`状态：${norm(availability)}`);
    return parts.join('；') || norm(value) || norm(evidence);
  };

  registry.registerUi?.('character-schedule', {
    row(update = {}, store = {}, row = {}, entry = null) {
      const subject = update.subject || {};
      const subjectId = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
      const subjectName = store?.realWorldSettlementTargetGroup?.(subjectId, subject.name || '')
        || subject.name
        || subject.characterName
        || subjectId;
      const raw = asObject(update.change?.value ?? update.value ?? row.value);
      const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
      const evidence = registry.normalizeSettlementText(
        [...new Set(
          [first.evidence, raw.reason, update.reason, row.reason]
            .map((item) => String(item || '').trim())
            .filter((item) => item && !/^(?:人事安排|characterSchedules?|结算确认)$/iu.test(item)),
        )].join('；') || '',
      );
      const norm = (text) => registry.normalizeSettlementText(String(text || ''));
      const timeLabel = norm(raw.updatedAt || update.settlementAt || row.settlementAt || entry?.time?.label || '');
      const composite = scheduleDisplay(store, subjectId, raw, '当前安排', '', evidence);
      return {
        field: '人事安排',
        uiTitle: '人事安排',
        name: subjectName,
        uiName: subjectName,
        value: composite,
        uiValue: composite,
        reason: evidence || '本轮正文确认的人事变化',
        settlementAt: timeLabel,
        rowKey: `schedule:${subjectId}`,
        detailLines: [
          timeLabel ? `时间：${timeLabel}` : '',
          raw.currentLocation ? `完整地点：${norm(raw.currentLocation)}` : '',
        ].filter(Boolean),
      };
    },
  });
}());
