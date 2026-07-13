window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.save = window.GameModules.app.save || {};

window.GameModules.app.save.slotMutationFlow = {
  async overwriteSlotFlow(slot) {
    if (this.busy) return;
    const source = this.selectedSlot;
    await this.save();
    if (slot !== source) {
      const raw = await window.GameModules.platform.core.storage.backend.readRaw(source);
      await window.GameModules.storage.remove(slot);
      if (raw) await window.GameModules.platform.core.storage.backend.writeRaw(slot, raw);
      this.selectedSlot = slot;
      await window.GameModules.storage.open(slot);
      const save = await window.GameModules.storage.get();
      if (save) window.GameModules.storage.restore(this, save);
      await this.loadWritingStyles();
      this.loadSavedRpgStates();
    }
    await this.refreshSaveMetas();
    this.saveMessage = slot === source ? `已覆盖保存 ${slot}` : `已完整复制当前数据并覆盖 ${slot}`;
  },

  async newSlotFlow(slot) {
    await window.GameModules.storage.remove(slot);
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot, { deferPersist: true });
    await this.loadWritingStyles({ deferPersist: true });
    this.started = false;
    this.turn = 1;
    this.log = [];
    this.rpgStates = {};
    this.rpgPanelCharacterId = this.selectedCharacterId;
    if (this.phoneSetupDone) await this.ensurePlayerRpgState?.(true);
    await window.GameModules.platform.core.storage.backend.persist();
  },
};
