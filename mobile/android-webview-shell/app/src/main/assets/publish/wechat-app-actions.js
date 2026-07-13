window.GameModules = window.GameModules || {};

const wechatAppFacadeMethods = [
  'openWechatApp',
  'closeWechatApp',
  'openWechatIdentity',
];

function callWechatAppOrchestration(methodName, context, args) {
  return window.GameModules.app.wechat.appOrchestration[methodName].call(context, ...args);
}

window.GameModules.wechatAppActions = {};

for (const methodName of wechatAppFacadeMethods) {
  window.GameModules.wechatAppActions[methodName] = function wechatAppFacade(...args) {
    return callWechatAppOrchestration(methodName, this, args);
  };
}
