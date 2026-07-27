window.GameModules = window.GameModules || {};

(() => {
  const methods = {
    factionQueryInstalled: true,

    limit(text = '', max = 1600) {
      const raw = String(text || '');
      if (!(max > 0) || raw.length <= max) return raw;
      return `${raw.slice(0, max)}…`;
    },

    faction(store, method, params = {}) {
      store.initFactionSystem?.();
      if (method === 'listFactions') return this.factionList(store);
      if (method === 'searchFactionOne') return this.factionSearch(store, params);
      if (method === 'getFactionDetail') return this.factionDetail(store, params.name || params.id || params.keyword);
      if (method === 'getFactionField') return this.getFactionField(store, params);
      if (method === 'searchFactionArchive') return window.GameModules.factionArchive?.contextFor?.(store, params.keyword || params.name || '', 1800) || '暂无势力资料库记录。';
      if (method === 'createFaction') return this.createFaction(store, params);
      if (method === 'patchFactionField') return this.patchFactionField(store, params);
      if (method === 'upsertFaction') return this.upsertFaction(store, params);
      if (method === 'addFactionPosition') return this.addFactionPosition(store, params);
      if (method === 'listMemberships') return this.listMemberships(store, params);
      if (method === 'getTerritoryControl') return this.getTerritoryControl(store, params);
      if (method === 'resolveTerritoryBrief') return this.resolveTerritoryBrief(store, params);
      return this.factionList(store);
    },

    factionRows(store) {
      return store.factionState?.factions || [];
    },

    factionList(store) {
      const rows = this.factionRows(store);
      if (!rows.length) return '暂无势力。';
      return rows.map((f) => {
        const structure = (f.structure || []).map((node) => {
          const roles = store.normalizeFactionRoles?.(node.roles)?.map((role) => `${role.title}：${(role.characters || ['未知']).join('、')}`).join('；')
            || (node.roles || []).map((role) => `${role.title || role}：${(role.characters || ['未知']).join('、')}`).join('；')
            || '职位未记录';
          return `  - ${node.name || '未命名节点'}：${roles}`;
        }).join('\n') || '  （无组织架构）';
        return [
          `- id=${f.id || '未知'}｜名=${f.name || '未命名'}｜世界=${f.worldTag || '未知世界'}｜类型=${f.type || '组织'}｜层级=${f.level || '未知'}｜归属=${store.factionParentName?.(f) || f.parentName || '未知'}`,
          `  组织架构：`,
          structure,
        ].join('\n');
      }).join('\n');
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

    isAbstractFactionName(name = '') {
      return /^(现实社会|现代社会|现实世界|社会|国家|公民|居民|成年人|成年学生)$/.test(String(name || '').trim());
    },

    isAbstractPosition(position = '') {
      return /^(公民|居民|成年人|成年学生|成员)$/.test(String(position || '').trim());
    },

    factionText(store, f = {}) {
      const structure = (f.structure || []).map((node) => {
        const roles = store.normalizeFactionRoles?.(node.roles)?.map((role) => `${role.title}：${(role.characters || ['未知']).join('、')}`).join('；') || '职位未记录';
        return `- ${node.name || '未命名节点'}：${roles}`;
      }).join('\n') || '暂无组织架构。';
      return [`势力：${f.name}`, `所属世界：${f.worldTag || '未知世界'}`, `类型/层级：${f.type || '组织'}｜${f.level || '未知'}｜影响力${f.influence ?? '未知'}`, `归属：${store.factionParentName?.(f) || f.parentName || '未知'}`, `地点/领域：${f.location || '未知'}｜${f.domain || '未知'}`, `说明：${f.description || '暂无说明。'}`, `组织架构：\n${structure}`, `规则：${(f.rules || []).join('；') || '暂无'}`, `资源：${(f.resources || []).join('、') || '暂无'}`].join('\n');
    },

    upsertFaction(store, params = {}) {
      store.initFactionSystem?.();
      const name = String(params.name || params.factionName || params.keyword || '').trim();
      if (!name) return '新增或调整势力失败：缺少势力名。';
      if (this.isAbstractFactionName(name)) return `跳过抽象势力：${name}。势力必须是具体公司、学校、部门、机构或组织。`;
      const now = store.phoneDate?.().toISOString?.() || new Date().toISOString();
      // Parent only when AI explicitly provided parentName/parentId — never fall back to a country.
      const parent = this.findFaction(store, params.parentName || params.parentId || '') || null;
      let faction = this.findFaction(store, name);
      const patch = this.factionPatch(params, parent, now, store);
      const explicitWorld = String(params.worldTag || params.所属世界 || params.world || '').trim();
      if (!faction) {
        if (!patch.worldTag) {
          patch.worldTag = window.GameModules.orgTerritory?.resolveFactionWorldTag?.(params, store) || '未知世界';
        }
        faction = { id: store.factionIdByName?.(name) || `force-${Date.now()}`, name, ...patch, fixed: true, updatedAt: now };
        faction.fieldReasons = store.completeFactionReasons?.(faction, {}, params.reason || '现实推演确认出现新势力或下属单位。') || {};
        faction.changeLog = [{ field: 'all', reason: params.reason || '现实推演新增势力。', at: now, action: 'add' }];
        const normalized = window.GameModules.orgTerritory?.normalizeFaction?.(
          store.normalizeFactionStructure?.(faction) || faction,
          store,
        ) || store.normalizeFactionStructure?.(faction) || faction;
        store.factionState.factions.push(normalized);
        return `已新增势力：${name}\n${this.factionText(store, normalized)}`;
      }
      if (!explicitWorld) delete patch.worldTag;
      Object.entries(patch).forEach(([key, value]) => { if (value !== undefined && value !== '' && JSON.stringify(faction[key]) !== JSON.stringify(value)) faction[key] = value; });
      faction.updatedAt = now;
      faction.changeLog = [{ field: 'partial', reason: params.reason || '现实推演调整势力资料。', at: now, action: 'adjust' }, ...(faction.changeLog || [])].slice(0, 50);
      store.normalizeFactionStructure?.(faction);
      Object.assign(faction, window.GameModules.orgTerritory?.normalizeFaction?.(faction, store) || faction);
      return `已调整势力：${name}\n${this.factionText(store, faction)}`;
    },

    factionPatch(params = {}, parent = null, now = '', store = null) {
      const structure = (Array.isArray(params.structure) ? params.structure : []).map((node) => ({
        ...node,
        roles: (Array.isArray(node.roles) ? node.roles : []).filter((role) => !this.isAbstractPosition(role?.title || role?.name || role?.position || role)),
      })).filter((node) => !this.isAbstractFactionName(node.name));
      const explicitWorld = String(params.worldTag || params.所属世界 || params.world || '').trim().slice(0, 40);
      const patch = {
        type: params.type || '组织',
        parentId: params.parentId || parent?.id || '',
        parentName: params.parentName || parent?.name || '无势力归属',
        level: params.level || '组织级',
        location: params.location || '未知',
        domain: params.domain || '现实组织关系',
        scale: params.scale || '未知',
        stance: params.stance || '中立',
        influence: Number(params.influence) || 30,
        description: params.description || params.summary || '现实推演确认的势力。',
        structure,
        rules: Array.isArray(params.rules) ? params.rules.map(String) : [],
        resources: Array.isArray(params.resources) ? params.resources.map(String) : [],
        relations: Array.isArray(params.relations) ? params.relations : [],
        updatedAt: now,
      };
      if (explicitWorld) patch.worldTag = explicitWorld;
      return patch;
    },

    addFactionPosition(store, params = {}) {
      store.initFactionSystem?.();
      const factionName = String(params.factionName || params.name || '').trim();
      const position = String(params.position || params.title || '').trim();
      if (!factionName || !position) return '新增势力职位失败：缺少势力名或职位。';
      if (this.isAbstractFactionName(factionName) || this.isAbstractPosition(position)) return `跳过抽象势力职位：${factionName} / ${position}。势力职位必须来自具体组织层级。`;
      let faction = this.findFaction(store, factionName);
      if (!faction) {
        this.upsertFaction(store, {
          name: factionName,
          parentName: params.parentName || '',
          reason: params.reason || '现实推演先新增势力再写入职位。',
        });
        faction = this.findFaction(store, factionName);
      }
      const character = String(params.characterName || params.character || '未知').trim() || '未知';
      store.addFactionRoleOccupant?.(faction, position, character, params.reason || '现实推演确认势力职位与角色占位。');
      return `已新增势力职位：${factionName} / ${position} / ${character}`;
    },

    listMemberships(store, params = {}) {
      store.initFactionSystem?.();
      const faction = this.findFaction(store, params.name || params.factionName || params.id || '');
      const rows = faction
        ? window.GameModules.orgTerritory?.collectFactionMemberships?.(store, faction) || []
        : Object.values(store.rpgStates || {}).flatMap((state) => (state.values?.memberships || []).map((m) => ({
          characterName: state.profile?.name || state.name,
          ...window.GameModules.orgTerritory?.normalizeMembership?.(m, store),
        })));
      if (!rows.length) return '暂无人事归属记录。';
      return rows.slice(0, 20).map((r) => `- ${r.characterName}｜${r.orgName || r.orgId}｜${r.title}｜${r.department || '—'}｜${r.source || 'membership'}`).join('\n');
    },

    getTerritoryControl(store, params = {}) {
      const map = window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {}) || {};
      const ot = window.GameModules.orgTerritory;
      const name = String(params.locationName || params.name || map.current || '').trim();
      const node = ot?.findMapNode?.(map, name);
      if (!node) return `未找到地点：${name || '未知'}`;
      const label = ot?.resolveControlLabel?.(map, node, store) || '控势未知';
      const history = ot?.controlHistoryForNode?.(map, node, store) || [];
      return [`地点：${node.name}`, `控势：${label}`, history.length ? `时间轴：\n${history.map((h) => `- ${h}`).join('\n')}` : '暂无控势变更记录。'].join('\n');
    },

    resolveTerritoryBrief(store, params = {}) {
      return window.GameModules.orgTerritory?.resolveTerritoryBrief?.(store, params) || '暂无控势摘要。';
    },

    panelKeyAlias(panel = '') {
      const raw = String(panel || '').trim();
      const map = {
        ideology: 'ideology', 国体: 'ideology', 意识形态: 'ideology',
        economy: 'economy', 经济: 'economy',
        politics: 'politics', 政治: 'politics',
        military: 'military', 军事: 'military',
        diplomacy: 'diplomacy', 外交: 'diplomacy',
        territory: 'territory', 统治区域: 'territory', 领土: 'territory',
      };
      return map[raw] || raw;
    },

    ensureSolidPanels(faction = {}) {
      const ot = window.GameModules.orgTerritory;
      faction.solid = faction.solid && typeof faction.solid === 'object' ? faction.solid : {};
      faction.solid.overviewPanels = ot?.normalizeOverviewPanels?.(faction.solid.overviewPanels || {})
        || ot?.defaultOverviewPanels?.()
        || faction.solid.overviewPanels
        || {};
      return faction.solid.overviewPanels;
    },

    getFactionField(store, params = {}) {
      store.initFactionSystem?.();
      const faction = this.findFaction(store, params.id || params.name || params.factionId || '');
      if (!faction) return '未命中势力。';
      const panel = this.panelKeyAlias(params.panel || params.面板 || '');
      const field = String(params.field || params.字段 || params.key || '').trim();
      if (!field && !panel) {
        return this.limit(JSON.stringify({
          id: faction.id,
          name: faction.name,
          worldTag: faction.worldTag,
          type: faction.type,
          structure: faction.structure || [],
          overviewPanels: faction.solid?.overviewPanels || {},
        }, null, 0), 2400);
      }
      if (!panel) {
        return this.limit(JSON.stringify({ id: faction.id, field, value: faction[field] }, null, 0), 1600);
      }
      const panels = this.ensureSolidPanels(faction);
      if (panel === 'ideology') {
        const value = field ? panels.ideology?.[field] : panels.ideology;
        return this.limit(JSON.stringify({ id: faction.id, panel, field: field || '*', value }, null, 0), 1600);
      }
      const entries = panels[panel]?.entries || {};
      const value = field ? entries[field] : entries;
      return this.limit(JSON.stringify({ id: faction.id, panel, field: field || '*', value }, null, 0), 1600);
    },

    createFaction(store, params = {}) {
      store.initFactionSystem?.();
      const ot = window.GameModules.orgTerritory;
      const name = String(params.name || params.factionName || '').trim();
      if (!name) return '创建势力失败：缺少 name。';
      if (this.isAbstractFactionName(name)) return `跳过抽象势力：${name}。`;
      const typeText = String(params.type || '').trim();
      const looksFamily = params.kind === 'family'
        || /家庭|家族|家族势力/.test(typeText)
        || /(家庭|家族)$/.test(name)
        || (/家$/.test(name) && name.length <= 4 && !/国家|专家/.test(name))
        || String(params.id || '').trim() === 'family-player-home';
      const id = String(
        params.id
        || store.factionIdByName?.(name)
        || (looksFamily ? 'family-player-home' : `force-${Date.now()}`)
      ).trim();
      if (this.findFaction(store, id) || this.findFaction(store, name)) {
        return `创建失败：势力已存在（${id}/${name}）。请改用 patchFactionField。`;
      }
      const now = store.phoneDate?.().toISOString?.() || new Date().toISOString();
      const parent = this.findFaction(store, params.parentName || params.parentId || '') || null;
      const patch = this.factionPatch(params, parent, now, store);
      if (!patch.worldTag) {
        patch.worldTag = ot?.resolveFactionWorldTag?.(params, store) || '未知世界';
      }
      let faction = {
        id,
        name,
        ...patch,
        classification: params.classification || patch.classification || 'community',
        structure: Array.isArray(params.structure) ? params.structure : (patch.structure || []),
        solid: params.solid && typeof params.solid === 'object'
          ? params.solid
          : { overviewPanels: ot?.defaultOverviewPanels?.() || {} },
        fixed: true,
        updatedAt: now,
      };
      // 家庭/家族也是正式势力（如「刘家」「刘悠家庭」），需可被 Stage1/8 创建并被 family-actions 识别
      if (looksFamily || patch.kind === 'family') {
        faction.kind = 'family';
        faction.type = typeText || patch.type || '家庭';
      }
      if (params.solid?.overviewPanels) {
        faction.solid = { overviewPanels: ot?.normalizeOverviewPanels?.(params.solid.overviewPanels) || params.solid.overviewPanels };
      }
      faction.fieldReasons = store.completeFactionReasons?.(faction, params.fieldReasons || {}, params.reason || '创建完整势力。') || {};
      faction.changeLog = [{ field: 'all', reason: params.reason || '创建完整势力。', at: now, action: 'create' }];
      faction = ot?.normalizeFaction?.(store.normalizeFactionStructure?.(faction) || faction, store)
        || store.normalizeFactionStructure?.(faction)
        || faction;
      store.factionState.factions.push(faction);
      return `已创建势力：${name}（${faction.id}）\n${this.factionText(store, faction)}`;
    },

    patchFactionField(store, params = {}) {
      store.initFactionSystem?.();
      const ot = window.GameModules.orgTerritory;
      const faction = this.findFaction(store, params.id || params.name || params.factionId || '');
      if (!faction) return `更新失败：未找到势力「${params.id || params.name || ''}」`;
      const panel = this.panelKeyAlias(params.panel || params.面板 || '');
      const field = String(params.field || params.字段 || params.key || '').trim();
      const op = String(params.op || params.operation || 'set').trim().toLowerCase();
      const reason = String(params.reason || 'Stage9 势力字段更新').slice(0, 200);
      const now = store.phoneDate?.().toISOString?.() || new Date().toISOString();
      if (!field) return '更新失败：缺少 field。';

      if (!panel) {
        if (op === 'set') {
          faction[field] = params.value;
        } else if (op === 'append') {
          const list = Array.isArray(faction[field]) ? faction[field].slice() : [];
          list.push(params.value);
          faction[field] = list;
        } else if (op === 'delete') {
          const list = Array.isArray(faction[field]) ? faction[field].slice() : [];
          const index = Number(params.index);
          if (!Number.isInteger(index) || index < 0 || index >= list.length) return `更新失败：无效 index ${params.index}`;
          list.splice(index, 1);
          faction[field] = list;
        } else {
          return `更新失败：未知 op ${op}`;
        }
      } else {
        const panels = this.ensureSolidPanels(faction);
        if (panel === 'ideology') {
          if (op === 'set') {
            panels.ideology[field] = ot?.normalizeOverviewField?.({
              value: params.value,
              updatedAt: now,
              reason,
            }, field === 'legitimacy' ? 0 : '', field === 'legitimacy' ? '/100' : '')
              || { value: params.value, updatedAt: now, reason };
          } else {
            return '意识形态字段仅支持 op=set 覆盖。';
          }
        } else {
          const panelObj = panels[panel] || { entries: {} };
          panelObj.entries = panelObj.entries && typeof panelObj.entries === 'object' ? panelObj.entries : {};
          const entry = panelObj.entries[field] && typeof panelObj.entries[field] === 'object'
            ? { ...panelObj.entries[field] }
            : { value: panelObj.entries[field] };
          let list = Array.isArray(entry.value) ? entry.value.slice() : [];
          if (op === 'set') {
            entry.value = params.value;
          } else if (op === 'append') {
            if (!Array.isArray(entry.value)) list = entry.value == null || entry.value === '' ? [] : [entry.value];
            list.push(params.value);
            entry.value = list;
          } else if (op === 'delete') {
            if (!Array.isArray(entry.value)) return '更新失败：该字段不是列表，无法 delete。';
            const index = Number(params.index);
            if (!Number.isInteger(index) || index < 0 || index >= list.length) return `更新失败：无效 index ${params.index}`;
            list.splice(index, 1);
            entry.value = list;
          } else {
            return `更新失败：未知 op ${op}`;
          }
          entry.updatedAt = now;
          entry.reason = reason;
          panelObj.entries[field] = entry;
          panels[panel] = panelObj;
        }
      }

      faction.updatedAt = now;
      faction.changeLog = [{
        field: panel ? `${panel}.${field}` : field,
        reason,
        at: now,
        action: op,
      }, ...(faction.changeLog || [])].slice(0, 50);
      Object.assign(faction, ot?.normalizeFaction?.(faction, store) || faction);
      return `已更新势力字段：${faction.name}｜${panel ? `${panel}.` : ''}${field}｜${op}`;
    },
  };

  function installFactionQuery(target = window.GameModules.realWorldAgentContext) {
    if (!target) return false;
    if (typeof target.faction === 'function' && target.factionQueryInstalled) return true;
    Object.assign(target, methods);
    return true;
  }

  window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};
  window.GameModules.realWorldAgentContextParts.factionQuery = methods;
  window.GameModules.installFactionQuery = installFactionQuery;
  installFactionQuery();
})();
