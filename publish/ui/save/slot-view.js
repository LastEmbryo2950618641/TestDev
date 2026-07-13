window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.save = window.GameModules.ui.save || {};

window.GameModules.ui.save.slotView = {
  findEmptySlot() {
    const slots = Array.isArray(this.saveSlots) ? this.saveSlots : [];
    const metas = this.saveMetas || {};
    return slots.find((slot) => !(metas[slot]?.exists)) || null;
  },

  meta(slot) {
    return this.saveMetas[slot] || { slot, exists: false, savedAt: '', playerName: '', phoneSetupDone: false };
  },

  formatTime(value) {
    if (!value) return '无存档';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间未知';
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },

  slotRow(slot = '') {
    const meta = this.meta(slot);
    return {
      key: slot,
      slot,
      active: this.selectedSlot === slot,
      exists: !!meta.exists,
      statusText: meta.exists ? '已有存档' : '空存档位',
      timeText: '最近：' + this.formatTime(meta.savedAt),
      label: this.saveSlotLabel?.(slot) || slot,
      homeSummary: (this.saveSlotLabel?.(slot) || slot) + ' · ' + this.formatTime(meta.savedAt),
    };
  },

  slotRows() {
    return (this.saveSlots || []).map((slot) => this.slotRow(slot));
  },

  savePanelView() {
    return {
      rows: this.slotRows(),
    };
  },
};
