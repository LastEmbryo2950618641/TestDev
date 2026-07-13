window.GameModules = window.GameModules || {};
window.GameModules.wechatCleanup = {};

const wechatCleanupFacadeMethods = [
  'run',
  'isOldWechatText',
  'cleanWorldline',
  'cleanMemories',
  'cleanMemoryObject',
];

function callWechatCleanupOrchestration(methodName, context, args) {
  return window.GameModules.app.wechat.cleanupOrchestration[methodName].call(context, ...args);
}

for (const methodName of wechatCleanupFacadeMethods) {
  window.GameModules.wechatCleanup[methodName] = function wechatCleanupFacade(...args) {
    return callWechatCleanupOrchestration(methodName, this, args);
  };
}
