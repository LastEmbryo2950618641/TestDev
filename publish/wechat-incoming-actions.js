window.GameModules = window.GameModules || {};
window.GameModules.wechatIncomingActions = {};

const wechatIncomingFacadeMethods = [
  'applyWechatActions',
  'applyWechatIncomingAction',
  'findWechatIncomingContact',
  'wechatPastMessageTime',
  'wechatPastLabel',
];

function callWechatIncomingOrchestration(methodName, context, args) {
  return window.GameModules.app.wechat.incomingOrchestration[methodName].call(context, ...args);
}

for (const methodName of wechatIncomingFacadeMethods) {
  window.GameModules.wechatIncomingActions[methodName] = function wechatIncomingFacade(...args) {
    return callWechatIncomingOrchestration(methodName, this, args);
  };
}
