/**
 * 存档管理：多 slot SQLite 存储，序列化后走 dzmm.kv/localStorage。
 */
window.GameModules = window.GameModules || {};

window.GameModules.storage = {
  slots: Array.from({ length: 10 }, (_, index) => `slot-${index + 1}`),

  async open(slot, options = {}) {
    await window.GameModules.platform.storage.backend.open(slot, options);
  },

  async put(value) {
    await window.GameModules.platform.storage.backend.put(value);
  },

  async get() {
    return window.GameModules.platform.storage.backend.get();
  },

  async remove(slot) {
    await window.GameModules.platform.storage.backend.remove(slot);
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
        selectedPlayerId: store.roleCardSetup?.selectedPlayerId || '',
        selectedPlayerName: store.roleCardSetup?.selectedPlayerName || '',
        selectedCardIds: store.roleCardSetup?.selectedCardIds || [],
      },
      wechatUsers: store.wechatUsers || [],
      wechatFriendRequests: Array.isArray(store.wechatFriendRequests) ? store.wechatFriendRequests.slice(-40) : [],
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
        stage1MaterialIterationLimited: store.settingsState.stage1MaterialIterationLimited !== false,
        stage1MaterialMaxIterations: Number(store.settingsState.stage1MaterialMaxIterations) || 3,
        aiOutputLimitGlobalMode: store.settingsState.aiOutputLimitGlobalMode,
        aiOutputLimitGlobalMaxTokens: store.settingsState.aiOutputLimitGlobalMaxTokens,
        aiOutputLimitStage1Mode: store.settingsState.aiOutputLimitStage1Mode,
        aiOutputLimitStage1MaxTokens: store.settingsState.aiOutputLimitStage1MaxTokens,
        aiOutputLimitStage2Mode: store.settingsState.aiOutputLimitStage2Mode,
        aiOutputLimitStage2MaxTokens: store.settingsState.aiOutputLimitStage2MaxTokens,
        aiOutputLimitStage3Mode: store.settingsState.aiOutputLimitStage3Mode,
        aiOutputLimitStage3MaxTokens: store.settingsState.aiOutputLimitStage3MaxTokens,
        aiOutputLimitStage3BudgetVersion: store.settingsState.aiOutputLimitStage3BudgetVersion,
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
      locationGraph: this.snapshotPlainValue(store.locationGraph),
      realWorldQuest: store.realWorldQuest,
      realWorldStatus: store.realWorldStatus,
      realWorldChoices: store.realWorldChoices,
      realWorldLog: (store.realWorldLog || []).filter((entry) => !entry.transientError).slice(-30),
      realWorldLongingEvents: store.realWorldLongingEvents || [],
      socialInbox: Array.isArray(store.socialInbox) ? store.socialInbox.slice(-30) : [],
      socialInboxPreparedIds: Array.isArray(store.socialInboxPreparedIds) ? store.socialInboxPreparedIds.slice(-30) : [],
      realWorldlineState: store.realWorldlineState || { events: [], plots: [], pendingPlot: null },
      realWorldSystemRecords: (store.realWorldSystemRecords || []).slice(-60),
      realWorldAgentKvByMode: store.realWorldAgentKvByMode || {},
      characterSchedules: store.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {},
      appearingLocationById: store.appearingLocationById && typeof store.appearingLocationById === 'object' ? store.appearingLocationById : {},
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
    window.GameModules.domain.storage.restoreStateHelpers.normalizePlayerIdentityState(store, save);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeWechatProfileState(store, save);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeSettingsState(store, save);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeControlExperienceConfigState(store, save);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeRealWorldState(store, save);
    window.GameModules.app.storage.restorePostFlow.applyNonFieldSideEffects.call(this, store);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeAppPanelState(store, save);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeEntrySceneControlState(store, save);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeRpgPanelState(store, save);
    if (!save.started) return false;
    window.GameModules.domain.storage.restoreStateHelpers.normalizeEmotionState(store, save);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeMetricState(store, save);
    window.GameModules.metrics.ensure(store);
    window.GameModules.domain.storage.restoreStateHelpers.normalizeQuestIntentState(store, save);
    store.choices = save.choices || store.choices;
    store.log = save.log || store.log;
    store.started = true;
    return true;
  },
};
