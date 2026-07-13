window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.imageOfferOrchestration = {
  async appendWechatPendingImageMessage(characterId, state = {}, contact = {}, imageIntent = {}) {
    const contactName = state?.profile?.name || contact.name || '联系人';
    const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const imageDescription = String(imageIntent.imageDescription || imageIntent.contentDescription || '一张联系人发送的近照。').trim().slice(0, 180);
    const time = this.wechatMemoryTime?.() || { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim() };
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const imageRecord = this.wechatImageRecordText(contactName, label, imageId, imageDescription);
    this.appendWechatMessage(characterId, { side: 'other', name: contactName, mark: contactName.slice(0, 1), text: '', characterId, imagePending: true, imageStatus: 'pending', imageIntent: { ...imageIntent, imageDescription }, imageId, imageDescription, imageRecord, imageRecordTime: label, imageUnreadBy: ['玩家'], imageReadBy: [] });
    await this.recordWechatImageOffer?.({ ...contact, id: characterId, characterId, name: contactName }, time, imageRecord, imageId, imageIntent);
  },

  async recordWechatImageOffer(contact = {}, time = {}, imageRecord = '', imageId = '', imageIntent = {}) {
    const characterId = String(contact.characterId || contact.id || '').trim();
    if (!characterId || contact.group || !imageRecord) return;
    const cm = window.GameModules.characterMemory;
    const impression = Math.max(0, Math.min(100, Math.round(Number(imageIntent.impression) || 35)));
    for (const id of [characterId, 'player-self']) {
      const memory = cm.ensure(id);
      const item = cm.memoryItem(this, { text: imageRecord, source: 'wechat-image', place: '微信', time, impression });
      memory.shortTerm.recent.push(item);
      cm.promote(memory, item);
      await cm.compact(id, memory);
    }
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const seed = window.GameModules.rpgState.seed(`${time.label}-${characterId}-${imageId}`);
    const event = { eventId: `wx_img_${seed}`, name: `微信图片：${contact.name || '联系人'}`, time: label, detail: imageRecord, status: '已记录' };
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    await this.appendWorldlineEvent?.(this.realWorldlineState, event, '现实情节');
  },
};
