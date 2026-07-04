window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapActions = {
  ensureMapView(map = {}) {
    if (!map.view || typeof map.view !== 'object') {
      map.view = { x: 0, y: 0, scale: 1 };
    }
    return map.view;
  },

  realWorldMapGraph() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    return window.GameModules.realWorldMapGraph.build(map);
  },

  realWorldMapGraphSignature() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const graph = window.GameModules.realWorldMapGraph.build(map);
    return `${map.currentId}|${map.mapAnchorId || ''}|${(map.revealedIds || []).join(',')}|${graph.nodes.map((node) => `${node.id}:${node.x}:${node.y}:${node.current}:${node.visited}`).join(';')}`;
  },

  renderRealWorldMapGraph() {
    const stage = document.querySelector('.real-world-map-stage');
    if (!stage || this.realWorldFunctionView !== 'map') return;
    const signature = this.realWorldMapGraphSignature();
    if (stage.dataset.signature === signature) return;
    stage.dataset.signature = signature;

    const graph = this.realWorldMapGraph();
    const ns = 'http://www.w3.org/2000/svg';
    stage.replaceChildren();

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'real-world-map-svg');
    svg.setAttribute('viewBox', `0 0 ${graph.width} ${graph.height}`);
    svg.setAttribute('width', String(graph.width));
    svg.setAttribute('height', String(graph.height));

    const defs = document.createElementNS(ns, 'defs');
    const gradient = document.createElementNS(ns, 'linearGradient');
    gradient.setAttribute('id', 'realWorldMapEdge');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    ['0%', '100%'].forEach((offset, index) => {
      const stop = document.createElementNS(ns, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', index ? 'rgba(116,246,255,0.18)' : 'rgba(116,246,255,0.55)');
      gradient.appendChild(stop);
    });
    defs.appendChild(gradient);
    svg.appendChild(defs);

    graph.edges.forEach((edge) => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'real-world-map-edge');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'url(#realWorldMapEdge)');
      path.setAttribute('stroke-width', '2');
      const mid = (edge.y1 + edge.y2) / 2;
      path.setAttribute('d', `M ${edge.x1} ${edge.y1} C ${edge.x1} ${mid}, ${edge.x2} ${mid}, ${edge.x2} ${edge.y2}`);
      svg.appendChild(path);
    });
    stage.appendChild(svg);

    const layer = document.createElement('div');
    layer.className = 'real-world-map-nodes-layer';
    graph.nodes.forEach((node) => {
      const card = document.createElement('article');
      const fogClass = node.visited ? '' : ' fog-tile';
      card.className = `real-world-map-node-card${node.current ? ' current' : ''}${fogClass}`;
      card.style.width = `${node.w}px`;
      card.style.height = `${node.h}px`;
      card.style.transform = `translate(${node.x}px, ${node.y}px)`;

      const label = document.createElement('p');
      label.className = 'real-world-map-node-label';
      label.textContent = node.name;
      card.appendChild(label);

      const controlLine = this.realWorldMapNodeControlLine(node.id);
      if (controlLine) {
        const control = document.createElement('small');
        control.className = 'real-world-map-node-control';
        control.textContent = controlLine;
        card.appendChild(control);
      }

      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'real-world-map-node-info-btn';
      info.textContent = '说明';
      info.addEventListener('click', (event) => {
        event.stopPropagation();
        this.showRealWorldMapInfo(node.id);
      });

      card.addEventListener('click', () => this.showRealWorldMapInterior(node.id));
      card.appendChild(info);
      layer.appendChild(card);
    });
    stage.appendChild(layer);
  },

  realWorldMapViewBox() {
    const graph = this.realWorldMapGraph();
    return `0 0 ${graph.width} ${graph.height}`;
  },

  realWorldMapStageStyle() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    return `transform: translate(${view.x}px, ${view.y}px) scale(${view.scale}); transform-origin: 0 0;`;
  },

  realWorldMapRows() {
    return window.GameModules.realWorldMap.visibleNodes(window.GameModules.realWorldMap.ensure(this, this.playerProfile || {}));
  },

  resetRealWorldMapView() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.view = { x: 0, y: 0, scale: 1 };
    const stage = document.querySelector('.real-world-map-stage');
    if (stage) delete stage.dataset.signature;
    this.fitRealWorldMapView();
    this.renderRealWorldMapGraph();
  },

  fitRealWorldMapView() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    const graph = window.GameModules.realWorldMapGraph.build(map);
    const viewport = this._realWorldMapViewportSize();
    if (!viewport.width || !viewport.height) return;
    const scaleX = (viewport.width - 24) / Math.max(graph.width, 1);
    const scaleY = (viewport.height - 24) / Math.max(graph.height, 1);
    view.scale = Math.min(1.2, Math.max(0.45, Math.min(scaleX, scaleY)));
    view.x = (viewport.width - graph.width * view.scale) / 2;
    view.y = Math.max(12, (viewport.height - graph.height * view.scale) / 2);
  },

  _realWorldMapViewportSize() {
    const el = document.querySelector('.real-world-map-viewport');
    if (!el) return { width: 640, height: 420 };
    return { width: el.clientWidth || 640, height: el.clientHeight || 420 };
  },

  realWorldMapWheel(event) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    const next = Math.min(2.4, Math.max(0.35, view.scale * factor));
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const ratio = next / view.scale;
    view.x = px - (px - view.x) * ratio;
    view.y = py - (py - view.y) * ratio;
    view.scale = next;
  },

  realWorldMapZoomBy(delta) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    const viewport = this._realWorldMapViewportSize();
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    const next = Math.min(2.4, Math.max(0.35, view.scale * delta));
    const ratio = next / view.scale;
    view.x = cx - (cx - view.x) * ratio;
    view.y = cy - (cy - view.y) * ratio;
    view.scale = next;
  },

  realWorldMapPanStart(event) {
    if (event.button !== 0 || event.target.closest('.real-world-map-node-card')) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    this._realWorldMapPan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: view.x,
      origY: view.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  },

  realWorldMapPanMove(event) {
    const pan = this._realWorldMapPan;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    view.x = pan.origX + (event.clientX - pan.startX);
    view.y = pan.origY + (event.clientY - pan.startY);
  },

  realWorldMapPanEnd(event) {
    const pan = this._realWorldMapPan;
    if (!pan || (event && pan.pointerId !== event.pointerId)) return;
    this._realWorldMapPan = null;
  },

  openRealWorldMapGraph() {
    this.openRealWorldFunctionPanel?.('map');
    requestAnimationFrame(() => this.fitRealWorldMapView());
  },

  toggleRealWorldMapNode(id) {
    window.GameModules.realWorldMap.toggle(this, id);
  },

  showRealWorldMapInfo(id) {
    window.GameModules.realWorldMap.showInfo(this, id);
  },

  closeRealWorldMapInfo() {
    window.GameModules.realWorldMap.closeInfo(this);
  },

  showRealWorldMapInterior(id) {
    window.GameModules.realWorldMap.showInterior(this, id);
    this.realWorldMap = { ...this.realWorldMap };
  },

  closeRealWorldMapInterior() {
    window.GameModules.realWorldMap.closeInterior(this);
    this.realWorldMap = { ...this.realWorldMap };
  },

  toggleRealWorldMapInteriorFloor(floorId) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (!map.interiorFloorOpen || typeof map.interiorFloorOpen !== 'object') map.interiorFloorOpen = {};
    const key = String(floorId || '');
    map.interiorFloorOpen[key] = !map.interiorFloorOpen[key];
    this.realWorldMap = { ...map };
  },

  realWorldMapInteriorFloorOpen(floorId) {
    const map = this.realWorldMap || {};
    const key = String(floorId || '');
    if (!map.interiorFloorOpen || typeof map.interiorFloorOpen !== 'object') return true;
    return map.interiorFloorOpen[key] !== false;
  },

  realWorldMapRoomResidentsLabel(room = {}) {
    const text = String(room?.residentsText || '').trim();
    return text ? `居住人：${text}` : '居住人：—';
  },

  openRealWorldMapRoom(roomId) {
    const { room } = window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), roomId);
    if (!room?.hasLayout && !room?.layout) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorRoomId = String(roomId || '');
    this.realWorldMap = { ...map };
    requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  realWorldMapInteriorNode() {
    return window.GameModules.realWorldMap.interiorNode(this.realWorldMap);
  },

  realWorldMapInteriorView() {
    const map = this.realWorldMap || {};
    return map.interiorRoomId ? 'room' : 'tree';
  },

  realWorldMapInteriorTitle() {
    const node = this.realWorldMapInteriorNode();
    if (!node) return '';
    const map = this.realWorldMap || {};
    if (map.interiorRoomId) {
      const { room } = window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), map.interiorRoomId);
      return room ? `${room.number || room.name} 房间布局` : node.name;
    }
    return node.name;
  },

  realWorldMapInteriorFloors() {
    const node = this.realWorldMapInteriorNode();
    if (!node) return [];
    return window.GameModules.realWorldMapInterior.ensureFloors(node, this);
  },

  realWorldMapInteriorZones() {
    const node = this.realWorldMapInteriorNode();
    return Array.isArray(node?.interiorLayout?.zones) ? node.interiorLayout.zones : [];
  },

  realWorldMapInteriorSummary() {
    return '';
  },

  backRealWorldMapInteriorTree() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorRoomId = '';
    this.realWorldMap = { ...map };
  },

  realWorldMapSelectedRoom() {
    const map = this.realWorldMap || {};
    return window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), map.interiorRoomId).room;
  },

  realWorldMapSelectedRoomResidentsLine() {
    const room = this.realWorldMapSelectedRoom();
    if (!room?.residentsText) return '';
    return `居住人：${room.residentsText}`;
  },

  renderRealWorldMapRoomCanvas() {
    const room = this.realWorldMapSelectedRoom();
    const canvas = document.querySelector('.real-world-map-room-canvas');
    if (!room || !canvas) return;
    const layout = window.GameModules.realWorldMapInterior.resolveRoomLayout(room)
      || window.GameModules.realWorldMapInterior.defaultRoom202Layout();
    window.GameModules.realWorldMapInterior.drawRoomLayout(canvas, layout);
  },

  realWorldMapSelectedRoomTemplateLabel() {
    const room = this.realWorldMapSelectedRoom();
    if (!room?.layoutTemplateId) return '';
    const item = window.GameModules.realWorldMapInteriorTemplates?.list?.().find((row) => row.id === room.layoutTemplateId);
    return item ? `布局：${item.name}` : '';
  },

  realWorldMapZoneGridClass(position = '') {
    const map = { 北: 'zone-n', 南: 'zone-s', 东: 'zone-e', 西: 'zone-w', 中: 'zone-c' };
    return map[String(position || '中').trim()] || 'zone-c';
  },

  realWorldMapInfoControlLine() {
    const node = this.realWorldMapInfoNode();
    if (!node?.revealed) return '';
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    return window.GameModules.orgTerritory?.resolveControlLabel?.(map, node, this) || '';
  },

  realWorldMapInfoControlHistory() {
    const node = this.realWorldMapInfoNode();
    if (!node?.revealed) return [];
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    return window.GameModules.orgTerritory?.controlHistoryForNode?.(map, node, this) || [];
  },

  realWorldMapNodeControlLine(nodeId = '') {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const node = (map.nodes || []).find((item) => item.id === nodeId);
    if (!node?.revealed) return '';
    return window.GameModules.orgTerritory?.resolveControlLabel?.(map, node, this) || '';
  },

  realWorldMapInfoNode() {
    return window.GameModules.realWorldMap.infoNode(this.realWorldMap);
  },

  realWorldMapInfoFacts() {
    const node = this.realWorldMapInfoNode();
    if (!node) return [];
    return window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, window.GameModules.realWorldMapFacts.nowLabel(this)) || [];
  },

  realWorldMapFactText(fact, index) {
    return window.GameModules.realWorldMapFacts?.formatFact?.(fact, index) || '';
  },
};
