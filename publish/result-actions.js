/**
 * AI 缁撴灉搴旂敤涓庢暟鍊煎洖濉€?
 */
window.GameModules = window.GameModules || {};

window.GameModules.resultActions = {
  async applyResult(result, logId = null) {
    console.log('[鍥炲悎娴佺▼] 搴旂敤AI缁撴灉:', { sceneTitle: result.sceneTitle, appearedCharacters: result.appearedCharacters?.length || 0, choices: result.choices?.length || 0 });
    this.sceneTitle = result.sceneTitle;
    this.mood = result.mood;
    this.trust = result.trust;
    this.resistance = result.resistance;
    this.quest = result.quest;
    this.updateFeedbackFromResult(result);
    this.choices = result.choices;
    this.applyMetricUpdates(result.metricUpdates);
    await this.applyLexiconUpdatesFromResult(result);
    const genericApplied = await this.applyGenericUpdatesFromResult(result);
    if (genericApplied.length) result.characterCardChanges = [...(result.characterCardChanges || []), ...genericApplied];
    await window.GameModules.entryTime.advance(this, result.elapsedSeconds || 60);
    this.advancePhoneTime?.(result.elapsedSeconds || 60);
    this.checkWorkReminder?.();
    await this.ensureRpgFromResults(result);
    await this.applyStatChanges(result.statChanges, result);
    await this.applyControlExperience(result);
    await this.refreshControlLinkStates?.();
    await window.GameModules.characterMemory?.recordTurn?.(this, result);
    if (this.updateWorldlineFromTurn) this.updateWorldlineFromTurn(result).catch((err) => console.warn('[涓栫晫绾縘 鍥炲悎鏇存柊璺宠繃:', err.code, err.message));
    if (!this.finalizeNovelEntry(logId, result)) {
      const id = this.addNovelEntry(this.lastAction || '缁х画鎺ㄨ繘');
      this.finalizeNovelEntry(id, result);
    }
  },

  updateFeedbackFromResult(result) {
    const mind = String(result.mind || '').trim();
    const intent = String(result.characterIntent || '').trim();
    if (result.source === 'ai' && (mind || intent)) {
      this.mindText = mind || this.mindText;
      this.characterIntent = intent || this.characterIntent;
      this.feedbackSource = 'ai';
      console.debug('[瑙掕壊鍙嶉] 鍓ф儏AI鍥炲～:', { mindLength: mind.length, intentLength: intent.length });
      return;
    }
    console.debug('[瑙掕壊鍙嶉] 淇濈暀鐜版湁鍙嶉:', { source: result.source, hasMind: Boolean(mind), currentSource: this.feedbackSource });
  },

  applyMetricUpdates(updates) {
    window.GameModules.metrics.apply(this, updates);
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  async applyLexiconUpdatesFromResult(result) {
    if (!Array.isArray(result.lexiconUpdates) || !result.lexiconUpdates.length) return;
    const cardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(this.currentRpgState, result.lexiconUpdates) || [];
    result.characterCardChanges = cardChanges;
    await window.GameModules.rpgLexicon.applyLexiconSkill(result.lexiconUpdates.filter((item) => item?.kind !== '瑙掕壊鍗' && item?.kind !== '瑙掕壊鎶€鑳'));
    await this.applyInventoryUpdatesToState?.(this.currentRpgState, result.lexiconUpdates);
    for (const item of result.lexiconUpdates) {
      if (item?.kind === '鑱屼笟' && item?.name) await this.knowProfession?.(item.name, item.worldTag || this.character?.work, { sourceReason: item.reason || '鍓ф儏鎺ㄦ紨涓嚭鐜板苟纭璇ヨ亴涓', characterName: this.character?.name, role: this.character?.role, detail: item.description || item.summary || this.character?.detail });
    }
  },

  async applyGenericUpdatesFromResult(result = {}) {
    let updates = Array.isArray(result.genericUpdates) ? result.genericUpdates : [];
    updates = window.GameModules.orgTerritory?.filterUpdatesForStoryWorld?.(updates, this) || updates;
    if (!updates.length) return [];
    await window.GameModules.updateRegistry?.applyGeneric?.(this, updates);
    return updates.map((item) => {
      const subject = item.subject || {};
      const field = item.field || item.updateType || '鐘舵€';
      const value = item.change?.value ?? item.value ?? '';
      return `瑙掕壊鍗★細${subject.name || subject.id || this.character?.name || '鐩爣'} ${field} 宸叉洿鏂${value && typeof value !== 'object' ? `（${value}）` : ''}`;
    });
  },

  applyInitialMetrics(updates) {
    this.temporaryEmotions = {};
    this.temporaryPlayerFeelings = {};
    window.GameModules.metrics.applyInitial(this, updates);
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  async applyMetricUpdatesToState(state, updates) {
    if (!state?.id) return;
    const metrics = this.ensureStateMetrics(state);
    Object.keys(metrics.temporaryEmotions).forEach((key) => { metrics.temporaryEmotions[key] = Math.max(0, window.GameModules.metrics.clamp(metrics.temporaryEmotions[key]) - 1); });
    Object.keys(metrics.temporaryPlayerFeelings).forEach((key) => { metrics.temporaryPlayerFeelings[key] = Math.max(0, window.GameModules.metrics.clamp(metrics.temporaryPlayerFeelings[key]) - 1); });
    window.GameModules.metrics.applyGroup(metrics.emotions, updates?.emotions, metrics.notes, 'emotion', metrics.temporaryEmotions);
    window.GameModules.metrics.applyGroup(metrics.playerFeelings, updates?.playerFeelings, metrics.notes, 'player', metrics.temporaryPlayerFeelings);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    if (state.id === this.character?.id) this.loadMetricsFromCharacterState(state);
    await window.GameModules.characterStateStore?.save?.(state);
  },

  loadMetricsFromCharacterState(state = this.characterRpgState) {
    if (!state) {
      window.GameModules.metrics.ensure?.(this);
      this.metricNotes = { ...(this.metricNotes || {}) };
      this.metricsReady = true;
      this.syncMetricDerived();
      return;
    }
    const metrics = this.ensureStateMetrics(state);
    this.emotions = { ...metrics.emotions };
    this.playerFeelings = { ...metrics.playerFeelings };
    this.temporaryEmotions = { ...(metrics.temporaryEmotions || {}) };
    this.temporaryPlayerFeelings = { ...(metrics.temporaryPlayerFeelings || {}) };
    this.metricNotes = { ...(metrics.notes || {}) };
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  syncMetricDerived() {
    this.trust = this.playerFeelings['淇′换'];
    this.resistance = this.playerFeelings['鍙嶆姉'];
    this.mood = Object.entries(this.emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || this.mood;
  },

  async applyStatChanges(changes, result = {}) {
    const state = this.characterRpgState;
    if (!state?.values) return;
    window.GameModules.progression.applySceneChanges(state, changes, result);
    window.GameModules.rpgInitializer?.touch(state.values, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.characterStateStore?.save?.(state);
  },

  async applyControlExperience(result) {
    if (!this.online || this.controlMode !== 'possess') return;
    const state = this.characterRpgState;
    if (!state?.values) return;
    const exp = state.values.control_experience || { onlineCount: 0, feeling: '鏈煡', adaptation: 0, summary: '', lastUpdated: '' };
    exp.onlineCount = Math.max(0, Number(exp.onlineCount) || 0);
    exp.feeling = result.controlFeeling || exp.feeling || '鐤戞儜';
    exp.adaptation = Math.max(0, Math.min(100, Math.round(Number(result.controlAdaptation ?? exp.adaptation) || 0)));
    exp.summary = result.controlExperienceSummary || exp.summary || '';
    exp.lastUpdated = new Date().toISOString();
    state.values.control_experience = exp;
    window.GameModules.rpgInitializer?.touch(state.values, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.characterStateStore?.save?.(state);
  },
};
