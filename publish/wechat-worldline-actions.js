window.GameModules = window.GameModules || {};

function callWechatWorldlineOrchestration(name, context, args) {
  return window.GameModules.app.wechat.worldlineOrchestration[name].call(context, ...args);
}

window.GameModules.wechatWorldlineActions = {
  async recordWechatWorldline(...args) {
    return callWechatWorldlineOrchestration('recordWechatWorldline', this, args);
  },
};
