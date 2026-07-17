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
      : window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
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
    const map = mapArg || window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const visibleIds = new Set(map.revealedIds || []);
    const nodeSig = (map.nodes || [])
      .filter((node) => !visibleIds.size || visibleIds.has(node.id) || node.revealed)
      .map((node) => [node.id, node.name, node.parentId || '', node.order || 0, node.visited ? 1 : 0, node.revealed ? 1 : 0, node.mapVisible === false ? 0 : 1].join(':'))
      .join(';');
    const edgeSig = (map.edges || [])
      .map((edge) => [edge.id || '', edge.from || edge.fromId || '', edge.to || edge.toId || '', edge.distanceMeters || '', edge.distanceText || ''].join(':'))
      .join(';');
    return [map.currentId || '', map.mapAnchorId || '', (map.revealedIds || []).join(','), nodeSig, edgeSig].join('|');
  },

  realWorldMapGraph(options = {}) {
    const runtime = this.realWorldMapRuntime();
    if (options.fast && runtime.graphCache?.graph) return runtime.graphCache.graph;
    const map = options.map || window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
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
    return this.realWorldMapGraph().nodes.length > 0;
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

  realWorldMapCanvasSize(canvas = this.realWorldMapCanvasElement()) {
    if (!canvas) return { width: 720, height: 460, dpr: 1 };
    const viewport = document.querySelector('.real-world-map-viewport') || canvas.parentElement;
    const rect = viewport?.getBoundingClientRect?.() || canvas.getBoundingClientRect?.() || { width: 720, height: 460 };
    const width = Math.max(320, Math.round(rect.width || 720));
    const height = Math.max(260, Math.round(rect.height || 460));
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
    return { width, height, dpr };
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

  realWorldMapDrawPill(ctx, x, y, text, options = {}) {
    const label = String(text || '').trim();
    if (!label) return { x, y, w: 0, h: 0 };
    const fontSize = options.fontSize || 13;
    const padX = options.padX || 10;
    const padY = options.padY || Math.max(6, fontSize * 0.45);
    const lineHeight = options.lineHeight || Math.max(fontSize + 4, fontSize * 1.28);
    const minWidth = options.minWidth || 42;
    const maxWidth = options.maxWidth || 210;
    const maxLines = options.maxLines || 3;
    ctx.save();
    ctx.font = `${options.weight || 800} ${fontSize}px "Microsoft YaHei", sans-serif`;
    const contentMaxWidth = Math.max(1, maxWidth - padX * 2);
    const lines = this.realWorldMapWrapText(ctx, label, contentMaxWidth, maxLines);
    const contentWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    const width = Math.min(maxWidth, Math.max(minWidth, contentWidth + padX * 2));
    const height = Math.max(options.height || 0, lines.length * lineHeight + padY * 2);
    this.realWorldMapRoundRect(ctx, x, y, width, height, Math.min(height / 2, 18));
    ctx.fillStyle = options.fill || 'rgba(4,18,30,0.86)';
    ctx.fill();
    ctx.strokeStyle = options.stroke || 'rgba(87,199,255,0.42)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = options.color || '#e8fcff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const firstLineY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, x + padX, firstLineY + index * lineHeight + 0.5);
    });
    ctx.restore();
    return { x, y, w: width, h: height };
  },

  drawRealWorldMapCanvas(viewArg = null) {
    const canvas = this.realWorldMapCanvasElement();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const runtime = this.realWorldMapRuntime();
    const map = viewArg ? this.realWorldMapCurrentMap() : window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = viewArg || runtime.liveView || this.ensureMapView(map);
    const graph = this.realWorldMapGraph({ fast: Boolean(viewArg || runtime.pan), map });
    const size = this.realWorldMapCanvasSize(canvas);
    runtime.hitRegions = [];

    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = 'rgba(96,206,255,0.10)';
    ctx.lineWidth = 1;
    for (let x = ((Number(view.x) || 0) % 64) - 64; x < size.width + 64; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + size.height * 0.62, size.height); ctx.stroke();
    }
    for (let x = ((Number(view.x) || 0) % 96) - 96; x < size.width + 96; x += 96) {
      ctx.beginPath(); ctx.moveTo(x, size.height); ctx.lineTo(x + size.height * 0.72, 0); ctx.stroke();
    }
    ctx.restore();

    const scale = Math.min(2.4, Math.max(0.35, Number(view.scale) || 1));
    const uiScale = Math.min(1.75, Math.max(0.68, scale));
    const scaleUi = (value) => Math.max(1, value * uiScale);
    const tx = Number(view.x) || 0;
    const ty = Number(view.y) || 0;
    const sx = (value) => tx + value * scale;
    const sy = (value) => ty + value * scale;

    const isInteracting = Boolean(runtime.pan);

    graph.edges.forEach((edge) => {
      const x1 = sx(edge.x1);
      const y1 = sy(edge.y1);
      const x2 = sx(edge.x2);
      const y2 = sy(edge.y2);
      ctx.save();
      ctx.strokeStyle = edge.fallback ? 'rgba(118,143,160,0.34)' : 'rgba(54,255,179,0.54)';
      ctx.lineWidth = Math.max(1.4, 2 * Math.min(scale, 1.2));
      ctx.setLineDash(edge.fallback ? [8, 8] : []);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      if (!isInteracting) {
        const label = String(edge.distanceText || '\u8ddd\u79bb\u5f85\u63a8\u6f14');
        const mx = sx(edge.mx);
        const my = sy(edge.my);
        this.realWorldMapDrawPill(ctx, mx - 44, my - 13, label, {
          fontSize: 11,
          height: 24,
          minWidth: 72,
          maxWidth: 132,
          fill: 'rgba(3,15,22,0.82)',
          stroke: 'rgba(34,240,173,0.30)',
          color: '#dffcff',
          weight: 700,
        });
      }
    });

    graph.nodes.forEach((node) => {
      const cx = sx(node.x + node.w / 2);
      const cy = sy(node.y + node.h / 2);
      const current = Boolean(node.current);
      const visited = Boolean(node.visited);
      const radius = scaleUi(current ? 11 : (visited ? 8 : 7));
      const ring = radius + scaleUi(current ? 8 : 5);
      const color = current ? '#ffd166' : (visited ? '#22f0ad' : '#7fa6ba');

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

      const label = String(node.name || '').trim();
      const labelX = cx + ring + scaleUi(8);
      const labelY = cy - scaleUi(current ? 20 : 14);
      const labelBox = this.realWorldMapDrawPill(ctx, labelX, labelY, label, {
        fontSize: scaleUi(current ? 15 : 13),
        padX: scaleUi(10),
        height: scaleUi(current ? 36 : 28),
        minWidth: scaleUi(current ? 116 : 68),
        maxWidth: scaleUi(current ? 260 : 190),
        maxLines: current ? 3 : 2,
        fill: current ? 'rgba(44,31,9,0.92)' : 'rgba(4,18,30,0.84)',
        stroke: current ? 'rgba(255,209,102,0.70)' : (visited ? 'rgba(34,240,173,0.42)' : 'rgba(126,160,180,0.34)'),
        color: current ? '#fff4c7' : '#e8fcff',
      });

      if (current && !isInteracting) {
        const controlLine = this.realWorldMapNodeControlCachedLine?.(node.id) || '';
        if (controlLine) {
          const detail = this.realWorldMapShortLabel(controlLine, 24);
          this.realWorldMapDrawPill(ctx, labelX, labelY + scaleUi(42), detail, {
            fontSize: scaleUi(12),
            padX: scaleUi(10),
            height: scaleUi(26),
            minWidth: scaleUi(92),
            maxWidth: scaleUi(220),
            fill: 'rgba(6,16,28,0.80)',
            stroke: 'rgba(255,209,102,0.26)',
            color: '#d6e4ef',
            weight: 700,
          });
        }
      }

      const infoR = scaleUi(current ? 13 : 11);
      const infoX = Math.min(size.width - infoR - scaleUi(8), labelBox.x + labelBox.w + infoR + scaleUi(6));
      const infoY = labelBox.y + labelBox.h / 2;
      ctx.beginPath();
      ctx.arc(infoX, infoY, infoR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(87,199,255,0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(87,199,255,0.46)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = `900 ${scaleUi(current ? 14 : 12)}px "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = '#c9f6ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('i', infoX, infoY + 0.5);
      ctx.restore();

      runtime.hitRegions.push({
        type: 'node',
        id: node.id,
        x: Math.min(cx - ring - scaleUi(8), labelBox.x),
        y: Math.min(cy - ring - scaleUi(8), labelBox.y),
        w: Math.max(labelBox.x + labelBox.w, cx + ring + scaleUi(8)) - Math.min(cx - ring - scaleUi(8), labelBox.x),
        h: Math.max(labelBox.y + labelBox.h, cy + ring + scaleUi(8)) - Math.min(cy - ring - scaleUi(8), labelBox.y),
      });
      runtime.hitRegions.push({ type: 'info', id: node.id, x: infoX - infoR - scaleUi(12), y: infoY - infoR - scaleUi(12), w: (infoR + scaleUi(12)) * 2, h: (infoR + scaleUi(12)) * 2 });
    });
  },

  realWorldMapCanvasHitTest(event) {
    const viewport = document.querySelector('.real-world-map-viewport');
    const rect = viewport?.getBoundingClientRect?.();
    if (!rect) return null;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
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
    this.drawRealWorldMapCanvas(next);
    if (commit) {
      const map = this.realWorldMap && typeof this.realWorldMap === 'object'
        ? this.realWorldMap
        : window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
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
      this.drawRealWorldMapCanvas(runtime.liveView);
    });
  },

  commitRealWorldMapView(view = this.realWorldMapRuntime().liveView) {
    if (!view) return;
    this.paintRealWorldMapView(view, true);
  },

  realWorldMapRows() {
    return window.GameModules.realWorldMap.visibleNodes(window.GameModules.realWorldMap.ensure(this, this.playerProfile || {}));
  },

  resetRealWorldMapView() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.view = { x: 0, y: 0, scale: 1 };
    this.fitRealWorldMapView();
    this.renderRealWorldMapGraph();
    this.paintRealWorldMapView(map.view, false);
  },

  fitRealWorldMapView() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const graph = this.realWorldMapGraph();
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
    const node = (this.realWorldMap.nodes || []).find((item) => item.id === id);
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
          this.realWorldMap = { ...this.realWorldMap };
        }, 0);
      });
    }
    if (this.realWorldMap) this.realWorldMap = { ...this.realWorldMap };
  },
  closeRealWorldMapInfo() {
    window.GameModules.realWorldMap.closeInfo(this);
    this.realWorldMapInfoCache = null;
    if (this.realWorldMap) this.realWorldMap = { ...this.realWorldMap };
  },

  showRealWorldMapInterior(id) {
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : null;
    if (!map) return;
    const infoNode = this.realWorldMapInfoNode?.() || null;
    const fallbackId = infoNode?.id || map.infoNodeId || '';
    let key = String(id || fallbackId || '');
    let node = (map.nodes || []).find((item) => item.id === key) || null;
    if (!node && infoNode?.name) node = (map.nodes || []).find((item) => item.name === infoNode.name) || null;
    if (!node && key) node = (map.nodes || []).find((item) => item.name === key) || null;
    if (node?.id) key = node.id;
    if (!key) return;
    map.interiorNodeId = key;
    map.interiorRoomId = '';
    map.interiorFloorId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    map.infoNodeId = '';
    map.interiorFloorOpen = map.interiorFloorOpen && typeof map.interiorFloorOpen === 'object' ? map.interiorFloorOpen : {};
    const runtime = this.realWorldMapRuntime();
    runtime.interiorPreparingNodeId = key;
    if (runtime.interiorFloorCache?.[key]) delete runtime.interiorFloorCache[key];
    this.realWorldMap = { ...map };
    this.realWorldMapAfterPaint(() => this.prepareRealWorldMapInteriorFloors(key));
  },

  openRealWorldMapInfoInterior(id = '') {
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : null;
    const infoNode = this.realWorldMapInfoNode?.() || null;
    let key = String(id || infoNode?.id || map?.infoNodeId || '');
    let node = (map?.nodes || []).find((item) => item.id === key) || null;
    if (!node && infoNode?.name) node = (map?.nodes || []).find((item) => item.name === infoNode.name) || null;
    if (!node && key) node = (map?.nodes || []).find((item) => item.name === key) || null;
    if (node?.id) key = node.id;
    if (!key) return;
    this.showRealWorldMapInterior(key);
    if (this.realWorldMap?.infoNodeId) this.realWorldMap.infoNodeId = '';
    if (this.realWorldMap) this.realWorldMap = { ...this.realWorldMap };
  },

  closeRealWorldMapInterior() {
    window.GameModules.realWorldMap.closeInterior(this);
    if (this.realWorldMap) {
      this.realWorldMap.interiorFloorId = '';
      this.realWorldMap.interiorRoomId = '';
      this.realWorldMap.interiorRoomAreaId = '';
      this.realWorldMap.interiorRoomShapeId = '';
    }
    this.realWorldMap = { ...this.realWorldMap };
  },

  toggleRealWorldMapInteriorFloor(floorId) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (!map.interiorFloorOpen || typeof map.interiorFloorOpen !== 'object') map.interiorFloorOpen = {};
    const key = String(floorId || '');
    map.interiorFloorOpen[key] = !map.interiorFloorOpen[key];
    this.realWorldMap = { ...map };
  },

  openRealWorldMapInteriorFloor(floorId) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorFloorId = String(floorId || '');
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.realWorldMap = { ...map };
    requestAnimationFrame(() => this.renderRealWorldMapFloorPlanCanvas());
  },

  realWorldMapInteriorFloorOpen(floorId) {
    const map = this.realWorldMap || {};
    const key = String(floorId || '');
    if (!map.interiorFloorOpen || typeof map.interiorFloorOpen !== 'object') return true;
    return map.interiorFloorOpen[key] !== false;
  },

  realWorldMapRoomResidentsLabel(room = {}) { return window.GameModules.ui.realWorld.mapViewHelpers.roomResidentsLabel.call(this, room); },

  realWorldMapRoomTitle(room = {}) { return window.GameModules.realWorldMapInterior.roomDisplayTitle(room); },

  openRealWorldMapRoom(roomId) {
    const { floor, room } = window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), roomId);
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (floor?.id) map.interiorFloorId = floor.id;
    map.interiorRoomId = String(roomId || '');
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.realWorldMap = { ...map };
    if (room) requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  realWorldMapInteriorNode() { return window.GameModules.realWorldMap.interiorNode(this.realWorldMap); },

  realWorldMapInteriorFloorSignature(node = {}) {
    const floors = Array.isArray(node?.interiorLayout?.floors) ? node.interiorLayout.floors : [];
    return floors.map((floor) => {
      const rooms = Array.isArray(floor.rooms) ? floor.rooms : [];
      return [floor.id || '', floor.name || floor.label || '', rooms.length].join(':');
    }).join('|');
  },

  prepareRealWorldMapInteriorFloors(nodeId = '') {
    const map = this.realWorldMap && typeof this.realWorldMap === 'object' ? this.realWorldMap : null;
    const node = (map?.nodes || []).find((item) => item.id === nodeId);
    if (!node) return [];
    const floors = window.GameModules.realWorldMapInterior.ensureFloors(node, this);
    const runtime = this.realWorldMapRuntime();
    runtime.interiorFloorCache = runtime.interiorFloorCache || {};
    runtime.interiorFloorCache[nodeId] = {
      signature: this.realWorldMapInteriorFloorSignature(node),
      floors,
    };
    if (runtime.interiorPreparingNodeId === nodeId) runtime.interiorPreparingNodeId = '';
    if (map.interiorFloorOpen && typeof map.interiorFloorOpen === 'object') {
      floors.forEach((floor) => {
        if (map.interiorFloorOpen[floor.id] === undefined) map.interiorFloorOpen[floor.id] = false;
      });
    }
    if (map.interiorNodeId === nodeId) this.realWorldMap = { ...map };
    return floors;
  },

  realWorldMapInteriorView() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorView.call(this); },

  realWorldMapInteriorTitle() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorTitle.call(this); },

  realWorldMapInteriorFloors() {
    const node = this.realWorldMapInteriorNode();
    if (!node) return [];
    const runtime = this.realWorldMapRuntime();
    const signature = this.realWorldMapInteriorFloorSignature(node);
    const cached = runtime.interiorFloorCache?.[node.id];
    if (cached?.signature === signature) return cached.floors || [];
    if (runtime.interiorPreparingNodeId === node.id) return [];
    return this.prepareRealWorldMapInteriorFloors(node.id);
  },

  realWorldMapInteriorZones() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorZones.call(this); },

  realWorldMapInteriorZoneRows() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorZoneRows.call(this); },

  realWorldMapInteriorSummary() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorSummary.call(this); },

  realWorldMapInteriorPanelView() { return window.GameModules.ui.realWorld.mapViewHelpers.interiorPanelView.call(this); },

  backRealWorldMapInteriorTree() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorFloorId = '';
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.realWorldMap = { ...map };
  },

  backRealWorldMapInteriorFloor() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.realWorldMap = { ...map };
    requestAnimationFrame(() => this.renderRealWorldMapFloorPlanCanvas());
  },

  realWorldMapSelectedFloor() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedFloor.call(this); },

  realWorldMapSelectedRoom() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoom.call(this); },

  realWorldMapSelectedRoomResidentsLine() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomResidentsLine.call(this); },

  realWorldMapSelectedRoomObjectsLine() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomObjectsLine.call(this); },

  realWorldMapSelectedRoomObjectTitle() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomObjectTitle.call(this); },

  realWorldMapSelectedRoomObjectLine() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomObjectLine.call(this); },

  realWorldMapSelectedRoomAreaTitle() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomAreaTitle.call(this); },

  clearRealWorldMapRoomArea() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    this.realWorldMap = { ...map };
    requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  renderRealWorldMapFloorPlanCanvas() {
    const floor = this.realWorldMapSelectedFloor();
    const canvas = document.querySelector('.real-world-map-floorplan-canvas');
    if (!floor || !canvas) return;
    const regions = window.GameModules.realWorldMapInterior.drawFloorPlan(canvas, floor);
    const runtime = this.realWorldMapRuntime();
    runtime.floorPlanRegions = regions || [];
  },

  realWorldMapFloorPlanClick(event) {
    const canvas = event?.currentTarget;
    if (!canvas?.getBoundingClientRect) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = (canvas.width || rect.width || 1) / Math.max(rect.width || 1, 1);
    const scaleY = (canvas.height || rect.height || 1) / Math.max(rect.height || 1, 1);
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const hit = (this.realWorldMapRuntime().floorPlanRegions || []).find((region) => x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h);
    if (hit?.roomId) this.openRealWorldMapRoom(hit.roomId);
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
    const regions = window.GameModules.realWorldMapInterior.drawRoomLayout(canvas, layout, { selectedId: this.realWorldMap?.interiorRoomShapeId || '' });
    const runtime = this.realWorldMapRuntime();
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
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (runtime.roomLayoutMode === 'area-detail') {
      map.interiorRoomShapeId = hit.id;
    } else if (window.GameModules.realWorldMapInterior.isDrillableRoomRegion(hit)) {
      map.interiorRoomAreaId = hit.id;
      map.interiorRoomShapeId = '';
    } else {
      map.interiorRoomShapeId = hit.id;
    }
    this.realWorldMap = { ...map };
    requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  realWorldMapSelectedRoomTemplateLabel() { return window.GameModules.ui.realWorld.mapViewHelpers.selectedRoomTemplateLabel.call(this); },

  realWorldMapZoneGridClass(position = '') { return window.GameModules.ui.realWorld.mapViewHelpers.zoneGridClass.call(this, position); },

  realWorldMapInfoControlLine() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlLine.call(this); },

  realWorldMapInfoControlDisplayLine() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlDisplayLine.call(this); },

  realWorldMapInfoControlHistory() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistory.call(this); },

  realWorldMapInfoControlHistoryRows() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryRows.call(this); },

  realWorldMapHasInfoControlHistory() { return window.GameModules.ui.realWorld.mapViewHelpers.hasInfoControlHistory.call(this); },

  realWorldMapInfoControlHistoryEmptyText() { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryEmptyText.call(this); },

  realWorldMapInfoControlHistoryKey(line = '', index = 0) { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryKey.call(this, line, index); },

  realWorldMapInfoControlHistoryText(line = '') { return window.GameModules.ui.realWorld.mapViewHelpers.infoControlHistoryText.call(this, line); },

  realWorldMapNodeControlLine(nodeId = '') { return window.GameModules.ui.realWorld.mapViewHelpers.nodeControlLine.call(this, nodeId); },

  realWorldMapNodeControlCachedLine(nodeId = '') { return window.GameModules.ui.realWorld.mapViewHelpers.nodeControlCachedLine.call(this, nodeId); },

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

  realWorldMapFactKey(fact, index) { return window.GameModules.ui.realWorld.mapViewHelpers.factKey.call(this, fact, index); },

  realWorldMapFactText(fact, index) { return window.GameModules.ui.realWorld.mapViewHelpers.factText.call(this, fact, index); }
};

(function installRealWorldMapInteriorNativeOpen() {
  if (window.GameModules.__realWorldMapInteriorNativeOpenInstalled) return;
  window.GameModules.__realWorldMapInteriorNativeOpenInstalled = true;

  document.addEventListener('click', async (event) => {
    const button = event.target?.closest?.('[data-real-world-open-interior], .real-world-map-info-pop .ghost-wide');
    if (!button) return;
    const pop = button.closest?.('.real-world-map-info-pop');
    if (!pop) return;
    event.preventDefault();
    event.stopPropagation();
    const store = window.Alpine?.store?.('game');
    if (!store) return;
    await window.GameModules.assetLoader?.ensureChunks?.(['gameplay'], store);
    window.GameModules.remergeGameStore?.();
    store.openRealWorldMapInfoInterior(store.realWorldMapInfoNode?.()?.id || store.realWorldMap?.infoNodeId || '');
  }, true);
}());
