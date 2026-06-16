window.GameModules = window.GameModules || {};

(function attachRoleCardEditor() {
  const actions = window.GameModules.predefinedRoleCardActions;
  if (!actions) return;

  const simpleFields = [
    ['id', 'ID', 'text'], ['name', '姓名', 'text'], ['gender', '性别', 'text'], ['age', '年龄', 'number'], ['birthday', '生日', 'date'],
    ['work', '所属世界', 'text'], ['role', '身份', 'text'], ['job', '职业', 'text'], ['rank', '等级/地位', 'text'],
    ['faction', '社群/势力', 'text'], ['factionRole', '社群角色', 'text'], ['workplace', '工作/活动地点', 'text'], ['position', '职位/地位', 'text'],
    ['relationships', '人际关系', 'textarea'], ['detail', '人物说明', 'textarea'], ['appearance', '外貌', 'textarea'], ['personality', '性格', 'textarea'],
    ['roleCard', '角色卡标记', 'checkbox'], ['roleCardSource', '角色卡来源', 'text'], ['roleCardUpdatedAt', '更新时间', 'text'], ['isPlayer', '玩家本人', 'checkbox'],
  ];
  const jsonFields = [
    ['factions', '社群角色列表'], ['forcePositions', '势力地位列表'], ['force_positions', '势力地位兼容列表'], ['skills', '技能'],
    ['equipment', '装备'], ['items', '物品'], ['wearing', '穿着'], ['roleCardFieldReasons', '角色卡字段原因'],
    ['rpgFieldReasons', 'RPG字段原因'], ['worldAttributes', '世界属性'],
  ];
  const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

  actions.roleCardSimpleFields = function roleCardSimpleFields() {
    return simpleFields.map(([key, label, type]) => ({ key, label, type }));
  };

  actions.roleCardJsonFields = function roleCardJsonFields() {
    return jsonFields.map(([key, label]) => ({ key, label }));
  };

  actions.roleCardFieldValue = function roleCardFieldValue(card, key) {
    return card?.[key] ?? (key === 'roleCard' || key === 'isPlayer' ? false : '');
  };

  actions.setRoleCardField = function setRoleCardField(card, key, value) {
    if (!card) return;
    const oldName = card.name;
    card[key] = key === 'age' ? Number(value || 0) : value;
    if (key === 'name' && oldName && oldName !== value) this.renameRoleCardReferences(oldName, value);
    this.syncEditedPlayerCard(card);
  };

  actions.roleCardJsonText = function roleCardJsonText(card, key) {
    try { return JSON.stringify(card?.[key] ?? null, null, 2); } catch (_) { return 'null'; }
  };

  actions.setRoleCardJsonField = function setRoleCardJsonField(card, key, raw) {
    if (!card) return;
    try {
      card[key] = JSON.parse(raw || 'null');
      this.setupError = '';
      this.syncEditedPlayerCard(card);
    } catch (err) {
      this.setupError = `${key} 不是合法 JSON：${err.message}`;
      console.warn('[预定义角色卡] JSON字段编辑失败:', key, err.message, err.stack);
    }
  };

  actions.roleCardMetricGroups = function roleCardMetricGroups(card) {
    this.ensureEditableRoleCardMetrics(card);
    return [
      { key: 'emotions', title: '情绪数值', items: card?.initialMetrics?.emotions || [] },
      { key: 'playerFeelings', title: '对玩家感情', items: card?.initialMetrics?.playerFeelings || [] },
    ];
  };

  actions.ensureEditableRoleCardMetrics = function ensureEditableRoleCardMetrics(card) {
    if (!card) return;
    const metrics = window.GameModules.metrics;
    card.initialMetrics = card.initialMetrics || {};
    card.initialMetrics.emotions = this.normalizeMetricList(card.initialMetrics.emotions, metrics.emotionKeys, metrics.defaults.emotions);
    card.initialMetrics.playerFeelings = this.normalizeMetricList(card.initialMetrics.playerFeelings, metrics.playerKeys, metrics.defaults.playerFeelings);
  };

  actions.normalizeMetricList = function normalizeMetricList(list, keys, defaults) {
    const byKey = new Map((Array.isArray(list) ? list : []).map((item) => [item?.key, item]));
    return keys.map((key) => {
      const item = byKey.get(key) || {};
      return { key, value: window.GameModules.metrics.clamp(item.value ?? defaults[key] ?? 0), status: item.status || '', reason: item.reason || '' };
    });
  };

  actions.renameRoleCardReferences = function renameRoleCardReferences(oldName, newName) {
    if (this.roleCardSetup.selectedPlayerName === oldName) this.roleCardSetup.selectedPlayerName = newName;
    this.roleCardSetup.selectedRelationNames = (this.roleCardSetup.selectedRelationNames || []).map((name) => (name === oldName ? newName : name));
    if (this.roleCardSetup.selectedRelationCardName === oldName) this.roleCardSetup.selectedRelationCardName = newName;
    if (this.roleCardSetup.relationRoles?.[oldName]) {
      this.roleCardSetup.relationRoles[newName] = this.roleCardSetup.relationRoles[oldName];
      delete this.roleCardSetup.relationRoles[oldName];
    }
  };

  actions.syncEditedPlayerCard = function syncEditedPlayerCard(card) {
    if (!card || card.name !== this.roleCardSetup.selectedPlayerName) return;
    this.playerProfile = window.GameModules.predefinedRoleCards.playerProfileFromCard(card, this.playerProfile || {});
    this.applySelectedRelationshipRoleCards?.();
  };

  actions.cloneRoleCardForEditing = function cloneRoleCardForEditing(card) {
    const copied = clone(card);
    this.ensureEditableRoleCardMetrics(copied);
    return copied;
  };
})();
