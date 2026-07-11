window.GameModules = window.GameModules || {};

function resolveSaveSlotView() {
  return window.GameModules?.ui?.save?.slotView || null;
}

window.GameModules.saveActions = {
  async refreshSaveMetas() {
    const entries = await Promise.all(this.saveSlots.map(async (slot) => [slot, await window.GameModules.platform.storage.backend.inspectSlot(slot)]));
    this.saveMetas = Object.fromEntries(entries);
  },

  async refreshSaveMeta(slot) {
    if (!slot) return;
    this.saveMetas = { ...(this.saveMetas || {}), [slot]: await window.GameModules.platform.storage.backend.inspectSlot(slot) };
  },

  findEmptySaveSlot() {
    const view = resolveSaveSlotView();
    if (view?.findEmptySlot) return view.findEmptySlot.call(this);
    return (this.saveSlots || []).find((slot) => !(this.saveMetas?.[slot]?.exists)) || null;
  },
  saveMeta(slot) {
    const view = resolveSaveSlotView();
    if (view?.meta) return view.meta.call(this, slot);
    return this.saveMetas?.[slot] || { slot, exists: false, savedAt: '', playerName: '', phoneSetupDone: false };
  },
  formatSaveTime(value) {
    const view = resolveSaveSlotView();
    if (view?.formatTime) return view.formatTime.call(this, value);
    if (!value) return '无存档';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
};
