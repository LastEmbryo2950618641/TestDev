window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.mapInfoViewHelpers = {
  infoNode() {
    const mapNode = window.GameModules.realWorldMap.infoNode(this.realWorldMap);
    const graphNode = window.GameModules.realWorldLocationGraph?.getNode?.(this, mapNode?.graphNodeId || mapNode?.id || this.realWorldMap?.infoNodeId);
    return graphNode ? { ...mapNode, ...graphNode, positionInfo: graphNode.positionInfo || mapNode?.positionInfo } : mapNode;
  },

  infoFacts() {
    const node = this.realWorldMapInfoNode();
    if (!node) return [];
    return window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, window.GameModules.realWorldMapFacts.nowLabel(this)) || [];
  },

  hasInfoFacts() {
    return this.realWorldMapInfoFacts().length > 0;
  },

  infoTitleText() {
    const node = this.realWorldMapInfoNode();
    return String(node?.name || '').trim() || '未命名地点';
  },

  infoSubtitleText() {
    const node = this.realWorldMapInfoNode();
    const facts = this.realWorldMapInfoFacts();
    if (!node) return '';
    if (facts.length) return `已记录 ${facts.length} 条地点事实`;
    const description = String(node.description || '').trim();
    if (description) return '已生成地点说明';
    return '等待地点信息展开';
  },

  infoDescriptionText() {
    const node = this.realWorldMapInfoNode();
    return String(node?.description || '').trim();
  },

  infoFactsSummaryText() {
    const facts = this.realWorldMapInfoFacts();
    if (!facts.length) return '暂无事实记录';
    return `共 ${facts.length} 条事实记录`;
  },

  infoFactsJoinedText() {
    const facts = this.realWorldMapInfoFacts();
    if (!facts.length) return '';
    return facts.map((fact, index) => this.realWorldMapFactText(fact, index)).filter(Boolean).join('');
  },

  infoFactsEmptyText() {
    if (this.realWorldMapHasInfoFacts()) return '';
    const description = this.realWorldMapInfoDescriptionText();
    if (description) return '当前地点已生成基础说明，更多事实将在后续推演中补全。';
    return '该地点暂未生成可展示的说明与事实。';
  },

  infoEmptyStateText() {
    const node = this.realWorldMapInfoNode();
    if (!node) return '当前没有可展示的地点信息';
    return this.realWorldMapInfoFactsEmptyText();
  },

  infoPanelView() {
    const controlHistoryRows = this.realWorldMapInfoControlHistoryRows();
    const factRows = this.realWorldMapInfoFactRows();
    const interiorActionLabel = this.realWorldMapInfoInteriorActionLabel();
    const targetNodeId = this.realWorldMapInfoInteriorTargetNodeId();
    const canOpenInterior = this.realWorldMapCanOpenInfoInterior();
    return {
      title: this.realWorldMapInfoTitleText(),
      subtitle: this.realWorldMapInfoSubtitleText(),
      controlDisplayLine: this.realWorldMapInfoControlDisplayLine(),
      controlHistoryRows,
      hasControlHistory: controlHistoryRows.length > 0,
      controlHistoryEmptyText: this.realWorldMapInfoControlHistoryEmptyText(),
      factsSummaryText: this.realWorldMapInfoFactsSummaryText(),
      descriptionText: this.realWorldMapInfoDescriptionText(),
      factRows,
      hasFactRows: factRows.length > 0,
      factsEmptyText: this.realWorldMapInfoFactsEmptyText(),
      canOpenInterior,
      interiorActionLabel,
      interiorTargetNodeId: targetNodeId,
      hasInteriorAction: !!(canOpenInterior && interiorActionLabel && targetNodeId),
    };
  },

  factRows() {
    return this.realWorldMapInfoFacts().map((fact, index) => ({
      key: this.realWorldMapFactKey(fact, index),
      text: this.realWorldMapFactText(fact, index),
    })).filter((row) => row.text);
  },

  factKey(fact, index) {
    return fact?.id || `fact-${index}`;
  },

  factText(fact, index) {
    return window.GameModules.realWorldMapFacts?.formatFact?.(fact, index) || '';
  },

  positionInfoPresentation(node = {}) {
    const source = node?.positionInfo && typeof node.positionInfo === 'object' ? node.positionInfo : null;
    const chain = Array.isArray(source?.positionChain) ? source.positionChain.map((item) => String(item || '').trim()).filter(Boolean) : [];
    if (!chain.length) return null;
    const typeLabel = (name, index) => /室|房|卧室|客厅|厨房|卫生间|书房|阳台/u.test(name) || index === chain.length - 1 ? '房间' : '位置';
    const baseId = String(node.graphNodeId || node.id || node.name || 'position');
    const items = (Array.isArray(source.items) ? source.items : []).map((item) => ({
      name: String(item?.name || '').trim(),
      place: String(item?.place || '').trim() || '位于当前空间内。',
    })).filter((item) => item.name);
    const tree = chain.map((name, index) => ({
      id: `${baseId}:position:${index}`,
      name,
      type: index === chain.length - 1 ? 'room' : 'zone',
      typeLabel: typeLabel(name, index),
      depth: index,
      intro: index === chain.length - 1 ? String(source.intro || '').trim().slice(0, 20) || `${name}。` : `${name}。`,
      items: index === chain.length - 1 ? items : [],
      children: index < chain.length - 1 ? [{ id: `${baseId}:position:${index + 1}`, name: chain[index + 1], typeLabel: typeLabel(chain[index + 1], index + 1) }] : [],
    }));
    return { title: node.displayName || node.name || '地点内部', tree, selectedId: tree[tree.length - 1]?.id || '', emptyText: '' };
  },

  infoSpacePresentation() {
    const node = this.realWorldMapInfoNode();
    const graphApi = window.GameModules.realWorldLocationGraph;
    const stored = this.realWorldMap?.nodes?.find((item) => item.id === node?.id || item.graphNodeId === node?.graphNodeId || item.name === node?.name)?.positionInfo;
    const positionFallback = window.GameModules.ui.realWorld.mapInfoViewHelpers.positionInfoPresentation({ ...node, positionInfo: node?.positionInfo || stored });
    if (!node?.id || !graphApi?.ensureGraphState) {
      return positionFallback || { title: '未选择地点', tree: [], selectedId: '', emptyText: '点击地图节点查看空间。' };
    }
    const graph = graphApi.ensureGraphState(this);
    const graphNode = graphApi.getNode?.(this, node.graphNodeId || node.id || node.name)
      || Object.values(graph.nodesById || {}).find((item) => item.name === node.name)
      || node;
    const nodes = Object.values(graph.nodesById || {});
    const childMap = nodes.reduce((map, item) => {
      if (!item?.parentId) return map;
      if (!map[item.parentId]) map[item.parentId] = [];
      map[item.parentId].push(item);
      return map;
    }, {});
    Object.values(childMap).forEach((items) => items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || ''))));
    const records = [];
    const visit = (current, depth = 0) => {
      if (!current?.id || records.some((row) => row.id === current.id)) return;
      const children = childMap[current.id] || [];
      records.push(this.realWorldMapInfoSpaceNodeRecord(current, depth, children));
      children
        .filter((child) => !['object', 'container-item'].includes(String(child.type || '')))
        .forEach((child) => visit(child, depth + 1));
    };
    visit(graphNode, 0);
    const selected = records.find((row) => row.depth > 0 && (row.children.length || row.items.length)) || records[0] || null;
    if (records.length <= 1 && positionFallback) return positionFallback;
    return {
      title: node.displayName || node.name || '地点内部',
      tree: records,
      selectedId: selected?.id || '',
      emptyText: '该地点内部仍处于迷雾，等待现实行动推演。',
    };
  },

  infoSpaceNodeRecord(node = {}, depth = 0, children = []) {
    const name = String(node.displayName || node.name || node.id || '未命名空间').trim();
    const type = String(node.type || '').trim();
    const typeLabel = {
      poi: '地点', floor: '楼层', room: '房间', zone: '位置', object: '物品', 'container-item': '物品',
    }[type] || '空间';
    const introSource = String(node.description || (Array.isArray(node.descriptionFacts) ? node.descriptionFacts[0] : '') || `${typeLabel}：${name}`).replace(/^地点[:：]\s*/u, '').trim();
    const objectChildren = children.filter((child) => ['object', 'container-item'].includes(String(child.type || '')));
    const spaceChildren = children.filter((child) => !['object', 'container-item'].includes(String(child.type || '')));
    return {
      id: String(node.id || ''),
      name,
      type,
      typeLabel,
      depth,
      intro: (introSource || `${typeLabel}空间。`).slice(0, 20),
      items: objectChildren.map((child) => ({
        name: child.displayName || child.name || child.id || '物品',
        place: child.position || child.placement || child.description || '位于该空间内。',
      })),
      children: spaceChildren.map((child) => ({
        id: String(child.id || ''),
        name: child.displayName || child.name || child.id || '下级空间',
        typeLabel: { floor: '楼层', room: '房间', zone: '位置' }[String(child.type || '')] || '下级空间',
      })),
    };
  },

  infoSpaceSelected(space = {}, activeNodeId = '') {
    return (space?.tree || []).find((node) => node.id === activeNodeId) || (space?.tree || [])[0] || null;
  },
};
