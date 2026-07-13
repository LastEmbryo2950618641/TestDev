window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.imageRecordHelpers = {
  wechatImageRecordText(contactName, label, imageId, imageDescription, read = false) {
      const unread = read ? '' : '玩家';
      const readBy = read ? '玩家' : '';
      return `${contactName || '联系人'}（${label || '时间未知'}）已发送图片[${imageId}]（状态：未读人（${unread}），已读人（${readBy}），图片内容：${imageDescription || '一张联系人发送的近照。'}）`;
    },

  wechatImageReadRecord(msg = {}) {
      return this.wechatImageRecordText(msg.name || '联系人', msg.imageRecordTime || msg.atDisplay || msg.at || '时间未知', msg.imageId || '图片ID', msg.imageDescription || msg.imageIntent?.imageDescription || '一张联系人发送的近照。', true);
    },

  async replaceWechatImageRecord(msg = {}, readRecord = '') {
      const oldRecord = String(msg.imageRecord || '');
      if (!oldRecord || !readRecord) return;
      const cm = window.GameModules.characterMemory;
      const ids = [msg.characterId || this.wechatSelectedContact, 'player-self'].filter(Boolean);
      for (const id of ids) {
        const memory = cm.ensure(id);
        if (this.replaceWechatImageRecordInMemory(memory, oldRecord, readRecord)) await cm.compact(id, memory);
      }
      this.replaceWechatImageRecordInWorldline(oldRecord, readRecord);
    },

  replaceWechatImageRecordInMemory(memory = {}, oldRecord = '', readRecord = '') {
      let changed = false;
      const sections = [memory.shortTerm?.recent, memory.shortTerm?.summaryBuffer, memory.shortTerm?.summarized, memory.shortTerm?.forgotten, memory.longTerm?.vivid, memory.longTerm?.permanent];
      sections.forEach((items) => (items || []).forEach((item) => {
        if (typeof item === 'string') return;
        if (String(item.text || '').includes(oldRecord)) { item.text = String(item.text || '').replace(oldRecord, readRecord); changed = true; }
        if (String(item.summary || '').includes(oldRecord)) { item.summary = String(item.summary || '').replace(oldRecord, readRecord); changed = true; }
      }));
      return changed;
    },

  replaceWechatImageRecordInWorldline(oldRecord = '', readRecord = '') {
      const state = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
      this.realWorldlineState = { ...state, events: (state.events || []).map((event) => String(event.detail || '').includes(oldRecord) ? { ...event, detail: String(event.detail || '').replace(oldRecord, readRecord) } : event) };
    },
};
