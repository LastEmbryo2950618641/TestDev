window.GameModules = window.GameModules || {};

(function attachRoleCardEditor() {
  const actions = window.GameModules.predefinedRoleCardActions;
  if (!actions) return;

  const simpleFields = [
    ['id', 'ID', 'text'], ['name', '姓名', 'text'], ['gender', '性别', 'text'], ['age', '年龄', 'number'], ['birthday', '生日', 'date'],
    ['work', '所属世界', 'text'], ['role', '身份', 'text'], ['job', '职业', 'text'], ['rank', '等级/地位', 'text'],
    ['relationships', '人际关系', 'textarea'], ['detail', '人物说明', 'textarea'], ['appearance', '外貌', 'textarea'], ['preferences', '喜好', 'textarea'], ['personality', '性格', 'textarea'],
    ['roleCard', '角色卡标记', 'checkbox'], ['roleCardSource', '角色卡来源', 'text'], ['roleCardUpdatedAt', '更新时间', 'text'], ['isPlayer', '玩家本人', 'checkbox'],
  ];
  const jsonFields = [
    ['factions', '社群角色列表'], ['force_positions', '势力地位列表'], ['skills', '技能'],
    ['items', '物品'], ['wearing', '穿着'], ['roleCardFieldReasons', '角色卡字段原因'],
    ['rpgFieldReasons', 'RPG字段原因'], ['worldAttributes', '世界属性'],
  ];
  const pathLabels = {
    name: '名称', faction: '社群/势力', role: '角色', force: '势力', position: '地位/职位', reason: '原因', changeMode: '变化方式',
    desc: '说明', type: '类型', kind: '种类', quantity: '数量', equipSlots: '装备栏位', level: '等级', slot: '部位', description: '描述',
    key: '字段键', label: '字段名', source: '来源', fields: '字段列表', worldTag: '所属世界', value: '值', status: '状态',
  };
  const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

  actions.roleCardSimpleFields = function roleCardSimpleFields() {
    return simpleFields.map(([key, label, type]) => ({ key, label, type }));
  };

  actions.roleCardStructuredFields = function roleCardStructuredFields(card) {
    this.normalizePlayerSocialFields(card);
    return jsonFields.map(([key, label]) => ({ key, label, items: this.flattenRoleCardLeaves(card?.[key], []) }));
  };

  actions.normalizePlayerSocialFields = function normalizePlayerSocialFields(card) {
    if (!card?.isPlayer) return;
    if (!Array.isArray(card.factions) || !card.factions.length) {
      const faction = card.faction || card.workplace || '未记录社群';
      card.factions = [{ name: `${faction} / ${card.factionRole || card.role || '成员'}`, faction, role: card.factionRole || card.role || '成员', reason: card.roleCardFieldReasons?.社群角色 || '由玩家角色卡资料确定。', changeMode: '角色卡编辑' }];
    }
    if (!Array.isArray(card.force_positions) || !card.force_positions.length) {
      const force = card.workplace || card.faction || '未记录势力';
      card.force_positions = [{ name: `${force} / ${card.position || card.rank || '成员'}`, force, position: card.position || card.rank || '成员', reason: card.roleCardFieldReasons?.势力地位 || '由玩家角色卡资料确定。', changeMode: '角色卡编辑' }];
    }
  };

  actions.roleCardHasItems = function roleCardHasItems(field) {
    return Array.isArray(field?.items) && field.items.length > 0;
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

  actions.flattenRoleCardLeaves = function flattenRoleCardLeaves(value, path) {
    if (Array.isArray(value)) return value.flatMap((item, index) => this.flattenRoleCardLeaves(item, [...path, index]));
    if (value && typeof value === 'object') return Object.keys(value).flatMap((key) => this.flattenRoleCardLeaves(value[key], [...path, key]));
    return [{ path, label: this.roleCardPathLabel(path), valueType: typeof value, inputType: this.roleCardInputType(value), multiline: this.roleCardNeedsMultiline(value), value: value ?? '' }];
  };

  actions.roleCardInputType = function roleCardInputType(value) {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    return 'text';
  };

  actions.roleCardNeedsMultiline = function roleCardNeedsMultiline(value) {
    return typeof value === 'string' && value.length > 48;
  };

  actions.roleCardPathLabel = function roleCardPathLabel(path) {
    if (!path.length) return '值';
    return path.map((part) => (typeof part === 'number' ? `第${part + 1}项` : (pathLabels[part] || part))).join(' / ');
  };

  actions.roleCardLeafValue = function roleCardLeafValue(card, key, path) {
    let target = card?.[key];
    for (const part of path) target = target?.[part];
    return target ?? '';
  };

  actions.setRoleCardLeafValue = function setRoleCardLeafValue(card, key, path, value, valueType) {
    if (!card || !path.length) return;
    let target = card[key];
    for (let i = 0; i < path.length - 1; i += 1) target = target?.[path[i]];
    if (!target) return;
    const leaf = path[path.length - 1];
    if (valueType === 'number') target[leaf] = Number(value || 0);
    else if (valueType === 'boolean') target[leaf] = Boolean(value);
    else target[leaf] = value;
    this.syncEditedPlayerCard(card);
  };

  actions.roleCardMetricGroups = function roleCardMetricGroups(card) {
    if (!card || card.isPlayer) return [];
    this.ensureEditableRoleCardMetrics(card);
    return [
      { key: 'emotions', title: '情绪数值', items: card?.initialMetrics?.emotions || [] },
      { key: 'playerFeelings', title: '对玩家感情', items: card?.initialMetrics?.playerFeelings || [] },
    ];
  };

  actions.ensureEditableRoleCardMetrics = function ensureEditableRoleCardMetrics(card) {
    if (!card || card.isPlayer) return;
    const metrics = window.GameModules.metrics;
    card.initialMetrics = card.initialMetrics || {};
    card.initialMetrics.emotions = this.normalizeMetricList(card.initialMetrics.emotions, metrics.emotionKeys, metrics.defaults.emotions);
    card.initialMetrics.playerFeelings = this.normalizeMetricList(card.initialMetrics.playerFeelings, metrics.playerKeys, metrics.defaults.playerFeelings);
  };

  actions.normalizeMetricList = function normalizeMetricList(list, keys, defaults) {
    const byKey = new Map((Array.isArray(list) ? list : []).map((item) => [item?.key, item]));
    return keys.map((key) => {
      const item = byKey.get(key) || {};
      const sourceTool = window.GameModules.characterProfile;
      const metricSources = sourceTool?.metricSources?.(item, '系统') || { 数值: '系统', 解释: '系统', 原因: '系统' };
      return { key, value: window.GameModules.metrics.clamp(item.value ?? defaults[key] ?? 0), status: item.status || '', reason: item.reason || '', metricSources };
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
    this.normalizePlayerSocialFields(copied);
    this.ensureEditableRoleCardMetrics(copied);
    return copied;
  };
})();
