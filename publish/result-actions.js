/**
 * AI 结果应用与数值回填。
 */
window.GameModules = window.GameModules || {};

window.GameModules.resultActions = {
  async applyResult(result, logId = null) {
    console.log('[回合流程] 应用AI结果:', { sceneTitle: result.sceneTitle, appearedCharacters: result.appearedCharacters?.length || 0, choices: result.choices?.length || 0 });
    await this.ensureRpgFromResults(result);
    this.sceneTitle = result.sceneTitle;
    this.mood = result.mood;
    this.trust = result.trust;
    this.resistance = result.resistance;
    this.quest = result.quest;
    this.characterIntent = result.characterIntent || this.characterIntent;
    this.choices = result.choices;
    this.mindText = result.mind;
    await this.applyStatChanges(result.statChanges, result);
    this.applyMetricUpdates(result.metricUpdates);
    await this.applyControlExperience(result);
    await window.GameModules.characterMemory.recordTurn(this, result);
    await window.GameModules.entryTime.advance(this, result.elapsedSeconds || 60);
    if (!this.finalizeNovelEntry(logId, result)) {
      this.addLog('story', '作者叙事', result.narration);
      if (result.speech) this.addLog('speech', this.character.name, result.speech);
      this.addLog('mind', `${this.character.name}的心理`, result.mind);
    }
  },

  applyMetricUpdates(updates) {
    window.GameModules.metrics.apply(this, updates);
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  applyInitialMetrics(updates) {
    window.GameModules.metrics.applyInitial(this, updates);
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
