window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.factionQueryInstalled) return;

  Object.assign(ctx, {
    factionQueryInstalled: true,

    faction(store, method, params = {}) {
      store.initFactionSystem?.();
      if (method === 'listFactions') return this.factionList(store);
      if (method === 'searchFactionOne') return this.factionSearch(store, params);
      if (method === 'getFactionDetail') return this.factionDetail(store, params.name || params.id || params.keyword);
      if (method === 'upsertFaction') return this.upsertFaction(store, params);
      if (method === 'addFactionPosition') return this.addFactionPosition(store, params);
      return this.factionList(store);
    },

    factionRows(store) {
      return store.factionState?.factions || [];
    },

    factionList(store) {
      const rows = this.factionRows(store);
      return rows.map((f) => `- ${f.name}｜${f.type || '组织'}｜${f.level || '未知'}｜归属：${store.factionParentName?.(f) || f.parentName || '未知'}`).join('\n') || '暂无势力。';
    },

    factionSearch(store, params = {}) {
      const key = String(params.keyword || params.name || '').trim();
      const hit = this.findFaction(store, key);
      return hit ? this.limit(this.factionText(store, hit), 1000) : '未命中势力。';
    },

    factionDetail(store, key = '') {
      const hit = this.findFaction(store, String(key || '').trim());
      return hit ? this.limit(this.factionText(store, hit), 1600) : '未命中势力。';
    },

    findFaction(store, key = '') {
      const rows = this.factionRows(store);
      if (!key) return rows[0] || null;
      return rows.find((f) => f.id === key || f.name === key || this.factionRaw(f).includes(key)) || null;
    },

    factionRaw(f = {}) {
      return `${f.id || ''}\n${f.name || ''}\n${JSON.stringify(f)}`;
    },

    factionText(store, f = {}) {
      const structure = (f.structure || []).map((node) => {
        const roles = store.normalizeFactionRoles?.(node.roles)?.map((role) => `${role.title}：${(role.characters || ['未知']).join('、')}`).join('；') || '职位未记录';
        return `- ${node.name || '未命名节点'}：${roles}`;
      }).join('\n') || '暂无组织架构。';
      return [`势力：${f.name}`, `类型/层级：${f.type || '组织'}｜${f.level || '未知'}｜影响力${f.influence ?? '未知'}`, `归属：${store.factionParentName?.(f) || f.parentName || '未知'}`, `地点/领域：${f.location || '未知'}｜${f.domain || '未知'}`, `说明：${f.description || '暂无说明。'}`, `组织架构：\n${structure}`, `规则：${(f.rules || []).join('；') || '暂无'}`, `资源：${(f.resources || []).join('、') || '暂无'}`].join('\n');
    },

    upsertFaction(store, params = {}) {
      store.initFactionSystem?.();
      const name = String(params.name || params.factionName || params.keyword || '').trim();
      if (!name) return '新增或调整势力失败：缺少势力名。';
      const now = store.phoneDate?.().toISOString?.() || new Date().toISOString();
      const parent = this.findFaction(store, params.parentName || params.parentId || '') || this.findFaction(store, '中华人民共和国');
      let faction = this.findFaction(store, name);
      const patch = this.factionPatch(params, parent, now);
      if (!faction) {
        faction = { id: store.factionIdByName?.(name) || `force-${Date.now()}`, name, ...patch, fixed: true, updatedAt: now };
        faction.fieldReasons = store.completeFactionReasons?.(faction, {}, params.reason || '现实推演确认出现新势力或下属单位。') || {};
        faction.changeLog = [{ field: 'all', reason: params.reason || '现实推演新增势力。', at: now, action: 'add' }];
        store.factionState.factions.push(store.normalizeFactionStructure?.(faction) || faction);
        return `已新增势力：${name}\n${this.factionText(store, faction)}`;
      }
      Object.entries(patch).forEach(([key, value]) => { if (value !== undefined && value !== '' && JSON.stringify(faction[key]) !== JSON.stringify(value)) faction[key] = value; });
      faction.updatedAt = now;
      faction.changeLog = [{ field: 'partial', reason: params.reason || '现实推演调整势力资料。', at: now, action: 'adjust' }, ...(faction.changeLog || [])].slice(0, 50);
      store.normalizeFactionStructure?.(faction);
      return `已调整势力：${name}\n${this.factionText(store, faction)}`;
    },

    factionPatch(params = {}, parent = null, now = '') {
      return { type: params.type || '组织', parentId: params.parentId || parent?.id || 'country-china', parentName: params.parentName || parent?.name || '中华人民共和国', level: params.level || '组织级', location: params.location || '未知', domain: params.domain || '现实社会关系', scale: params.scale || '未知', stance: params.stance || '中立', influence: Number(params.influence) || 30, description: params.description || params.summary || '现实推演确认的势力。', structure: Array.isArray(params.structure) ? params.structure : [], rules: Array.isArray(params.rules) ? params.rules.map(String) : [], resources: Array.isArray(params.resources) ? params.resources.map(String) : [], relations: Array.isArray(params.relations) ? params.relations : [], updatedAt: now };
    },

    addFactionPosition(store, params = {}) {
      store.initFactionSystem?.();
      const factionName = String(params.factionName || params.name || '').trim();
      const position = String(params.position || params.title || '').trim();
      if (!factionName || !position) return '新增势力职位失败：缺少势力名或职位。';
      let faction = this.findFaction(store, factionName);
      if (!faction) {
        this.upsertFaction(store, { name: factionName, parentName: params.parentName, reason: params.reason || '现实推演先新增势力再写入职位。' });
        faction = this.findFaction(store, factionName);
      }
      const character = String(params.characterName || params.character || '未知').trim() || '未知';
      store.addFactionRoleOccupant?.(faction, position, character, params.reason || '现实推演确认势力职位与角色占位。');
      return `已新增势力职位：${factionName} / ${position} / ${character}`;
    },
  });
})();
