window.GameModules = window.GameModules || {};

window.GameModules.rpgActions = {
  normalizeRpgCharacterSource(character = null) {
    const current = character || this.character || {};
    const id = String(current.id || current.characterId || current.name || '').trim();
    const name = String(current.name || current.displayName || id || 'unknown-character').trim();
    const work = current.work || current.worldTag || this.character?.work || this.selectedWork || '原创世界';
    return { ...current, id: id || name, name, work };
  },

  async ensureRpgProfileForCharacter(source, context = '', options = {}) {
    if (source?.roleCard && options.refresh !== true && source.forceRoleCardRegenerate !== true) return source;
    if (options.useRawProfile === true) return source;
    try {
      return await window.GameModules.characterProfile.ensure(source, this, context);
    } catch (err) {
      console.warn('[RPG actions] role card generation unavailable, using source profile:', err?.message || err);
      this.failRoleCardLoading?.(source.id, err?.message || 'role card generation failed');
      return source;
    }
  },

  async ensureRpgForCharacter(character = null, context = '', options = {}) {
    const source = this.normalizeRpgCharacterSource(character);
    const loadingId = source.id || source.name;
    this.updateRoleCardLoading?.(loadingId, { status: 'running', startedAt: Date.now(), finishedAt: 0 });
    this.updateRoleCardLoadingStep?.(loadingId, 'state', 'running');
    const profile = await this.ensureRpgProfileForCharacter(source, context, options);
    const state = await window.GameModules.rpgState.ensureCharacter(profile, this);
    this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
    this.rpgPanelCharacterId = state.id;
    if (options.loadMetrics !== false && state.id === this.character?.id) this.loadMetricsFromCharacterState?.(state);
    await window.GameModules.characterStateStore?.save?.(state);
    this.updateRoleCardLoadingStep?.(loadingId, 'state', 'done');
    this.finishRoleCardLoading?.(loadingId, state.profile || profile);
    return state;
  },

  async ensureRpgForCurrentCharacter(options = {}) {
    const current = this.normalizeRpgCharacterSource(this.character);
    const context = options.context || this.entryCurrentAction || this.entryTimeLabel?.() || this.sceneTitle || '';
    return await this.ensureRpgForCharacter(current, context, { ...options, loadMetrics: options.loadMetrics !== false });
  },

  async ensureRpgFromResults(result = {}) {
    const current = await this.ensureRpgForCurrentCharacter({ useRawProfile: true, loadMetrics: false });
    const cards = await this.collectSolidifiableCharacters?.(result, 'story');
    if (Array.isArray(cards) && cards.length) {
      this.solidifyState = {
        ...(this.solidifyState || {}),
        candidates: cards,
        selectedKey: this.solidifyState?.selectedKey || this.solidifyKey?.(cards[0]) || '',
      };
    }
    return current;
  },

  async ensurePlayerRpgState(refresh = false, loadMetrics = false, overrideSource = null) {
    const existing = this.playerIdentityState?.();
    if (existing && !refresh && !overrideSource?.forceRoleCardRegenerate) {
      const changed = this.syncPlayerSocialFields?.(existing) || false;
      if (changed) await window.GameModules.characterStateStore?.save?.(existing);
      return existing;
    }
    const source = overrideSource || this.playerCharacterBase?.() || { id: 'player-self', name: this.playerName || 'player-self', isPlayer: true };
    const context = this.playerSetupSummary?.() || this.playerProfile?.notes || '';
    const state = await this.ensureRpgForCharacter(
      { ...source, id: 'player-self', isPlayer: true },
      context,
      { refresh, loadMetrics, useRawProfile: overrideSource?.useRawProfile === true }
    );
    this.syncPlayerSocialFields?.(state);
    this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
    await window.GameModules.characterStateStore?.save?.(state);
    return state;
  },

  loadSavedRpgStates() {
    const list = window.GameModules.characterStateStore?.list?.() || [];
    const next = { ...(this.rpgStates || {}) };
    list.forEach((state) => {
      if (state?.id) next[state.id] = state;
    });
    this.rpgStates = next;
    this.rpgPanelCharacterId = this.rpgPanelCharacterId || this.selectedCharacterId || this.character?.id || '';
    return next;
  },
};
