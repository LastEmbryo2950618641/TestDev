/**
 * 组织—领土控势：Stage4 结算 apply（territory-control / faction-structure）。
 */
window.GameModules = window.GameModules || {};

window.GameModules.orgTerritoryActions = {
  ot() {
    return window.GameModules.orgTerritory;
  },

  reasonText(update = {}) {
    return window.GameModules.updateRegistry?.reasonText?.(update, '现实推演确认组织或控势变化。') || '现实推演确认组织或控势变化。';
  },

  appendOrgTerritorySystemRecord(store, key, value, reason = '') {
    if (!store || !value) return;
    store.realWorldSystemRecords = Array.isArray(store.realWorldSystemRecords) ? store.realWorldSystemRecords : [];
    const at = store.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    const entry = { key: String(key || '政体').slice(0, 24), value: String(value).slice(0, 240), reason: String(reason || '').slice(0, 120), at };
    const dup = store.realWorldSystemRecords.some((item) => item.key === entry.key && item.value === entry.value);
    if (dup) return;
    store.realWorldSystemRecords = [...store.realWorldSystemRecords, entry].slice(-60);
  },

  ensureFaction(store, name = '') {
    store.initFactionSystem?.();
    const label = String(name || '').trim();
    let faction = (store.factionState?.factions || []).find((f) => f.name === label || f.id === label);
    if (!faction && label) {
      store.ensureFactionMembership?.({ orgName: label, title: '成员', characterName: '未知', reason: '控势或组织结算先创建势力 stub。' });
      faction = (store.factionState?.factions || []).find((f) => f.name === label || f.id === label);
    }
    return faction;
  },

  applyTerritoryControl(store, update = {}) {
    const ot = this.ot();
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const subject = update.subject || {};
    const value = update.change?.value ?? update.value ?? {};
    const locationName = String(subject.locationName || subject.name || subject.id || value.locationName || value.name || '').trim();
    const node = ot.findMapNode(map, locationName || map.current);
    if (!node) return { ok: false, text: `控势：未找到地点「${locationName || map.current || '未知'}」` };

    const anchor = window.GameModules.realWorldMap.resolveExteriorAnchorNode(map, node) || node;
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const allowUnrevealed = update.change?.reveal === true || patch.reveal === true;
    if (!anchor.revealed && !allowUnrevealed) {
      return { ok: false, text: `控势：地点「${anchor.name}」尚未揭示，不可写入地图；可仅写入 archive/org sketch` };
    }
    const before = JSON.stringify(anchor.control || {});
    const next = ot.normalizeControl({
      ...(anchor.control || {}),
      effectiveOrgId: patch.effectiveOrgId || patch.effective || anchor.control?.effectiveOrgId,
      claimOrgId: patch.claimOrgId || patch.claim || anchor.control?.claimOrgId,
      ownerOrgId: patch.ownerOrgId || patch.owner || anchor.control?.ownerOrgId,
      status: patch.status || anchor.control?.status || 'stable',
      since: ot.nowLabel(store),
      reason: patch.reason || this.reasonText(update),
      inherit: patch.inherit === true ? true : false,
    }, store);

    anchor.control = next;
    anchor.controlHistory = [
      {
        at: next.since,
        effectiveOrgId: next.effectiveOrgId,
        claimOrgId: next.claimOrgId,
        ownerOrgId: next.ownerOrgId,
        status: next.status,
        reason: next.reason,
        source: 'settlement',
      },
      ...(Array.isArray(anchor.controlHistory) ? anchor.controlHistory : []),
    ].slice(0, 20);

    ot.ensureMapControls(map, store);
    map.lastText = window.GameModules.realWorldMap.render(map);
    const changed = before !== JSON.stringify(anchor.control);
    const label = ot.resolveControlLabel(map, anchor, store);
    return { ok: changed, text: changed ? `控势更新：${anchor.name} → ${label}` : '' };
  },

  parseStructurePath(field = '') {
    const parts = String(field || '').split('.').filter(Boolean);
    const idx = parts.indexOf('structure');
    if (idx < 0) return { nodeName: '', tail: parts };
    return { nodeName: parts[idx + 1] || '', tail: parts.slice(idx + 2) };
  },

  applyFactionStructureUpdate(store, update = {}, legacyItem = {}) {
    const ot = this.ot();
    store.initFactionSystem?.();
    const subject = update.subject || {};
    const factionName = String(subject.name || subject.factionId || subject.id || legacyItem.factionName || legacyItem.name || '').trim();
    const faction = this.ensureFaction(store, factionName);
    if (!faction) return { ok: false, text: `组织：未找到势力「${factionName}」` };

    const change = update.change || {};
    const value = change.value ?? legacyItem.value ?? {};
    const { nodeName } = this.parseStructurePath(update.field || '');
    const deptName = nodeName && nodeName !== 'roles' ? nodeName : (value.nodeName || value.department || value.dept || '组织架构');
    const reason = this.reasonText(update) || legacyItem.reason || '现实推演确认组织架构变化。';
    const now = ot.nowLabel(store);

    faction.structure = Array.isArray(faction.structure) ? faction.structure : [];
    let node = faction.structure.find((n) => n.name === deptName || n.id === value.nodeId || n.id === value.id);
    if (!node) {
      node = ot.normalizeStructureNode({
        name: deptName,
        state: value.nodeState || value.state || 'fog',
        parentRef: value.parentRef,
        roles: [],
      }, faction, faction.structure.length, store);
      faction.structure.push(node);
    } else if (!ot.canMutateEstablished(node, update) && (value.name || value.parentRef)) {
      return { ok: false, text: `组织：「${deptName}」已确立，需「更改」类结算才能修改` };
    } else {
      if (value.name) node.name = String(value.name).trim();
      if (value.state || value.nodeState) node.state = ot.normalizeItemState(value.state || value.nodeState, node.state);
      if (value.parentRef) node.parentRef = ot.normalizeParentRef(value.parentRef);
      if (value.sketchNote) node.sketchNote = String(value.sketchNote).slice(0, 240);
    }

    const roleValue = value.title || value.position || legacyItem.position || (typeof value === 'string' ? value : '');
    if (roleValue || value.roles || Array.isArray(value.characters)) {
      node.roles = Array.isArray(node.roles) ? node.roles : [];
      const title = String(roleValue || value.title || '未命名职位').trim();
      const lookupTitle = String(value.previousTitle || value.oldTitle || '').trim();
      let role = node.roles.find((r) => (value.roleId && r.id === value.roleId) || (lookupTitle && r.title === lookupTitle) || r.title === title);
      if (!role) {
        role = { title, state: 'fog', titleFog: !title, dutyFog: true, occupantFog: true, characters: [], occupants: [] };
        node.roles.push(role);
      } else if (!ot.canMutateEstablished(role, update) && (value.title || value.characters || value.occupants)) {
        return { ok: false, text: `组织：职位「${title}」已确立，需「更改」类结算` };
      }
      if (value.title) {
        role.title = String(value.title).trim();
        role.titleFog = value.titleFog === true || !role.title;
      }
      if (value.dutyNote || value.duty) {
        role.dutyNote = String(value.dutyNote || value.duty).trim();
        role.dutyFog = false;
      }
      if (value.dutyFog === true) role.dutyFog = true;
      if (value.state) role.state = ot.normalizeItemState(value.state, role.state);
      if (value.establish === true || value.state === 'established') role.state = 'established';
      if (Array.isArray(value.characters)) {
        role.characters = value.characters.map(String).filter(Boolean);
        role.occupants = value.characters.map((c) => ot.normalizeOccupant(c, store));
        role.occupantFog = !role.occupants.length;
      }
      if (Array.isArray(value.occupants)) {
        role.occupants = value.occupants.map((o) => ot.normalizeOccupant(o, store));
        role.characters = role.occupants.map((o) => o.name).filter(Boolean);
        role.occupantFog = role.occupants.every((o) => o.occupantFog);
      }
      if (value.occupantFog === true) role.occupantFog = true;
      Object.assign(role, ot.normalizeRole(role, store));
    }

    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.updatedAt = now;
    faction.changeLog = [{ field: 'structure', reason, at: now, action: change.mode || 'upsert' }, ...(faction.changeLog || [])].slice(0, 50);
    if (faction.resolution === 'L1' && faction.structure.length) faction.resolution = 'L2';
    store.refreshFactionOrgCache?.();
    return { ok: true, text: `组织更新：${faction.name} / ${node.name}` };
  },

  ensureFactionSolid(faction = {}) {
    const ot = this.ot();
    if (!faction.solid || typeof faction.solid !== 'object') faction.solid = {};
    faction.solid.overviewPanels = ot.normalizeOverviewPanels(faction.solid.overviewPanels || {});
    return faction.solid;
  },

  overviewEntryKey(panel = '', entry = {}) {
    const raw = String(entry.id || entry.key || entry.name || entry.title || panel || 'entry').trim();
    return raw.replace(/[^\w\u4e00-\u9fa5-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 64) || `${panel}-entry`;
  },

  upsertOverviewEntry(faction = {}, panelKey = 'economy', patch = {}, meta = {}) {
    const ot = this.ot();
    this.ensureFactionSolid(faction);
    const panel = faction.solid.overviewPanels[panelKey] || { entries: {} };
    panel.entries = panel.entries && typeof panel.entries === 'object' ? panel.entries : {};
    const key = this.overviewEntryKey(panelKey, patch);
    if (meta.mode === 'remove') {
      delete panel.entries[key];
      faction.solid.overviewPanels[panelKey] = panel;
      return key;
    }
    const previous = panel.entries[key] && typeof panel.entries[key] === 'object' ? panel.entries[key] : {};
    panel.entries[key] = {
      ...previous,
      ...patch,
      value: patch.value ?? patch.text ?? previous.value ?? '',
      unit: patch.unit ?? previous.unit ?? '',
      kind: patch.kind || patch.type || previous.kind || '',
      state: patch.state || previous.state || 'sketch',
      note: patch.note || patch.sketchNote || previous.note || '',
      updatedAt: meta.now || ot.nowLabel(meta.store),
      reason: patch.reason || meta.reason || previous.reason || '',
    };
    faction.solid.overviewPanels[panelKey] = panel;
    return key;
  },

  parseOverviewPanel(update = {}, patch = {}) {
    const explicit = String(patch.panel || update.panel || update.subject?.panel || '').trim();
    if (['ideology', 'economy', 'politics', 'military', 'diplomacy'].includes(explicit)) return explicit;
    const field = String(update.field || '').trim();
    const match = field.match(/overviewPanels\.(ideology|economy|politics|military|diplomacy)/u);
    return match?.[1] || '';
  },

  applyOrgOverviewPanel(store, update = {}) {
    const ot = this.ot();
    store.initFactionSystem?.();
    const subject = update.subject || {};
    const factionName = String(subject.name || subject.factionId || subject.orgId || subject.id || '').trim();
    const faction = this.ensureFaction(store, factionName);
    if (!faction) return { ok: false, text: `总览：未找到组织「${factionName}」` };

    const change = update.change || {};
    const value = change.value ?? update.value ?? {};
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : { value };
    const panelKey = this.parseOverviewPanel(update, patch);
    if (!panelKey) return { ok: false, text: `总览：缺少五面板类型「${faction.name}」` };

    const reason = this.reasonText(update);
    const now = ot.nowLabel(store);
    this.ensureFactionSolid(faction);
    faction.solid.overviewPanels = ot.normalizeOverviewPanels(faction.solid.overviewPanels || {});

    if (panelKey === 'ideology') {
      const field = String(patch.field || update.field || '').split('.').pop();
      const key = ['core', 'reason', 'description', 'base', 'legitimacy'].includes(field) ? field : String(patch.key || patch.name || '').trim();
      if (!['core', 'reason', 'description', 'base', 'legitimacy'].includes(key)) return { ok: false, text: `总览：意识形态字段无效「${key || '未指定'}」` };
      faction.solid.overviewPanels.ideology[key] = ot.normalizeOverviewField({
        value: patch.value ?? patch.text ?? '',
        unit: patch.unit || (key === 'legitimacy' ? '/100' : ''),
        establishedAt: patch.establishedAt || '',
        updatedAt: now,
        reason: patch.reason || reason,
      }, key === 'legitimacy' ? 0 : '', key === 'legitimacy' ? '/100' : '');
    } else {
      const panel = faction.solid.overviewPanels[panelKey] || { entries: {} };
      const key = this.overviewEntryKey(panelKey, { id: patch.id, name: patch.key || patch.name || patch.title || update.field });
      if (change.mode === 'remove') {
        delete panel.entries[key];
      } else {
        panel.entries[key] = {
          value: patch.value ?? patch.name ?? patch.title ?? '',
          unit: patch.unit || '',
          kind: patch.kind || patch.type || '',
          state: patch.state || 'sketch',
          note: patch.note || patch.description || '',
          updatedAt: now,
          reason: patch.reason || reason,
        };
      }
      faction.solid.overviewPanels[panelKey] = panel;
    }

    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.updatedAt = now;
    faction.changeLog = [{ field: `overviewPanels.${panelKey}`, reason, at: now, action: change.mode || 'upsert' }, ...(faction.changeLog || [])].slice(0, 50);
    if (['L1', 'L2'].includes(String(faction.resolution || 'L1').toUpperCase())) faction.resolution = 'L2';
    store.refreshFactionOrgCache?.();
    return { ok: true, text: `总览面板：${faction.name} / ${panelKey}` };
  },

  applyMembershipUpdate(store, update = {}) {
    const ot = this.ot();
    const subject = update.subject || {};
    const characterName = String(subject.name || subject.characterName || update.characterName || '').trim();
    const characterId = String(subject.characterId || subject.id || '').trim();
    let state = characterId && characterId !== 'player-self' ? store.itemSkillState?.(characterId) : store.playerIdentityState?.();
    if (!state && characterName) state = ot.findCharacterStateByName(store, characterName);
    if (!state && (characterId === 'player-self' || !characterName)) state = store.playerIdentityState?.();
    if (!state?.values) return { ok: false, text: `人事：未找到角色「${characterName || characterId || '未知'}」` };

    const change = update.change || {};
    const value = change.value ?? update.value ?? {};
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const reason = this.reasonText(update);
    const now = ot.nowLabel(store);

    if (change.mode === 'remove') {
      const orgId = patch.orgId || ot.resolveOrgIdByName(store, patch.orgName || patch.force);
      state.values.memberships = (state.values.memberships || []).filter((m) => m.orgId !== orgId && m.orgName !== patch.orgName);
    } else {
      ot.upsertCharacterMembership(state, { ...patch, since: patch.since || now, reason: patch.reason || reason }, store);
    }

    store.rpgStates = { ...(store.rpgStates || {}), [state.id]: state };
    window.GameModules.sqliteSave?.saveCharacterState?.(state);
    const mem = (state.values.memberships || []).slice(-1)[0];
    return { ok: true, text: `人事归属：${state.profile?.name || characterName} → ${mem?.displayLine || patch.orgName || '组织'}` };
  },

  syncCompanyEconomicEntry(store, faction = {}, company = {}, reason = '') {
    if (!faction?.id || !company?.name) return;
    const ot = this.ot();
    const now = ot.nowLabel(store);
    this.upsertOverviewEntry(faction, 'economy', {
      id: `econ-${faction.id}`,
      key: '????',
      value: company.name,
      kind: '????',
      state: 'sketch',
      note: [company.industry, company.scale, company.location].filter(Boolean).join(' / ').slice(0, 240),
      source: 'company-app',
    }, { reason, now, store });
    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.changeLog = [{ field: 'overviewPanels.economy', reason: reason || '??APP???????', at: now, action: 'sync' }, ...(faction.changeLog || [])].slice(0, 50);
  },

  ensureFamilyOrg(store) {
    store.initFactionSystem?.();
    const ot = this.ot();
    const profile = store.playerProfile || {};
    const id = 'family-player-home';
    let faction = (store.factionState?.factions || []).find((f) => f.id === id);
    const country = (store.factionState?.factions || []).find((f) => f.type === '国家' && !f.parentId)
      || window.GameModules.factionSystem?.countryFaction?.(profile);
    const community = (store.factionState?.factions || []).find((f) => f.kind === 'community');
    const parent = community || country;
    const name = ot.inferFamilyOrgName(profile);
    const now = ot.nowLabel(store);
    if (!faction) {
      faction = ot.normalizeFaction({
        id,
        name,
        type: '家庭',
        kind: 'family',
        parentId: parent?.id || '',
        parentName: parent?.name || '无势力归属',
        level: '家庭级',
        location: profile.refinedCity || profile.city || '现实城市未登记',
        domain: '家庭资产与同住',
        scale: '小型',
        stance: '私人',
        influence: 10,
        description: '玩家家庭组织 stub；个人现金资产单向同步至 asset 能力条目。',
        resolution: 'L1',
        stub: { oneLine: `${name}（家庭 stub，资产随 playerProfile.wealth 镜像）` },
        status: 'active',
        legitimacy: 'recognized',
        structure: [],
        rules: [],
        resources: [],
        relations: [],
        fixed: true,
        updatedAt: now,
      }, store);
      store.factionState.factions.push(faction);
    } else {
      faction.name = name;
      faction.parentId = community?.id || country?.id || faction.parentId;
      faction.parentName = community?.name || country?.name || faction.parentName;
      Object.assign(faction, ot.normalizeFaction(faction, store));
    }
    this.syncFamilyTerritoryAnchor(store, faction);
    return faction;
  },

  syncFamilyTerritoryAnchor(store, family = null) {
    const ot = this.ot();
    const item = family || this.ensureFamilyOrg(store);
    const node = ot.resolveHomeMapNode?.(store);
    if (!node?.id) return item;
    const anchors = Array.isArray(item.territoryAnchors) ? item.territoryAnchors.slice() : [];
    if (!anchors.includes(node.id)) anchors.unshift(node.id);
    item.territoryAnchors = anchors.slice(0, 8);
    if (node.name) item.location = node.name;
    Object.assign(item, ot.normalizeFaction(item, store));
    return item;
  },

  syncPlayerWealthAsset(store, wealth = null) {
    if (!store?.playerProfile) return null;
    const ot = this.ot();
    const profile = store.playerProfile;
    const w = wealth || (typeof store.normalizePlayerWealth === 'function' ? store.normalizePlayerWealth(profile) : {});
    const amount = Number(w.wealthAmount ?? profile.wealthAmount ?? 0);
    const tier = w.wealthTier || profile.wealthTier || '??';
    const family = this.ensureFamilyOrg(store);
    const now = ot.nowLabel(store);
    this.upsertOverviewEntry(family, 'economy', {
      id: 'money',
      key: '??',
      value: amount,
      unit: '?',
      kind: '????',
      state: 'sketch',
      note: tier + ' / source: playerProfile.wealth',
      source: 'playerProfile.wealth',
      wealthMirror: { tier, amount, source: profile.wealthSource || '' },
    }, { reason: 'player wealth mirror', now, store });
    Object.assign(family, ot.normalizeFaction(family, store));
    family.updatedAt = now;
    return family;
  },

  applyOrgStatus(store, update = {}) {
    const ot = this.ot();
    store.initFactionSystem?.();
    const subject = update.subject || {};
    const factionId = String(subject.factionId || subject.id || subject.orgId || '').trim();
    const factionName = String(subject.name || subject.factionName || '').trim();
    let faction = (store.factionState?.factions || []).find((f) => f.id === factionId || f.name === factionName);
    if (!faction && factionName) faction = this.ensureFaction(store, factionName);
    if (!faction) return { ok: false, text: `政体：未找到组织「${factionName || factionId}」` };

    const change = update.change || {};
    const value = change.value ?? update.value ?? {};
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const reason = this.reasonText(update);
    const now = ot.nowLabel(store);
    const nextStatus = ot.normalizeOrgStatus(patch.status || patch.orgStatus, faction.status || 'active');

    faction.status = nextStatus;
    if (patch.legitimacy) faction.legitimacy = String(patch.legitimacy).slice(0, 24);
    if (Array.isArray(patch.predecessorIds)) faction.predecessorIds = patch.predecessorIds.map(String).slice(0, 8);
    if (patch.successorId || patch.successorOrgId) {
      faction.successorIds = [String(patch.successorId || patch.successorOrgId)].filter(Boolean);
    }
    if (Array.isArray(patch.successorIds)) faction.successorIds = patch.successorIds.map(String).slice(0, 4);
    if (patch.name) faction.name = String(patch.name).trim();

    if ((nextStatus === 'merged' || nextStatus === 'dissolved') && faction.successorIds?.length) {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      (map.nodes || []).forEach((node) => {
        if (!node.control) return;
        let touched = false;
        if (node.control.effectiveOrgId === faction.id) {
          node.control.effectiveOrgId = ot.resolveLiveOrgId(store, faction.successorIds[0]);
          touched = true;
        }
        if (node.control.claimOrgId === faction.id) {
          node.control.claimOrgId = ot.resolveLiveOrgId(store, faction.successorIds[0]);
          touched = true;
        }
        if ((node.control.ownerOrgId || node.control.effectiveOrgId) === faction.id) {
          node.control.ownerOrgId = ot.resolveLiveOrgId(store, faction.successorIds[0]);
          touched = true;
        }
        if (touched) {
          node.control.inherit = false;
          node.controlHistory = [{ at: now, effectiveOrgId: node.control.effectiveOrgId, claimOrgId: node.control.claimOrgId, ownerOrgId: node.control.ownerOrgId, status: node.control.status, reason, source: 'org-status' }, ...(node.controlHistory || [])].slice(0, 20);
        }
      });
      map.lastText = window.GameModules.realWorldMap.render(map);
      store.realWorldMap = map;
    }

    if (nextStatus === 'rebel' || nextStatus === 'independent') {
      this.applyOrgStatusEconomicCascade(store, faction, reason, now);
      const statusLabel = ot.orgStatusLabel(faction) || nextStatus;
      this.appendOrgTerritorySystemRecord(store, '政体', `${faction.name}：${statusLabel}`, reason);
      const parent = (store.factionState?.factions || []).find((f) => f.id === faction.parentId);
      const hasBreakRelation = (faction.relations || []).some((r) => /hostile|secession/u.test(String(r.type || r.relation || '')));
      if (parent && !hasBreakRelation) {
        faction.relations = [{
          targetOrgId: parent.id,
          target: parent.name,
          type: nextStatus === 'independent' ? 'secession' : 'hostile',
          relation: nextStatus === 'independent' ? 'secession' : 'hostile',
          detail: reason || '政体状态变更',
          status: 'active',
          since: now,
        }, ...(faction.relations || [])].slice(0, 12);
      }
    }

    if (nextStatus === 'dissolved' || nextStatus === 'merged') {
      this.syncEmploymentOnOrgDissolved(store, faction, reason);
    }

    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.updatedAt = now;
    faction.changeLog = [{ field: 'status', reason, at: now, action: nextStatus }, ...(faction.changeLog || [])].slice(0, 50);
    ot.validateWorldConsistency(store);
    store.refreshFactionOrgCache?.();
    const label = ot.orgStatusLabel(faction) || nextStatus;
    return { ok: true, text: `政体状态：${faction.name} → ${label}` };
  },

  applyOrgStatusEconomicCascade(store, faction, reason = '', now = '') {
    const ot = this.ot();
    const isEmployer = faction.kind === 'company' || faction.orgDomain === 'corp' || /company|studio|enterprise/i.test(String(faction.type || faction.name || ''));
    if (!isEmployer) return;
    this.ensureFactionSolid(faction);
    const panel = faction.solid.overviewPanels.economy || { entries: {} };
    panel.entries = panel.entries && typeof panel.entries === 'object' ? panel.entries : {};
    const label = ot.orgStatusLabel(faction) || faction.status;
    const note = label + ': governance/status disruption; ' + String(reason || 'org status changed').slice(0, 80);
    let touched = false;
    Object.entries(panel.entries).forEach(([key, entry]) => {
      const value = entry && typeof entry === 'object' ? entry : { value: entry };
      const text = `${key}${value.value || ''}${value.kind || ''}${value.note || ''}`;
      if (/payroll|salary|operation|revenue|business|income/i.test(text)) {
        panel.entries[key] = {
          ...value,
          note: [value.note, note].filter(Boolean).join(' / ').slice(0, 240),
          state: value.state || 'sketch',
          updatedAt: now || ot.nowLabel(store),
          reason,
        };
        touched = true;
      }
    });
    if (!touched) {
      panel.entries[`economic-disrupt-${String(now || ot.nowLabel(store)).replace(/[^\d]/g, '').slice(-12)}`] = {
        value: '????',
        kind: '????',
        state: 'sketch',
        note,
        updatedAt: now || ot.nowLabel(store),
        reason,
      };
    }
    faction.solid.overviewPanels.economy = panel;
  },

  adminSlug(name = '') {
    return String(name || '').replace(/[^\w\u4e00-\u9fa5]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'region';
  },

  ensureAdminOrgStub(store, item = {}, parentOrgId = '') {
    const ot = this.ot();
    store.initFactionSystem?.();
    const profile = store.playerProfile || {};
    const country = (store.factionState?.factions || []).find((f) => f.type === '国家' && !f.parentId)
      || window.GameModules.factionSystem?.countryFaction?.(profile);
    const kind = item.kind || 'admin';
    const id = kind === 'community' ? `community-${this.adminSlug(item.name)}` : `admin-${this.adminSlug(item.name)}`;
    const parentId = parentOrgId || country?.id || '';
    const parentFaction = (store.factionState?.factions || []).find((f) => f.id === parentId);
    const parentName = parentFaction?.name || country?.name || '无势力归属';
    let faction = (store.factionState?.factions || []).find((f) => f.id === id || f.name === item.name);
    const now = ot.nowLabel(store);
    const type = kind === 'community' ? '社区' : '行政区';
    if (!faction) {
      faction = ot.normalizeFaction({
        id,
        name: item.name,
        type,
        kind,
        parentId,
        parentName,
        level: item.level || '行政区级',
        location: item.name,
        domain: kind === 'community' ? '居住社区' : '地方政区',
        scale: kind === 'community' ? '小型' : '大型',
        stance: '中立',
        influence: kind === 'community' ? 15 : 40,
        description: `${item.name}（${item.level || '政区'} stub，地址链自动生成）`,
        resolution: 'L1',
        stub: { oneLine: `${item.name}（${item.level || '政区'} stub，尚未推演接触）` },
        status: 'active',
        structure: [],
        rules: [],
        resources: [],
        relations: [],
        fixed: true,
        updatedAt: now,
      }, store);
      store.factionState.factions.push(faction);
    } else if (parentId && !faction.parentId) {
      faction.parentId = parentId;
      faction.parentName = parentName;
      Object.assign(faction, ot.normalizeFaction(faction, store));
    }
    return faction;
  },

  linkFamilyToCommunity(store, communityOrgId = '') {
    if (!communityOrgId) return;
    const ot = this.ot();
    const community = (store.factionState?.factions || []).find((f) => f.id === communityOrgId);
    if (!community) return;
    const family = this.ensureFamilyOrg(store);
    family.parentId = community.id;
    family.parentName = community.name;
    Object.assign(family, ot.normalizeFaction(family, store));
  },

  syncEmploymentOnOrgDissolved(store, faction, reason = '') {
    if (!store?.companyState || !faction) return false;
    const isPlayerCompany = faction.id === 'company-main'
      || (store.currentCompany?.()?.name && store.currentCompany().name === faction.name);
    if (!isPlayerCompany || !['dissolved', 'merged'].includes(faction.status)) return false;
    if (store.companyState.employment?.active === false) return false;
    const endAt = store.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    const companyName = store.currentCompany?.()?.name || faction.name;
    store.companyState.employment = {
      active: false,
      startAt: store.companyState.employment?.startAt || endAt,
      resignedAt: endAt,
      resignedCompany: companyName,
    };
    const records = store.companyState.employmentRecords || [];
    const record = records.find((item) => item.status === '在职') || records[0];
    if (record) {
      record.status = '已离职';
      record.endAt = endAt;
      record.duration = store.employmentDurationText?.(record.startAt, endAt) || record.duration || '';
    }
    this.appendOrgTerritorySystemRecord(store, '就业', `${companyName}：组织 ${faction.status}，同步离职`, reason || '政体状态变更');
    return true;
  },

  applySettlementUpdates(store, updates = []) {
    const lines = [];
    const ot = this.ot();
    const deduped = ot.dedupeOrgTerritoryUpdates?.(Array.isArray(updates) ? updates : [], store) || updates;
    const ordered = deduped.slice().sort((a, b) => {
      const rank = (t) => (t === 'org-status' ? 0 : t === 'territory-control' ? 1 : 2);
      return rank(a?.updateType) - rank(b?.updateType);
    });
    const settlementLimit = 12;
    const batch = ordered.slice(0, settlementLimit);
    const droppedCount = Math.max(0, ordered.length - batch.length);
    if (droppedCount > 0) {
      console.warn('[orgTerritory] 同轮组织结算超过上限，丢弃', droppedCount, '条');
      store.orgTerritoryReconciliationLog = Array.isArray(store.orgTerritoryReconciliationLog) ? store.orgTerritoryReconciliationLog : [];
      store.orgTerritoryReconciliationLog.push({
        at: ot.nowLabel(store),
        kind: 'settlement-truncated',
        kept: batch.length,
        dropped: droppedCount,
      });
      ot.trimReconciliationLog?.(store);
    }
    for (const update of batch) {
      const type = String(update?.updateType || '').trim();
      if (type === 'org-status') {
        const result = this.applyOrgStatus(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'territory-control') {
        const result = this.applyTerritoryControl(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'faction-structure' || type === 'org-structure-node') {
        const result = this.applyFactionStructureUpdate(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'org-overview-panel') {
        const result = this.applyOrgOverviewPanel(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'membership') {
        const result = this.applyMembershipUpdate(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'faction-overview') {
        const ctx = window.GameModules.realWorldAgentContext;
        const name = update.subject?.name || update.subject?.factionId || update.subject?.id || '';
        const value = update.change?.value ?? update.value ?? {};
        const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
        if (name && ctx?.upsertFaction) {
          const text = ctx.upsertFaction(store, { name, ...patch, reason: this.reasonText(update) });
          if (text) lines.push(String(text).split('\n')[0]);
        }
      }
    }
    return lines;
  },

  applyLegacyStructure(store, item = {}) {
    if (String(item.action || '') !== 'updateStructure') return null;
    return this.applyFactionStructureUpdate(store, {
      subject: { name: item.factionName || item.name },
      change: { mode: 'upsert', value: item.value || { title: item.position, characters: item.characters } },
      reasons: [{ evidence: item.reason || '' }],
    }, item);
  },
};
