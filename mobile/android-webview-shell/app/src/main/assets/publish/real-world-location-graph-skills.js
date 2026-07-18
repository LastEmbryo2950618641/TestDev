window.GameModules = window.GameModules || {};

window.GameModules.realWorldLocationGraphSkills = {
  graph() {
    return window.GameModules.realWorldLocationGraph;
  },

  query(store = {}, method = '', params = {}) {
    const graph = this.graph();
    if (!graph) return '';
    if (method === 'getNode') return this.getNode(store, params);
    if (method === 'pathByNodeId') return this.pathByNodeId(store, params);
    if (method === 'nearbyBfs') return this.nearbyBfs(store, params);
    if (method === 'searchNode') return this.searchNode(store, params);
    if (method === 'searchByPerson') return this.searchByPerson(store, params);
    if (method === 'searchContracts') return this.searchContracts(store, params);
    if (method === 'authorityPath') return this.authorityPath(store, params);
    if (method === 'nodeEnsureAsync' || method === 'ensureAsync') return this.nodeEnsureAsync(store, params);
    if (method === 'nodeEnsure' || method === 'ensure') return this.nodeEnsure(store, params);
    return '未知房产地点查询方法。';
  },

  nodeSummary(store = {}, node = {}) {
    if (!node?.id) return '';
    const graph = this.graph();
    return [
      node.identityKey ? `identityKey:${node.identityKey}` : '',
      `标识：${node.id}`,
      `类型：${node.type || '未知'}`,
      `名称：${node.displayName || node.name || '未命名'}`,
      `路径：${graph.pathText(store, node.id) || node.name || node.id}`,
      node.legacyMapNodeId ? `旧地图标识：${node.legacyMapNodeId}` : '',
      node.ownerRefs?.length ? `所属：${node.ownerRefs.map((ref) => ref.name || ref.id || ref.type).filter(Boolean).join('、')}` : '',
      node.usageContracts?.length ? `合同数：${node.usageContracts.length}` : '',
    ].filter(Boolean).join('\n');
  },

  edgeSummary(row = {}) {
    const node = row.node || {};
    const edge = row.edge || {};
    return [
      `- ${node.displayName || node.name || node.id}（标识:${node.id}，层数:${row.depth || 1}）`,
      edge.distanceText ? `距离:${edge.distanceText}` : '',
      edge.distanceMeters ? `距离米:${edge.distanceMeters}` : '',
      edge.basis ? `依据:${edge.basis}` : '',
    ].filter(Boolean).join('，');
  },

  getNode(store = {}, params = {}) {
    const node = this.graph().getNode(store, params.nodeId || params.id || params.name);
    return node ? this.nodeSummary(store, node) : '未命中节点。';
  },

  pathByNodeId(store = {}, params = {}) {
    const path = this.graph().pathByNodeId(store, params.nodeId || params.id);
    if (!path.length) return '未命中节点路径。';
    return path.map((node) => `${node.displayName || node.name || node.id}（${node.type || 'node'}:${node.id}）`).join(' -> ');
  },

  nearbyBfs(store = {}, params = {}) {
    const rows = this.graph().nearbyBfs(store, params.nodeId || params.id || params.locationName, params.depth || 1);
    return rows.length ? rows.map((row) => this.edgeSummary(row)).join('\n') : '暂无周围直接相邻节点。';
  },

  searchNode(store = {}, params = {}) {
    const rows = this.graph().searchNode(store, params.keyword || params.name || '', params.limit || 20);
    return rows.length ? rows.map((node) => this.nodeSummary(store, node)).join('\n\n') : '未命中节点。';
  },

  searchByPerson(store = {}, params = {}) {
    const rows = this.graph().searchByPerson(store, params.name || params.personName || '', params.mode || 'both');
    return rows.length ? rows.map((node) => this.nodeSummary(store, node)).join('\n\n') : '未命中该姓名相关房产节点。';
  },

  searchContracts(store = {}, params = {}) {
    const rows = this.graph().searchContracts(store, params);
    return rows.length
      ? rows.map(({ node, contract }) => [
        `节点：${node.displayName || node.name}（${node.id}）`,
        `合同：${contract.id || '未命名'}`,
        `状态：${contract.status || '未知'}`,
        `月租：${Number(contract.monthlyRent) || 0}`,
        `欠款：${Number(contract.debtAmount) || 0}`,
      ].join('，')).join('\n')
      : '未命中合同。';
  },

  authorityPath(store = {}, params = {}) {
    const result = this.graph().authorityPath(store, params.nodeId || params.id);
    if (!result.path.length) return '未命中节点解释权。';
    return [
      `路径：${result.path.map((node) => node.displayName || node.name || node.id).join(' -> ')}`,
      result.ownerRefs?.length ? `所属：${result.ownerRefs.map((ref) => ref.name || ref.id || ref.type).filter(Boolean).join('、')}` : '所属：未知',
      result.effectiveAuthorityRef ? `最高解释权：${result.effectiveAuthorityRef.name || result.effectiveAuthorityRef.id || result.effectiveAuthorityRef.type}` : '最高解释权：未记录',
    ].join('\n');
  },

  auditDebug(store = {}, event = '', detail = {}) {
    const row = {
      at: new Date().toISOString(),
      event,
      stage: detail.stage || '',
      targetKeyword: detail.targetKeyword || '',
      currentRef: detail.currentRef || '',
      signature: detail.signature || '',
      decision: detail.decision || '',
      nodeId: detail.nodeId || '',
      changedNodeIds: Array.isArray(detail.changedNodeIds) ? detail.changedNodeIds : [],
      reason: detail.reason || '',
    };
    store.realWorldLocationGraphDebugLog = Array.isArray(store.realWorldLocationGraphDebugLog) ? store.realWorldLocationGraphDebugLog : [];
    store.realWorldLocationGraphDebugLog.unshift(row);
    store.realWorldLocationGraphDebugLog = store.realWorldLocationGraphDebugLog.slice(0, 80);
    console.info?.('[location-tree-audit-fill]', row);
    return row;
  },

  auditSignature(input = {}) {
    return [
      String(input.stage || ''),
      String(input.intent || ''),
      String(input.targetKeyword || '').trim(),
      String(input.currentNode?.id || input.currentNode?.name || ''),
      String(input.requiredScopeText || ''),
    ].join('|');
  },

  readAuditCache(store = {}, signature = '') {
    const graph = this.graph().ensureGraphState(store);
    const cached = signature ? graph.auditCache?.[signature] : null;
    if (!cached?.result) return null;
    if (cached.result.nodeId && !graph.nodesById[cached.result.nodeId]) return null;
    return cached.result;
  },

  writeAuditCache(store = {}, signature = '', result = {}) {
    if (!signature) return;
    const graph = this.graph().ensureGraphState(store);
    graph.auditCache = graph.auditCache && typeof graph.auditCache === 'object' ? graph.auditCache : {};
    graph.auditCache[signature] = {
      at: new Date().toISOString(),
      result: {
        decision: result.decision || '',
        nodeId: result.nodeId || '',
        path: Array.isArray(result.path) ? result.path : [],
        changedNodeIds: Array.isArray(result.changedNodeIds) ? result.changedNodeIds : [],
        queryEvidence: Array.isArray(result.queryEvidence) ? result.queryEvidence : [],
        audit: result.audit || null,
      },
    };
    const entries = Object.entries(graph.auditCache);
    if (entries.length > 80) {
      entries
        .sort((left, right) => String(right[1]?.at || '').localeCompare(String(left[1]?.at || '')))
        .slice(80)
        .forEach(([key]) => { delete graph.auditCache[key]; });
    }
  },

  nodeEnsure(store = {}, params = {}) {
    const graph = this.graph();
    graph.ensureGraphState(store);
    const keyword = params.targetKeyword || params.keyword || params.name || params.currentLegacyLocationName || '';
    const hit = graph.findStrictNode?.(store, {
      nodeId: params.nodeId || params.id,
      identityKey: params.identityKey,
      name: params.name || params.targetKeyword || params.keyword || params.currentLegacyLocationName,
      type: params.type,
      parentId: params.parentId,
    });
    const hits = hit ? [hit] : [];
    const queryEvidence = [{
      skill: 'realworld.property.searchNode',
      paramsSummary: String(keyword || '').slice(0, 80),
      hitNodeIds: hits.map((node) => node.id),
      summary: hits.length ? '已有节点命中，暂不新增。' : '未命中节点；等待 Stage4 电子地图更新显式提交补全 patch。',
    }];
    if (hits.length) {
      const node = hits[0];
      return {
        decision: 'reuse-existing',
        nodeId: node.id,
        path: graph.pathByNodeId(store, node.id).map((item) => item.displayName || item.name || item.id),
        changedNodeIds: [],
        cacheHit: true,
        queryEvidence,
      };
    }
    return {
      decision: 'defer-unknown',
      nodeId: '',
      path: [],
      changedNodeIds: [],
      cacheHit: false,
      queryEvidence,
      reason: '新增入口已建立；未收到 Stage4 显式补全 patch 时不直接新增，也不隐藏请求 AI。',
    };
  },

  async nodeEnsureAsync(store = {}, params = {}) {
    const graph = this.graph();
    const precheck = this.nodeEnsure(store, params);
    if (precheck.decision === 'reuse-existing') {
      this.auditDebug(store, 'precheck-reuse', {
        stage: params.stage,
        targetKeyword: params.targetKeyword || params.keyword || params.name || '',
        currentRef: params.currentNodeId || params.currentLegacyLocationName || '',
        decision: precheck.decision,
        nodeId: precheck.nodeId,
        reason: 'searchNode hit before explicit location patch',
      });
      return precheck;
    }
    const input = this.buildAuditInput(store, params, precheck.queryEvidence || []);
    const signature = this.auditSignature(input);
    const explicitPayload = this.explicitAuditFillPayload(params);
    if (!explicitPayload) {
      const result = {
        ...precheck,
        targetKeyword: input.targetKeyword,
        needsExplicitPatch: true,
        hiddenAuditSkipped: true,
        auditCacheSignature: signature,
        reason: '地点图查询未命中；Stage1 不补地图。等待 Stage4 电子地图周围解锁/地图更新根据正文提交显式补全 patch；系统不发起隐藏 AI 审计。',
      };
      this.auditDebug(store, 'explicit-patch-required', {
        stage: input.stage,
        targetKeyword: input.targetKeyword,
        currentRef: input.currentNode?.id || params.currentLegacyLocationName || '',
        signature,
        decision: result.decision,
        reason: result.reason,
      });
      return result;
    }
    const cached = this.readAuditCache(store, signature);
    if (cached) {
      const result = { ...cached, cacheHit: true, queryEvidence: input.queryEvidence, auditCacheSignature: signature };
      this.auditDebug(store, 'audit-cache-hit', {
        stage: input.stage,
        targetKeyword: input.targetKeyword,
        currentRef: input.currentNode?.id || params.currentLegacyLocationName || '',
        signature,
        decision: result.decision,
        nodeId: result.nodeId,
        changedNodeIds: result.changedNodeIds,
        reason: result.audit?.reason || 'same explicit patch signature reused without AI request',
      });
      return result;
    }
    let payload = null;
    try {
      payload = this.validateAuditFillPayload(explicitPayload);
    } catch (err) {
      console.warn('[location-tree-audit-fill] explicit payload invalid:', err.code, err.message);
      return {
        ...precheck,
        targetKeyword: input.targetKeyword,
        needsExplicitPatch: true,
        hiddenAuditSkipped: true,
        auditCacheSignature: signature,
        reason: `显式地点补全 JSON 无效：${err.message || err.code || 'unknown'}`,
      };
    }
    const applied = this.applyAuditFillPatch(store, payload, input);
    graph.ensureGraphState(store);
    const primaryNodeId = payload.audit.decision === 'defer-unknown' ? '' : applied.primaryNodeId || '';
    const result = {
      decision: payload.audit.decision,
      nodeId: primaryNodeId,
      path: primaryNodeId ? graph.pathByNodeId(store, primaryNodeId).map((node) => node.displayName || node.name || node.id) : [],
      changedNodeIds: applied.changedNodeIds,
      cacheHit: false,
      queryEvidence: input.queryEvidence,
      audit: payload.audit,
      auditCacheSignature: signature,
      explicitPatchApplied: true,
    };
    this.writeAuditCache(store, signature, result);
    this.auditDebug(store, 'explicit-patch-applied', {
      stage: input.stage,
      targetKeyword: input.targetKeyword,
      currentRef: input.currentNode?.id || params.currentLegacyLocationName || '',
      signature,
      decision: result.decision,
      nodeId: result.nodeId,
      changedNodeIds: result.changedNodeIds,
      reason: payload.audit.reason || '',
    });
    return result;
  },

  explicitAuditFillPayload(params = {}) {
    const candidates = [
      params.auditFillPayload,
      params.locationTreeAuditFill,
      params.locationTreePatch,
      params.patchPayload,
      params.payload,
      params,
    ];
    return candidates.find((item) => item && typeof item === 'object' && (item.patchType === 'location-tree-audit-fill' || (item.audit && item.patch))) || null;
  },

  buildAuditInput(store = {}, params = {}, queryEvidence = []) {
    const graph = this.graph();
    graph.ensureGraphState(store);
    const currentNode = graph.getNode(store, params.currentNodeId || params.currentLegacyLocationName || store.realWorldMap?.currentId || store.realWorldMap?.current || store.realWorldLocationName);
    const nearby = currentNode ? graph.nearbyBfs(store, currentNode.id, 1) : [];
    return {
      stage: String(params.stage || 'stage1'),
      intent: String(params.intent || 'reuse-or-create'),
      targetKeyword: String(params.targetKeyword || params.keyword || params.name || '').trim(),
      visibleNeed: String(params.visibleNeed || '').trim() || '本轮现实推演需要确认地点结构。',
      actionText: String(params.actionText || store.realWorldInput || '').trim(),
      requiredScope: Array.isArray(params.requiredScope) ? params.requiredScope : [],
      requiredScopeText: (Array.isArray(params.requiredScope) ? params.requiredScope : []).join('、') || '未指定',
      currentNode,
      currentNodeText: currentNode ? this.nodeSummary(store, currentNode) : '未命中当前节点',
      currentPathText: currentNode ? graph.pathText(store, currentNode.id) : '无',
      nearbyText: nearby.length ? nearby.map((row) => this.edgeSummary(row)).join('\n') : '暂无',
      queryEvidence,
      queryEvidenceText: queryEvidence.length ? queryEvidence.map((item, index) => `qe_${index + 1}: ${item.skill} ${item.paramsSummary || ''} -> ${item.summary || ''} [${(item.hitNodeIds || []).join(',')}]`).join('\n') : '无',
    };
  },

  validateAuditFillPayload(raw = {}) {
    if (!raw || typeof raw !== 'object') throw new Error('审计结果必须是对象');
    if (raw.patchType !== 'location-tree-audit-fill') throw new Error('patchType 必须是 location-tree-audit-fill');
    const audit = raw.audit && typeof raw.audit === 'object' ? raw.audit : null;
    if (!audit) throw new Error('缺少 audit');
    const decisions = ['reuse-existing', 'patch-existing', 'create-new', 'defer-unknown'];
    if (!decisions.includes(audit.decision)) throw new Error('非法 audit.decision');
    if (audit.queriedBeforeDecision !== true) throw new Error('queriedBeforeDecision 必须为 true');
    const patch = raw.patch && typeof raw.patch === 'object' ? raw.patch : {};
    const poiGraphPatch = patch.poiGraphPatch && typeof patch.poiGraphPatch === 'object' ? patch.poiGraphPatch : {};
    const nodes = Array.isArray(poiGraphPatch.nodes) ? poiGraphPatch.nodes : [];
    const edges = Array.isArray(poiGraphPatch.edges) ? poiGraphPatch.edges : [];
    const interiorsPatch = Array.isArray(patch.interiorsPatch) ? patch.interiorsPatch : [];
    return {
      patchType: raw.patchType,
      audit: {
        decision: audit.decision,
        queriedBeforeDecision: true,
        isComplete: Boolean(audit.isComplete),
        reason: String(audit.reason || '').slice(0, 300),
        requiredScope: Array.isArray(audit.requiredScope) ? audit.requiredScope.map((x) => String(x || '').slice(0, 40)).filter(Boolean) : [],
        queryEvidenceRefs: Array.isArray(audit.queryEvidenceRefs) ? audit.queryEvidenceRefs.map((x) => String(x || '').slice(0, 40)).filter(Boolean) : [],
        missing: Array.isArray(audit.missing) ? audit.missing.slice(0, 12) : [],
        defer: Array.isArray(audit.defer) ? audit.defer.slice(0, 12) : [],
      },
      tempRefs: raw.tempRefs && typeof raw.tempRefs === 'object' ? raw.tempRefs : {},
      patch: { poiGraphPatch: { nodes, edges }, interiorsPatch },
    };
  },

  applyAuditFillPatch(store = {}, payload = {}, input = {}) {
    const graph = this.graph();
    const stateGraph = graph.ensureGraphState(store);
    const changedNodeIds = [];
    const tempMap = {};
    const existingRef = (value = '') => String(value || '').replace(/^existing:/, '');
    Object.entries(payload.tempRefs || {}).forEach(([key, value]) => {
      const text = String(value || '');
      if (text.startsWith('existing:')) tempMap[key] = existingRef(text);
    });
    (payload.patch?.poiGraphPatch?.nodes || []).forEach((raw) => {
      const node = this.mergeAuditNode(store, raw, 'poi', '', tempMap);
      if (node?.id) {
        changedNodeIds.push(node.id);
        if (!stateGraph.poiGraph.nodes.includes(node.id)) stateGraph.poiGraph.nodes.push(node.id);
      }
    });
    (payload.patch?.poiGraphPatch?.edges || []).forEach((raw) => {
      const edge = this.mergeAuditEdge(store, raw, tempMap);
      if (edge?.id) changedNodeIds.push(edge.id);
    });
    (payload.patch?.interiorsPatch || []).forEach((raw) => {
      this.mergeInteriorsPatch(store, raw, tempMap, changedNodeIds);
    });
    stateGraph.updatedAt = new Date().toISOString();
    graph.projectLocationGraphToLegacyMap?.(store);
    return { changedNodeIds, primaryNodeId: changedNodeIds.find((id) => stateGraph.nodesById[id]) || input.currentNode?.id || '' };
  },

  mergeAuditNode(store = {}, raw = {}, fallbackType = 'node', parentId = '', tempMap = {}) {
    const graph = this.graph();
    const stateGraph = graph.ensureGraphState(store);
    const tempRef = String(raw.tempRef || raw.ref || '').trim();
    const existing = raw.existingNodeId || raw.nodeId || '';
    let id = existing && stateGraph.nodesById[existing] ? existing : tempRef && tempMap[tempRef] && stateGraph.nodesById[tempMap[tempRef]] ? tempMap[tempRef] : '';
    if (!id) id = graph.allocateLocationNodeId(store);
    const name = graph.cleanName(raw.displayName || raw.name || raw.label || id);
    const node = {
      ...(stateGraph.nodesById[id] || {}),
      id,
      type: String(raw.type || fallbackType || 'node'),
      name,
      displayName: graph.cleanName(raw.displayName || name),
      parentId: parentId || raw.parentId || stateGraph.nodesById[id]?.parentId || '',
      mapVisible: raw.mapVisible !== false,
      known: raw.known !== false,
      ownerRefs: Array.isArray(raw.ownerRefs) ? raw.ownerRefs : stateGraph.nodesById[id]?.ownerRefs || [],
      usageContracts: Array.isArray(raw.usageContracts) ? raw.usageContracts : stateGraph.nodesById[id]?.usageContracts || [],
      effectiveAuthorityRef: raw.effectiveAuthorityRef || stateGraph.nodesById[id]?.effectiveAuthorityRef || null,
      ownershipBasis: raw.ownershipBasis || stateGraph.nodesById[id]?.ownershipBasis || '',
      source: 'location-tree-audit-fill',
      updatedAt: new Date().toISOString(),
    };
    stateGraph.nodesById[id] = node;
    if (tempRef) tempMap[tempRef] = id;
    return node;
  },

  resolvePatchRef(store = {}, ref = '', tempMap = {}) {
    const graph = this.graph();
    const text = String(ref || '').trim();
    if (!text) return '';
    if (text.startsWith('existing:')) {
      const existingKey = text.slice('existing:'.length);
      return graph.getNode(store, existingKey)?.id || existingKey;
    }
    if (tempMap[text]) return tempMap[text];
    return graph.getNode(store, text)?.id || '';
  },

  mergeAuditEdge(store = {}, raw = {}, tempMap = {}) {
    const graph = this.graph();
    const stateGraph = graph.ensureGraphState(store);
    const fromPoiId = this.resolvePatchRef(store, raw.fromPoiId || raw.from || raw.sourceRef, tempMap);
    const toPoiId = this.resolvePatchRef(store, raw.toPoiId || raw.to || raw.targetRef, tempMap);
    if (!fromPoiId || !toPoiId || fromPoiId === toPoiId) return null;
    const id = String(raw.id || `edge_${fromPoiId}_${toPoiId}`);
    const existing = (stateGraph.poiGraph.edges || []).find((edge) => edge.id === id);
    const edge = {
      ...(existing || {}),
      id,
      fromPoiId,
      toPoiId,
      relation: raw.relation || 'direct-neighbor',
      directNeighbor: raw.directNeighbor !== false,
      noIntermediateLocations: raw.noIntermediateLocations !== false,
      intermediateLocations: Array.isArray(raw.intermediateLocations) ? raw.intermediateLocations : [],
      distanceMeters: Number(raw.distanceMeters) || null,
      distanceText: String(raw.distanceText || '').slice(0, 40),
      basis: String(raw.basis || raw.reason || '').slice(0, 160),
    };
    if (existing) Object.assign(existing, edge);
    else stateGraph.poiGraph.edges.push(edge);
    return edge;
  },

  mergeInteriorsPatch(store = {}, raw = {}, tempMap = {}, changedNodeIds = []) {
    const targetPoiId = this.resolvePatchRef(store, raw.targetPoiRef || raw.poiId || raw.targetPoiId, tempMap);
    if (!targetPoiId) return;
    (Array.isArray(raw.floors) ? raw.floors : []).forEach((floor) => {
      const floorNode = this.mergeAuditNode(store, floor, 'floor', targetPoiId, tempMap);
      if (floorNode?.id) changedNodeIds.push(floorNode.id);
      (Array.isArray(floor.rooms) ? floor.rooms : []).forEach((room) => {
        const roomNode = this.mergeAuditNode(store, room, 'room', floorNode.id, tempMap);
        if (roomNode?.id) changedNodeIds.push(roomNode.id);
        this.mergeInteriorChildren(store, room, roomNode.id, tempMap, changedNodeIds);
      });
    });
  },

  mergeInteriorChildren(store = {}, raw = {}, parentId = '', tempMap = {}, changedNodeIds = []) {
    const objectItems = Array.isArray(raw.objects) ? raw.objects : [];
    objectItems.forEach((object) => {
      const objectNode = this.mergeAuditNode(store, object, 'object', parentId, tempMap);
      if (objectNode?.id) changedNodeIds.push(objectNode.id);
      const items = [
        ...(Array.isArray(object.containerItems) ? object.containerItems : []),
        ...(Array.isArray(object.contents) ? object.contents : []),
        ...(Array.isArray(object.insideObjects) ? object.insideObjects : []),
        ...(Array.isArray(object.onObjects) ? object.onObjects : []),
      ];
      items.forEach((item) => {
        const itemNode = this.mergeAuditNode(store, item, 'container-item', objectNode.id, tempMap);
        if (itemNode?.id) changedNodeIds.push(itemNode.id);
      });
    });
    const zones = [
      ...(Array.isArray(raw.zones) ? raw.zones : []),
      ...(Array.isArray(raw.areas) ? raw.areas : []),
      ...(Array.isArray(raw.functionZones) ? raw.functionZones : []),
    ];
    zones.forEach((zone) => {
      const zoneNode = this.mergeAuditNode(store, zone, 'zone', parentId, tempMap);
      if (zoneNode?.id) changedNodeIds.push(zoneNode.id);
      this.mergeInteriorChildren(store, zone, zoneNode.id, tempMap, changedNodeIds);
    });
    const rooms = [
      ...(Array.isArray(raw.rooms) ? raw.rooms : []),
      ...(Array.isArray(raw.innerRooms) ? raw.innerRooms : []),
    ];
    rooms.forEach((room) => {
      const roomNode = this.mergeAuditNode(store, room, 'room', parentId, tempMap);
      if (roomNode?.id) changedNodeIds.push(roomNode.id);
      this.mergeInteriorChildren(store, room, roomNode.id, tempMap, changedNodeIds);
    });
  },
};
