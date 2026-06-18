window.GameModules = window.GameModules || {};

window.GameModules.promptSections = {
  value(value, fallback = '未填写') {
    const text = String(value ?? '').trim();
    return text || fallback;
  },

  lines(rows) {
    return rows.map(([label, value]) => `- ${label}：${this.value(value)}`).join('\n');
  },

  playerProfile(store) {
    const p = store?.playerProfile || {};
    const factions = this.knownFactions(store);
    return {
      playerBasic: this.lines([
        ['姓名', p.name || store?.playerName], ['性别', p.gender], ['生日', p.birthday], ['年龄', p.age],
      ]),
      playerIdentity: this.lines([
        ['现实身份', p.refinedRole || p.dailyRole], ['工作/学校/组织', p.workplace], ['地位/岗位/年级', p.position], ['已知势力库', factions], ['世界观补全', p.worldbuildingNote || '无'],
      ]),
      playerHome: this.lines([
        ['具体地址', p.refinedCity || p.city], ['居住状态', p.refinedLivingStatus || p.livingStatus], ['父母状态', p.parentStatus || p.parents], ['父母去世原因', p.parentDeathCause || '无'],
      ]),
      playerRelations: this.playerRelationshipLines(store),
      playerNotes: this.lines([
        ['补充设定/备注', p.notes || '无'],
      ]),
    };
  },

  playerRelationshipLines(store) {
    if (typeof store?.relationshipEntriesPrompt === 'function') return store.relationshipEntriesPrompt();
    const p = store?.playerProfile || {};
    if (Array.isArray(p.relationshipEntries) && p.relationshipEntries.length) {
      return p.relationshipEntries.map((entry, index) => [
        `关系${index + 1}`,
        `关系名=${entry?.relation || '未填写'}`,
        `姓名=${entry?.name || '未填写'}`,
        `设定=${entry?.detail || '无'}`,
      ].join('；')).join('\n');
    }
    return this.lines([['人际关系', p.relationships]]);
  },

  characterBase(base) {
    return this.lines([
      ['候选姓名', base.name], ['候选性别', base.gender], ['候选年龄', base.age], ['身份/关系/叙事定位', base.role], ['人物背景摘要', base.detail],
      ['外貌线索', base.appearance], ['性格线索', base.personality], ['所属作品或世界', base.work], ['命名要求', base.nameRule], ['已整理关系', base.relationships],
    ]);
  },

  relationContext(context) {
    return String(context || '暂无').trim() || '暂无';
  },

  worldLore(lore) {
    return this.lines([
      ['世界背景', lore?.background], ['势力', (lore?.factions || []).map((x) => x.name).join('、') || '无'],
      ['特殊职业', (lore?.specialJobs || []).map((x) => x.name).join('、') || '无'], ['职业等级', (lore?.jobRanks || []).join('、') || '无'],
    ]);
  },

  worldFields(attrs) {
    return (attrs?.fields || []).map((x) => `${x.key}(${x.label}:${x.type})`).join('、') || '无';
  },

  knownFactions(store) {
    const list = store?.factionState?.factions || [];
    return list.map((x) => `${x.name}(${x.type}/${x.level})`).join('、') || '未初始化';
  },

  stateSnapshot(store, state = null) {
    const metrics = state ? store?.ensureStateMetrics?.(state) : { emotions: store?.emotions, playerFeelings: store?.playerFeelings };
    const wearing = store?.wearingItems?.(state || store?.inventoryTargetState?.()) || [];
    return this.lines([
      ['已有情绪', JSON.stringify(metrics?.emotions || {})],
      ['已有对玩家感觉', JSON.stringify(metrics?.playerFeelings || {})],
      ['已有穿着', wearing.map((item) => `${item.slot}:${item.name || '未穿戴'}`).join('、') || '无'],
    ]);
  },

  wechatContact(contact, hint) {
    return this.lines([
      ['微信关系', contact?.relation || '联系人'], ['联系人当前名称', contact?.name], ['是否需要 AI 命名', contact?.needsNameAi ? '是' : '否'],
      ['命名要求', hint?.nameRule], ['补充上下文', contact?.context || contact?.latest],
    ]);
  },
};
