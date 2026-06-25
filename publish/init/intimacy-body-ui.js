window.GameModules = window.GameModules || {};

window.GameModules.initPromptRegistry?.registerUi?.('intimacyBody', {
  sectionTitle: '身体状态',
  afterSection: '身份信息',
  bodyStatusUpdateType: 'body-status',
  fieldKeys: ['bodyStatus'],
  row(field = {}, item = null) {
    if (item && item.type === '当前身体状态') {
      if (item.pendingAiInit) return { field: '身体状态', name: item.part || item.partKey || '', value: '待AI初始化｜当前为模板占位', detailLines: ['尚未经过现实推演AI初始化', '占位值不作为真实原始值'] };
      const updateUi = window.GameModules.updateRegistry?.uiForChange?.({ updateType: this.bodyStatusUpdateType });
      const value = { part: item.part, partKey: item.partKey, status: item.status, description: item.description || item['描述状态'] };
      if (typeof updateUi?.row === 'function') return updateUi.row({ updateType: this.bodyStatusUpdateType, field: `bodyStatus.${item.partKey || 'overall'}`, change: { value }, reasons: [{ trigger: item.reason || '初始化身体状态', confidence: 'initial' }] }, null, { name: item.part || item.partKey || '' });
    }
    return { field: field.label || '身体状态', name: item?.name || field.label || '', value: item ? window.GameModules.rpgFieldUi?.rpgItemSummary?.(item) : field.value };
  },
});
