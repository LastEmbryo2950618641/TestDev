window.GameModules = window.GameModules || {};
window.GameModules.wechatWorldlineActions = {
  async recordWechatWorldline(contact, playerText, replyText = '', result = {}) {
    const display = this.displayWechatContact?.(contact) || contact || {};
    const time = this.wechatMemoryTime?.() || { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim() };
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const playerName = this.playerDisplayCharacter?.().name || this.playerName || '玩家';
    const detail = this.formatWechatDialogueLog?.(playerName, display.name || '微信联系人', label, playerText, replyText) || '';
    const seed = window.GameModules.rpgState.seed(`${time.label}-${contact?.id}-${playerText}-${replyText}`);
    const event = { eventId: `wx_${seed}`, name: `微信对话：${display.name || '联系人'}`, time: label, detail, status: '已记录' };
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    await this.appendWorldlineEvent?.(this.realWorldlineState, event, '现实情节');
  },
};
