window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.storage = window.GameModules.domain.storage || {};

window.GameModules.domain.storage.restoreStateHelpers = {
  rawLargeValue(value) {
    if (!value || typeof value !== 'object') return value;
    try {
      return window.Alpine?.raw ? window.Alpine.raw(value) : value;
    } catch (err) {
      return value;
    }
  },
  normalizeRpgPanelState(store, save) {
    store.rpgPanelCharacterId = save.rpgPanelCharacterId || store.selectedCharacterId;
  },
  normalizeQuestIntentState(store, save) {
    store.quest = save.quest || store.quest;
    store.mindText = save.mindText || store.mindText;
    store.feedbackSource = save.feedbackSource || store.feedbackSource || 'fallback';
    store.characterIntent = save.characterIntent || store.characterIntent;
  },
  normalizeMetricState(store, save) {
    store.metricsReady = save.metricsReady ?? true;
    store.metricNotes = save.metricNotes || store.metricNotes;
  },
  normalizeEmotionState(store, save) {
    store.mood = save.mood || store.mood;
    store.trust = save.trust ?? store.trust;
    store.resistance = save.resistance ?? store.resistance;
    store.emotions = save.emotions || store.emotions;
    store.playerFeelings = save.playerFeelings || store.playerFeelings;
    store.temporaryEmotions = save.temporaryEmotions && typeof save.temporaryEmotions === 'object'
      ? save.temporaryEmotions
      : (store.temporaryEmotions || {});
    store.temporaryPlayerFeelings = save.temporaryPlayerFeelings && typeof save.temporaryPlayerFeelings === 'object'
      ? save.temporaryPlayerFeelings
      : (store.temporaryPlayerFeelings || {});
  },
  normalizeEntrySceneControlState(store, save) {
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
  },
  normalizeAppPanelState(store, save) {
    store.companyState = save.companyState ? { ...save.companyState, open: false } : store.companyState;
    store.bossState = save.bossState ? { ...save.bossState, open: false, companyDetailOpen: false, generating: false } : store.bossState;
    store.calendarState = save.calendarState ? { ...save.calendarState, open: false } : store.calendarState;
    store.eventState = save.eventState ? { ...save.eventState, open: false, message: '' } : store.eventState;
    store.newsDriverState = save.newsDriverState
      ? { ...(store.newsDriverState || {}), ...save.newsDriverState, open: false, message: '' }
      : (store.newsDriverState || window.GameModules.newsDriverSystem?.defaultState?.() || {});
    store.factionState = save.factionState
      ? { ...save.factionState, open: false, detailOpen: false, generating: false, archives: save.factionState.archives || save.factionArchives || {} }
      : store.factionState;
    store.taobaoState = save.taobaoState
      ? { ...store.taobaoState, ...save.taobaoState, open: false, generatingId: '', buyingId: '' }
      : store.taobaoState;
    store.solidifyState = save.solidifyState
      ? { ...store.solidifyState, ...save.solidifyState, open: false }
      : store.solidifyState;
  },
  normalizeRealWorldState(store, save) {
    store.realWorldThinkMode = Boolean(save.realWorldThinkMode ?? store.realWorldThinkMode);
    store.realWorldSceneTitle = save.realWorldSceneTitle || store.realWorldSceneTitle;
    store.realWorldLocationName = save.realWorldLocationName || store.realWorldLocationName;
    store.realWorldMap = this.rawLargeValue(save.realWorldMap || store.realWorldMap);
    store.locationGraph = this.rawLargeValue(save.locationGraph || store.locationGraph);
    store.realWorldQuest = save.realWorldQuest || store.realWorldQuest;
    store.realWorldStatus = save.realWorldStatus || store.realWorldStatus;
    store.realWorldChoices = save.realWorldChoices || store.realWorldChoices;
    store.realWorldLog = window.GameModules.realWorldThinkingActions?.normalizeRealWorldLog?.(save.realWorldLog || store.realWorldLog) || (save.realWorldLog || store.realWorldLog);
    store.realWorldLongingEvents = Array.isArray(save.realWorldLongingEvents) ? save.realWorldLongingEvents : (store.realWorldLongingEvents || []);
    store.socialInbox = Array.isArray(save.socialInbox) ? save.socialInbox : (store.socialInbox || []);
    store.socialInboxPreparedIds = Array.isArray(save.socialInboxPreparedIds) ? save.socialInboxPreparedIds : (store.socialInboxPreparedIds || []);
    store.realWorldlineState = save.realWorldlineState || store.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    store.realWorldSystemRecords = Array.isArray(save.realWorldSystemRecords) ? save.realWorldSystemRecords : (store.realWorldSystemRecords || []);
    store.realWorldAgentKvByMode = save.realWorldAgentKvByMode && typeof save.realWorldAgentKvByMode === 'object'
      ? save.realWorldAgentKvByMode
      : (store.realWorldAgentKvByMode || {});
    store.characterSchedules = save.characterSchedules && typeof save.characterSchedules === 'object'
      ? save.characterSchedules
      : (store.characterSchedules || {});
    store.appearingLocationById = save.appearingLocationById && typeof save.appearingLocationById === 'object'
      ? save.appearingLocationById
      : (store.appearingLocationById || {});
    store.orgTerritoryReconciliationLog = Array.isArray(save.orgTerritoryReconciliationLog)
      ? save.orgTerritoryReconciliationLog.slice(-30)
      : (store.orgTerritoryReconciliationLog || []);
    if (save.orgTerritoryConsistency) {
      store.orgTerritoryConsistency = {
        ...(store.orgTerritoryConsistency || {}),
        dismissed: Boolean(save.orgTerritoryConsistency.dismissed),
        at: save.orgTerritoryConsistency.at || '',
        signature: String(save.orgTerritoryConsistency.signature || '').slice(0, 4000),
      };
    }
  },
  normalizePlayerIdentityState(store, save) {
    store.phoneSetupDone = save.phoneSetupDone ?? store.phoneSetupDone;
    store.phoneFixedTime = Number(save.phoneFixedTime) || new Date(save.playerProfile?.initializedAt || Date.now()).getTime();
    store.refreshPhoneClockLabels?.();
    store.playerProfile = { ...store.playerProfile, ...(save.playerProfile || {}) };
    store.playerAspiration = save.playerAspiration || null;
    store.playerName = save.playerName || store.playerProfile?.name || store.playerName;
    if (save.roleCardSetup && store.roleCardSetup) {
      store.roleCardSetup = {
        ...store.roleCardSetup,
        usePredefinedPlayerCard: Boolean(save.roleCardSetup.usePredefinedPlayerCard),
        selectedPlayerId: save.roleCardSetup.selectedPlayerId || store.roleCardSetup.selectedPlayerId,
        selectedPlayerName: save.roleCardSetup.selectedPlayerName || store.roleCardSetup.selectedPlayerName,
        selectedCardIds: Array.isArray(save.roleCardSetup.selectedCardIds) ? save.roleCardSetup.selectedCardIds : store.roleCardSetup.selectedCardIds,
      };
    }
  },

  normalizeWechatProfileState(store, save) {
    store.wechatUsers = Array.isArray(save.wechatUsers) ? save.wechatUsers : (store.wechatUsers || []);
    store.wechatFriendRequests = Array.isArray(save.wechatFriendRequests) ? save.wechatFriendRequests : (store.wechatFriendRequests || []);
    store.wechatMessagesByContact = save.wechatMessagesByContact && typeof save.wechatMessagesByContact === 'object' ? save.wechatMessagesByContact : (store.wechatMessagesByContact || {});
    store.wechatAlbumPhotos = save.wechatAlbumPhotos && typeof save.wechatAlbumPhotos === 'object' ? save.wechatAlbumPhotos : (store.wechatAlbumPhotos || {});
    store.wechatAlbumPrompts = save.wechatAlbumPrompts && typeof save.wechatAlbumPrompts === 'object' ? save.wechatAlbumPrompts : (store.wechatAlbumPrompts || {});
    if (save.wechatSelectedContact) store.wechatSelectedContact = save.wechatSelectedContact;
    const migrate = window.GameModules.wechatActions?.migrateWechatContactIdentity;
    if (typeof migrate === 'function') migrate.call(store, store);
    store.bodyFigureMaskState = save.bodyFigureMaskState && typeof save.bodyFigureMaskState === 'object'
      ? {
        natural: Boolean(save.bodyFigureMaskState.natural),
        dressed: Boolean(save.bodyFigureMaskState.dressed),
      }
      : { ...(store.bodyFigureMaskState || { natural: false, dressed: false }) };
  },
  normalizeSettingsState(store, save) {
    if (!save.settingsState || !store.settingsState) return;
    const keepKey = String(store.settingsState.deepseekApiKey || '').trim();
    const keepPixaiKey = String(store.settingsState.pixaiApiKey || '').trim();
    store.settingsState = { ...store.settingsState, ...save.settingsState, open: false, loading: false, error: '' };
    if (!String(store.settingsState.deepseekApiKey || '').trim() && keepKey) {
      store.settingsState.deepseekApiKey = keepKey;
    }
    if (!String(store.settingsState.pixaiApiKey || '').trim() && keepPixaiKey) {
      store.settingsState.pixaiApiKey = keepPixaiKey;
    }
    store.settingsState.stage1MaterialIterationLimited = store.settingsState.stage1MaterialIterationLimited !== false;
    store.settingsState.stage1MaterialMaxIterations = Math.max(1, Math.min(8, Math.round(Number(store.settingsState.stage1MaterialMaxIterations) || 3)));
    store.settingsState.textProvider = store.settingsState.textProvider || 'deepseek';
    store.settingsState.deepseekBaseUrl = store.settingsState.deepseekBaseUrl || 'https://api.deepseek.com';
    store.settingsState.drawProvider = store.settingsState.drawProvider || 'pixai';
    store.settingsState.drawModelId = store.settingsState.drawModelId || 'anime';
    store.settingsState.pixaiBaseUrl = store.settingsState.pixaiBaseUrl || 'https://api.pixai.art';
    store.settingsState.pixaiModelVersionId = store.settingsState.pixaiModelVersionId || window.GameModules.config?.drawProviders?.pixai?.defaultModel || '1983308862240288769';
    store.settingsState.pixaiMode = store.settingsState.pixaiMode || 'standard';
    store.ensureAiOutputLimitSettings?.();
    store.modelId = store.settingsState.textModelId || store.modelId;
    window.GameModules.localSettings?.ensureActivationTextModels?.(store);
    window.GameModules.rootKeyAutofill?.scheduleApply?.(store);
  },

  normalizeControlExperienceConfigState(store, save) {
    if (!store.controlExperienceConfigState) return;
    const normalizedControlExperience = window.GameModules.controlExperienceConfig?.normalize?.(save.controlExperienceConfig)
      || window.GameModules.controlExperienceConfig?.normalizeConfig?.(save.controlExperienceConfig)
      || {
        enabled: save.controlExperienceConfig?.enabled !== false,
        masterPrompt: save.controlExperienceConfig?.masterPrompt || store.controlExperienceConfigState.masterPrompt || '',
      };
    store.controlExperienceConfigState = {
      ...(window.GameModules.controlExperienceConfigApp?.normalizeControlExperienceConfigState?.(store.controlExperienceConfigState)
        || store.controlExperienceConfigState),
      ...normalizedControlExperience,
      open: false,
      message: '',
      error: '',
    };
    store.controlExperienceConfigState.previewItems = window.GameModules.controlExperienceConfigApp?.controlExperiencePreviewItems?.(store.controlExperienceConfigState) || [];
  },
};
