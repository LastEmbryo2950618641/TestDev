window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.chatMessageHelpers = {

  appendWechatMessage(id, msg) {
    const key = id || 'group-main';
    const time = msg.time || this.wechatMessageTime();
    const saved = { ...msg, at: time.label, atDisplay: time.display, time: time.value };
    const list = [...(this.wechatMessagesByContact?.[key] || []), saved].slice(-40);
    this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}), [key]: list };
    this.saveWechatHistoryRow?.(key, saved)?.catch?.((err) => console.warn('[微信] 固定历史写入失败:', err?.code || '', err?.message || String(err), err?.stack || ''));
    if (msg.text) this.updateWechatLatest(key, msg.text, msg.side === 'other');
  },

  wechatMessageTime() {
    const d = this.phoneDate?.() || new Date();
    return { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), display: this.wechatTimeDisplay(d), value: this.wechatTimeValue(d) };
  },

  wechatMemoryTime() {
    const d = this.phoneDate?.() || new Date();
    return { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), value: this.wechatTimeValue(d) };
  },

  wechatDialogueTimeLabel(label = '') {
    return String(label || '时间未知').replace(/日周/g, '日 周');
  },

  formatWechatDialogueLog(playerName, contactName, label, playerText, replyText = '') {
    const time = this.wechatDialogueTimeLabel(label);
    return [
      '以下来自微信对话。',
      `${playerName}（${time}）：“${playerText}”`,
      replyText ? `${contactName}（${time}）：“${replyText}”` : '',
    ].filter(Boolean).join('');
  },

  wechatTimeValue(d) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
  },

  wechatTimeDisplay(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

};
