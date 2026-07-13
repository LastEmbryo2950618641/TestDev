window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.worldlineOrchestration = {
  async recordWechatWorldline(contact, playerText, replyText = '', result = {}) {
    const event = window.GameModules.domain.worldline.wechatEventService.wechatWorldlineEvent.call(this, contact, playerText, replyText);
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    await this.appendWorldlineEvent?.(this.realWorldlineState, event, '现实情节');
  },
};
