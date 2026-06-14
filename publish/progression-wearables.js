window.GameModules = window.GameModules || {};

(function setupWearableProgression() {
  const progression = window.GameModules.progression;
  if (!progression) return;
  const baseSchemaSections = progression.schemaSections.bind(progression);
  const baseCreateValues = progression.createValues.bind(progression);
  const baseEnsureStateMechanics = progression.ensureStateMechanics.bind(progression);

  Object.assign(progression, {
    bodyWearSlots() { return ['内衣', '上衣', '内裤', '下衣', '袜子', '鞋子', '外套', '手套', '头部', '颈部', '腰部', '包具']; },
    equipSlotDefaults() { return Array.from({ length: 10 }, (_, i) => `装备${i + 1}`); },
    wearableSlots(existing = []) { return [...this.bodyWearSlots(), ...this.dynamicSlots(existing, '饰品'), ...this.dynamicSlots(existing, '装备', 10)]; },
    slotBase(slot) { return String(slot || '').replace(/\d+$/, ''); },
    dynamicSlots(existing = [], base, min = 0) {
      const slots = (Array.isArray(existing) ? existing : []).map((item) => item?.slot || item).filter((slot) => this.slotBase(slot) === base);
      const max = Math.max(min, ...slots.map((slot) => Number(String(slot).match(/(\d+)$/)?.[1] || 0)));
      return Array.from({ length: max }, (_, i) => `${base}${i + 1}`);
    },
    nextSlot(existing = [], base = '装备') {
      const count = this.dynamicSlots(existing, base).length;
      return `${base}${count + 1}`;
    },

    inferEquipSlots(item = {}, kind = '') {
      const explicit = item.equipSlots || item.equippableSlots || item.wearableSlots || item.equipSlot || item.slot;
      const list = Array.isArray(explicit) ? explicit : String(explicit || '').split(/[、,，/|；;\s]+/);
      const slots = list.map((x) => String(x || '').trim()).filter(Boolean);
      const text = `${item.name || ''}${item.description || item.desc || ''}`;
      for (const slot of this.bodyWearSlots()) if (text.includes(slot) && !slots.includes(slot)) slots.push(slot);
      if (/戒指|项链|耳环|手链|胸针|饰品/.test(text) && !slots.includes('饰品')) slots.push('饰品');
      if ((kind === '装备' || item.type === '装备' || item.kind === '装备') && !slots.length) slots.push('装备');
      return [...new Set(slots)];
    },

    normalizeCarryItem(item, kind = '物品') {
      const obj = typeof item === 'string' ? { name: item } : { ...(item || {}) };
      const name = String(obj.name || obj.label || '未命名物品').slice(0, 32);
      return { ...obj, name, type: obj.type || kind, kind: obj.kind || kind, quantity: Math.max(1, Number(obj.quantity) || 1), equipSlots: this.inferEquipSlots(obj, kind), level: Number(obj.level) > 0 ? obj.level : -1 };
    },

    defaultWearing(existing = []) {
      const old = Array.isArray(existing) ? existing : [];
      return this.wearableSlots(old).map((slot) => {
        const hit = old.find((item) => item?.slot === slot);
        return hit ? { ...hit, slot, type: hit.type || '穿着', level: -1 } : { slot, name: '未穿戴', type: '穿着', description: '该部位暂无已记录穿着。', level: -1 };
      });
    },

    ensureInventoryFields(values) {
      if (!values) return false;
      const before = JSON.stringify({ equipment: values.equipment, items: values.items, wearing: values.wearing });
      values.equipment = (Array.isArray(values.equipment) ? values.equipment : []).map((item) => this.normalizeCarryItem(item, '装备'));
      values.items = (Array.isArray(values.items) ? values.items : []).map((item) => this.normalizeCarryItem(item, '物品'));
      values.wearing = this.defaultWearing(values.wearing);
      return before !== JSON.stringify({ equipment: values.equipment, items: values.items, wearing: values.wearing });
    },

    schemaSections(attrs) {
      return baseSchemaSections(attrs).map((section) => {
        if (section.title !== '习得与职业') return section;
        const fields = [...section.fields];
        const insertAfter = fields.findIndex((field) => field.key === 'equipment') + 1;
        const additions = [
          this.field('items', '物品', 'list', 0, 100, '当前持有、可消耗、可转让或可用于现实行动的普通物品。'),
          this.field('wearing', '穿着', 'list', 0, 100, '当前穿戴在各身体部位、饰品位和装备位的衣物、装备、饰品与包具。'),
        ].filter((field) => !fields.some((item) => item.key === field.key));
        fields.splice(insertAfter || fields.length, 0, ...additions);
        return { ...section, fields };
      });
    },

    createValues(character, seed, existing) {
      const values = baseCreateValues(character, seed, existing || {});
      values.equipment = values.equipment?.length ? values.equipment : (character.equipment || []);
      values.items = values.items?.length ? values.items : (character.items || []);
      values.wearing = values.wearing?.length ? values.wearing : (character.wearing || []);
      this.ensureInventoryFields(values);
      return values;
    },

    ensureStateMechanics(state, character = state?.profile || {}) {
      const changed = baseEnsureStateMechanics(state, character);
      return this.ensureInventoryFields(state?.values) || changed;
    },
  });
})();
