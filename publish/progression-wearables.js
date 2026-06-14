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
      const rules = [
        ['内衣', /内衣|胸衣|文胸|bra|背心/iu], ['上衣', /上衣|衬衫|T恤|短袖|长袖|卫衣|毛衣|外衣/iu],
        ['内裤', /内裤|底裤|三角裤|四角裤|brief|panty/iu], ['下衣', /下衣|裤|长裤|短裤|裙|牛仔裤|运动裤/iu],
        ['袜子', /袜|丝袜|短袜|长袜/iu], ['鞋子', /鞋|靴|凉鞋|运动鞋|皮鞋/iu],
        ['外套', /外套|大衣|风衣|夹克|披风|斗篷/iu], ['手套', /手套/iu], ['头部', /帽|头盔|发饰/iu],
        ['颈部', /项链|围巾|领带|项圈/iu], ['腰部', /腰带|皮带/iu], ['包具', /包|背包|挎包|手提包|书包/iu],
      ];
      for (const slot of this.bodyWearSlots()) if (text.includes(slot) && !slots.includes(slot)) slots.push(slot);
      for (const [slot, re] of rules) if (re.test(text) && !slots.includes(slot)) slots.push(slot);
      if (/戒指|项链|耳环|手链|胸针|饰品/.test(text) && !slots.includes('饰品')) slots.push('饰品');
      if ((kind === '装备' || item.type === '装备' || item.kind === '装备') && !slots.length) slots.push('装备');
      return [...new Set(slots)];
    },

    normalizeCarryItem(item, kind = '物品') {
      const obj = typeof item === 'string' ? { name: item } : { ...(item || {}) };
      const name = String(obj.name || obj.label || '未命名物品').slice(0, 32);
      return { ...obj, name, type: obj.type || kind, kind: obj.kind || kind, quantity: Math.max(1, Number(obj.quantity) || 1), equipSlots: this.inferEquipSlots(obj, kind), level: Number(obj.level) > 0 ? obj.level : -1 };
    },

    defaultWearForSlot(slot) {
      const names = { 内衣: '日常内衣', 上衣: '日常上衣', 内裤: '日常内裤', 下衣: '日常下衣', 袜子: '日常袜子', 鞋子: '日常鞋子' };
      return names[slot] ? { slot, name: names[slot], type: '穿着', description: '上下文未写明异常，按常规场景补齐的基础穿着。', level: -1 } : null;
    },

    isPlaceholderEmptyWear(item) {
      return !item?.name || item.name === '未记录' || (item.name === '未穿戴' && /暂无已记录|未被上下文记录/.test(item.description || ''));
    },

    defaultWearing(existing = []) {
      const old = Array.isArray(existing) ? existing : [];
      return this.wearableSlots(old).map((slot) => {
        const hit = old.find((item) => item?.slot === slot);
        if (hit && !this.isPlaceholderEmptyWear(hit)) return { ...hit, slot, type: hit.type || '穿着', level: -1 };
        const basic = this.defaultWearForSlot(slot);
        if (basic) return basic;
        return { slot, name: '未穿戴', type: '穿着', description: '该槽位当前未穿戴，表示对应部位空置。', level: -1 };
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
