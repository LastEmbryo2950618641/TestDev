window.GameModules = window.GameModules || {};
window.GameModules.wechatMemoryDebugActions = {};

const wechatMemoryDebugFacadeMethods = [
  'debugWechatMemory',
  'sqliteWechatMemory',
  'sqliteWechatWorldline',
  'memoryDebugRuntimeWorldline',
  'sqliteWechatArchiveCount',
];

function callWechatMemoryDebugOrchestration(methodName, context, args) {
  return window.GameModules.app.wechat.memoryDebugOrchestration[methodName].call(context, ...args);
}

for (const methodName of wechatMemoryDebugFacadeMethods) {
  window.GameModules.wechatMemoryDebugActions[methodName] = function wechatMemoryDebugFacade(...args) {
    return callWechatMemoryDebugOrchestration(methodName, this, args);
  };
}
