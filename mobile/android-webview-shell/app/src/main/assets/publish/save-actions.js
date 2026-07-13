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

async function inspectSlotSafe(slot) {
  const inspect = window.GameModules?.platform?.storage?.backend?.inspectSlot;
  if (typeof inspect !== 'function') {
    return defaultSaveMeta(slot);
  }
  try {
    return (await inspect(slot)) || defaultSaveMeta(slot);
  } catch (error) {
    console.warn('save inspectSlot fallback:', error?.message || error);
    return defaultSaveMeta(slot);
  }
}

window.GameModules.saveActions = {
  async refreshSaveMetas() {
    const slots = Array.isArray(this.saveSlots) ? this.saveSlots : [];
    const entries = await Promise.all(slots.map(async (slot) => [slot, await inspectSlotSafe(slot)]));
    this.saveMetas = Object.fromEntries(entries);
  },

  async refreshSaveMeta(slot) {
    if (!slot) return;
    this.saveMetas = { ...(this.saveMetas || {}), [slot]: await inspectSlotSafe(slot) };
  },
};

Object.entries(saveSlotViewForwarders).forEach(([name, helperName]) => {
  window.GameModules.saveActions[name] = function saveSlotViewFacade(...args) {
    const value = callSaveSlotView(helperName, this, ...args);
    if (name === 'saveMeta') return value || defaultSaveMeta(args[0]);
    if (name === 'formatSaveTime') return value || '无存档';
    if (name === 'findEmptySaveSlot') {
      if (value) return value;
      const slots = Array.isArray(this.saveSlots) ? this.saveSlots : [];
      const metas = this.saveMetas || {};
      return slots.find((slot) => !(metas[slot]?.exists)) || null;
    }
    return value;
  };
});
