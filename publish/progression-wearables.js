window.GameModules = window.GameModules || {};

(function setupWearableProgression() {
  const progression = window.GameModules.progression;
  if (!progression) return;
  const baseSchemaSections = progression.schemaSections.bind(progression);
  const baseCreateValues = progression.createValues.bind(progression);
  const baseEnsureStateMechanics = progression.ensureStateMechanics.bind(progression);

  Object.assign(progression, {
    wearableSlots() {
      return ['内衣', '上衣', '内裤', '下衣', '袜子', '鞋子', '外套', '手套', '头部', '颈部', '腰部', '包具', '饰品1', '饰品2', '饰品3', '饰品4'];
    },

    defaultWearing(existing = []) {
      const old = Array.isArray(existing) ? existing : [];
      return this.wearableSlots().map((slot) => old.find((item) => item?.slot === slot) || { slot, name: '未穿戴', type: '穿着', description: '该部位暂无已记录穿着。', level: -1 });
    },

    ensureInventoryFields(values) {
      if (!values) return false;
      let changed = false;
      if (!Array.isArray(values.equipment)) { values.equipment = []; changed = true; }
      if (!Array.isArray(values.items)) { values.items = []; changed = true; }
      if (!Array.isArray(values.wearing)) { values.wearing = []; changed = true; }
      const next = this.defaultWearing(values.wearing);
      if (JSON.stringify(next) !== JSON.stringify(values.wearing)) { values.wearing = next; changed = true; }
      return changed;
    },

    schemaSections(attrs) {
      return baseSchemaSections(attrs).map((section) => {
        if (section.title !== '习得与职业') return section;
        const fields = [...section.fields];
        const insertAfter = fields.findIndex((field) => field.key === 'equipment') + 1;
        const additions = [
          this.field('items', '物品', 'list', 0, 100, '当前持有、可消耗、可转让或可用于现实行动的普通物品。'),
          this.field('wearing', '穿着', 'list', 0, 100, '当前穿戴在各身体部位与随身位置的衣物、鞋帽、饰品和包具。'),
        ].filter((field) => !fields.some((item) => item.key === field.key));
        fields.splice(insertAfter || fields.length, 0, ...additions);
        return { ...section, fields };
      });
    },

    createValues(character, seed, existing) {
      const values = baseCreateValues(character, seed, existing || {});
      this.ensureInventoryFields(values);
      return values;
    },

    ensureStateMechanics(state, character = state?.profile || {}) {
      const changed = baseEnsureStateMechanics(state, character);
      return this.ensureInventoryFields(state?.values) || changed;
    },
  });
})();
