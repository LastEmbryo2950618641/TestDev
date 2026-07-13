window.GameModules = window.GameModules || {};

const wechatHistoryContextForwarders = {
  ensureWechatHistoryTable: 'ensureWechatHistoryTable',
  saveWechatHistoryRow: 'saveWechatHistoryRow',
  wechatHistoryCreatedAt: 'wechatHistoryCreatedAt',
  listWechatHistoryRows: 'listWechatHistoryRows',
  wechatHistoryQueryText: 'wechatHistoryQueryText',
  wechatHistoryText: 'wechatHistoryText',
  wechatMemoryContext: 'wechatMemoryContext',
  validateWechatHistoryDecision: 'validateWechatHistoryDecision',
  wechatHistoryContextForReply: 'wechatHistoryContextForReply',
  wechatHistoryQueryHint: 'wechatHistoryQueryHint',
};

function callWechatHistoryContextHelper(helperName, context, ...args) {
  return window.GameModules.app.wechat.historyContextHelpers[helperName].call(context, ...args);
}

window.GameModules.wechatMemoryContextActions = Object.fromEntries(
  Object.entries(wechatHistoryContextForwarders).map(([publicName, helperName]) => [
    publicName,
    function wechatHistoryContextFacade(...args) {
      return callWechatHistoryContextHelper(helperName, this, ...args);
    },
  ]),
);
