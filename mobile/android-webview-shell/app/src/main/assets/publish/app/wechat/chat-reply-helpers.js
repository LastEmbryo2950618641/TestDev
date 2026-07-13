window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.chatReplyHelpers = {
  wechatContactProfileText(contact, playerText = '') {
    const display = this.displayWechatContact?.(contact) || contact;
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const profile = state?.profile || {};
    const rows = [
      ['姓名', profile.name || display.name], ['微信关系', display.relation || display.subtitle], ['角色定位', profile.role || display.context],
      ['背景', profile.detail || contact.latest], ['外貌', profile.appearance], ['性格', profile.personality], ['关系', profile.relationships],
    ];
    const archive = window.GameModules.factionArchive?.contextFor?.(this, `${profile.name || display.name || ''} ${playerText || ''} ${this.realWorldLocationName || ''}`, 1200) || '暂无势力资料库记录。';
    return `${rows.map(([label, value]) => `- ${label}：${String(value || '未记录')}`).join('\n')}\n\n### 相关势力资料库\n${archive}`;
  },

  validateWechatReply(raw, contact) {
    const reply = String(raw?.reply || '').trim().slice(0, 120) || this.fallbackWechatReply(contact, '');
    const impression = Math.max(0, Math.min(100, Math.round(Number(raw?.impression) || 20)));
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const imageRaw = raw?.imageIntent || {};
    const imageIntent = imageRaw.offer ? { offer: true, reason: String(imageRaw.reason || '联系人愿意发送一张图片').slice(0, 120), imageDescription: String(imageRaw.imageDescription || imageRaw.contentDescription || '一张联系人发送的近照。').slice(0, 180), tagsHint: String(imageRaw.tagsHint || '').slice(0, 300), usesMentionedImage: !!imageRaw.usesMentionedImage } : null;
    return { reply, mood: String(raw?.mood || '平常').slice(0, 20), elapsedSeconds: Math.max(20, Math.min(1800, Number(raw?.elapsedSeconds) || 60)), impression, metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(raw?.metricUpdates, state) || {}, lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(raw?.lexiconUpdates, { character: { work: '2026 现代都市现实世界' } }) || [], imageIntent };
  },

  fallbackWechatReply(contact, text) {
    const rel = String(contact?.relation || '你').replace(/之一|之二/g, '');
    if (/在吗|你好|嗨|哈喽/.test(text)) return `在呀，怎么突然找我？`;
    return `我看到啦，等我想一下再回你。`;
  },
};
