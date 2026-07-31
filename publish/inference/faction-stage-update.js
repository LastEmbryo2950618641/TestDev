window.GameModules = window.GameModules || {};

window.GameModules.inferenceFactionStageUpdate = {
  parseOpsPayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { ops: [], done: true };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const ops = Array.isArray(data.ops) ? data.ops : (Array.isArray(data.operations) ? data.operations : []);
      return { ops, done: data.done !== false, raw: data };
    } catch (_) {
      return { ops: [], done: true };
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
    };
  },

  panelFieldAliases() {
    return {
      ideology: { core: 'core', reason: 'reason', desc: 'description', description: 'description', base: 'base', legit: 'legitimacy', legitimacy: 'legitimacy' },
      economy: { gdp: 'gdp', income: 'income', expense: 'expenditure', expenditure: 'expenditure', assets: 'assets', res: 'resources', resources: 'resources', output: 'production', production: 'production', system: 'system', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      politics: { regime: 'regime', power: 'powerStructure', powerstructure: 'powerStructure', rule: 'rulemaking', rulemaking: 'rulemaking', judge: 'adjudication', adjudication: 'adjudication', exec: 'execution', execution: 'execution', part: 'participation', participation: 'participation', lead: 'leadership', leadership: 'leadership', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      military: { posture: 'posture', forces: 'forces', troops: 'personnel', personnel: 'personnel', quality: 'quality', supply: 'sustainment', sustainment: 'sustainment', reach: 'projection', projection: 'projection', equip: 'equipment', equipment: 'equipment', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      diplomacy: { posture: 'posture', orient: 'orientation', orientation: 'orientation', allies: 'allies', rivals: 'rivals', members: 'memberships', memberships: 'memberships', treaties: 'treaties', presence: 'presence', orgs: 'institutions', institutions: 'institutions', laws: 'laws', works: 'works' },
      territory: { capital: 'capital', area: 'area', pop: 'population', population: 'population', admin: 'adminDivision', admindivision: 'adminDivision', regions: 'regions' },
    };
  },

  resolvePanelKey(value = '') {
    const key = this.normalizeKey(value).toLowerCase();
    return this.panelAliases()[key] || '';
  },

  resolveDraftFieldKey(panel = '', value = '') {
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
        const name = String(item).trim();
        return name ? { name, description: '' } : null;
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
        const name = String(item).trim();
        return name ? { name, description: '', viewOfSelf: '' } : null;
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
        const name = String(item).trim();
        return name ? { name, items: [] } : null;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const name = String(item.name || item.group || item.title || '').trim();
      if (!name) return null;
      const items = this.toStringList(Array.isArray(item.items) ? item.items : (Array.isArray(item.members) ? item.members : []));
      return { name, items };
    }).filter(Boolean);
  },

  toRegionList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (item == null) return null;
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const name = String(item).trim();
        return name ? { name, capital: '', area: '', controlRate: '', population: '', description: '', garrison: '' } : null;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const name = String(item.name || item.region || item.title || '').trim();
      if (!name) return null;
      return {
        name,
        capital: String(item.capital || item.center || '').trim(),
        area: String(item.area || '').trim(),
        controlRate: String(item.controlRate || item.ctrl || '').trim(),
        population: String(item.population || item.pop || '').trim(),
        description: String(item.description || item.desc || '').trim(),
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

  buildOverviewPanelsFromDraft(rawPanels, fallbackReason = '') {
    const ot = window.GameModules.orgTerritory;
    const result = this.emptyOverviewPanels(fallbackReason);
    const schema = this.overviewFieldKinds();
    const panels = this.plainObject(rawPanels);
    const ideologySource = this.plainObject(panels.ideology || panels.ideo);
    Object.entries(ideologySource).forEach(([key, value]) => {
      const mapped = this.resolveDraftFieldKey('ideology', key);
      if (!schema.ideology[mapped]) return;
      result.ideology[mapped] = this.makeOverviewField(schema.ideology[mapped], value, fallbackReason, { defaultUnit: mapped === 'legitimacy' ? '/100' : '' });
    });
    const shortPanelKey = { economy: 'econ', politics: 'pol', military: 'mil', diplomacy: 'dip', territory: 'ter' };
    ['economy', 'politics', 'military', 'diplomacy', 'territory'].forEach((panel) => {
      const source = this.plainObject(panels[panel] || panels[shortPanelKey[panel]]);
      const entries = this.plainObject(source.entries && typeof source.entries === 'object' ? source.entries : source);
      Object.entries(entries).forEach(([key, value]) => {
        const mapped = this.resolveDraftFieldKey(panel, key);
        if (!schema[panel][mapped]) return;
        result[panel].entries[mapped] = this.makeOverviewField(schema[panel][mapped], value, fallbackReason);
      });
    });
    return ot?.normalizeOverviewPanels?.(result) || result;
  },

  normalizeStructureDraft(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((node, index) => {
      if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        const name = String(node).trim();
        return name ? { name, roles: [] } : null;
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

  normalizeCreateDraftParams(params = {}) {
    const raw = this.plainObject(params);
    const candidateName = this.normalizeKey(raw.candidate || raw.candidateName || raw.sourceCandidate || raw.name);
    const id = this.normalizeKey(raw.id);
    const name = this.normalizeKey(raw.name || candidateName);
    const reason = this.normalizeKey(raw.reason) || `Stage9-1 根据完整上下文补全并创建势力：${name || candidateName || id || '未命名势力'}`;
    const type = this.normalizeKey(raw.type) || '组织';
    const kind = this.normalizeKey(raw.kind) || (/家庭|家族/.test(type) || /家庭|家族/.test(name) ? 'family' : '');
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
      structure: this.normalizeStructureDraft(raw.structure),
      rules: this.toStringList(raw.rules),
      resources: this.toStringList(raw.resources),
      relations: this.toRelationList(raw.relations),
      solid: { overviewPanels: this.buildOverviewPanelsFromDraft(raw.panels || raw.overviewPanels || raw.solid?.overviewPanels, reason) },
      reason,
    };
  },

  normalizeCreateDraftOp(op = {}) {
    return { method: 'createFaction', params: this.normalizeCreateDraftParams(op.params) };
  },

  resolveDraftFieldPath(params = {}) {
    const panelFromParam = this.resolvePanelKey(params.panel || params.section || '');
    const rawField = this.normalizeKey(params.field || params.path || params.key);
    if (panelFromParam) {
      return { panel: panelFromParam, field: this.resolveDraftFieldKey(panelFromParam, rawField) };
    }
    if (!rawField) return { panel: '', field: '' };
    const tokens = rawField.split('.').map((item) => this.normalizeKey(item)).filter(Boolean);
    if (tokens[0] === 'panels' && tokens.length >= 2) {
      const panel = this.resolvePanelKey(tokens[1]);
      return { panel, field: panel ? this.resolveDraftFieldKey(panel, tokens.slice(2).join('.')) : '' };
    }
    const panel = this.resolvePanelKey(tokens[0]);
    if (panel) {
      return { panel, field: this.resolveDraftFieldKey(panel, tokens.slice(1).join('.')) };
    }
    return { panel: '', field: this.resolveDraftFieldKey('', rawField) };
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

  normalizePatchValue(panel = '', field = '', raw) {
    const rawObj = this.plainObject(raw);
    const valueSource = Object.prototype.hasOwnProperty.call(rawObj, 'value') ? rawObj.value : raw;
    if (!panel) return valueSource;
    const kind = this.overviewFieldKinds()?.[panel]?.[field] || 'text';
    return this.normalizeKindValue(kind, valueSource);
  },

  expandPatchMerge(store, baseParams = {}, path = {}, value) {
    const source = this.plainObject(value);
    const ops = [];
    const reason = this.normalizeKey(baseParams.reason) || 'Stage9-2 合并更新';
    if (path.panel) {
      Object.entries(source).forEach(([key, item]) => {
        const field = this.resolveDraftFieldKey(path.panel, key);
        if (!field) return;
        ops.push({ method: 'patchFactionField', params: { id: this.normalizeKey(baseParams.id || baseParams.factionId), name: this.normalizeKey(baseParams.name || baseParams.factionName), panel: path.panel, field, op: 'set', value: this.normalizePatchValue(path.panel, field, item), reason } });
      });
      return ops;
    }
    Object.entries(source).forEach(([key, item]) => {
      const panel = this.resolvePanelKey(key);
      if (panel) {
        ops.push(...this.expandPatchMerge(store, baseParams, { panel, field: '' }, item));
        return;
      }
      const field = this.resolveDraftFieldKey('', key);
      if (!field) return;
      ops.push({ method: 'patchFactionField', params: { id: this.normalizeKey(baseParams.id || baseParams.factionId), name: this.normalizeKey(baseParams.name || baseParams.factionName), field, op: 'set', value: item, reason } });
    });
    return ops;
  },

  normalizePatchDraftOp(store, op = {}) {
    const params = this.plainObject(op.params);
    const target = { id: this.normalizeKey(params.id || params.factionId), name: this.normalizeKey(params.name || params.factionName) };
    const path = this.resolveDraftFieldPath(params);
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
      finalOp.params.value = this.normalizePatchValue(path.panel, path.field, params.value);
    }
    return [finalOp];
  },

  toFinalOps(store, op = {}) {
    const method = this.normalizeKey(op?.method || op?.skillMethod);
    if (!method) return [];
    if (method === 'createFactionDraft') return [this.normalizeCreateDraftOp(op)];
    if (method === 'patchFactionDraft') return this.normalizePatchDraftOp(store, op);
    if (['createFaction', 'patchFactionField', 'getFactionField'].includes(method)) return [{ method, params: this.plainObject(op.params) }];
    return [];
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

  createFactionKeysFromOps(ops = []) {
    const set = new Set();
    (Array.isArray(ops) ? ops : []).forEach((op) => {
      const method = this.normalizeKey(op?.method || op?.skillMethod);
      if (!['createFaction', 'createFactionDraft'].includes(method)) return;
      const params = this.plainObject(op?.params);
      const id = this.normalizeKey(params.id);
      const name = this.normalizeKey(params.name);
      const candidateName = this.normalizeKey(params.candidateName || params.candidate || params.sourceCandidate);
      if (id) set.add(id);
      if (name) set.add(name);
      if (candidateName) set.add(candidateName);
    });
    return set;
  },

  unresolvedPendingCandidates(store, pendingFactionCandidates = [], ops = []) {
    const existing = this.existingFactionKeys(store);
    const creating = this.createFactionKeysFromOps(ops);
    return (Array.isArray(pendingFactionCandidates) ? pendingFactionCandidates : []).filter((item) => {
      const id = this.normalizeKey(item?.id);
      const name = this.normalizeKey(item?.name);
      if (!id && !name) return false;
      if ((id && existing.has(id)) || (name && existing.has(name))) return false;
      if ((id && creating.has(id)) || (name && creating.has(name))) return false;
      return true;
    });
  },

  pickOps(ops = [], allowedMethods = []) {
    const allow = new Set((Array.isArray(allowedMethods) ? allowedMethods : []).map((item) => this.normalizeKey(item)));
    const picked = [];
    const skipped = [];
    (Array.isArray(ops) ? ops : []).forEach((op) => {
      const method = this.normalizeKey(op?.method || op?.skillMethod);
      if (!method) return;
      if (allow.has(method)) picked.push(op);
      else skipped.push(op);
    });
    return { picked, skipped };
  },

  buildCreatePrompt({ narration = '', action = '', factionIndex = '', pendingFactionCandidates = [], contextReview = '' } = {}) {
    return [
      '# Stage9-1 势力创建',
      '角色：势力首建草稿生成器。你这一阶段只负责 createFactionDraft。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '你必须重新检查本轮完整上下文；只要稍微识别到可作为势力的组织线索，且尚未入库，就必须创建。即使 Stage1 候选为空，也不能跳过复查。',
      '',
      '## 规则',
      '1. 只允许输出 createFactionDraft；禁止输出 patchFactionDraft、createFaction、patchFactionField。',
      '2. Stage1 待建候选若仍未入库，必须全部创建；正文或完整上下文中新出现但 Stage1 漏记的势力线索，也必须补创建。',
      '3. Stage1 候选称呼只是线索，不是最终势力名；必须基于完整上下文合理推演并补全正式名称与完整资料。',
      '4. 若 Stage1 待建候选已带 id，必须沿用该 id；不要改 ID。只有复查时新发现且确实没有 id 的势力，才自行生成稳定唯一 ID。',
      '5. 不要输出最终落库 UI schema；你只输出短 English key 的 draft schema，最多三层嵌套。代码会把 draft 映射为最终 createFaction。',
      '6. create draft 不能是空壳；必须尽量一次补齐 name/type/class/world/location/domain/scale/stance/influence/desc/structure/rules/resources/relations/panels。',
      '7. reason 在 Stage9-1 可省略；若省略，代码会补默认 reason。',
      '8. 同一响应中把全部待创建势力分别写成 createFactionDraft op，一次性批量返回。不要逐个等待下一轮。',
      '9. 若复查后确实没有任何未入库势力，才返回 { "ops": [], "done": true }。',
      '',
      '## Draft schema',
      '{ "ops": [ { "method": "createFactionDraft", "params": { "candidate": "Stage1原候选称呼", "id": "待沿用或新生成", "name": "最终势力名", "type": "组织类型", "kind": "可选", "class": "classification", "world": "所属世界", "parent_id": null, "parent_name": null, "level": "层级", "location": "地点", "domain": "领域", "scale": "规模", "stance": "立场", "influence": 30, "desc": "简介", "structure": [ { "name": "部门", "members": ["职位A", "职位B"] } ], "rules": ["规则"], "resources": ["资源"], "relations": [ { "target": "对象", "type": "关系" } ], "panels": { "ideo": { "core": "...", "base": "...", "desc": "...", "legit": 60 }, "econ": { "income": "...", "orgs": [ { "name": "机构", "description": "..." } ] }, "pol": { "regime": "..." }, "mil": { "posture": "..." }, "dip": { "allies": [ { "name": "对象", "description": "...", "viewOfSelf": "..." } ] }, "ter": { "capital": "...", "regions": [ { "name": "区域", "center": "中心", "area": "...", "ctrl": "...", "pop": "...", "desc": "...", "garrison": "..." } ] } }, "reason": "可选" } } ], "done": true }',
      'panel key 只用：ideo / econ / pol / mil / dip / ter。字段可用短 key，例如 desc / legit / orgs / power / rule / judge / exec / part / lead / troops / supply / reach / equip / orient / members / pop / admin。',
      '',
      '## Stage1 待建势力候选',
      (Array.isArray(pendingFactionCandidates) && pendingFactionCandidates.length ? JSON.stringify(pendingFactionCandidates, null, 2).slice(0, 4000) : '无'),
      '',
      '## 当前势力索引',
      factionIndex || '暂无势力。',
      '',
      '## 本轮完整上下文复查材料',
      String(contextReview || '无').slice(0, 36000),
      '',
      '## 本次行动',
      String(action || '').slice(0, 800),
      '',
      '## 本轮正文（摘要）',
      String(narration || '').slice(0, 4000),
    ].join('\n');
  },
  validateCreateFactionPayload(params = {}) {
    const overview = params?.solid?.overviewPanels;
    if (!overview || typeof overview !== 'object' || Array.isArray(overview)) return '缺少 solid.overviewPanels';
    if (overview.teritory) return 'overviewPanels 使用了错误 key teritory，必须是 territory';
    const requiredPanels = ['ideology', 'economy', 'politics', 'military', 'diplomacy', 'territory'];
    const missingPanel = requiredPanels.find((key) => !overview[key] || typeof overview[key] !== 'object' || Array.isArray(overview[key]));
    if (missingPanel) return `缺少 overviewPanels.${missingPanel}`;
    const ideologyKeys = ['core', 'reason', 'description', 'base', 'legitimacy'];
    const missingIdeology = ideologyKeys.find((key) => !overview.ideology[key] || typeof overview.ideology[key] !== 'object' || !Object.prototype.hasOwnProperty.call(overview.ideology[key], 'value'));
    if (missingIdeology) return `overviewPanels.ideology.${missingIdeology} 必须是包含 value 的对象`;
    const schema = {
      economy: ['gdp', 'income', 'expenditure', 'assets', 'resources', 'production', 'system', 'institutions', 'laws', 'works'],
      politics: ['regime', 'powerStructure', 'rulemaking', 'adjudication', 'execution', 'participation', 'leadership', 'institutions', 'laws', 'works'],
      military: ['posture', 'forces', 'personnel', 'quality', 'sustainment', 'projection', 'equipment', 'institutions', 'laws', 'works'],
      diplomacy: ['posture', 'orientation', 'allies', 'rivals', 'memberships', 'treaties', 'presence', 'institutions', 'laws', 'works'],
      territory: ['capital', 'area', 'population', 'adminDivision', 'regions'],
    };
    for (const [panelKey, fields] of Object.entries(schema)) {
      const entries = overview[panelKey]?.entries;
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) return `overviewPanels.${panelKey}.entries 必须存在`;
      const missingField = fields.find((field) => !entries[field] || typeof entries[field] !== 'object' || !Object.prototype.hasOwnProperty.call(entries[field], 'value'));
      if (missingField) return `overviewPanels.${panelKey}.entries.${missingField} 必须是包含 value 的对象`;
    }
    return '';
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
      description: item.description || '',
      structure: Array.isArray(item.structure) ? item.structure : [],
      solid: item.solid && typeof item.solid === 'object' ? item.solid : {},
    }));
    return JSON.stringify(slim, null, 2).slice(0, Math.max(800, Number(maxChars) || 6000));
  },

  buildUpdatePrompt({ narration = '', action = '', factionIndex = '', factionSnapshot = '', pendingFactionCandidates = [] } = {}) {
    return [
      '# Stage9-2 势力更新',
      '角色：势力字段草稿更新器。你这一阶段只负责 patchFactionDraft。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '本阶段在 Stage9-1 创建之后执行。',
      '',
      '## 规则',
      '1. 只允许输出 patchFactionDraft；禁止输出 createFactionDraft、createFaction、patchFactionField。',
      '2. 若当前势力字段明显不合理、空白、占位、壳化或过于模糊，而上下文/候选参数/正文足以支持稳定推断，可以直接补齐更新。',
      '3. 若当前字段已经具体、合理、成型，则必须有正文或上下文中的明确事实变化依据，才允许更新。',
      '4. 仅被提及、没有事实变化、且当前字段本身并不明显不合理的势力，不要 patch。',
      '5. Stage9-2 的 reason 必填。',
      '6. 你只输出短 English key 的 draft patch；代码会把 draft 映射为最终 patchFactionField。',
      '7. field 可以写顶层字段，也可以写短路径：ideo.core / ideo.legit / econ.income / pol.power / mil.forces / dip.allies / ter.regions。',
      '8. op 只用：set / append / remove / merge。merge 适合一次补多个字段。remove 若删除列表项，优先配合 match 或 index。',
      '9. 若没有任何可更新字段，返回 { "ops": [], "done": true }。',
      '',
      '## Draft schema',
      '{ "ops": [ { "method": "patchFactionDraft", "params": { "id": "force-xxx", "name": "势力名", "field": "econ.income", "op": "set", "value": "新的字段值", "reason": "依据说明" } } ], "done": true }',
      '也可使用 merge，例如：{ "method": "patchFactionDraft", "params": { "id": "force-xxx", "field": "econ", "op": "merge", "value": { "income": "...", "orgs": [ { "name": "机构", "description": "..." } ] }, "reason": "依据说明" } }。',
      '',
      '## Stage1 待建势力候选 / 上下文补齐线索',
      (Array.isArray(pendingFactionCandidates) && pendingFactionCandidates.length ? JSON.stringify(pendingFactionCandidates, null, 2).slice(0, 4000) : '无'),
      '',
      '## 当前势力索引',
      factionIndex || '暂无势力。',
      '',
      '## 当前势力完整快照',
      factionSnapshot || '无',
      '',
      '## 本次行动',
      String(action || '').slice(0, 800),
      '',
      '## 本轮正文（摘要）',
      String(narration || '').slice(0, 4000),
    ].join('\n');
  },

  applyOps(store, ops = []) {
    const ctx = window.GameModules.realWorldAgentContext;
    const lines = [];
    const applied = [];
    for (const rawOp of (Array.isArray(ops) ? ops : []).slice(0, 24)) {
      const finalOps = this.toFinalOps(store, rawOp);
      if (!finalOps.length) {
        const skippedMethod = this.normalizeKey(rawOp?.method || rawOp?.skillMethod);
        if (skippedMethod) lines.push(`势力Stage9：跳过未知 method ${skippedMethod}`);
        continue;
      }
      for (const op of finalOps) {
        const method = this.normalizeKey(op?.method || op?.skillMethod);
        const params = this.plainObject(op?.params);
        if (!method || !ctx?.faction) continue;
        if (method === 'createFaction') {
          const invalidReason = this.validateCreateFactionPayload(params);
          if (invalidReason) {
            const text = `势力Stage9：拒绝不完整 createFaction（${params?.name || params?.candidateName || '未命名'}）：${invalidReason}`;
            console.warn('[Stage9势力] createFaction JSON 不符合 UI schema，已拒绝落库:', { reason: invalidReason, id: params?.id, name: params?.name });
            lines.push(text);
            applied.push({ method, params, text });
            continue;
          }
        }
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

  async requestStage9(loop, store, config, logId, prompt, phaseTitle, reasoningStep = 0) {
    return await loop.completeCachedJsonPrompt(store, {
      prompt,
      logId,
      ...config,
      sourceTitle: `${config?.label || ''}${phaseTitle}`,
      promptId: 'inference-stage6-faction-update',
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
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage9-1 势力创建：重新检查完整上下文，并一次性批量创建全部未入库势力。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'stage9-1-status',
      settlementThinkingLabel: 'Stage9-1 势力创建',
      livePatch: true,
    });

    let createRaw = '';
    try {
      createRaw = await this.requestStage9(
        loop,
        store,
        config,
        logId,
        this.buildCreatePrompt({ narration, action, factionIndex: factionIndexBeforeCreate, pendingFactionCandidates, contextReview }),
        'Stage9-1 势力创建',
        1,
      );
    } catch (err) {
      console.warn('[Stage9-1势力创建] 生成失败:', err?.message || err);
      return { ops: [], lines: [`势力Stage9-1失败：${err?.message || '未知错误'}`], skipped: true, error: err?.message };
    }

    const parsedCreate = this.parseOpsPayload(createRaw);
    const createSelection = this.pickOps(parsedCreate.ops, ['createFactionDraft', 'createFaction']);
    if (createSelection.skipped.length) console.warn('[Stage9-1势力创建] 已忽略非创建 ops:', createSelection.skipped);
    const unresolvedAfterCreate = this.unresolvedPendingCandidates(store, pendingFactionCandidates, createSelection.picked);
    console.log('[Stage9-1势力创建] create ops=', createSelection.picked, '未消费候选=', unresolvedAfterCreate);
    const appliedCreate = this.applyOps(store, createSelection.picked);

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
    try {
      updateRaw = await this.requestStage9(
        loop,
        store,
        config,
        logId,
        this.buildUpdatePrompt({ narration, action, factionIndex: factionIndexBeforeUpdate, factionSnapshot: this.factionSnapshot(store), pendingFactionCandidates }),
        'Stage9-2 势力更新',
        2,
      );
    } catch (err) {
      console.warn('[Stage9-2势力更新] 生成失败:', err?.message || err);
      return {
        ops: appliedCreate.applied.map(({ method, params }) => ({ method, params })),
        lines: [...appliedCreate.lines, `势力Stage9-2失败：${err?.message || '未知错误'}`],
        applied: appliedCreate.applied,
        createRaw,
        error: err?.message,
      };
    }

    const parsedUpdate = this.parseOpsPayload(updateRaw);
    const updateSelection = this.pickOps(parsedUpdate.ops, ['patchFactionDraft', 'patchFactionField']);
    if (updateSelection.skipped.length) console.warn('[Stage9-2势力更新] 已忽略非更新 ops:', updateSelection.skipped);
    console.log('[Stage9-2势力更新] patch ops=', updateSelection.picked);
    const appliedUpdate = this.applyOps(store, updateSelection.picked);

    const lines = [];
    if (unresolvedAfterCreate.length) {
      lines.push(`势力Stage9-1未完成：仍有 ${unresolvedAfterCreate.length} 个待建势力候选未被创建。`);
    }
    lines.push(...appliedCreate.lines, ...appliedUpdate.lines);

    return {
      ops: [...appliedCreate.applied, ...appliedUpdate.applied].map(({ method, params }) => ({ method, params })),
      lines,
      applied: [...appliedCreate.applied, ...appliedUpdate.applied],
      createRaw,
      updateRaw,
      unresolvedPendingCandidates: unresolvedAfterCreate,
    };
  },
};
