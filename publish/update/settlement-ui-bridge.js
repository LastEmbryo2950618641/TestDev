window.GameModules = window.GameModules || {};

(function installSettlementUiBridge() {
  const registry = window.GameModules.updateRegistry;
  if (!registry || registry.settlementUiBridgeInstalled) return;

  registry.legacySettlementType = function legacySettlementType(row = {}) {
    const text = `${row.updateType || ''} ${row.field || ''} ${row.name || ''} ${row.group || ''} ${row.section || ''}`;
    if (/临时情绪|临时感觉/u.test(text)) return 'system';
    if (/人事安排|characterSchedules?/u.test(text)) return 'character-schedule';
    if (/情绪/u.test(text)) return 'emotion';
    if (/感觉/u.test(text)) return 'feeling';
    if (/人际关系|关系名|relationships?|亲属|恋人|朋友|同事|师生|同居/u.test(text)) return 'relationship';
    if (/生命体征|生命力|生命值|健康|精力|饱食|水分|疲劳|精神稳定/u.test(text)) return 'vital';
    if (/物品|装备|穿着|购买|转交|丢弃|消耗/u.test(text)) return 'item';
    if (/地图|地点|路线/u.test(text)) return 'map';
    if (/控势|夺控|占领|领土|territory/u.test(text)) return 'territory-control';
    if (/政体|独立|起义|解散|合并|org-status/u.test(text)) return 'org-status';
    if (/overviewPanels|ideology|cohesion|economy|politics|military|diplomacy|\u4e94\u9762\u677f|\u610f\u8bc6\u5f62\u6001|\u51dd\u805a\u539f\u56e0|\u7ecf\u6d4e|\u653f\u6cbb|\u519b\u4e8b|\u5916\u4ea4|\u8054\u8c0a/u.test(text)) return 'org-overview-panel';
    if (/人事归属|membership|入职|任职/u.test(text)) return 'membership';
    if (/组织架构|职位|部门|岗位|成员/u.test(text)) return 'faction-structure';
    if (/势力|公司|社群|社区|家庭|组织/u.test(text)) return 'faction-overview';
    if (/身份|角色卡|职业|外貌|性格|技能|状态|盛装|status_tags/u.test(text)) return 'role-card';
    return 'system';
  };

  registry.legacySettlementSubject = function legacySettlementSubject(row = {}) {
    const cardId = String(row.cardId || '');
    const title = row.cardTitle || row.group || row.name || '';
    if (cardId.startsWith('schedule:')) return { type: 'character', id: cardId.slice(9) || 'real-world', name: title || '人事安排' };
    if (cardId.startsWith('role:')) return { type: 'player', id: cardId.slice(5) || 'player-self', name: title };
    if (cardId.startsWith('faction:')) return { type: 'faction', id: cardId.slice(8), name: title };
    if (cardId.startsWith('map:')) return { type: 'location', id: title || 'real-world-map', name: title };
    if (cardId.startsWith('system:')) return { type: title || 'system', id: cardId.slice(7), name: title };
    return { type: 'player', id: 'player-self', name: title };
  };

  registry.legacySettlementField = function legacySettlementField(type = '', row = {}) {
    const name = row.name || this.leafName?.(row.field) || type || '结算';
    if (type === 'emotion') return `metrics.emotions.${name}`;
    if (type === 'feeling') return `metrics.playerFeelings.${name}`;
    if (type === 'vital') return `vitals.${name}`;
    if (type === 'item') return `inventory.${name}`;
    if (type === 'map') return `map.${name}`;
    if (type === 'faction-overview') return `factions.${name}`;
    if (type === 'faction-structure') return `structure.${name}`;
    if (type === 'role-card') return row.field || `profile.${name}`;
    if (type === 'character-schedule') return 'characterSchedules';
    return row.field || `system.${name}`;
  };

  registry.legacySettlementUpdate = function legacySettlementUpdate(row = {}) {
    if (row && typeof row === 'object' && row.updateType && row.change) return row;
    const source = row && typeof row === 'object' ? row : {
      field: '系统记录', name: '结算', value: String(row || ''), reason: String(row || ''), group: '系统记录', section: '系统卡',
    };
    const updateType = this.legacySettlementType(source);
    const value = source.uiValue ?? source.value ?? '';
    const reason = source.reason || '本轮正文确认的变化。';
    const trigger = source.field === '盛装外观' ? '盛装外观更新'
      : (source.field === '状态标签' || /^status_tags/u.test(String(source.field || '')) ? '状态标签更新' : '结算确认');
    return {
      updateType,
      subject: this.legacySettlementSubject(source),
      field: this.legacySettlementField(updateType, source),
      name: source.uiName || source.name || this.leafName?.(source.field) || source.field || '结算',
      change: { mode: 'set', value },
      reasons: [{ trigger, evidence: reason, confidence: 'settled' }],
      __settlementRow: source,
    };
  };

  registry.rowFromSettlement = function rowFromSettlement(row = {}, store = null, entry = null) {
    const source = row && typeof row === 'object' ? row : null;
    const isTemporaryMetricRow = /^(临时情绪|临时感觉)$/u.test(source?.field || '');
    const rendered = this.rowFromGeneric(this.legacySettlementUpdate(row), store, entry);
    if (!source || source.updateType) return rendered;
    return this.decorateRow({
      ...rendered,
      at: source.at || rendered.at,
      group: source.group || rendered.group,
      cardId: rendered.cardId,
      cardTitle: rendered.cardTitle,
      section: rendered.section || source.section,
      field: isTemporaryMetricRow ? source.field : rendered.field,
      name: isTemporaryMetricRow ? (source.uiName || source.name || source.field || rendered.name) : rendered.name,
      value: isTemporaryMetricRow ? (source.uiValue ?? source.value ?? rendered.value) : rendered.value,
      uiTitle: isTemporaryMetricRow ? source.field : rendered.uiTitle,
      uiName: isTemporaryMetricRow ? (source.uiName || source.name || source.field || rendered.uiName) : rendered.uiName,
      uiValue: isTemporaryMetricRow ? (source.uiValue ?? source.value ?? rendered.uiValue) : rendered.uiValue,
      applied: source.applied !== undefined ? source.applied : rendered.applied,
    });
  };

  registry.settlementRows = function settlementRows(entry = {}, store = null) {
    const keepSystemUpdate = (item) => {
      if (item?.updateType !== 'system') return true;
      const raw = item?.change?.value;
      const payload = this.systemRecordPayload?.(raw) || {};
      const key = payload.key || this.leafName?.(item.field) || '';
      const value = payload.value || '';
      return !this.isNarrativeSystemEvent?.(key, value);
    };
    const vitalAliases = { 生命力: 'vitality', 生命值: 'vitality', 健康: 'vitality', health: 'vitality', 精力池: 'stamina_pool', 精力: 'stamina_pool', 体力: 'stamina_pool', stamina: 'stamina_pool', 饱食度: 'satiety', 饱食: 'satiety', 水分: 'hydration', 水合: 'hydration', 疲劳度: 'fatigue', 疲劳: 'fatigue', 精神稳定: 'mental_stability', 精神稳定度: 'mental_stability' };
    const appliedMetricKeys = new Set((entry.characterCardChanges || []).filter((item) => /^(情绪|感觉|临时情绪|临时感觉)$/u.test(item?.field || '')).map((item) => `${item.cardId || item.group || ''}:${item.field}:${item.name}`));
    const appliedVitalKeys = new Set((entry.characterCardChanges || []).filter((item) => item?.field === '生命体征').map((item) => `${item.cardId || item.group || ''}:vital:${vitalAliases[item.name] || item.name}`));
    const genericRows = (entry.genericUpdates || [])
      .filter((item) => {
        if (/^(emotion|feeling)$/u.test(item?.updateType || '')) {
          const name = this.leafName?.(item.field) || item.name || '';
          const fixedKeys = item.updateType === 'feeling' ? window.GameModules.metrics?.playerKeys : window.GameModules.metrics?.emotionKeys;
          const isTemporary = /(^|\.)temporary(\.|$)/u.test(item?.field || '') || item?.temporary === true || (Array.isArray(fixedKeys) && name && !fixedKeys.includes(name));
          const type = item.updateType === 'feeling' ? (isTemporary ? '临时感觉' : '感觉') : (isTemporary ? '临时情绪' : '情绪');
          const card = this.cardForChange(item, store);
          return !appliedMetricKeys.has(`${card.id || card.title || ''}:${type}:${name}`);
        }
        if (item?.updateType === 'vital') {
          const card = this.cardForChange(item, store);
          const key = this.vitalKeyFromField?.(item.field) || this.leafName?.(item.field) || item.name || '';
          return !appliedVitalKeys.has(`${card.id || card.title || ''}:vital:${key}`);
        }
        return true;
      })
      .filter(keepSystemUpdate)
      .map((item) => this.rowFromGeneric(item, store, entry));
    return [
      ...(entry.characterCardChanges || []).map((item) => {
        if (item?.field && !item?.updateType) {
          // 旧日志里可能直接塞了 characterSchedules 对象；走 UI 格式化，避免 JSON 原文。
          if (/characterSchedules?|人事安排/iu.test(String(item.field || item.name || ''))) {
            return this.rowFromSettlement(item, store, entry);
          }
          return this.decorateRow(this.normalizeSettlementCardRow(item, store));
        }
        return this.rowFromSettlement(item, store, entry);
      }),
      ...genericRows.map((row) => this.decorateRow(this.normalizeSettlementCardRow(row, store))),
    ].filter(Boolean);
  };

  registry.settlementUiBridgeInstalled = true;
}());
