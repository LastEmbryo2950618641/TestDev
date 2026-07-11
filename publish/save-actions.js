window.GameModules = window.GameModules || {};

const saveSlotViewForwarders = {
  findEmptySaveSlot: 'findEmptySlot',
  saveMeta: 'meta',
  formatSaveTime: 'formatTime',
};

function resolveSaveSlotView() {
  return window.GameModules?.ui?.save?.slotView || null;
}

function callSaveSlotView(name, context, ...args) {
  const view = resolveSaveSlotView();
  return view?.[name] ? view[name].call(context, ...args) : null;
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
};

Object.entries(saveSlotViewForwarders).forEach(([name, helperName]) => {
  window.GameModules.saveActions[name] = function saveSlotViewFacade(...args) {
    const value = callSaveSlotView(helperName, this, ...args);
    if (name === 'saveMeta') return value || defaultSaveMeta(args[0]);
    if (name === 'formatSaveTime') return value || '无存档';
    return value;
  };
});
