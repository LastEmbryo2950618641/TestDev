window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.save = window.GameModules.app.save || {};

window.GameModules.app.save.slotFlow = {
  async openSlotFlow(slot) {
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot);
    const save = await window.GameModules.storage.get();
    if (save) window.GameModules.storage.restore(this, save);
    await this.loadWritingStyles({ readOnly: true });
    this.ensureCatalogSelection();
    this.loadSavedRpgStates();
  },

  async loadSlotFlow(slot) {
    if (this.busy || !this.saveMeta(slot).exists) return;
    await window.GameModules.app.save.slotFlow.openSlotFlow.call(this, slot);
    await this.refreshSaveMetas();
    this.saveMessage = `已读取 ${slot}`;
    this.savePanelOpen = false;
    this.saveAppOpen = false;
  },
};
