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

function callSaveFlow(flowName, method, context, ...args) {
  const flow = window.GameModules?.app?.save?.[flowName];
  const action = flow?.[method];
  if (typeof action !== 'function') throw new Error(`Save flow unavailable: ${flowName}.${method}`);
  return action.call(context, ...args);
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
  async openSlot(slot) {
    return callSaveFlow('slotFlow', 'openSlotFlow', this, slot);
  },

  async loadSlot(slot) {
    return callSaveFlow('slotFlow', 'loadSlotFlow', this, slot);
  },

  async overwriteSlot(slot) {
    return callSaveFlow('slotMutationFlow', 'overwriteSlotFlow', this, slot);
  },

  async newSlot(slot) {
    return callSaveFlow('slotMutationFlow', 'newSlotFlow', this, slot);
  },

  async refreshSaveMetas() {
    const slots = Array.isArray(this.saveSlots) ? this.saveSlots : [];
    const inspectWithTimeout = async (slot) => {
      const timeoutMs = 1200;
      return await Promise.race([
        inspectSlotSafe(slot),
        new Promise((resolve) => setTimeout(() => resolve(defaultSaveMeta(slot)), timeoutMs)),
      ]);
    };
    const entries = await Promise.all(slots.map(async (slot) => [slot, await inspectWithTimeout(slot)]));
    this.saveMetas = Object.fromEntries(entries);
  },

  async refreshSaveMeta(slot) {
    if (!slot) return;
    this.saveMetas = { ...(this.saveMetas || {}), [slot]: await inspectSlotSafe(slot) };
  },

  rpgVitals(state) {
    const values = state?.values || {};
    const percent = (pool) => pool?.max ? Math.round((pool.current / pool.max) * 100) : 100;
    const vital = (key, label, poolKey = key) => {
      const pool = values[poolKey];
      const note = values.vital_update_notes?.[poolKey];
      return { key, label, value: poolKey === 'stamina_pool' ? (values.stamina ?? percent(pool)) : percent(pool), text: note?.reason || this.rpgFieldValue(pool) };
    };
    return [
      { key: 'health', label: '生命力', value: values.health ?? percent(values.vitality), text: this.rpgFieldValue(values.vitality) },
      vital('stamina', '精力', 'stamina_pool'),
      vital('satiety', '饱食度'),
      vital('hydration', '水分'),
      vital('fatigue', '疲劳度'),
      vital('mental_stability', '精神稳定'),
    ];
  },

  rpgFieldValue(value) {
    if (Array.isArray(value)) return value.map((item) => this.rpgFieldValue(item));
    if (!value || typeof value !== 'object') return value;
    if (Object.prototype.hasOwnProperty.call(value, 'next')) return `${value.current || 0}/${value.next || 'max'}`;
    if (Object.prototype.hasOwnProperty.call(value, 'current') && Object.prototype.hasOwnProperty.call(value, 'max')) return `${value.current}/${value.max}`;
    if (value.type === '职业') return `${value.name} lv.${value.level || 1}`;
    if (Object.values(value).some((item) => item?.partKey && item?.status)) return Object.values(value).map((item) => `${item.part || item.partKey}：${item.status || '稳定'}`).join('；');
    if (Object.prototype.hasOwnProperty.call(value, 'onlineCount')) return `上线${value.onlineCount || 0}次｜${value.feeling || '未知'}｜适应${value.adaptation || 0}/100｜了解:${value.controllerAwareness || '尚不知晓控制者是谁'}｜${value.summary || ''}`;
    if (Object.prototype.hasOwnProperty.call(value, 'totalLevelUps')) return `累计升级${value.totalLevelUps || 0}次｜自动${value.autoPointsPerLevel || 1}点/级｜自由${value.freePointsPerLevel || 1}点/级`;
    if (value.attackPower || value.defensePower) return `攻${value.attackPower || 0}｜防${value.defensePower || 0}｜${value.damageRuleNote || ''}`;
    if (value.effectiveDamage !== undefined) return `${value.summary || '战斗模拟'}｜伤害${value.effectiveDamage}`;
    if (value.level) return `${value.name} lv${value.level}（${value.type || '能力'}）`;
    if (Object.prototype.hasOwnProperty.call(value, 'name') && (Object.prototype.hasOwnProperty.call(value, 'worldTag') || Object.prototype.hasOwnProperty.call(value, 'updatedAt') || Object.prototype.hasOwnProperty.call(value, 'reason'))) {
      return window.GameModules.characterQuery?.locationText?.(value) || [value.name, value.worldTag, value.reason].filter(Boolean).join('｜') || String(value.name || '未记录');
    }
    return JSON.stringify(value);
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
