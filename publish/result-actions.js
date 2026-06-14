/**
 * AI 结果应用与数值回填。
 */
window.GameModules = window.GameModules || {};

window.GameModules.resultActions = {
  async applyResult(result, logId = null) {
    console.log('[回合流程] 应用AI结果:', { sceneTitle: result.sceneTitle, appearedCharacters: result.appearedCharacters?.length || 0, choices: result.choices?.length || 0 });
    this.sceneTitle = result.sceneTitle;
    this.mood = result.mood;
    this.trust = result.trust;
    this.resistance = result.resistance;
    this.quest = result.quest;
    this.updateFeedbackFromResult(result);
    this.choices = result.choices;
    this.applyMetricUpdates(result.metricUpdates);
    await this.applyLexiconUpdatesFromResult(result);
    await window.GameModules.entryTime.advance(this, result.elapsedSeconds || 60);
    this.advancePhoneTime?.(result.elapsedSeconds || 60);
    this.checkWorkReminder?.();
    await this.ensureRpgFromResults(result);
    await this.applyStatChanges(result.statChanges, result);
    await this.applyControlExperience(result);
    await window.GameModules.characterMemory.recordTurn(this, result);
    if (this.updateWorldlineFromTurn) this.updateWorldlineFromTurn(result).catch((err) => console.warn('[世界线] 回合更新跳过:', err.code, err.message));
    if (!this.finalizeNovelEntry(logId, result)) {
      const id = this.addNovelEntry(this.lastAction || '继续推进');
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
      console.log('[角色反馈] 剧情AI回填:', { mindLength: mind.length, intentLength: intent.length });
      return;
    }
    console.log('[角色反馈] 保留现有反馈:', { source: result.source, hasMind: Boolean(mind), currentSource: this.feedbackSource });
  },

  applyMetricUpdates(updates) {
    window.GameModules.metrics.apply(this, updates);
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  async applyLexiconUpdatesFromResult(result) {
    if (!Array.isArray(result.lexiconUpdates) || !result.lexiconUpdates.length) return;
    await window.GameModules.rpgLexicon.applyLexiconSkill(result.lexiconUpdates);
    await this.applyInventoryUpdatesToState?.(this.currentRpgState, result.lexiconUpdates);
    for (const item of result.lexiconUpdates) {
      if (item?.kind === '职业' && item?.name) await this.knowProfession?.(item.name, item.worldTag || this.character?.work, { sourceReason: item.reason || '剧情推演中出现并确认该职业', characterName: this.character?.name, role: this.character?.role, detail: item.description || item.summary || this.character?.detail });
    }
  },

  applyInitialMetrics(updates) {
    window.GameModules.metrics.applyInitial(this, updates);
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  loadMetricsFromCharacterState(state = this.characterRpgState) {
    const metrics = this.ensureStateMetrics(state);
    this.emotions = { ...metrics.emotions };
    this.playerFeelings = { ...metrics.playerFeelings };
    this.metricNotes = { ...(metrics.notes || {}) };
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  syncMetricDerived() {
    this.trust = this.playerFeelings.信任;
    this.resistance = this.playerFeelings.反抗;
    this.mood = Object.entries(this.emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || this.mood;
  },

  async applyStatChanges(changes, result = {}) {
    const state = this.characterRpgState;
    if (!state?.values) return;
    window.GameModules.progression.applySceneChanges(state, changes, result);
    window.GameModules.rpgInitializer?.touch(state.values, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },

  async applyControlExperience(result) {
    if (!this.online || this.controlMode !== 'possess') return;
    const state = this.characterRpgState;
    if (!state?.values) return;
    const exp = state.values.control_experience || { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '', lastUpdated: '' };
    exp.onlineCount = Math.max(0, Number(exp.onlineCount) || 0);
    exp.feeling = result.controlFeeling || exp.feeling || '疑惑';
    exp.adaptation = Math.max(0, Math.min(100, Math.round(Number(result.controlAdaptation ?? exp.adaptation) || 0)));
    exp.summary = result.controlExperienceSummary || exp.summary || '';
    exp.lastUpdated = new Date().toISOString();
    state.values.control_experience = exp;
    window.GameModules.rpgInitializer?.touch(state.values, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },
};
