window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.changePanelOrchestration = {
  toggleWechatChangePanel(msg) {
    if (!msg) return;
    msg.changeReasonsOpen = !msg.changeReasonsOpen;
  },
};
