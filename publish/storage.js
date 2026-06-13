/**
 * 存档管理：多 slot SQLite 存储，序列化后走 dzmm.kv/localStorage。
 */
window.GameModules = window.GameModules || {};

window.GameModules.storage = {
  slots: Array.from({ length: 10 }, (_, index) => `slot-${index + 1}`),

  async open(slot) {
    await window.GameModules.sqliteSave.open(slot);
  },

  async put(value) {
    await window.GameModules.sqliteSave.saveGameState(value);
  },

  async get() {
    return window.GameModules.sqliteSave.loadGameState();
  },

  async remove(slot) {
    await window.GameModules.sqliteSave.deleteSlot(slot || window.GameModules.sqliteSave.activeSlot);
  },

  snapshot(store) {
    return {
      started: store.started,
      phoneSetupDone: store.phoneSetupDone,
      playerProfile: store.playerProfile,
      playerName: store.playerName,
      selectedSlot: store.selectedSlot,
      selectedWork: store.selectedWork,
      selectedCharacterId: store.selectedCharacterId,
      characterAge: store.characterAge,
      entryTime: store.entryTime,
      entryCalendar: store.entryCalendar,
      entryCurrentAction: store.entryCurrentAction,
      controlMode: store.controlMode,
      online: store.online,
      turn: store.turn,
      sceneTitle: store.sceneTitle,
      mood: store.mood,
      trust: store.trust,
      resistance: store.resistance,
      emotions: store.emotions,
      playerFeelings: store.playerFeelings,
      metricsReady: store.metricsReady,
      metricNotes: store.metricNotes,
      quest: store.quest,
      mindText: store.mindText,
      feedbackSource: store.feedbackSource,
      characterIntent: store.characterIntent,
      choices: store.choices,
      log: store.log.slice(-30).map((entry) => ({ ...entry, thinking: store.normalizeNovelThinking ? store.normalizeNovelThinking(entry.thinking) : entry.thinking })),
      realWorldSceneTitle: store.realWorldSceneTitle,
      realWorldQuest: store.realWorldQuest,
      realWorldStatus: store.realWorldStatus,
      realWorldChoices: store.realWorldChoices,
      realWorldLog: (store.realWorldLog || []).slice(-30),
      companyState: store.companyState,
      bossState: store.bossState,
      calendarState: store.calendarState,
      rpgPanelCharacterId: store.rpgPanelCharacterId,
    };
  },

  restore(store, save) {
    if (!save) return false;
    store.phoneSetupDone = save.phoneSetupDone ?? store.phoneSetupDone;
    store.playerProfile = { ...store.playerProfile, ...(save.playerProfile || {}) };
    store.playerName = save.playerName || store.playerProfile?.name || store.playerName;
    store.realWorldSceneTitle = save.realWorldSceneTitle || store.realWorldSceneTitle;
    store.realWorldQuest = save.realWorldQuest || store.realWorldQuest;
    store.realWorldStatus = save.realWorldStatus || store.realWorldStatus;
    store.realWorldChoices = save.realWorldChoices || store.realWorldChoices;
    store.realWorldLog = save.realWorldLog || store.realWorldLog;
    store.companyState = save.companyState || store.companyState;
    store.bossState = save.bossState || store.bossState;
    store.calendarState = save.calendarState || store.calendarState;
    if (!save.started) return false;
    store.selectedWork = save.selectedWork || store.selectedWork;
    store.selectedCharacterId = save.selectedCharacterId || store.selectedCharacterId;
    store.characterAge = save.characterAge || store.characterAge;
    store.entryTime = save.entryTime || store.entryTime;
    store.entryCalendar = save.entryCalendar || store.entryCalendar;
    store.entryCurrentAction = save.entryCurrentAction || store.entryCurrentAction;
    store.controlMode = save.controlMode || store.controlMode;
    store.online = save.online ?? store.online;
    store.turn = save.turn || 1;
    store.sceneTitle = save.sceneTitle || store.sceneTitle;
    store.mood = save.mood || store.mood;
    store.trust = save.trust ?? store.trust;
    store.resistance = save.resistance ?? store.resistance;
    store.emotions = save.emotions || store.emotions;
    store.playerFeelings = save.playerFeelings || store.playerFeelings;
    store.metricsReady = save.metricsReady ?? true;
    store.metricNotes = save.metricNotes || store.metricNotes;
    window.GameModules.metrics.ensure(store);
    store.quest = save.quest || store.quest;
    store.mindText = save.mindText || store.mindText;
    store.feedbackSource = save.feedbackSource || store.feedbackSource || 'fallback';
    store.characterIntent = save.characterIntent || store.characterIntent;
    store.choices = save.choices || store.choices;
    store.log = save.log || store.log;
    store.rpgPanelCharacterId = save.rpgPanelCharacterId || store.selectedCharacterId;
    store.started = true;
    return true;
  },
};
