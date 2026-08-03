window.GameModules = window.GameModules || {};

function callRealWorldMapStageViewHelper(name, context, ...args) {
  return window.GameModules.ui.realWorld.mapStageViewHelpers[name].call(context, ...args);
}

window.GameModules.realWorldMapActions = {
  ensureMapView(map = {}) {
    if (!map.view || typeof map.view !== 'object') {
      map.view = { x: 0, y: 0, scale: 1 };
    }
    return map.view;
  },

  realWorldMapRuntime() {
    window.GameModules.realWorldMapRuntime = window.GameModules.realWorldMapRuntime || {};
    return window.GameModules.realWorldMapRuntime;
  },

  setRealWorldMapState(map = {}) {
    const next = map && typeof map === 'object'
      ? (window.Alpine?.raw ? window.Alpine.raw(map) : map)
      : map;
    this.realWorldMap = next;
    return next;
  },

  realWorldMapAfterPaint(callback) {
    const run = () => {
      try { callback?.(); } catch (err) { console.warn('[real-world-map] deferred task failed:', err?.message || err); }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 0));
    else setTimeout(run, 0);
  },

  realWorldMapCurrentMap() {
    return this.realWorldMap && typeof this.realWorldMap === 'object'
      ? this.realWorldMap
      : window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
  },

  realWorldMapProfile() {
    return window.GameModules.currentLocationField?.roleProfile?.(this) || {};
  },

  realWorldMapGraphData() {
    return window.GameModules.realWorldLocationGraph?.standardPoiGraph?.(this)
      || { currentId: '', nodes: [], edges: [] };
  },

  realWorldMapInteractionView() {
    const runtime = this.realWorldMapRuntime();
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : null;
    const view = runtime.liveView || map?.view || { x: 0, y: 0, scale: 1 };
    return {
      x: Number(view.x) || 0,
      y: Number(view.y) || 0,
      scale: Math.min(2.4, Math.max(0.35, Number(view.scale) || 1)),
    };
  },

  realWorldMapGraphSourceSignature(mapArg = null) {
    const map = mapArg || this.realWorldMapGraphData();
    const nodeSig = (Array.isArray(map.nodes) ? map.nodes : [])
      .map((node) => [node.id, node.name, node.parentId || '', node.order || 0, node.visited ? 1 : 0, node.mapVisible === false ? 0 : 1].join(':'))
      .join(';');
    const edgeSig = (map.edges || [])
      .map((edge) => [edge.id || '', edge.from || edge.fromId || '', edge.to || edge.toId || '', edge.distanceMeters || '', edge.distanceText || ''].join(':'))
      .join(';');
    return [map.currentId || '', nodeSig, edgeSig].join('|');
  },

  realWorldMapGraph(options = {}) {
    const runtime = this.realWorldMapRuntime();
    if (options.fast && runtime.graphCache?.graph) return runtime.graphCache.graph;
    const map = options.map || this.realWorldMapGraphData();
    const signature = this.realWorldMapGraphSourceSignature(map);
    if (runtime.graphCache?.signature === signature) return runtime.graphCache.graph;
    const graph = window.GameModules.realWorldMapGraph?.build?.(map) || { nodes: [], edges: [], width: 720, height: 420 };
    runtime.graphCache = { signature, graph };
    return graph;
  },

  realWorldMapGraphSignature() {
    return this.realWorldMapGraphSourceSignature();
  },

  realWorldMapHasGraphNodes() {
    const map = this.realWorldMapGraphData();
    return Array.isArray(map.nodes) && map.nodes.some((node) => node && node.name && node.mapVisible !== false);
  },

  realWorldMapPanelTitle() { return window.GameModules.ui.realWorld.mapViewHelpers.panelTitle.call(this); },

  realWorldMapLocationText() { return window.GameModules.ui.realWorld.mapViewHelpers.locationText.call(this); },

  realWorldMapEmptyText() { return window.GameModules.ui.realWorld.mapViewHelpers.emptyMapText.call(this); },

  realWorldMapPanelView() { return window.GameModules.ui.realWorld.mapViewHelpers.panelView.call(this); },

  renderRealWorldMapGraph() {
    if (this.realWorldFunctionView !== 'map') return;
    this.drawRealWorldMapCanvas();
  },

  realWorldMapCanvasElement() {
    return callRealWorldMapStageViewHelper('canvasElement', this);
  },

  realWorldMapCanvasSize(canvas = this.realWorldMapCanvasElement(), fast = false, graph = null) {
    if (!canvas) return { width: 720, height: 460, dpr: 1 };
    const runtime = this.realWorldMapRuntime();
    const graphWidth = Math.ceil(Number(graph?.width) || 720);
    const graphHeight = Math.ceil(Number(graph?.height) || 460);
    if (fast && runtime.canvasSize?.canvas === canvas && runtime.canvasSize.graphWidth === graphWidth && runtime.canvasSize.graphHeight === graphHeight) {
      return runtime.canvasSize;
    }
    const width = Math.max(720, graphWidth + 320);
    const height = Math.max(460, graphHeight + 160);
    // Keep the moving map layer at 1x. Browser maps rely on cheap transform/WebGL
    // layers; repainting a 2x canvas on every pointermove is visibly janky here.
    const dpr = 1;
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    canvas.style.transformOrigin = '0 0';
    runtime.canvasSize = { canvas, width, height, dpr, graphWidth, graphHeight };
    return runtime.canvasSize;
  },

  realWorldMapStageElement() {
    return callRealWorldMapStageViewHelper('stageElement', this);
  },

  realWorldMapStageStyle() {
    return callRealWorldMapStageViewHelper('stageStyle', this);
  },

  realWorldMapWrapText(ctx, text = '', maxWidth = 220, maxLines = 2) {
    return callRealWorldMapStageViewHelper('wrapText', this, ctx, text, maxWidth, maxLines);
  },

  realWorldMapRoundRect(ctx, x, y, w, h, r = 16) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  realWorldMapShortLabel(text = '', maxChars = 18) {
    return callRealWorldMapStageViewHelper('shortLabel', this, text, maxChars);
  },

  applyRealWorldMapCanvasTransform(view = {}) {
    const canvas = this.realWorldMapCanvasElement();
    if (!canvas) return;
    const scale = Math.min(2.4, Math.max(0.35, Number(view.scale) || 1));
    const x = Number(view.x) || 0;
    const y = Number(view.y) || 0;
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  },

  drawRealWorldMapCanvas(viewArg = null) {
    const canvas = this.realWorldMapCanvasElement();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const runtime = this.realWorldMapRuntime();
    const mapState = this.realWorldMapCurrentMap();
    const graphData = this.realWorldMapGraphData();
    const view = viewArg || runtime.liveView || this.ensureMapView(mapState);
    const signature = this.realWorldMapGraphSourceSignature(graphData);
    const graph = this.realWorldMapGraph({ map: graphData });
    const size = this.realWorldMapCanvasSize(canvas, false, graph);
    const drawSignature = `${signature}|${size.width}x${size.height}`;
    this.applyRealWorldMapCanvasTransform(view);
    if (runtime.canvasDrawSignature === drawSignature && runtime.hitRegions?.length) return;

    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    runtime.hitRegions = [];

    ctx.save();
    ctx.strokeStyle = 'rgba(96,206,255,0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x < size.width + 72; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + size.height * 0.55, size.height);
      ctx.stroke();
    }
    ctx.restore();

    graph.edges.forEach((edge) => {
      const x1 = edge.x1;
      const y1 = edge.y1;
      const x2 = edge.x2;
      const y2 = edge.y2;
      ctx.save();
      ctx.strokeStyle = 'rgba(54,255,179,0.54)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const label = String(edge.distanceText || '距离待推演').slice(0, 18);
      ctx.font = '700 11px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(3,15,22,0.82)';
      ctx.strokeStyle = 'rgba(34,240,173,0.30)';
      const mx = edge.mx;
      const my = edge.my;
      this.realWorldMapRoundRect(ctx, mx - 44, my - 13, 88, 26, 13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dffcff';
      ctx.fillText(label, mx, my + 1);
      ctx.restore();
    });

    graph.nodes.forEach((node) => {
      const cx = node.cx;
      const cy = node.cy;
      const current = Boolean(node.current);
      const visited = Boolean(node.visited);
      const radius = current ? 11 : (visited ? 8 : 7);
      const ring = radius + (current ? 8 : 5);
      const color = current ? '#ffd166' : (visited ? '#22f0ad' : '#7fa6ba');
      const label = String(node.name || '').trim();
      const labelWidth = Math.min(current ? 260 : 210, Math.max(current ? 128 : 96, label.length * 12 + 28));
      const labelHeight = current ? 42 : 34;
      const labelX = cx + ring + 10;
      const labelY = cy - labelHeight / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, Math.PI * 2);
      ctx.fillStyle = current ? 'rgba(255,209,102,0.16)' : 'rgba(34,240,173,0.10)';
      ctx.fill();
      ctx.strokeStyle = current ? 'rgba(255,209,102,0.72)' : 'rgba(87,199,255,0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(2,10,18,0.92)';
      ctx.lineWidth = 2;
      ctx.stroke();
      this.realWorldMapRoundRect(ctx, labelX, labelY, labelWidth, labelHeight, Math.min(18, labelHeight / 2));
      ctx.fillStyle = current ? 'rgba(44,31,9,0.92)' : 'rgba(4,18,30,0.84)';
      ctx.fill();
      ctx.strokeStyle = current ? 'rgba(255,209,102,0.70)' : (visited ? 'rgba(34,240,173,0.42)' : 'rgba(126,160,180,0.34)');
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = current ? '#fff4c7' : '#e8fcff';
      ctx.font = `${current ? 800 : 700} ${current ? 14 : 12}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.realWorldMapShortLabel(label, current ? 24 : 18), labelX + 12, labelY + labelHeight / 2 + 1);

      if (current) {
        const infoR = 13;
        const infoX = labelX + labelWidth + infoR + 8;
        const infoY = labelY + labelHeight / 2;
        ctx.beginPath();
        ctx.arc(infoX, infoY, infoR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(87,199,255,0.18)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(87,199,255,0.46)';
        ctx.stroke();
        ctx.font = '900 14px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#c9f6ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('i', infoX, infoY + 0.5);
        runtime.hitRegions.push({ type: 'info', id: node.id, x: infoX - 25, y: infoY - 25, w: 50, h: 50 });
        runtime.hitRegions.push({
          type: 'node',
          id: node.id,
          x: Math.min(cx - ring - 8, labelX),
          y: Math.min(cy - ring - 8, labelY),
          w: Math.max(labelX + labelWidth, cx + ring + 8) - Math.min(cx - ring - 8, labelX),
          h: Math.max(labelY + labelHeight, cy + ring + 8) - Math.min(cy - ring - 8, labelY),
        });
      } else {
        runtime.hitRegions.push({ type: 'node', id: node.id, x: cx - 28, y: cy - 28, w: 56, h: 56 });
      }
      ctx.restore();
    });
    runtime.canvasDrawSignature = drawSignature;
  },

  realWorldMapCanvasHitTest(event) {
    const viewport = document.querySelector('.real-world-map-viewport');
    const rect = viewport?.getBoundingClientRect?.();
    if (!rect) return null;
    const view = this.realWorldMapInteractionView();
    const scale = Math.min(2.4, Math.max(0.35, Number(view.scale) || 1));
    const x = (event.clientX - rect.left - (Number(view.x) || 0)) / scale;
    const y = (event.clientY - rect.top - (Number(view.y) || 0)) / scale;
    const regions = this.realWorldMapRuntime().hitRegions || [];
    return regions.slice().reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
  },

  realWorldMapHandleCanvasTap(event) {
    const hit = this.realWorldMapCanvasHitTest(event);
    if (!hit) return;
    if (hit.type === 'info') this.showRealWorldMapInfo(hit.id);
    else if (hit.type === 'node') this.showRealWorldMapInfo(hit.id);
  },

  paintRealWorldMapView(view = {}, commit = false) {
    const next = {
      x: Number(view.x) || 0,
      y: Number(view.y) || 0,
      scale: Math.min(2.4, Math.max(0.35, Number(view.scale) || 1)),
    };
    const runtime = this.realWorldMapRuntime();
    runtime.liveView = next;
    if (!runtime.canvasDrawSignature) this.drawRealWorldMapCanvas(next);
    else this.applyRealWorldMapCanvasTransform(next);
    if (commit) {
      const map = this.realWorldMap && typeof this.realWorldMap === 'object'
        ? this.realWorldMap
        : window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
      map.view = { ...next };
      runtime.liveView = null;
    }
    return next;
  },

  queueRealWorldMapViewPaint(view = {}) {
    const runtime = this.realWorldMapRuntime();
    runtime.liveView = {
      x: Number(view.x) || 0,
      y: Number(view.y) || 0,
      scale: Math.min(2.4, Math.max(0.35, Number(view.scale) || 1)),
    };
    if (runtime.paintFrame) return;
    runtime.paintFrame = requestAnimationFrame(() => {
      runtime.paintFrame = 0;
      this.applyRealWorldMapCanvasTransform(runtime.liveView);
    });
  },

  commitRealWorldMapView(view = this.realWorldMapRuntime().liveView) {
    if (!view) return;
    this.paintRealWorldMapView(view, true);
  },

  realWorldMapRows() {
    return this.realWorldMapGraph({ map: this.realWorldMapGraphData() }).nodes || [];
  },

  resetRealWorldMapView() {
    const map = window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
    map.view = { x: 0, y: 0, scale: 1 };
    this.fitRealWorldMapView();
    this.renderRealWorldMapGraph();
    this.paintRealWorldMapView(map.view, false);
  },

  fitRealWorldMapView() {
    const map = this.realWorldMapCurrentMap();
    const graph = this.realWorldMapGraph({ map: this.realWorldMapGraphData() });
    const viewport = this._realWorldMapViewportSize();
    if (!viewport.width || !viewport.height) return;
    const scaleX = (viewport.width - 40) / Math.max(graph.width, 1);
    const scaleY = (viewport.height - 40) / Math.max(graph.height, 1);
    const scale = Math.min(1.2, Math.max(0.42, Math.min(scaleX, scaleY)));
    const view = {
      scale,
      x: (viewport.width - graph.width * scale) / 2,
      y: Math.max(18, (viewport.height - graph.height * scale) / 2),
    };
    map.view = view;
    this.paintRealWorldMapView(view, false);
  },

  _realWorldMapViewportSize() {
    const el = document.querySelector('.real-world-map-viewport');
    if (!el) return { width: 720, height: 460 };
    return { width: el.clientWidth || 720, height: el.clientHeight || 460 };
  },

  ensureRealWorldMapNativeInput() {
    const runtime = this.realWorldMapRuntime();
    const viewport = document.querySelector('.real-world-map-viewport');
    if (!viewport) return;
    if (runtime.nativeInputViewport === viewport && runtime.nativeInputCleanup) return;
    if (runtime.nativeInputCleanup) runtime.nativeInputCleanup();

    const onWheel = (event) => this.realWorldMapWheel(event);
    const onPointerDown = (event) => this.realWorldMapPanStart(event);
    const onPointerMove = (event) => this.realWorldMapPanMove(event);
    const onPointerUp = (event) => this.realWorldMapPanEnd(event);
    const onContextMenu = (event) => event.preventDefault();

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('contextmenu', onContextMenu);
    viewport.dataset.realWorldMapNativeInput = 'bound';

    runtime.nativeInputViewport = viewport;
    runtime.nativeInputCleanup = () => {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      viewport.removeEventListener('contextmenu', onContextMenu);
      if (viewport.dataset.realWorldMapNativeInput === 'bound') viewport.dataset.realWorldMapNativeInput = 'stale';
      if (runtime.nativeInputViewport === viewport) runtime.nativeInputViewport = null;
    };
  },

  realWorldMapWheel(event) {
    event.preventDefault?.();
    const view = this.realWorldMapInteractionView();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    const nextScale = Math.min(2.4, Math.max(0.35, view.scale * factor));
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const ratio = nextScale / view.scale;
    const next = {
      x: px - (px - view.x) * ratio,
      y: py - (py - view.y) * ratio,
      scale: nextScale,
    };
    this.queueRealWorldMapViewPaint(next);
    const runtime = this.realWorldMapRuntime();
    clearTimeout(runtime.wheelCommitTimer);
    runtime.wheelCommitTimer = setTimeout(() => this.commitRealWorldMapView(next), 120);
  },

  realWorldMapZoomBy(delta) {
    const view = this.realWorldMapInteractionView();
    const viewport = this._realWorldMapViewportSize();
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    const nextScale = Math.min(2.4, Math.max(0.35, view.scale * delta));
    const ratio = nextScale / view.scale;
    const next = {
      x: cx - (cx - view.x) * ratio,
      y: cy - (cy - view.y) * ratio,
      scale: nextScale,
    };
    this.paintRealWorldMapView(next, true);
  },

  realWorldMapPanStart(event) {
    if (event.button !== 0 || event.buttons !== 1 || event.target.closest('button, .real-world-map-interior-panel')) {
      if (event.button === 2) event.preventDefault?.();
      return;
    }
    event.preventDefault?.();
    const runtime = this.realWorldMapRuntime();
    clearTimeout(runtime.wheelCommitTimer);
    const view = this.realWorldMapInteractionView();
    runtime.pan = {
      pointerId: event.pointerId,
      viewport: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      origX: Number(view.x) || 0,
      origY: Number(view.y) || 0,
      scale: Number(view.scale) || 1,
      view: { x: Number(view.x) || 0, y: Number(view.y) || 0, scale: Number(view.scale) || 1 },
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  },

  realWorldMapPanMove(event) {
    const pan = this.realWorldMapRuntime().pan;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) pan.moved = true;
    pan.view = {
      x: pan.origX + dx,
      y: pan.origY + dy,
      scale: pan.scale,
    };
    this.queueRealWorldMapViewPaint(pan.view);
  },

  realWorldMapPanEnd(event) {
    const runtime = this.realWorldMapRuntime();
    const pan = runtime.pan;
    if (!pan || (event && pan.pointerId !== event.pointerId)) return;
    const shouldTap = !pan.moved && event;
    if (pan.moved) this.commitRealWorldMapView(pan.view);
    runtime.pan = null;
    if (shouldTap) this.realWorldMapHandleCanvasTap(event);
  },

  openRealWorldMapGraph() {
    this.openRealWorldFunctionPanel?.('map');
    this.realWorldMapAfterPaint(() => this.fitRealWorldMapView());
  },

  toggleRealWorldMapNode(id) { window.GameModules.realWorldMap.toggle(this, id); },
  showRealWorldMapInfo(id) {
    if (!this.realWorldMap || typeof this.realWorldMap !== 'object') return;
    this.realWorldMap.infoNodeId = id;
    this.realWorldMap.interiorNodeId = '';
    this.realWorldMap.interiorRoomId = '';
    this.realWorldMap.interiorRoomAreaId = '';
    this.realWorldMap.interiorRoomShapeId = '';
    const node = window.GameModules.realWorldLocationGraph?.getNode?.(this, id)
      || (this.realWorldMap.nodes || []).find((item) => item.id === id);
    this.realWorldMapInfoCache = {
      id,
      controlLine: '',
      pending: Boolean(node?.revealed),
    };
    if (node?.revealed) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (this.realWorldMapInfoCache?.id !== id || !this.realWorldMap?.infoNodeId) return;
          this.realWorldMapInfoCache = {
            id,
            controlLine: window.GameModules.orgTerritory?.resolveControlLabel?.(this.realWorldMap, node, this) || '',
            pending: false,
          };
          this.setRealWorldMapState({ ...this.realWorldMap });
        }, 0);
      });
    }
    if (this.realWorldMap) this.setRealWorldMapState({ ...this.realWorldMap });
    this.refreshRealWorldMapInfoSpace();
  },
  refreshRealWorldMapInfoSpace(nodeId = this.realWorldMap?.infoNodeId || '') {
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : { nodes: [] };
    const node = (map.nodes || []).find((item) => item.id === nodeId || item.graphNodeId === nodeId)
      || window.GameModules.realWorldLocationGraph?.getNode?.(this, nodeId)
      || null;
    const graphNode = window.GameModules.realWorldLocationGraph?.getNode?.(this, node?.graphNodeId || node?.id || nodeId) || null;
    const source = graphNode?.positionInfo || null;
    const chain = Array.isArray(source?.positionChain) ? source.positionChain.map((item) => String(item || '').trim()).filter(Boolean) : [];
    const baseId = String(node?.graphNodeId || node?.id || nodeId || 'space');
    const items = (Array.isArray(source?.items) ? source.items : []).map((item) => ({
      name: String(item?.name || '').trim(), place: String(item?.place || '').trim() || '位于当前空间内。',
    })).filter((item) => item.name);
    const tree = chain.map((name, index) => ({
      id: `${baseId}:space:${index}`,
      parentId: index > 0 ? `${baseId}:space:${index - 1}` : '',
      name,
      typeLabel: /室|房|卧室|客厅|厨房|卫生间|书房|阳台/u.test(name) || index === chain.length - 1 ? '房间' : '位置',
      depth: index,
      intro: index === chain.length - 1 ? String(source?.intro || '').trim().slice(0, 20) || `${name}。` : `${name}。`,
      items: index === chain.length - 1 ? items : [],
      children: index < chain.length - 1 ? [{ id: `${baseId}:space:${index + 1}` }] : [],
    }));
    const space = {
      title: node?.displayName || node?.name || '未选择地点',
      tree,
      selectedId: tree[tree.length - 1]?.id || '',
      emptyText: node ? '该地点尚未生成内部空间信息。' : '未找到当前地图节点。',
    };
    this.realWorldMapInfoSpace = space;
    const existingId = String(this.realWorldMapInfoSpaceActiveNodeId || '');
    this.realWorldMapInfoSpaceActiveNodeId = (space.tree || []).some((node) => node.id === existingId) ? existingId : (space.selectedId || '');
    const rootId = space.tree?.[0]?.id || '';
    const previousExpanded = Array.isArray(this.realWorldMapInfoSpaceExpandedIds) ? this.realWorldMapInfoSpaceExpandedIds : [];
    this.realWorldMapInfoSpaceExpandedIds = previousExpanded.filter((id) => space.tree.some((node) => node.id === id));
    if (!this.realWorldMapInfoSpaceExpandedIds.length && rootId) this.realWorldMapInfoSpaceExpandedIds = [rootId];
    return space;
  },
  realWorldMapInfoVisibleSpaceNodes() {
    const tree = Array.isArray(this.realWorldMapInfoSpace?.tree) ? this.realWorldMapInfoSpace.tree : [];
    const expanded = new Set(Array.isArray(this.realWorldMapInfoSpaceExpandedIds) ? this.realWorldMapInfoSpaceExpandedIds : []);
    return tree.filter((node) => !node.parentId || expanded.has(node.parentId));
  },
  toggleRealWorldMapInfoSpaceNode(nodeId = '') {
    const tree = Array.isArray(this.realWorldMapInfoSpace?.tree) ? this.realWorldMapInfoSpace.tree : [];
    const node = tree.find((item) => item.id === nodeId);
    if (!node) return;
    this.realWorldMapInfoSpaceActiveNodeId = node.id;
    if (!(node.children || []).length) return;
    const expanded = new Set(Array.isArray(this.realWorldMapInfoSpaceExpandedIds) ? this.realWorldMapInfoSpaceExpandedIds : []);
    if (expanded.has(node.id)) {
      const descendants = tree.filter((item) => {
        let parentId = item.parentId;
        while (parentId) {
          if (parentId === node.id) return true;
          parentId = tree.find((candidate) => candidate.id === parentId)?.parentId || '';
        }
        return false;
      }).map((item) => item.id);
      expanded.delete(node.id);
      descendants.forEach((id) => expanded.delete(id));
    } else {
      expanded.add(node.id);
    }
    this.realWorldMapInfoSpaceExpandedIds = [...expanded];
  },
  closeRealWorldMapInfo() {
    window.GameModules.realWorldMap.closeInfo(this);
    this.realWorldMapInfoCache = null;
    this.realWorldMapInfoSpace = { title: '未选择地点', tree: [], selectedId: '', emptyText: '点击地图节点查看空间。' };
    this.realWorldMapInfoSpaceActiveNodeId = '';
    this.realWorldMapInfoSpaceExpandedIds = [];
    if (this.realWorldMap) this.setRealWorldMapState({ ...this.realWorldMap });
  },

  showRealWorldMapInterior(id) {
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : null;
    if (!map) return;
    let key = String(id || '').trim();
    let node = window.GameModules.realWorldLocationGraph?.getNode?.(this, key)
      || (map.nodes || []).find((item) => item.id === key || item.name === key)
      || null;
    if (node?.id) key = node.id;
    if (!key) return;
    map.interiorNodeId = key;
    map.interiorRoomId = '';
    map.interiorFloorId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    map.infoNodeId = '';
    const runtime = this.realWorldMapRuntime();
    this.prepareRealWorldMapInteriorFloors(key, { commit: false, node });
    this.setRealWorldMapState({ ...map });
  },

  openRealWorldMapInfoInterior(id = '') {
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : null;
    let key = String(id || map?.infoNodeId || '').trim();
    let node = window.GameModules.realWorldLocationGraph?.getNode?.(this, key)
      || (map?.nodes || []).find((item) => item.id === key || item.name === key)
      || null;
    if (node?.id) key = node.id;
    if (!key) return;
    this.showRealWorldMapInterior(key);
    this.realWorldMapInfoCache = null;
    if (this.realWorldMap) {
      this.realWorldMap.infoNodeId = '';
      this.setRealWorldMapState({ ...this.realWorldMap });
    }
  },

  closeRealWorldMapInterior() {
    window.GameModules.realWorldMap.closeInterior(this);
    if (this.realWorldMap) {
      this.realWorldMap.interiorFloorId = '';
      this.realWorldMap.interiorRoomId = '';
      this.realWorldMap.interiorRoomAreaId = '';
      this.realWorldMap.interiorRoomShapeId = '';
    }
    this.setRealWorldMapState({ ...this.realWorldMap });
  },

  openRealWorldMapInteriorFloor(floorId) {
    const map = window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
    map.interiorFloorId = String(floorId || '');
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.setRealWorldMapState({ ...map });
  },

  realWorldMapRoomResidentsLabel(room = {}) { return window.GameModules.ui.realWorld.mapViewHelpers.roomResidentsLabel.call(this, room); },

  realWorldMapRoomTitle(room = {}) { return window.GameModules.realWorldMapInterior.roomDisplayTitle(room); },

  openRealWorldMapRoom(roomId) {
    const { floor, room } = window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), roomId);
    const map = window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
    if (floor?.id) map.interiorFloorId = floor.id;
    map.interiorRoomId = String(roomId || '');
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.setRealWorldMapState({ ...map });
    if (room) requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  realWorldMapInteriorNode() { return window.GameModules.realWorldMap.interiorNode(this.realWorldMap); },

  realWorldMapInteriorFloorSignature(node = {}) {
    const layout = node?.interiorLayout && typeof node.interiorLayout === 'object' ? node.interiorLayout : {};
    const floors = Array.isArray(layout.floors) ? layout.floors : [];
    return [
      node?.id || '',
      node?.name || '',
      layout.updatedAt || layout.revision || layout.version || '',
      floors.length,
      floors.map((floor, index) => {
        const rooms = Array.isArray(floor?.rooms) ? floor.rooms : [];
        return [floor?.id || index, floor?.name || floor?.label || '', rooms.length].join(':');
      }).join('|'),
    ].join('§');
  },

  prepareRealWorldMapInteriorFloors(nodeId = '', options = {}) {
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : null;
    const node = options.node || (map?.nodes || []).find((item) => item.id === nodeId || item.name === nodeId);
    if (!node) return [];
    const layout = node.interiorLayout && typeof node.interiorLayout === 'object' ? node.interiorLayout : {};
    const floors = Array.isArray(layout.floors) ? layout.floors : [];
    const runtime = this.realWorldMapRuntime();
    runtime.missingInteriorLogKeys = runtime.missingInteriorLogKeys || new Set();
    const missingLogKey = `${nodeId}:${this.realWorldMapInteriorFloorSignature(node)}`;
    if (!floors.length && !runtime.missingInteriorLogKeys.has(missingLogKey)) {
      runtime.missingInteriorLogKeys.add(missingLogKey);
      const debugJson = JSON.stringify({
        nodeId,
        selectedNodeId: node?.id || '',
        selectedNodeName: node?.name || '',
        hasInteriorLayout: Boolean(node?.interiorLayout),
        rawInteriorLayout: node?.interiorLayout || null,
      }, null, 2);
      console.log('[real-world-map-interior] selected-node-json', debugJson.length > 12000 ? `${debugJson.slice(0, 12000)}\n...<truncated>` : debugJson);
    }
    runtime.interiorFloorCache = runtime.interiorFloorCache || {};
    runtime.interiorFloorCache[nodeId] = {
      signature: this.realWorldMapInteriorFloorSignature(node),
      nodeRef: node,
      layoutRef: node.interiorLayout,
      floors,
    };
    if (node.id && node.id !== nodeId) {
      runtime.interiorFloorCache[node.id] = {
        signature: this.realWorldMapInteriorFloorSignature(node),
        nodeRef: node,
        layoutRef: node.interiorLayout,
        floors,
      };
    }
    if (runtime.interiorPreparingNodeId === nodeId) runtime.interiorPreparingNodeId = '';
    if (options.commit !== false && map.interiorNodeId === nodeId) this.setRealWorldMapState({ ...map });
    return floors;
  },

  realWorldMapInteriorView() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorView.call(this); },

  realWorldMapInteriorTitle() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorTitle.call(this); },

  realWorldMapInteriorFloors() {
    const node = this.realWorldMapInteriorNode();
    if (!node) return [];
    const runtime = this.realWorldMapRuntime();
    const cached = runtime.interiorFloorCache?.[node.id];
    if (cached?.nodeRef === node && cached?.layoutRef === node.interiorLayout) return cached.floors || [];
    const signature = this.realWorldMapInteriorFloorSignature(node);
    if (cached?.signature === signature) return cached.floors || [];
    if (runtime.interiorPreparingNodeId === node.id) return [];
    return this.prepareRealWorldMapInteriorFloors(node.id);
  },

  realWorldMapInteriorSummary() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorSummary.call(this); },

  realWorldMapInteriorPanelView() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorPanelView.call(this); },

  backRealWorldMapInteriorTree() {
    const map = window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
    map.interiorFloorId = '';
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.setRealWorldMapState({ ...map });
  },

  backRealWorldMapInteriorFloor() {
    const map = window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.setRealWorldMapState({ ...map });
  },

  realWorldMapSelectedFloor() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedFloor.call(this); },

  realWorldMapSelectedRoom() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoom.call(this); },

  realWorldMapSelectedRoomResidentsLine() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomResidentsLine.call(this); },

  realWorldMapSelectedRoomObjectsLine() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomObjectsLine.call(this); },

  realWorldMapSelectedRoomObjectTitle() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomObjectTitle.call(this); },

  realWorldMapSelectedRoomObjectLine() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomObjectLine.call(this); },

  realWorldMapSelectedRoomAreaTitle() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomAreaTitle.call(this); },

  clearRealWorldMapRoomArea() {
    const map = window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.setRealWorldMapState({ ...map });
    requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  renderRealWorldMapRoomCanvas() {
    const room = this.realWorldMapSelectedRoom();
    const canvas = document.querySelector('.real-world-map-room-canvas');
    if (!room || !canvas) return;
    const baseLayout = window.GameModules.realWorldMapInterior.resolveRoomLayout(room);
    const areaId = String(this.realWorldMap?.interiorRoomAreaId || '');
    const areaRegion = areaId
      ? window.GameModules.realWorldMapInterior.roomLayoutRegions(baseLayout).find((region) => region.id === areaId)
      : null;
    const areaLayout = areaRegion ? window.GameModules.realWorldMapInterior.roomAreaDetailLayout(room, areaRegion) : null;
    const layout = areaLayout || baseLayout;
    if (!layout) return;
    const runtime = this.realWorldMapRuntime();
    const renderSignature = [
      this.realWorldMap?.interiorNodeId || '',
      this.realWorldMap?.interiorRoomId || '',
      areaId,
      this.realWorldMap?.interiorRoomShapeId || '',
      layout.areaId || '',
      Array.isArray(layout.shapes) ? layout.shapes.length : 0,
      canvas.width || 0,
      canvas.height || 0,
    ].join('|');
    if (runtime.roomLayoutRenderSignature === renderSignature) return;
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const regions = window.GameModules.realWorldMapInterior.drawRoomLayout(canvas, layout, { selectedId: this.realWorldMap?.interiorRoomShapeId || '' });
    const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
    if (durationMs > 16) console.log('[real-world-map-interior] room-render-slow', { durationMs: Math.round(durationMs), shapes: Array.isArray(layout.shapes) ? layout.shapes.length : 0, regions: regions.length });
    runtime.roomLayoutRenderSignature = renderSignature;
    runtime.roomLayoutRegions = regions || [];
    runtime.roomLayoutMode = areaLayout ? 'area-detail' : 'room-overview';
    runtime.roomLayoutAreaRegion = areaRegion || null;
    runtime.roomLayoutAreaLayout = areaLayout || null;
  },

  realWorldMapRoomLayoutClick(event) {
    const canvas = event?.currentTarget;
    if (!canvas?.getBoundingClientRect) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = (canvas.width || rect.width || 1) / Math.max(rect.width || 1, 1);
    const scaleY = (canvas.height || rect.height || 1) / Math.max(rect.height || 1, 1);
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const runtime = this.realWorldMapRuntime();
    const hit = (runtime.roomLayoutRegions || []).slice().reverse().find((region) => window.GameModules.realWorldMapInterior.regionContainsPoint(region, x, y));
    if (!hit?.id) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.realWorldMapProfile());
    if (runtime.roomLayoutMode === 'area-detail') {
      map.interiorRoomShapeId = hit.id;
    } else if (window.GameModules.realWorldMapInterior.isDrillableRoomRegion(hit)) {
      map.interiorRoomAreaId = hit.id;
      map.interiorRoomShapeId = '';
    } else {
      map.interiorRoomShapeId = hit.id;
    }
    this.setRealWorldMapState({ ...map });
    requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  realWorldMapInfoControlLine() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlLine.call(this); },

  realWorldMapInfoControlDisplayLine() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlDisplayLine.call(this); },

  realWorldMapInfoControlHistory() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistory.call(this); },

  realWorldMapInfoControlHistoryRows() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryRows.call(this); },

  realWorldMapHasInfoControlHistory() { return window.GameModules.ui.realWorld.mapViewHelpers.hasInfoControlHistory.call(this); },

  realWorldMapInfoControlHistoryEmptyText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryEmptyText.call(this); },

  realWorldMapInfoControlHistoryKey(line = '', index = 0) { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryKey.call(this, line, index); },

  realWorldMapInfoControlHistoryText(line = '') { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryText.call(this, line); },

  realWorldMapNodeControlLine(nodeId = '') { return window.GameModules.ui.realWorld.mapViewHelpers.nodeControlLine.call(this, nodeId); },

  realWorldMapNodeControlDisplayLine(nodeId = '') { return window.GameModules.ui.realWorld.mapViewHelpers.nodeControlDisplayLine.call(this, nodeId); },

  realWorldMapInfoNode() { return window.GameModules.ui.realWorld.mapViewHelpers.infoNode.call(this); },

  realWorldMapInfoFacts() { return window.GameModules.ui.realWorld.mapViewHelpers.infoFacts.call(this); },

  realWorldMapInfoFactRows() { return window.GameModules.ui.realWorld.mapViewHelpers.infoFactRows.call(this); },

  realWorldMapHasInfoFacts() { return window.GameModules.ui.realWorld.mapViewHelpers.hasInfoFacts.call(this); },

  realWorldMapInfoTitleText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoTitleText.call(this); },

  realWorldMapInfoSubtitleText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoSubtitleText.call(this); },

  realWorldMapInfoDescriptionText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoDescriptionText.call(this); },

  realWorldMapInfoFactsSummaryText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoFactsSummaryText.call(this); },

  realWorldMapInfoFactsJoinedText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoFactsJoinedText.call(this); },

  realWorldMapInfoFactsEmptyText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoFactsEmptyText.call(this); },

  realWorldMapInfoEmptyStateText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoEmptyStateText.call(this); },

  realWorldMapInfoPanelView() { return window.GameModules.ui.realWorld.mapViewHelpers.infoPanelView.call(this); },

  realWorldMapInfoSpacePresentation() { return window.GameModules.ui.realWorld.mapViewHelpers.infoSpacePresentation.call(this); },

  realWorldMapInfoSpaceSelected(space = {}, activeNodeId = '') { return window.GameModules.ui.realWorld.mapViewHelpers.infoSpaceSelected.call(this, space, activeNodeId); },

  realWorldMapFactKey(fact, index) { return window.GameModules.ui.realWorld.mapViewHelpers.factKey.call(this, fact, index); },

  realWorldMapFactText(fact, index) { return window.GameModules.ui.realWorld.mapViewHelpers.factText.call(this, fact, index); },

  realWorldMapJsonDumpText(map = this.realWorldMapCurrentMap()) {
    try {
      const payload = window.GameModules.realWorldLocationGraph?.standardPoiGraph?.(this)
        || { currentId: '', nodes: [], edges: [] };
      return JSON.stringify(payload, null, 2);
    } catch (error) {
      return `{\n  "error": "电子地图 JSON 序列化失败：${String(error?.message || error || '').replace(/"/g, '\\"')}"\n}`;
    }
  },

  refreshRealWorldMapJsonDump() {
    const text = this.realWorldMapJsonDumpText(this.realWorldMapCurrentMap());
    this.realWorldMapJsonDump = text;
    return text;
  }
};
