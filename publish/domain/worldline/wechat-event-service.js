window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.worldline = window.GameModules.domain.worldline || {};

window.GameModules.domain.worldline.wechatEventService = {
  wechatWorldlineEvent(contact, playerText, replyText = '') {
    const display = this.displayWechatContact?.(contact) || contact || {};
    const time = this.wechatMemoryTime?.() || { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim() };
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const playerName = this.playerDisplayCharacter?.().name || this.playerName || '玩家';
    const detail = this.formatWechatDialogueLog?.(playerName, display.name || '微信联系人', label, playerText, replyText) || '';
    const seed = window.GameModules.rpgState.seed(`${time.label}-${contact?.id}-${playerText}-${replyText}`);
    const event = { eventId: `wx_${seed}`, name: `微信对话：${display.name || '联系人'}`, time: label, detail, status: '已记录' };
    return event;
  },
};
