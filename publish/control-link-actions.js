window.GameModules = window.GameModules || {};

window.GameModules.controlLinkActions = {
  controlLinkMetricKeys: ['好感', '信任', '依赖', '爱情', '亲情', '友情', '肉欲', '服从'],

  controlLinkState(idOrState) {
    const id = typeof idOrState === 'string' ? idOrState : idOrState?.id;
    return id ? this.rpgStates?.[id] : idOrState;
  },

  controlLinkId(item = {}) { return item.character?.id || item.state?.id || item.id || ''; },

  controlLinkLocationText(state = null) {
    const location = state?.values?.current_location;
    if (typeof location === 'string') return location;
    if (location?.name) return `${location.name}${location.worldTag ? `｜${location.worldTag}` : ''}`;
    return '当前位置未登记';
  },

  ensureControlRoleLocation(state = null, reason = '') {
    if (!state?.values) return false;
    const before = JSON.stringify(state.values.current_location || null);
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const isPlayer = state.id === 'player-self';
    const invalid = window.GameModules.rpgState?.isInvalidLocationName?.bind(window.GameModules.rpgState) || ((name) => !String(name || '').trim());
    const currentName = typeof state.values.current_location === 'string' ? state.values.current_location : state.values.current_location?.name;
    const fallback = isPlayer ? (this.realWorldLocationName || this.realWorldMap?.current || '现实当前位置') : '当前位置未知';
    const name = invalid(currentName) ? fallback : currentName;
    state.values.current_location = {
      name,
      worldTag: isPlayer ? realWorld : (state.worldTag || state.profile?.work || '未知世界'),
      updatedAt: this.phoneDateText?.() || '',
      reason: reason || (isPlayer ? '玩家现实当前位置。' : '角色当前位置登记；具体地点不足时保持未知。'),
    };
    const section = (state.schema?.sections || []).find((item) => item.title === '身份信息' || item.fields?.some((field) => field.key === 'world_tag')) || state.schema?.sections?.[0];
    if (section && !section.fields.some((field) => field.key === 'current_location')) section.fields.push({ key: 'current_location', label: '当前所在位置', type: 'text', desc: '用于避免同一人物同时出现在两个地点。' });
    return before !== JSON.stringify(state.values.current_location || null);
  },

  controlLinkHasHighMetric(state = null) {
    const feelings = state?.metrics?.playerFeelings || {};
    return this.controlLinkMetricKeys.some((key) => Number(feelings[key]) >= 90);
  },

  controlLinkHasPlayerIntimacy(state = null) {
    const intimacy = state?.values?.intimacy || {};
    const status = String(intimacy.sexualStatus || intimacy.status || '');
    const partnerText = JSON.stringify([intimacy.sexualPartners, intimacy.partners, intimacy.experiencePeople, intimacy.historyPeople]);
    const names = [this.playerProfile?.name, this.playerName, '玩家', 'player-self'].filter(Boolean);
    const hasPlayer = names.some((name) => partnerText.includes(String(name)));
    const explicitExperienced = /非处女|非童贞|非童真|已破身|破身|有经验|已有经历/.test(status);
    return explicitExperienced || hasPlayer;
  },

  isControlRoleLinked(state = null) {
    const target = this.controlLinkState(state);
    if (!target || target.id === 'player-self') return false;
    return Boolean(target.values?.control_link?.linked || (this.controlLinkHasHighMetric(target) && this.controlLinkHasPlayerIntimacy(target)));
  },

  async refreshControlLinkStates() {
    const save = window.GameModules.sqliteSave;
    for (const state of Object.values(this.rpgStates || {})) {
      if (!state?.values) continue;
      let changed = this.ensureControlRoleLocation(state);
      if (state.id !== 'player-self') {
        const linked = this.controlLinkHasHighMetric(state) && this.controlLinkHasPlayerIntimacy(state);
        const before = JSON.stringify(state.values.control_link || null);
        state.values.control_link = { ...(state.values.control_link || {}), linked, checkedAt: this.phoneDateText?.() || '', reason: linked ? '关系与经历条件已达成。' : '链接条件未达成。' };
        changed = changed || before !== JSON.stringify(state.values.control_link || null);
      }
      if (changed) await save.saveCharacterState?.(state);
    }
  },

  toggleControlLinkMenu(id) {
    if (!id || this.busy) return;
    this.controlLinkMenuId = this.controlLinkMenuId === id ? '' : id;
  },

  isSameWorldControlTarget(state = null) {
    const target = this.controlLinkState(state);
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const world = target?.values?.current_location?.worldTag || target?.worldTag || target?.profile?.work || '';
    return Boolean(target && (world === realWorld || /现实|现代都市|2026/.test(world)));
  },

  async summonControlRole(id) {
    const state = this.controlLinkState(id);
    if (!state || !this.isControlRoleLinked(state)) return;
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    state.values.current_location = { name: this.realWorldLocationName || this.realWorldMap?.current || '玩家面前', worldTag: realWorld, updatedAt: this.phoneDateText?.() || '', reason: '被玩家通过链接召唤到现实当前位置，原地点自然消失。' };
    state.values.control_link = { ...(state.values.control_link || {}), linked: true, summoned: true, lastAction: '召唤', checkedAt: this.phoneDateText?.() || '' };
    await window.GameModules.sqliteSave.saveCharacterState?.(state);
    this.controlLinkMenuId = '';
    this.realWorldLog = [...(this.realWorldLog || []), { id: `summon-${Date.now()}`, type: 'system', text: `${state.name || state.profile?.name || '目标'}已被召唤到你面前。异世界与现实世界相对停止，不会同步推进。`, time: this.phoneTimeText?.() || '' }];
    await window.GameModules.sqliteSave.saveRealWorldLogEntries?.(this.realWorldLog);
    await this.save?.();
  },

  async onlineControlRole(id) {
    const state = this.controlLinkState(id);
    this.controlLinkMenuId = '';
    if (state && this.isSameWorldControlTarget(state)) {
      this.sharedControlTargetId = state.id;
      this.sharedControlActive = true;
      state.values.control_link = { ...(state.values.control_link || {}), linked: true, lastAction: '上线附身控制', checkedAt: this.phoneDateText?.() || '' };
      await window.GameModules.sqliteSave.saveCharacterState?.(state);
      this.realWorldOpen = true;
      this.desktopUnlocked = false;
      this.controlSelectOpen = false;
      this.realWorldLog = [...(this.realWorldLog || []), { id: `possess-${Date.now()}`, type: 'system', text: `你已上线附身控制${state.name || state.profile?.name || '目标'}。慎二的意识可以一心二用，同时控制自己的现实本体与被控者身体，并同时感受两个肉体的全部感官；被控者无法控制身体，但意识清醒，能感觉自己身体的所有反馈。后续正文会以你在被控者身体内的附身视角为主，同时保留被控者的内心想法与感受。玩家没有明确指定慎二本体、现实身体、外部的我或其他执行者时，所有身体行动都默认由被控者身体亲自执行。`, time: this.phoneTimeText?.() || '' }];
      await window.GameModules.sqliteSave.saveRealWorldLogEntries?.(this.realWorldLog);
      await this.save?.();
      return;
    }
    await this.connectControlRole(id);
  },

  sharedControlOfflineNarration(state = null) {
    const name = state?.name || state?.profile?.name || '被控制者';
    return `你意识从${name}的肉体深处缓缓抽离，原本重叠在一起的呼吸、心跳、触感和视野像退潮一样分开。那具身体短暂地停顿了一瞬，随后控制权重新回到${name}自己的意识里；你仍能记得刚才附身时残留的感官余温，却已经不再驱使她的手脚。`;
  },

  async appendSharedControlSystemNarration(text = '', state = null) {
    const now = this.phoneDate?.() || new Date();
    const entry = {
      id: `real-system-offline-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'ai',
      systemGenerated: true,
      narration: String(text || '').trim(),
      sceneTitle: this.realWorldSceneTitle || '现实世界',
      locationName: this.realWorldLocationName || this.realWorldMap?.current || '',
      status: this.realWorldStatus || '',
      quest: this.realWorldQuest || '',
      choices: Array.isArray(this.realWorldChoices) ? this.realWorldChoices : [],
      characterCardChanges: [],
      genericUpdates: [],
      thinking: '',
      thinkingSections: [],
      streamTrace: [],
      agentTrace: [],
      promptPack: null,
      streaming: false,
      time: { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), iso: now.toISOString() },
      createdAt: now.toISOString(),
      controlledCharacterId: state?.id || '',
      controlledCharacterName: state?.name || state?.profile?.name || '',
    };
    await this.assignRealWorldlineEntry?.(entry);
    await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry);
    this.realWorldLog = this.normalizeRealWorldLog?.([...(this.realWorldLog || []), entry]).slice(-Math.max(1, Number(this.realWorldLogPageSize) || 12)) || [...(this.realWorldLog || []), entry];
    this.realWorldLogTotal = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || Math.max(this.realWorldLogTotal || 0, this.realWorldLog.length);
    this.refreshRealWorldLogPage?.(this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1);
    this.scrollRealWorldLogBottom?.();
    return entry;
  },

  async offlineSharedControlRole() {
    const state = this.sharedControlState?.();
    if (!state || this.realWorldBusy) return;
    this.realWorldFunctionOpen = false;
    this.realWorldFunctionView = 'menu';
    const narration = this.sharedControlOfflineNarration(state);
    await this.appendSharedControlSystemNarration(narration, state);
    this.sharedControlActive = false;
    state.values = state.values || {};
    state.values.control_link = {
      ...(state.values.control_link || {}),
      linked: true,
      lastAction: '下线交还控制权',
      checkedAt: this.phoneDateText?.() || '',
      offlineNarration: narration,
    };
    await window.GameModules.sqliteSave.saveCharacterState?.(state);
    await this.refreshControlLinkStates?.();
    await this.save?.();
  },

  sharedControlState() { return this.activeControlTargetState?.() || null; },
  sharedControlLabel() { return this.sharedControlState?.() ? '附身控制中' : ''; },
  realWorldDisplayState() { return this.sharedControlState?.() || this.playerIdentityState?.(); },
  realWorldDisplayCharacter() { return this.sharedControlState?.()?.profile || this.playerDisplayCharacter?.(); },
};
