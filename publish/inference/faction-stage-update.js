window.GameModules = window.GameModules || {};

window.GameModules.inferenceFactionStageUpdate = {
  parseArrayPayload(raw = '') {
    const source = String(raw || '').trim();
    if (!source.startsWith('[') || !source.endsWith(']')) throw new Error('Stage9 必须只返回 JSON 数组');
    try {
      const data = JSON.parse(source);
      if (!Array.isArray(data)) throw new Error('Stage9 返回值不是数组');
      return data;
    } catch (err) {
      throw new Error(`Stage9 JSON 数组解析失败：${err?.message || '未知错误'}`);
    }
  },

  normalizeKey(value = '') {
    return String(value || '').trim();
  },

  plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  },

  overviewFieldKinds() {
    return {
      ideology: {
        core: 'text',
        reason: 'text',
        description: 'text',
        base: 'text',
        legitimacy: 'number',
      },
      economy: {
        gdp: 'text', income: 'text', expenditure: 'text', assets: 'text', resources: 'text', production: 'text', system: 'text',
        institutions: 'nameDescList', laws: 'nameDescList', works: 'nameDescList',
      },
      politics: {
        regime: 'text', powerStructure: 'text', rulemaking: 'text', adjudication: 'text', execution: 'text', participation: 'text', leadership: 'text',
        institutions: 'nameDescList', laws: 'nameDescList', works: 'nameDescList',
      },
      military: {
        posture: 'text', forces: 'groupItemsList', personnel: 'text', quality: 'text', sustainment: 'text', projection: 'text', equipment: 'text',
        institutions: 'nameDescList', laws: 'nameDescList', works: 'nameDescList',
      },
      diplomacy: {
        posture: 'text', orientation: 'text', allies: 'relationList', rivals: 'relationList', memberships: 'nameDescList', treaties: 'nameDescList', presence: 'text',
        institutions: 'nameDescList', laws: 'nameDescList', works: 'nameDescList',
      },
      territory: {
        capital: 'text', area: 'text', population: 'text', adminDivision: 'text', regions: 'regionList',
      },
    };
  },

  panelAliases() {
    return {
      ideo: 'ideology', ideology: 'ideology',
      econ: 'economy', economy: 'economy',
      pol: 'politics', politics: 'politics',
      mil: 'military', military: 'military',
      dip: 'diplomacy', diplomacy: 'diplomacy',
      ter: 'territory', territory: 'territory',
    };
  },

  topLevelFieldAliases() {
    return {
      desc: 'description', description: 'description',
      parent_id: 'parentId', parent_name: 'parentName',
      world: 'worldTag', worldtag: 'worldTag',
      class: 'classification',
      faction_id: 'id', factionid: 'id',
      overview: 'overview',
      summary: 'overview',
      总览: 'overview',
      势力总览: 'overview',
    };
  },

  panelFieldAliases() {
    return {
      ideology: { core: 'core', reason: 'reason', desc: 'description', description: 'description', base: 'base', legit: 'legitimacy', legitimacy: 'legitimacy' },
      economy: { gdp: 'gdp', income: 'income', expense: 'expenditure', expenditure: 'expenditure', assets: 'assets', res: 'resources', resources: 'resources', output: 'production', production: 'production', system: 'system', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      politics: { regime: 'regime', power: 'powerStructure', powerstructure: 'powerStructure', rule: 'rulemaking', rulemaking: 'rulemaking', judge: 'adjudication', adjudication: 'adjudication', exec: 'execution', execution: 'execution', part: 'participation', participation: 'participation', lead: 'leadership', leadership: 'leadership', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      military: { posture: 'posture', forces: 'forces', troops: 'personnel', personnel: 'personnel', personel: 'personnel', quality: 'quality', supply: 'sustainment', sustainment: 'sustainment', reach: 'projection', projection: 'projection', equip: 'equipment', equipment: 'equipment', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      diplomacy: { posture: 'posture', orient: 'orientation', orientation: 'orientation', allies: 'allies', rivals: 'rivals', members: 'memberships', memberships: 'memberships', treaties: 'treaties', presence: 'presence', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      territory: { capital: 'capital', area: 'area', pop: 'population', population: 'population', admin: 'adminDivision', admindivision: 'adminDivision', regions: 'regions' },
    };
  },

  resolvePanelKey(value = '') {
    const key = this.normalizeKey(value).toLowerCase();
    return this.panelAliases()[key] || '';
  },

  resolveInputFieldKey(panel = '', value = '') {
    const key = this.normalizeKey(value);
    if (!key) return '';
    if (!panel) {
      const alias = this.topLevelFieldAliases();
      return alias[key] || alias[key.toLowerCase()] || key;
    }
    const alias = this.panelFieldAliases()[panel] || {};
    return alias[key] || alias[key.toLowerCase()] || key;
  },

  emptyKindValue(kind = 'text') {
    if (kind === 'number') return 0;
    if (['nameDescList', 'relationList', 'groupItemsList', 'regionList'].includes(kind)) return [];
    return '';
  },

  toStringList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (item == null) return '';
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item).trim();
      if (item && typeof item === 'object') return String(item.name || item.title || item.label || '').trim();
      return '';
    }).filter(Boolean);
  },

  toNameDescList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (item == null) return null;
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const [name, description = ''] = String(item).split('|').map((part) => part.trim());
        return name ? { name, description } : null;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const name = String(item.name || item.title || item.label || '').trim();
      if (!name) return null;
      return { name, description: String(item.description || item.desc || item.note || item.type || '').trim() };
    }).filter(Boolean);
  },

  toRelationList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (item == null) return null;
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const [name, description = '', viewOfSelf = ''] = String(item).split('|').map((part) => part.trim());
        return name ? { name, description, viewOfSelf } : null;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const name = String(item.name || item.target || item.label || '').trim();
      if (!name) return null;
      return {
        name,
        description: String(item.description || item.desc || item.type || item.note || '').trim(),
        viewOfSelf: String(item.viewOfSelf || item.view || '').trim(),
      };
    }).filter(Boolean);
  },

  toGroupItemsList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (item == null) return null;
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const [name = '', commander = '', deputy = '', staff = '', size = '', arms = '', task = ''] = String(item).split('|').map((part) => part.trim());
        return name ? { name, commander, deputy, staff, size, arms, task } : null;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const name = String(item.name || item.group || item.title || '').trim();
      if (!name) return null;
      const items = this.toStringList(Array.isArray(item.items) ? item.items : (Array.isArray(item.members) ? item.members : []));
      return {
        name,
        commander: String(item.commander || item.leader || item.chief || item.负责人 || '').trim(),
        deputy: String(item.deputy || item.second || item.副手 || '').trim(),
        staff: String(item.staff || item.third || item.参谋 || '').trim(),
        size: String(item.size || item.population || item.personnel || item.人数规模 || item.人数 || '').trim(),
        arms: String(item.arms || item.composition || item.branchComposition || item.兵种构成 || '').trim(),
        task: String(item.task || item.currentTask || item.mission || item.当前任务 || '').trim(),
        items,
      };
    }).filter(Boolean);
  },

  toRegionList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (item == null) return null;
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const [name, capital = '', area = '', controlRate = '', population = '', description = '', garrison = ''] = String(item).split('|').map((part) => part.trim());
        const match = controlRate.match(/^([^()（）]+)[(（]([^()（）]+)[)）]$/u);
        return name ? { name, capital, area, controlRate: match ? match[1].trim() : controlRate, controlReason: match ? match[2].trim() : '', population, description, garrison } : null;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const name = String(item.name || item.region || item.title || '').trim();
      if (!name) return null;
      return {
        name,
        capital: String(item.capital || item.center || '').trim(),
        area: String(item.area || '').trim(),
        controlRate: String(item.controlRate || item.ctrl || '').trim(),
        controlReason: String(item.controlReason || item.reason || item.控制原因 || '').trim(),
        population: String(item.population || item.pop || '').trim(),
        description: String(item.description || item.specialty || item.role || item.特产 || item.desc || '').trim(),
        garrison: String(item.garrison || '').trim(),
      };
    }).filter(Boolean);
  },
  normalizeKindValue(kind = 'text', raw) {
    if (kind === 'number') {
      const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
      return Number.isFinite(n) ? n : 0;
    }
    if (kind === 'nameDescList') return this.toNameDescList(raw);
    if (kind === 'relationList') return this.toRelationList(raw);
    if (kind === 'groupItemsList') return this.toGroupItemsList(raw);
    if (kind === 'regionList') return this.toRegionList(raw);
    if (raw == null) return '';
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw).trim();
    return '';
  },

  makeOverviewField(kind = 'text', raw, fallbackReason = '', options = {}) {
    const rawObj = this.plainObject(raw);
    const valueSource = Object.prototype.hasOwnProperty.call(rawObj, 'value') ? rawObj.value : raw;
    const reason = this.normalizeKey(rawObj.reason || options.reason || fallbackReason);
    const field = {
      value: this.normalizeKindValue(kind, valueSource),
      reason,
    };
    const rawUnit = this.normalizeKey(rawObj.unit || options.unit || '');
    if (rawUnit) field.unit = rawUnit;
    if (kind === 'number' && !field.unit && options.defaultUnit) field.unit = options.defaultUnit;
    return field;
  },

  emptyOverviewPanels(fallbackReason = '') {
    const schema = this.overviewFieldKinds();
    return {
      ideology: Object.fromEntries(Object.entries(schema.ideology).map(([field, kind]) => [field, this.makeOverviewField(kind, this.emptyKindValue(kind), fallbackReason, { defaultUnit: field === 'legitimacy' ? '/100' : '' })])),
      economy: { entries: Object.fromEntries(Object.entries(schema.economy).map(([field, kind]) => [field, this.makeOverviewField(kind, this.emptyKindValue(kind), fallbackReason)])) },
      politics: { entries: Object.fromEntries(Object.entries(schema.politics).map(([field, kind]) => [field, this.makeOverviewField(kind, this.emptyKindValue(kind), fallbackReason)])) },
      military: { entries: Object.fromEntries(Object.entries(schema.military).map(([field, kind]) => [field, this.makeOverviewField(kind, this.emptyKindValue(kind), fallbackReason)])) },
      diplomacy: { entries: Object.fromEntries(Object.entries(schema.diplomacy).map(([field, kind]) => [field, this.makeOverviewField(kind, this.emptyKindValue(kind), fallbackReason)])) },
      territory: { entries: Object.fromEntries(Object.entries(schema.territory).map(([field, kind]) => [field, this.makeOverviewField(kind, this.emptyKindValue(kind), fallbackReason)])) },
    };
  },

  buildOverviewPanelsFromInput(rawPanels, fallbackReason = '') {
    const ot = window.GameModules.orgTerritory;
    const result = this.emptyOverviewPanels(fallbackReason);
    const schema = this.overviewFieldKinds();
    const panels = this.plainObject(rawPanels);
    const ideologySource = this.plainObject(panels.ideology || panels.ideo);
    Object.entries(ideologySource).forEach(([key, value]) => {
      const mapped = this.resolveInputFieldKey('ideology', key);
      if (!schema.ideology[mapped]) return;
      result.ideology[mapped] = this.makeOverviewField(schema.ideology[mapped], value, fallbackReason, { defaultUnit: mapped === 'legitimacy' ? '/100' : '' });
    });
    const shortPanelKey = { economy: 'econ', politics: 'pol', military: 'mil', diplomacy: 'dip', territory: 'ter' };
    ['economy', 'politics', 'military', 'diplomacy', 'territory'].forEach((panel) => {
      const source = this.plainObject(panels[panel] || panels[shortPanelKey[panel]]);
      const entries = this.plainObject(source.entries && typeof source.entries === 'object' ? source.entries : source);
      Object.entries(entries).forEach(([key, value]) => {
        const mapped = this.resolveInputFieldKey(panel, key);
        if (!schema[panel][mapped]) return;
        result[panel].entries[mapped] = this.makeOverviewField(schema[panel][mapped], value, fallbackReason);
      });
    });
    return ot?.normalizeOverviewPanels?.(result) || result;
  },

  fieldHasValue(field = {}) {
    const value = field?.value;
    if (Array.isArray(value)) return value.length > 0;
    return String(value ?? '').trim() !== '';
  },

  fillPanelFallbacksFromTopLevel(panels = {}, raw = {}, fallbackReason = '') {
    const topResources = this.toStringList(raw.resources);
    if (topResources.length && !this.fieldHasValue(panels?.economy?.entries?.resources)) {
      panels.economy.entries.resources = this.makeOverviewField('text', topResources.join('、'), fallbackReason);
    }
    return panels;
  },

  normalizeStructureInput(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((node, index) => {
      if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        const [name, members = ''] = String(node).split('|').map((part) => part.trim());
        const roles = members.split(',').map((part) => part.trim()).filter(Boolean).map((title) => ({ title, characters: [] }));
        return name ? { name, roles } : null;
      }
      if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
      const name = String(node.name || node.title || node.label || `部门${index + 1}`).trim();
      const inputRoles = Array.isArray(node.roles) ? node.roles : (Array.isArray(node.members) ? node.members : []);
      const roles = inputRoles.map((role) => {
        if (typeof role === 'string' || typeof role === 'number' || typeof role === 'boolean') {
          const title = String(role).trim();
          return title ? { title, characters: [] } : null;
        }
        if (!role || typeof role !== 'object' || Array.isArray(role)) return null;
        const title = String(role.title || role.name || role.position || role.label || '').trim();
        if (!title) return null;
        return {
          title,
          dutyNote: String(role.dutyNote || role.duty || '').trim(),
          count: role.count,
          characters: this.toStringList(Array.isArray(role.characters) ? role.characters : (Array.isArray(role.members) ? role.members : [])),
        };
      }).filter(Boolean);
      return name ? { name, kind: String(node.kind || 'department').trim() || 'department', roles } : null;
    }).filter(Boolean);
  },

  normalizeCreateParams(params = {}) {
    const raw = this.plainObject(params);
    const candidateName = this.normalizeKey(raw.candidate || raw.candidateName || raw.sourceCandidate || raw.name);
    const id = this.normalizeKey(raw.id);
    const name = this.normalizeKey(raw.name || candidateName);
    const reason = this.normalizeKey(raw.reason) || `Stage9-1 根据完整上下文补全并创建势力：${name || candidateName || id || '未命名势力'}`;
    const type = this.normalizeKey(raw.type) || '组织';
    const kind = this.normalizeKey(raw.kind) || (/家庭|家族/.test(type) || /家庭|家族/.test(name) ? 'family' : '');
    const overviewPanels = this.fillPanelFallbacksFromTopLevel(
      this.buildOverviewPanelsFromInput({ ideo: raw.ideo, econ: raw.econ, pol: raw.pol, mil: raw.mil, dip: raw.dip, ter: raw.ter }, reason),
      raw,
      reason,
    );
    return {
      candidateName,
      id,
      name,
      type,
      kind,
      classification: this.normalizeKey(raw.classification || raw.class),
      worldTag: this.normalizeKey(raw.worldTag || raw.world),
      parentId: this.normalizeKey(raw.parentId || raw.parent_id),
      parentName: this.normalizeKey(raw.parentName || raw.parent_name),
      level: this.normalizeKey(raw.level),
      location: this.normalizeKey(raw.location),
      domain: this.normalizeKey(raw.domain),
      scale: this.normalizeKey(raw.scale),
      stance: this.normalizeKey(raw.stance),
      influence: raw.influence,
      description: this.normalizeKey(raw.description || raw.desc),
      structure: this.normalizeStructureInput(raw.structure),
      rules: this.toStringList(raw.rules),
      resources: this.toStringList(raw.resources),
      relations: this.toRelationList(raw.relations),
      solid: {
        overview: window.GameModules.orgTerritory?.normalizeFactionOverview?.(raw.overview || raw.summary || raw.势力总览 || {}, raw) || (raw.overview || {}),
        overviewPanels,
      },
      reason,
    };
  },

  normalizeCreateItem(item = {}) {
    return { method: 'createFaction', params: this.normalizeCreateParams(item) };
  },

  resolvePatchFieldPath(params = {}) {
    const panelFromParam = this.resolvePanelKey(params.panel || params.section || '');
    const rawField = this.normalizeKey(params.field || params.path || params.key);
    if (panelFromParam) {
      return { panel: panelFromParam, field: this.resolveInputFieldKey(panelFromParam, rawField) };
    }
    if (!rawField) return { panel: '', field: '' };
    const tokens = rawField.split('.').map((item) => this.normalizeKey(item)).filter(Boolean);
    if (tokens[0] === 'panels' && tokens.length >= 2) {
      const panel = this.resolvePanelKey(tokens[1]);
      return { panel, field: panel ? this.resolveInputFieldKey(panel, tokens.slice(2).join('.')) : '' };
    }
    const panel = this.resolvePanelKey(tokens[0]);
    if (panel) {
      return { panel, field: this.resolveInputFieldKey(panel, tokens.slice(1).join('.')) };
    }
    return { panel: '', field: this.resolveInputFieldKey('', rawField) };
  },

  findFaction(store, key = '') {
    const text = this.normalizeKey(key);
    const factions = Array.isArray(store?.factionState?.factions) ? store.factionState.factions : [];
    if (!text) return null;
    return factions.find((item) => this.normalizeKey(item?.id) === text || this.normalizeKey(item?.name) === text) || null;
  },

  getFactionFieldValue(store, target = {}, path = {}) {
    const faction = this.findFaction(store, target.id || target.name || '');
    if (!faction) return undefined;
    if (!path.panel) return faction?.[path.field];
    const overview = faction?.solid?.overviewPanels || {};
    if (path.panel === 'ideology') return overview?.ideology?.[path.field]?.value;
    return overview?.[path.panel]?.entries?.[path.field]?.value;
  },
  resolveRemoveIndex(currentValue, params = {}) {
    const explicit = Number(params.index);
    if (Number.isInteger(explicit) && explicit >= 0) return explicit;
    if (!Array.isArray(currentValue)) return -1;
    const matcher = params.match ?? params.value;
    if (matcher == null) return -1;
    if (typeof matcher === 'string' || typeof matcher === 'number' || typeof matcher === 'boolean') {
      const text = String(matcher).trim();
      return currentValue.findIndex((item) => {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item).trim() === text;
        if (item && typeof item === 'object') return String(item.name || item.title || item.target || '').trim() === text;
        return false;
      });
    }
    if (matcher && typeof matcher === 'object') {
      const name = this.normalizeKey(matcher.name || matcher.title || matcher.target);
      if (!name) return -1;
      return currentValue.findIndex((item) => item && typeof item === 'object' && this.normalizeKey(item.name || item.title || item.target) === name);
    }
    return -1;
  },

  normalizePatchValue(panel = '', field = '', raw, faction = null) {
    const rawObj = this.plainObject(raw);
    const valueSource = Object.prototype.hasOwnProperty.call(rawObj, 'value') ? rawObj.value : raw;
    if (!panel && field === 'overview') return window.GameModules.orgTerritory?.normalizeFactionOverview?.(valueSource, faction || {}) || valueSource;
    if (!panel) return valueSource;
    const kind = this.overviewFieldKinds()?.[panel]?.[field] || 'text';
    return this.normalizeKindValue(kind, valueSource);
  },

  expandPatchMerge(store, baseParams = {}, path = {}, value) {
    const source = this.plainObject(value);
    const ops = [];
    const reason = this.normalizeKey(baseParams.reason) || 'Stage9-2 合并更新';
    const faction = this.findFaction(store, baseParams.id || baseParams.name || baseParams.factionId || baseParams.factionName || '');
    if (path.panel) {
      Object.entries(source).forEach(([key, item]) => {
        const field = this.resolveInputFieldKey(path.panel, key);
        if (!field) return;
        ops.push({ method: 'patchFactionField', params: { id: this.normalizeKey(baseParams.id || baseParams.factionId), name: this.normalizeKey(baseParams.name || baseParams.factionName), panel: path.panel, field, op: 'set', value: this.normalizePatchValue(path.panel, field, item, faction), reason } });
      });
      return ops;
    }
    Object.entries(source).forEach(([key, item]) => {
      const panel = this.resolvePanelKey(key);
      if (panel) {
        ops.push(...this.expandPatchMerge(store, baseParams, { panel, field: '' }, item));
        return;
      }
      const field = this.resolveInputFieldKey('', key);
      if (!field) return;
      ops.push({ method: 'patchFactionField', params: { id: this.normalizeKey(baseParams.id || baseParams.factionId), name: this.normalizeKey(baseParams.name || baseParams.factionName), field, op: 'set', value: item, reason } });
    });
    return ops;
  },

  normalizePatchItem(store, item = {}) {
    const params = this.plainObject(item);
    const target = { id: this.normalizeKey(params.id || params.factionId), name: this.normalizeKey(params.name || params.factionName) };
    const faction = this.findFaction(store, target.id || target.name || '');
    const path = this.resolvePatchFieldPath(params);
    const opText = this.normalizeKey(params.op || params.operation || 'set').toLowerCase();
    const reason = this.normalizeKey(params.reason) || 'Stage9-2 字段更新';
    if (opText === 'merge') return this.expandPatchMerge(store, { ...params, ...target, reason }, path, params.value);
    if (!path.field) return [];
    const finalOp = { method: 'patchFactionField', params: { ...target, field: path.field, op: opText === 'remove' ? 'delete' : opText, reason } };
    if (path.panel) finalOp.params.panel = path.panel;
    if (finalOp.params.op === 'delete') {
      const currentValue = this.getFactionFieldValue(store, target, path);
      const index = this.resolveRemoveIndex(currentValue, params);
      if (index >= 0) finalOp.params.index = index;
      else if (Number.isInteger(Number(params.index))) finalOp.params.index = Number(params.index);
      else finalOp.params.index = -1;
    } else {
      finalOp.params.value = this.normalizePatchValue(path.panel, path.field, params.value, faction);
    }
    return [finalOp];
  },

  existingFactionKeys(store) {
    const set = new Set();
    const factions = Array.isArray(store?.factionState?.factions) ? store.factionState.factions : [];
    factions.forEach((item) => {
      const id = this.normalizeKey(item?.id);
      const name = this.normalizeKey(item?.name);
      if (id) set.add(id);
      if (name) set.add(name);
    });
    return set;
  },

  createFactionKeysFromItems(items = []) {
    const set = new Set();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const params = this.plainObject(item);
      const id = this.normalizeKey(params.id);
      const name = this.normalizeKey(params.name);
      const candidateName = this.normalizeKey(params.candidateName || params.candidate || params.sourceCandidate);
      if (id) set.add(id);
      if (name) set.add(name);
      if (candidateName) set.add(candidateName);
    });
    return set;
  },

  createTargetLabel(item = {}, index = 0, total = 0) {
    const name = this.normalizeKey(item?.name || item?.candidate || item?.candidateName || item?.id) || `目标${index + 1}`;
    return `${name} ${index + 1}/${Math.max(1, total)}`;
  },

  unresolvedPendingCandidates(store, pendingFactionCandidates = [], items = []) {
    const existing = this.existingFactionKeys(store);
    const creating = this.createFactionKeysFromItems(items);
    return (Array.isArray(pendingFactionCandidates) ? pendingFactionCandidates : []).filter((item) => {
      const id = this.normalizeKey(item?.id);
      const name = this.normalizeKey(item?.name);
      if (!id && !name) return false;
      if ((id && existing.has(id)) || (name && existing.has(name))) return false;
      if ((id && creating.has(id)) || (name && creating.has(name))) return false;
      return true;
    });
  },

  async buildCreatePrompt({ narration = '', action = '', factionIndex = '', pendingFactionCandidates = [], targetFactionCandidate = null, contextReview = '' } = {}) {
    return await window.GameModules.renderPrompt('inference-stage9-faction-create', {
      Stage1待建势力候选: Array.isArray(pendingFactionCandidates) && pendingFactionCandidates.length ? JSON.stringify(pendingFactionCandidates, null, 2).slice(0, 4000) : '无',
      本次目标势力: targetFactionCandidate ? JSON.stringify(targetFactionCandidate, null, 2).slice(0, 1200) : '请从完整上下文复查中新发现的单个未入库势力中选择最重要的一个；若没有则返回 []。',
      当前势力索引: factionIndex || '暂无势力。',
      完整上下文复查材料: String(contextReview || '无').slice(0, 36000),
      本次行动: String(action || '').slice(0, 800),
      本轮正文摘要: String(narration || '').slice(0, 4000),
    });
  },
  factionSnapshot(store, maxChars = 6000) {
    const rows = Array.isArray(store?.factionState?.factions) ? store.factionState.factions : [];
    if (!rows.length) return '无';
    const slim = rows.slice(0, 12).map((item) => ({
      id: item.id || '',
      name: item.name || '',
      type: item.type || '',
      classification: item.classification || '',
      worldTag: item.worldTag || '',
      level: item.level || '',
      location: item.location || '',
      domain: item.domain || '',
      parentId: item.parentId || '',
      parentName: item.parentName || '',
      description: item.description || '',
      structure: Array.isArray(item.structure) ? item.structure : [],
      solid: item.solid && typeof item.solid === 'object' ? item.solid : {},
    }));
    return JSON.stringify(slim, null, 2).slice(0, Math.max(800, Number(maxChars) || 6000));
  },

  async buildUpdatePrompt({ narration = '', action = '', factionIndex = '', factionSnapshot = '', pendingFactionCandidates = [] } = {}) {
    return await window.GameModules.renderPrompt('inference-stage9-faction-update', {
      Stage1待建势力候选: Array.isArray(pendingFactionCandidates) && pendingFactionCandidates.length ? JSON.stringify(pendingFactionCandidates, null, 2).slice(0, 4000) : '无',
      当前势力索引: factionIndex || '暂无势力。',
      当前势力完整快照: factionSnapshot || '无',
      本次行动: String(action || '').slice(0, 800),
      本轮正文摘要: String(narration || '').slice(0, 4000),
    });
  },

  applyItems(store, items = [], phase = 'create') {
    const ctx = window.GameModules.realWorldAgentContext;
    const lines = [];
    const applied = [];
    for (const item of (Array.isArray(items) ? items : [])) {
      const finalOps = phase === 'create' ? [this.normalizeCreateItem(item)] : this.normalizePatchItem(store, item);
      for (const op of finalOps) {
        const method = this.normalizeKey(op?.method || op?.skillMethod);
        const params = this.plainObject(op?.params);
        if (!method || !ctx?.faction) continue;
        if (!['createFaction', 'patchFactionField', 'getFactionField'].includes(method)) {
          lines.push(`势力Stage9：跳过未知 method ${method}`);
          continue;
        }
        const text = typeof ctx.faction === 'function' ? ctx.faction(store, method, params) : '势力查询模块未加载。';
        applied.push({ method, params, text: String(text || '').slice(0, 400) });
        if (text) lines.push(String(text).split('\n')[0]);
      }
    }
    return { lines, applied };
  },

  async requestStage9(loop, store, config, logId, prompt, phaseTitle, promptId, reasoningStep = 0) {
    return await loop.completeCachedJsonPrompt(store, {
      prompt,
      logId,
      ...config,
      sourceTitle: `${config?.label || ''}${phaseTitle}`,
      promptId,
      reasoningPhase: 'stage9',
      reasoningStep,
      reasoningKey: reasoningStep > 0 ? `stage9-${reasoningStep}` : 'stage9',
      jsonMode: true,
      outputLimitKind: 'stage4',
    });
  },
  async runAfterSettlement({ store, action, narration, updates, participants, logId, config, loop, materialSession = null, contextReview = '' }) {
    if (config?.mode === 'story') return { ops: [], lines: [], skipped: true };
    const ctx = window.GameModules.realWorldAgentContext;
    store?.initFactionSystem?.();
    const pendingFactionCandidates = window.GameModules.realWorldMaterials?.pendingFactionCandidates?.(materialSession) || [];
    const factionIndexBeforeCreate = ctx?.factionList?.(store) || '暂无势力。';
    const unresolvedBeforeCreate = this.unresolvedPendingCandidates(store, pendingFactionCandidates, []);
    console.log('[Stage9-1势力创建] 待建候选=', pendingFactionCandidates, '未入库候选=', unresolvedBeforeCreate);

    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage9-1 势力创建…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage9-1 势力创建：重新检查完整上下文，按候选逐个创建完整势力，避免长 JSON 被截断。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'stage9-1-status',
      settlementThinkingLabel: 'Stage9-1 势力创建',
      livePatch: true,
    });

    const createRawParts = [];
    let createItems = [];
    const appliedCreate = { lines: [], applied: [] };
    const targets = unresolvedBeforeCreate.length ? unresolvedBeforeCreate : [null];
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      try {
        const phaseTitle = target ? `Stage9-1【${this.createTargetLabel(target, index, targets.length)}】` : 'Stage9-1【上下文复查 1/1】';
        const createPrompt = await this.buildCreatePrompt({
          narration,
          action,
          factionIndex: ctx?.factionList?.(store) || factionIndexBeforeCreate,
          pendingFactionCandidates,
          targetFactionCandidate: target,
          contextReview,
        });
        const raw = await this.requestStage9(
          loop,
          store,
          config,
          logId,
          createPrompt,
          phaseTitle,
          'inference-stage9-faction-create',
          1 + index,
        );
        createRawParts.push(raw);
        const items = this.parseArrayPayload(raw);
        createItems.push(...items);
        const applied = this.applyItems(store, items, 'create');
        appliedCreate.lines.push(...applied.lines);
        appliedCreate.applied.push(...applied.applied);
      } catch (err) {
        const label = target ? this.createTargetLabel(target, index, targets.length) : '上下文复查 1/1';
        console.warn('[Stage9-1势力创建] 单个候选失败:', label, err?.message || err);
        appliedCreate.lines.push(`势力Stage9-1 ${label}失败：${err?.message || '未知错误'}；继续后续候选。`);
      }
    }

    const unresolvedAfterCreate = this.unresolvedPendingCandidates(store, pendingFactionCandidates, createItems);
    console.log('[Stage9-1势力创建] 完整势力数组=', createItems, '未消费候选=', unresolvedAfterCreate);

    const factionIndexBeforeUpdate = ctx?.factionList?.(store) || '暂无势力。';
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage9-2 势力更新…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage9-2 势力更新：只根据正文事实变化或明显字段缺陷来 patch 已存在势力字段。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'stage9-2-status',
      settlementThinkingLabel: 'Stage9-2 势力更新',
      livePatch: true,
    });

    let updateRaw = '';
    let updateItems = [];
    try {
      const updatePrompt = await this.buildUpdatePrompt({ narration, action, factionIndex: factionIndexBeforeUpdate, factionSnapshot: this.factionSnapshot(store), pendingFactionCandidates });
      updateRaw = await this.requestStage9(
        loop,
        store,
        config,
        logId,
        updatePrompt,
        'Stage9-2 势力更新',
        'inference-stage9-faction-update',
        2,
      );
      updateItems = this.parseArrayPayload(updateRaw);
    } catch (err) {
      console.warn('[Stage9-2势力更新] 生成失败:', err?.message || err);
      return {
        ops: appliedCreate.applied.map(({ method, params }) => ({ method, params })),
        lines: [...appliedCreate.lines, `势力Stage9-2失败：${err?.message || '未知错误'}`],
        applied: appliedCreate.applied,
        createRaw: createRawParts.join('\n\n'),
        error: err?.message,
      };
    }

    console.log('[Stage9-2势力更新] 字段补丁数组=', updateItems);
    const appliedUpdate = this.applyItems(store, updateItems, 'update');

    const lines = [];
    if (unresolvedAfterCreate.length) {
      lines.push(`势力Stage9-1未完成：仍有 ${unresolvedAfterCreate.length} 个待建势力候选未被创建。`);
    }
    lines.push(...appliedCreate.lines, ...appliedUpdate.lines);

    return {
      ops: [...appliedCreate.applied, ...appliedUpdate.applied].map(({ method, params }) => ({ method, params })),
      lines,
      applied: [...appliedCreate.applied, ...appliedUpdate.applied],
      createRaw: createRawParts.join('\n\n'),
      updateRaw,
      unresolvedPendingCandidates: unresolvedAfterCreate,
    };
  },
};
