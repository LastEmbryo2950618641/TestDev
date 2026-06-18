window.GameModules = window.GameModules || {};

(function setupWearableProgression() {
  const progression = window.GameModules.progression;
  if (!progression) return;
  const baseSchemaSections = progression.schemaSections.bind(progression);
  const baseCreateValues = progression.createValues.bind(progression);
  const baseEnsureStateMechanics = progression.ensureStateMechanics.bind(progression);

  Object.assign(progression, {
    bodyWearSlots() { return ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist']; },
    equipSlotDefaults() { return Array.from({ length: 10 }, (_, i) => `装备${i + 1}`); },
    wearableSlots(existing = []) { return [...this.bodyWearSlots(), ...this.customWearSlots(existing), ...this.dynamicSlots(existing, '饰品'), ...this.dynamicSlots(existing, '装备', 10)]; },
    customWearSlots(existing = []) {
      const reserved = new Set([...this.bodyWearSlots(), '饰品', '装备']);
      return [...new Set((Array.isArray(existing) ? existing : []).map((item) => this.canonicalWearSlot(item?.slot ? item : { slot: item })).filter((slot) => slot && !reserved.has(this.slotBase(slot))))];
    },
    slotBase(slot) { return String(slot || '').replace(/\d+$/, ''); },
    canonicalWearSlot(itemOrSlot) {
      const item = typeof itemOrSlot === 'object' && itemOrSlot ? itemOrSlot : { slot: itemOrSlot };
      const slot = String(item.slot || '').trim();
      if (this.bodyWearSlots().includes(slot)) return slot;
      const text = `${slot}${item.clothing_position || ''}${item.name || ''}${item.description || ''}`;
      const exact = { 头部: 'head', 颈部: 'neck', 上衣: 'top', 外套: 'outerwear', 手套: 'gloves', 腰部: 'waist', 下衣: 'bottom', 下装: 'bottom', 袜子: 'socks', 鞋子: 'shoes', 手腕: 'wrist' }[slot];
      if (exact) return exact;
      if (slot === '内裤') return 'innerwearBottom';
      if (slot === '内衣') return /内裤|底裤|三角裤|四角裤/.test(text) ? 'innerwearBottom' : 'innerwearTop';
      return slot;
    },
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

    pollutedReason(text = '') {
      const value = String(text || '').trim();
      return value.length > 90 || /变化方式|生成来源|词条名AI生成|值AI生成/.test(value) || /[：:](妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长)[：:]/.test(value);
    },

    cleanRelationText(text = '') {
      return String(text || '').replace(/([：:])(?=(妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长|朋友|同学|同事)[：:])/g, '；');
    },

    itemReason(item = {}, kind = '物品') {
      if ((kind === '穿着' || item.type === '穿着') && item?.name === '未穿戴') return String(item.reason || item.changeMode || `${item.clothing_position || item.slot || '该'}槽位当前未穿戴。`).slice(0, 120);
      const raw = this.cleanRelationText(String(item.reason || '').trim());
      const fallbackRaw = this.cleanRelationText(String(item.changeMode || '').trim());
      const candidate = raw && !this.pollutedReason(raw) ? raw : fallbackRaw;
      const vague = window.GameModules.characterProfile?.abstractReason?.(candidate) || /当前角色资料|持有状态|穿戴槽位|固化/.test(candidate) || this.pollutedReason(candidate);
      if (candidate && !vague) return candidate.slice(0, 120);
      const name = item.name || item.label || '未命名物品';
      const slot = item.slot ? String(item.slot) : '';
      const slots = (Array.isArray(item.equipSlots) ? item.equipSlots : String(item.equipSlots || '').split(/[、,，/|；;\s]+/)).filter(Boolean).join('、');
      if (kind === '穿着' || item.type === '穿着') return `${name}当前${slot ? `占用${slot}槽位` : '处于已穿戴状态'}，因此会影响角色此刻外观和行动。`;
      if (kind === '装备' || item.type === '装备') return `${name}被记录为当前可调用装备${slots ? `，可装备在${slots}` : ''}，后续获得、损坏、转让或穿戴时会更新。`;
      if (kind === '物品' || item.type === '物品') return `${name}被记录为当前持有物${item.quantity ? `，数量为${item.quantity}` : ''}，后续使用、消耗、转让或遗失时会更新。`;
      return `${name}当前属于${kind}词条，后续由明确行动或状态变化更新。`;
    },

    normalizeCarryItem(item, kind = '物品', ownerId = '') {
      const obj = typeof item === 'string' ? { name: item } : { ...(item || {}) };
      const name = String(obj.name || obj.label || '未命名物品').slice(0, 32);
      const finalOwnerId = String(obj.ownerId || obj.characterId || ownerId || '').trim();
      const id = String(obj.id || (finalOwnerId ? this.itemId(finalOwnerId, kind, obj.slot || '', name) : '')).slice(0, 80);
      const reason = this.itemReason({ ...obj, name }, kind);
      const mode = obj.changeMode && !this.pollutedReason(obj.changeMode) && String(obj.changeMode).length < 24 ? obj.changeMode : '状态规范化';
      return { ...obj, id, ownerId: finalOwnerId, characterId: finalOwnerId, name, type: obj.type || kind, kind: obj.kind || kind, quantity: Math.max(1, Number(obj.quantity) || 1), equipSlots: this.inferEquipSlots(obj, kind), reason, changeMode: mode, level: Number(obj.level) > 0 ? obj.level : -1 };
    },

    itemId(ownerId = '', kind = '物品', slot = '', name = '') {
      const raw = `${ownerId || 'unknown'}:${kind}:${slot}:${name}`;
      return `item_${window.GameModules.rpgState?.seed?.(raw) || Math.abs([...raw].reduce((sum, ch) => sum + ch.charCodeAt(0), 0))}`;
    },

    clothingPositionForSlot(slot) {
      const base = this.slotBase(slot);
      return ({ head: '头部', neck: '颈部', innerwearTop: '内衣', top: '上衣', outerwear: '外套', gloves: '手套', waist: '腰部', innerwearBottom: '内衣', bottom: '下装', socks: '袜子', shoes: '鞋子', wrist: '手腕', 内衣: '内衣', 上衣: '上衣', 内裤: '内衣', 下衣: '下装', 袜子: '袜子', 鞋子: '鞋子', 外套: '外套', 手套: '手套', 头部: '头部', 颈部: '颈部', 腰部: '腰部', 包具: '肩部', 饰品: '装饰部位', 装备: '装备位' })[base] || base || '';
    },

    defaultWearForSlot(slot) {
      return null;
    },

    isPlaceholderEmptyWear(item) {
      return !item?.name
        || item.name === '未记录'
        || /^日常(内衣|上衣|内裤|下衣|袜子|鞋子)$/.test(item.name)
        || /上下文未写明异常|常规场景基础穿着槽位/.test(`${item.description || ''}${item.reason || ''}${item.changeMode || ''}`)
        || (item.name === '未穿戴' && /暂无已记录|未被上下文记录/.test(item.description || ''));
    },

    defaultWearing(existing = [], ownerId = '') {
      const old = Array.isArray(existing) ? existing.map((item) => ({ ...(item || {}), slot: this.canonicalWearSlot(item) })) : [];
      return this.wearableSlots(old).map((slot) => {
        const hit = old.find((item) => item?.slot === slot);
        if (hit && !this.isPlaceholderEmptyWear(hit)) {
          const reason = this.itemReason(hit, '穿着');
          const mode = hit.changeMode && !this.pollutedReason(hit.changeMode) && String(hit.changeMode).length < 24 ? hit.changeMode : '状态规范化';
          const finalOwnerId = hit.ownerId || hit.characterId || ownerId;
          return { ...hit, id: hit.id || (finalOwnerId ? this.itemId(finalOwnerId, '穿着', slot, hit.name || '未穿戴') : ''), ownerId: finalOwnerId, characterId: finalOwnerId, slot, clothing_position: hit.clothing_position || this.clothingPositionForSlot(slot), slotLabel: hit.slotLabel || this.clothingPositionForSlot(slot), type: hit.type || '穿着', reason, changeMode: mode, level: -1 };
        }
        const basic = this.defaultWearForSlot(slot);
        if (basic) return basic;
        const position = this.clothingPositionForSlot(slot);
        const reason = hit?.reason || `${position || slot}槽位缺少AI生成的穿着或未穿戴原因，请重新生成个人资料。`;
        return { id: ownerId ? this.itemId(ownerId, '穿着', slot, '未穿戴') : '', ownerId, characterId: ownerId, slot, clothing_position: position, slotLabel: position, name: '未穿戴', type: '穿着', description: '该槽位缺少有效AI穿着记录。', reason, changeMode: reason, level: -1 };
      });
    },

    profileWearingItems(profile = {}) {
      const raw = Array.isArray(profile.wearingItems) ? profile.wearingItems : (window.GameModules.characterProfile?.wearingItemsLoose?.(profile.wearing) || []);
      const ownerId = String(profile.id || '').trim();
      return raw.map((item) => {
        const slot = this.canonicalWearSlot(item);
        const reason = item?.reason || item?.changeMode || '';
        const name = item?.name || '未穿戴';
        const id = item?.id || (ownerId ? this.itemId(ownerId, '穿着', slot, name) : '');
        return { ...(item || {}), id, ownerId, characterId: ownerId, slot, clothing_position: item?.clothing_position || this.clothingPositionForSlot(slot), slotLabel: item?.slotLabel || this.clothingPositionForSlot(slot), type: '穿着', reason, changeMode: reason || item?.changeMode || '', level: -1 };
      }).filter((item) => item.slot && item.reason).slice(0, 40);
    },

    generatedFallbackWear(item = {}) {
      return !item?.slot || /缺少AI生成|缺少有效AI|没有已穿戴物，表示该可穿戴位置空置|该槽位当前未穿戴，表示对应部位空置|暂无已记录|未被上下文记录|状态规范化|常规场景基础穿着槽位/.test(`${item.description || ''}${item.reason || ''}${item.changeMode || ''}`);
    },

    shouldReplaceWearing(current = [], incoming = []) {
      if (!incoming.length) return false;
      const fixed = this.bodyWearSlots();
      const old = Array.isArray(current) ? current.map((item) => ({ ...(item || {}), slot: this.canonicalWearSlot(item) })) : [];
      const incomingSlots = new Set(incoming.map((item) => item.slot));
      if (!fixed.every((slot) => incomingSlots.has(slot))) return false;
      if (!old.length) return true;
      const oldSlots = new Set(old.map((item) => item.slot));
      if (!fixed.every((slot) => oldSlots.has(slot))) return true;
      return old.some((item) => fixed.includes(item.slot) && this.generatedFallbackWear(item));
    },

    syncInventoryFromProfile(state, profile = state?.profile || {}) {
      if (!state?.values || !profile) return false;
      let changed = false;
      const before = JSON.stringify({ items: state.values.items, wearing: state.values.wearing });
      if (Array.isArray(profile.items) && profile.items.length && (!Array.isArray(state.values.items) || !state.values.items.length)) state.values.items = profile.items;
      const wearing = this.profileWearingItems(profile);
      if (this.shouldReplaceWearing(state.values.wearing, wearing)) state.values.wearing = wearing;
      this.ensureInventoryFields(state.values, state.id || profile.id || '');
      changed = before !== JSON.stringify({ items: state.values.items, wearing: state.values.wearing });
      return changed;
    },

    ensureInventoryFields(values, ownerId = '') {
      if (!values) return false;
      const before = JSON.stringify({ items: values.items, wearing: values.wearing });
      values.items = (Array.isArray(values.items) ? values.items : []).map((item) => this.normalizeCarryItem(item, item.type || '物品', ownerId));
      values.wearing = this.defaultWearing(values.wearing, ownerId);
      return before !== JSON.stringify({ items: values.items, wearing: values.wearing });
    },

    schemaSections(attrs) {
      return baseSchemaSections(attrs).map((section) => {
        if (section.title !== '习得与职业') return section;
        const fields = [...section.fields];
        const insertAfter = fields.findIndex((field) => field.key === 'force_positions') + 1;
        const additions = [
          this.field('items', '物品', 'list', 0, 100, '当前持有、可消耗、可转让或可用于现实行动的物品与装备。'),
          this.field('wearing', '穿着', 'list', 0, 100, '当前穿戴在各人体着装部位、饰品位和装备位的衣物、装备、饰品与包具。'),
        ].filter((field) => !fields.some((item) => item.key === field.key));
        fields.splice(insertAfter || fields.length, 0, ...additions);
        return { ...section, fields };
      });
    },

    createValues(character, seed, existing) {
      const values = baseCreateValues(character, seed, existing || {});
      values.items = values.items?.length ? values.items : (character.items || []);
      values.wearing = values.wearing?.length ? values.wearing : (character.wearingItems || character.wearing || []);
      this.ensureInventoryFields(values, character.id || '');
      return values;
    },

    ensureStateMechanics(state, character = state?.profile || {}) {
      const changed = baseEnsureStateMechanics(state, character);
      return this.ensureInventoryFields(state?.values, state?.id || character?.id || '') || changed;
    },
  });
})();
