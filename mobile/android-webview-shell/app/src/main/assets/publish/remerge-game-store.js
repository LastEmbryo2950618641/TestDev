/**
 * 动态分块加载后，将 GameModules 中的 actions 重新合并进 Alpine store。
 */
window.GameModules = window.GameModules || {};

window.GameModules.remergeGameStore = function remergeGameStore() {
  const store = window.Alpine?.store?.('game');
  if (!store) return false;
  const gm = window.GameModules;
  const modules = [
    gm.actions, gm.rpgFieldUi, gm.resultActions, gm.loadingActions, gm.roleCardLoadingActions, gm.solidifyActions, gm.wearingSyncActions, gm.saveActions, gm.styleActions,
    gm.worldlineActions, gm.predefinedRoleCardActions, gm.homeActions, gm.playerSetupActions, gm.playerAspirationActions, gm.playerIdentityActions, gm.rpgActions, gm.identityMemoryActions, gm.identityAppActions, gm.memoryQueryActions,
    gm.wechatActions, gm.wechatViewActions, gm.wechatMemoryContextActions, gm.wechatChatActions, gm.wechatIncomingActions, gm.wechatImageActions, gm.wechatMentionActions, gm.wechatWorldlineActions, gm.wechatMemoryDebugActions, gm.wechatAppActions, gm.wechatAlbumTagActions, gm.wechatAlbumPromptListActions, gm.wechatAvatarCropActions, gm.wechatAlbumActions, gm.wechatChangePanelActions,
    gm.controlEntryActions, gm.entryActions, gm.realWorldClockActions, gm.catalogActions, gm.coreActions, gm.controlState, gm.controlLinkActions, gm.appSwitchActions, gm.currentWorldActions,
    gm.inventoryActions, gm.inventoryEquipActions, gm.itemSkillActions, gm.realWorldStreamActions, gm.realWorldThinkingActions, gm.realWorldSettlementActions, gm.realWorldUtilityActions, gm.realWorldActions, gm.realWorldLongingActions, gm.realWorldMapActions, gm.realWorldFactionActions, gm.realWorldMatterActions,
    gm.companyActions, gm.companyAttendanceActions, gm.companyFactionActions, gm.bossActions, gm.bossAppointmentActions, gm.bossAiActions, gm.calendarActions, gm.eventActions,
    gm.factionActions, gm.factionArchiveActions, gm.factionOrgActions, gm.factionAiActions, gm.factionMembershipActions, gm.skillsActions, gm.knownProfessionActions,
    gm.taobaoActions, gm.taobaoGenerateActions, gm.taobaoBuyActions, gm.promptActions, gm.settingsActions, gm.systemTestActions, gm.tokenStatsActions, gm.roleCardJsonApp?.actions,
  ].filter(Boolean);
  Object.assign(store, ...modules);
  store.refreshPhoneClockLabels?.();
  return true;
};
