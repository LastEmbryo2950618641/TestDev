window.GameModules = window.GameModules || {};

function resolveSaveSlotView() {
  return window.GameModules?.ui?.save?.slotView || null;
}

function defaultSaveMeta(slot) {
  return { slot, exists: false, savedAt: '', playerName: '', phoneSetupDone: false };
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
    return view?.findEmptySlot ? view.findEmptySlot.call(this) : null;
  },

  saveMeta(slot) {
    const view = resolveSaveSlotView();
    return view?.meta ? view.meta.call(this, slot) : defaultSaveMeta(slot);
  },

  formatSaveTime(value) {
    const view = resolveSaveSlotView();
    return view?.formatTime ? view.formatTime.call(this, value) : '无存档';
  },
};
