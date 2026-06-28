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
      roleCardSetup: {
        usePredefinedPlayerCard: Boolean(store.roleCardSetup?.usePredefinedPlayerCard),
        selectedPlayerName: store.roleCardSetup?.selectedPlayerName || '',
        selectedRelationNames: store.roleCardSetup?.selectedRelationNames || [],
        relationRoles: store.roleCardSetup?.relationRoles || {},
      },
      wechatUsers: store.wechatUsers || [],
      wechatMessagesByContact: store.wechatMessagesByContact || {},
      wechatAlbumPhotos: store.wechatAlbumPhotos || {},
      wechatAlbumPrompts: store.wechatAlbumPrompts || {},
      settingsState: store.settingsState ? { textModelId: store.modelId || store.settingsState.textModelId, drawModelId: store.settingsState.drawModelId || 'anime' } : undefined,
      phoneFixedTime: store.phoneFixedTime,
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
      temporaryEmotions: store.temporaryEmotions,
      temporaryPlayerFeelings: store.temporaryPlayerFeelings,
      metricsReady: store.metricsReady,
      metricNotes: store.metricNotes,
      quest: store.quest,
      mindText: store.mindText,
      feedbackSource: store.feedbackSource,
      characterIntent: store.characterIntent,
      choices: store.choices,
      log: store.log.slice(-30).map((entry) => ({ ...entry, thinking: store.normalizeNovelThinking ? store.normalizeNovelThinking(entry.thinking) : entry.thinking })),
      realWorldThinkMode: Boolean(store.realWorldThinkMode),
      realWorldSceneTitle: store.realWorldSceneTitle,
      realWorldLocationName: store.realWorldLocationName,
      realWorldMap: store.realWorldMap,
      realWorldQuest: store.realWorldQuest,
      realWorldStatus: store.realWorldStatus,
      realWorldChoices: store.realWorldChoices,
      realWorldLog: (store.realWorldLog || []).filter((entry) => !entry.transientError).slice(-30),
      realWorldLongingEvents: store.realWorldLongingEvents || [],
      realWorldlineState: store.realWorldlineState || { events: [], plots: [], pendingPlot: null },
      companyState: store.companyState ? { ...store.companyState, open: false } : store.companyState,
      bossState: store.bossState ? { ...store.bossState, open: false, companyDetailOpen: false, generating: false } : store.bossState,
      calendarState: store.calendarState ? { ...store.calendarState, open: false } : store.calendarState,
      factionState: store.factionState ? { ...store.factionState, open: false, detailOpen: false, generating: false } : store.factionState,
      taobaoState: store.taobaoState ? { ...store.taobaoState, open: false, generatingId: '', buyingId: '', walletOpen: false } : store.taobaoState,
      rpgPanelCharacterId: store.rpgPanelCharacterId,
      solidifyState: store.solidifyState ? { open: false, candidates: store.solidifyState.candidates || [], selectedKey: store.solidifyState.selectedKey || '' } : undefined,
    };
  },

  restore(store, save) {
    if (!save) return false;
    store.phoneSetupDone = save.phoneSetupDone ?? store.phoneSetupDone;
    store.phoneFixedTime = Number(save.phoneFixedTime) || new Date(save.playerProfile?.initializedAt || Date.now()).getTime();
    store.playerProfile = { ...store.playerProfile, ...(save.playerProfile || {}) };
    store.playerName = save.playerName || store.playerProfile?.name || store.playerName;
    if (save.roleCardSetup && store.roleCardSetup) {
      store.roleCardSetup = {
        ...store.roleCardSetup,
        usePredefinedPlayerCard: Boolean(save.roleCardSetup.usePredefinedPlayerCard),
        selectedPlayerName: save.roleCardSetup.selectedPlayerName || store.roleCardSetup.selectedPlayerName,
        selectedRelationNames: Array.isArray(save.roleCardSetup.selectedRelationNames) ? save.roleCardSetup.selectedRelationNames : store.roleCardSetup.selectedRelationNames,
        relationRoles: save.roleCardSetup.relationRoles && typeof save.roleCardSetup.relationRoles === 'object' ? save.roleCardSetup.relationRoles : store.roleCardSetup.relationRoles,
      };
    }
    store.wechatUsers = Array.isArray(save.wechatUsers) ? save.wechatUsers : (store.wechatUsers || []);
    store.wechatMessagesByContact = save.wechatMessagesByContact && typeof save.wechatMessagesByContact === 'object' ? save.wechatMessagesByContact : (store.wechatMessagesByContact || {});
    store.wechatAlbumPhotos = save.wechatAlbumPhotos && typeof save.wechatAlbumPhotos === 'object' ? save.wechatAlbumPhotos : (store.wechatAlbumPhotos || {});
    store.wechatAlbumPrompts = save.wechatAlbumPrompts && typeof save.wechatAlbumPrompts === 'object' ? save.wechatAlbumPrompts : (store.wechatAlbumPrompts || {});
    if (save.settingsState && store.settingsState) {
      store.settingsState = { ...store.settingsState, ...save.settingsState, open: false, loading: false, error: '' };
      store.modelId = store.settingsState.textModelId || store.modelId;
    }
    store.realWorldThinkMode = Boolean(save.realWorldThinkMode ?? store.realWorldThinkMode);
    store.realWorldSceneTitle = save.realWorldSceneTitle || store.realWorldSceneTitle;
    store.realWorldLocationName = save.realWorldLocationName || store.realWorldLocationName;
    store.realWorldMap = save.realWorldMap || store.realWorldMap;
    window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {});
    store.realWorldQuest = save.realWorldQuest || store.realWorldQuest;
    store.realWorldStatus = save.realWorldStatus || store.realWorldStatus;
    store.realWorldChoices = save.realWorldChoices || store.realWorldChoices;
    store.realWorldLog = window.GameModules.realWorldThinkingActions?.normalizeRealWorldLog?.(save.realWorldLog || store.realWorldLog) || (save.realWorldLog || store.realWorldLog);
    store.realWorldLongingEvents = Array.isArray(save.realWorldLongingEvents) ? save.realWorldLongingEvents : (store.realWorldLongingEvents || []);
    window.GameModules.sqliteSave.saveRealWorldLogEntries?.(store.realWorldLog).catch((err) => console.warn('[现实日志] 旧日志迁移失败:', err.message, err.stack));
    store.realWorldlineState = save.realWorldlineState || store.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    window.GameModules.wechatCleanup?.run?.(store);
    store.companyState = save.companyState ? { ...save.companyState, open: false } : store.companyState;
    store.bossState = save.bossState ? { ...save.bossState, open: false, companyDetailOpen: false, generating: false } : store.bossState;
    store.calendarState = save.calendarState ? { ...save.calendarState, open: false } : store.calendarState;
    store.factionState = save.factionState ? { ...save.factionState, open: false, detailOpen: false, generating: false, archives: save.factionState.archives || save.factionArchives || {} } : store.factionState;
    store.taobaoState = save.taobaoState ? { ...store.taobaoState, ...save.taobaoState, open: false, generatingId: '', buyingId: '' } : store.taobaoState;
    store.solidifyState = save.solidifyState ? { ...store.solidifyState, ...save.solidifyState, open: false } : store.solidifyState;
    store.initTaobaoApp?.();
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
    store.temporaryEmotions = save.temporaryEmotions && typeof save.temporaryEmotions === 'object' ? save.temporaryEmotions : (store.temporaryEmotions || {});
    store.temporaryPlayerFeelings = save.temporaryPlayerFeelings && typeof save.temporaryPlayerFeelings === 'object' ? save.temporaryPlayerFeelings : (store.temporaryPlayerFeelings || {});
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
