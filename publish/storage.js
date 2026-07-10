/**
 * 存档管理：多 slot SQLite 存储，序列化后走 dzmm.kv/localStorage。
 */
window.GameModules = window.GameModules || {};

window.GameModules.storage = {
  slots: Array.from({ length: 10 }, (_, index) => `slot-${index + 1}`),

  async open(slot, options = {}) {
    await window.GameModules.sqliteSave.open(slot, options);
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

  snapshotPlainValue(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object') return typeof value === 'function' ? undefined : value;
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.map((item) => this.snapshotPlainValue(item, seen)).filter((item) => item !== undefined);
    }
    const plain = {};
    Object.entries(value).forEach(([key, item]) => {
      if (key === '_boundStore') return;
      if (typeof item === 'function') return;
      const next = this.snapshotPlainValue(item, seen);
      if (next !== undefined) plain[key] = next;
    });
    return plain;
  },

  snapshot(store) {
    return {
      started: store.started,
      phoneSetupDone: store.phoneSetupDone,
      playerProfile: store.playerProfile,
      playerAspiration: store.playerAspiration || null,
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
      bodyFigureMaskState: store.bodyFigureMaskState && typeof store.bodyFigureMaskState === 'object'
        ? {
          natural: Boolean(store.bodyFigureMaskState.natural),
          dressed: Boolean(store.bodyFigureMaskState.dressed),
        }
        : { natural: false, dressed: false },
      settingsState: store.settingsState ? {
        textProvider: store.settingsState.textProvider || 'deepseek',
        textModelId: store.modelId || store.settingsState.textModelId,
        deepseekApiKey: store.settingsState.deepseekApiKey || '',
        deepseekBaseUrl: store.settingsState.deepseekBaseUrl || 'https://api.deepseek.com',
        deepseekModel: store.settingsState.deepseekModel || '',
        drawProvider: store.settingsState.drawProvider || 'pixai',
        drawProviderExplicit: Boolean(store.settingsState.drawProviderExplicit),
        drawModelId: store.settingsState.drawModelId || 'anime',
        pixaiApiKey: store.settingsState.pixaiApiKey || '',
        pixaiBaseUrl: store.settingsState.pixaiBaseUrl || 'https://api.pixai.art',
        pixaiModelVersionId: store.settingsState.pixaiModelVersionId || window.GameModules.config?.drawProviders?.pixai?.defaultModel || '1983308862240288769',
        pixaiMode: store.settingsState.pixaiMode || 'standard',
        stage1MaterialIterationLimited: Boolean(store.settingsState.stage1MaterialIterationLimited),
        stage1MaterialMaxIterations: Number(store.settingsState.stage1MaterialMaxIterations) || 2,
        aiOutputLimitGlobalMode: store.settingsState.aiOutputLimitGlobalMode,
        aiOutputLimitGlobalMaxTokens: store.settingsState.aiOutputLimitGlobalMaxTokens,
        aiOutputLimitStage1Mode: store.settingsState.aiOutputLimitStage1Mode,
        aiOutputLimitStage1MaxTokens: store.settingsState.aiOutputLimitStage1MaxTokens,
        aiOutputLimitStage2Mode: store.settingsState.aiOutputLimitStage2Mode,
        aiOutputLimitStage2MaxTokens: store.settingsState.aiOutputLimitStage2MaxTokens,
        aiOutputLimitStage3Mode: store.settingsState.aiOutputLimitStage3Mode,
        aiOutputLimitStage3MaxTokens: store.settingsState.aiOutputLimitStage3MaxTokens,
        aiOutputLimitStage4Mode: store.settingsState.aiOutputLimitStage4Mode,
        aiOutputLimitStage4MaxTokens: store.settingsState.aiOutputLimitStage4MaxTokens,
        aiOutputLimitOtherMode: store.settingsState.aiOutputLimitOtherMode,
        aiOutputLimitOtherMaxTokens: store.settingsState.aiOutputLimitOtherMaxTokens,
      } : undefined,
      controlExperienceConfig: store.controlExperienceConfigState
        ? (window.GameModules.controlExperienceConfig?.normalize?.(store.controlExperienceConfigState)
          || window.GameModules.controlExperienceConfig?.normalizeConfig?.(store.controlExperienceConfigState)
          || {
            enabled: store.controlExperienceConfigState.enabled !== false,
            masterPrompt: store.controlExperienceConfigState.masterPrompt || '',
          })
        : undefined,
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
      realWorldMap: this.snapshotPlainValue(store.realWorldMap),
      realWorldQuest: store.realWorldQuest,
      realWorldStatus: store.realWorldStatus,
      realWorldChoices: store.realWorldChoices,
      realWorldLog: (store.realWorldLog || []).filter((entry) => !entry.transientError).slice(-30),
      realWorldLongingEvents: store.realWorldLongingEvents || [],
      realWorldlineState: store.realWorldlineState || { events: [], plots: [], pendingPlot: null },
      realWorldSystemRecords: (store.realWorldSystemRecords || []).slice(-60),
      realWorldAgentKvByMode: store.realWorldAgentKvByMode || {},
      characterSchedules: store.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {},
      orgTerritoryReconciliationLog: (store.orgTerritoryReconciliationLog || []).slice(-30),
      orgTerritoryConsistency: store.orgTerritoryConsistency ? {
        dismissed: Boolean(store.orgTerritoryConsistency.dismissed),
        at: store.orgTerritoryConsistency.at || '',
        signature: store.orgTerritoryConsistency.signature
          || window.GameModules.orgTerritory?.consistencySignature?.(store.orgTerritoryConsistency)
          || '',
      } : undefined,
      companyState: store.companyState ? { ...store.companyState, open: false } : store.companyState,
      bossState: store.bossState ? { ...store.bossState, open: false, companyDetailOpen: false, generating: false } : store.bossState,
      calendarState: store.calendarState ? { ...store.calendarState, open: false } : store.calendarState,
      eventState: store.eventState ? { ...store.eventState, open: false, message: '' } : store.eventState,
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
    store.refreshPhoneClockLabels?.();
    store.playerProfile = { ...store.playerProfile, ...(save.playerProfile || {}) };
    store.playerAspiration = save.playerAspiration || null;
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
    store.bodyFigureMaskState = save.bodyFigureMaskState && typeof save.bodyFigureMaskState === 'object'
      ? {
        natural: Boolean(save.bodyFigureMaskState.natural),
        dressed: Boolean(save.bodyFigureMaskState.dressed),
      }
      : { ...(store.bodyFigureMaskState || { natural: false, dressed: false }) };
    if (save.settingsState && store.settingsState) {
      const keepKey = String(store.settingsState.deepseekApiKey || '').trim();
      const keepPixaiKey = String(store.settingsState.pixaiApiKey || '').trim();
      store.settingsState = { ...store.settingsState, ...save.settingsState, open: false, loading: false, error: '' };
      if (!String(store.settingsState.deepseekApiKey || '').trim() && keepKey) {
        store.settingsState.deepseekApiKey = keepKey;
      }
      if (!String(store.settingsState.pixaiApiKey || '').trim() && keepPixaiKey) {
        store.settingsState.pixaiApiKey = keepPixaiKey;
      }
      store.settingsState.stage1MaterialIterationLimited = Boolean(store.settingsState.stage1MaterialIterationLimited);
      store.settingsState.stage1MaterialMaxIterations = Math.max(1, Math.min(8, Math.round(Number(store.settingsState.stage1MaterialMaxIterations) || 2)));
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
    }
    if (store.controlExperienceConfigState) {
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
    }
    window.GameModules.runtimeConfig?.applyToStore?.(store);
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
    store.realWorldSystemRecords = Array.isArray(save.realWorldSystemRecords) ? save.realWorldSystemRecords : (store.realWorldSystemRecords || []);
    store.realWorldAgentKvByMode = save.realWorldAgentKvByMode && typeof save.realWorldAgentKvByMode === 'object'
      ? save.realWorldAgentKvByMode
      : (store.realWorldAgentKvByMode || {});
    store.characterSchedules = save.characterSchedules && typeof save.characterSchedules === 'object'
      ? save.characterSchedules
      : (store.characterSchedules || {});
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
    window.GameModules.wechatCleanup?.run?.(store);
    store.companyState = save.companyState ? { ...save.companyState, open: false } : store.companyState;
    store.bossState = save.bossState ? { ...save.bossState, open: false, companyDetailOpen: false, generating: false } : store.bossState;
    store.calendarState = save.calendarState ? { ...save.calendarState, open: false } : store.calendarState;
    store.eventState = save.eventState ? { ...save.eventState, open: false, message: '' } : store.eventState;
    store.initEventSystem?.();
    store.factionState = save.factionState ? { ...save.factionState, open: false, detailOpen: false, generating: false, archives: save.factionState.archives || save.factionArchives || {} } : store.factionState;
    store.initFactionSystem?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(store);
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
