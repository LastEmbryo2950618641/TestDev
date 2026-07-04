window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('system', {
  row(update = {}, store = {}, row = {}, entry = null) {
    const registry = window.GameModules.updateRegistry;
    const change = update.change || {};
    const raw = change.value ?? row.value ?? '';
    const payload = registry.systemRecordPayload?.(raw) || {};
    const fieldKey = payload.key || registry.leafName(update.field) || '记录';
    const text = registry.normalizeSettlementText(payload.value || (typeof raw === 'string' ? raw : ''));
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const norm = (value) => registry.normalizeSettlementText(String(value || ''));
    const timeLabel = norm(payload.updatedAt || update.settlementAt || row.settlementAt || entry?.time?.label || '');
    const reason = norm(first.evidence || payload.reason || update.reason || row.reason || '');
    return {
      field: '系统记录',
      uiTitle: '系统记录',
      name: fieldKey,
      uiName: fieldKey,
      value: text,
      uiValue: text,
      reason,
      settlementAt: timeLabel,
      detailLines: [
        timeLabel ? `时间：${timeLabel}` : '',
        change.mode ? `方式：${change.mode}` : '',
        first.trigger ? `触发：${norm(first.trigger)}` : '',
        first.confidence ? `确认：${norm(first.confidence)}` : '',
      ].filter(Boolean),
    };
  },
});
