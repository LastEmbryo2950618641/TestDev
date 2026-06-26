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
    const name = isPlayer ? (this.realWorldLocationName || this.realWorldMap?.current || '现实当前位置') : (state.values.current_location?.name || this.sceneTitle || '原世界当前位置未知');
    state.values.current_location = {
      name,
      worldTag: isPlayer ? realWorld : (state.worldTag || state.profile?.work || '未知世界'),
      updatedAt: this.phoneDateText?.() || '',
      reason: reason || (isPlayer ? '玩家现实当前位置。' : '角色当前位置登记。'),
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
    const explicitExperienced = /非处女|非童贞|已破身|有经验|已有经历/.test(status);
    const explicitNone = /^(处女|童贞|未经历|无经验)$/.test(status.trim());
    return explicitExperienced || (!explicitNone && Boolean(status) && !/处女|童贞|未经历|无经验/.test(status)) || hasPlayer;
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
      this.realWorldOpen = true;
      this.desktopUnlocked = false;
      this.controlSelectOpen = false;
      await this.save?.();
      return;
    }
    await this.connectControlRole(id);
  },

  sharedControlState() { return this.sharedControlActive ? this.rpgStates?.[this.sharedControlTargetId] || null : null; },
  realWorldDisplayState() { return this.sharedControlState?.() || this.playerIdentityState?.(); },
  realWorldDisplayCharacter() { return this.sharedControlState?.()?.profile || this.playerDisplayCharacter?.(); },
};
