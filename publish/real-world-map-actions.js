window.GameModules = window.GameModules || {};

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

  realWorldMapCurrentMap() {
    return this.realWorldMap && typeof this.realWorldMap === 'object'
      ? this.realWorldMap
      : window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
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

  renderRealWorldMapGraph() {
    if (this.realWorldFunctionView !== 'map') return;
    this.drawRealWorldMapCanvas();
  },

  realWorldMapCanvasElement() {
    return document.querySelector('.real-world-map-canvas');
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
    return this.realWorldMapCanvasElement();
  },

  realWorldMapStageStyle() {
    return '';
  },

  realWorldMapWrapText(ctx, text = '', maxWidth = 220, maxLines = 2) {
    const source = String(text || '').trim();
    if (!source) return [];
    const chars = Array.from(source);
    const lines = [];
    let line = '';
    chars.forEach((ch) => {
      const next = line + ch;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
        return;
      }
      lines.push(line);
      line = ch;
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const clipped = lines.slice(0, maxLines);
      let last = clipped[maxLines - 1] || '';
      while (last && ctx.measureText(`${last}...`).width > maxWidth) last = last.slice(0, -1);
      clipped[maxLines - 1] = `${last}...`;
      return clipped;
    }
    return lines;
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
    const source = String(text || '').trim();
    if (!source) return '';
    const chars = Array.from(source);
    if (chars.length <= maxChars) return source;
    return `${chars.slice(0, Math.max(1, maxChars - 1)).join('')}…`;
  },

  realWorldMapDrawPill(ctx, x, y, text, options = {}) {
    const label = String(text || '').trim();
    if (!label) return { x, y, w: 0, h: 0 };
    const fontSize = options.fontSize || 13;
    const padX = options.padX || 10;
    const height = options.height || 28;
    ctx.save();
    ctx.font = `${options.weight || 800} ${fontSize}px "Microsoft YaHei", sans-serif`;
    const width = Math.min(options.maxWidth || 210, Math.max(options.minWidth || 42, ctx.measureText(label).width + padX * 2));
    this.realWorldMapRoundRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = options.fill || 'rgba(4,18,30,0.86)';
    ctx.fill();
    ctx.strokeStyle = options.stroke || 'rgba(87,199,255,0.42)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = options.color || '#e8fcff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + padX, y + height / 2 + 0.5);
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

      if (!isInteracting && scale >= 0.48) {
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
      const radius = current ? 11 : (visited ? 8 : 7);
      const ring = radius + (current ? 8 : 5);
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

      const label = this.realWorldMapShortLabel(node.name, current ? 28 : 18);
      const labelX = cx + ring + 8;
      const labelY = cy - (current ? 20 : 14);
      const labelBox = this.realWorldMapDrawPill(ctx, labelX, labelY, label, {
        fontSize: current ? 15 : 13,
        height: current ? 36 : 28,
        minWidth: current ? 116 : 68,
        maxWidth: current ? 260 : 190,
        fill: current ? 'rgba(44,31,9,0.92)' : 'rgba(4,18,30,0.84)',
        stroke: current ? 'rgba(255,209,102,0.70)' : (visited ? 'rgba(34,240,173,0.42)' : 'rgba(126,160,180,0.34)'),
        color: current ? '#fff4c7' : '#e8fcff',
      });

      if (current && !isInteracting) {
        const controlLine = this.realWorldMapNodeControlLine?.(node.id) || '';
        if (controlLine) {
          const detail = this.realWorldMapShortLabel(controlLine, 24);
          this.realWorldMapDrawPill(ctx, labelX, labelY + 42, detail, {
            fontSize: 12,
            height: 26,
            minWidth: 92,
            maxWidth: 220,
            fill: 'rgba(6,16,28,0.80)',
            stroke: 'rgba(255,209,102,0.26)',
            color: '#d6e4ef',
            weight: 700,
          });
        }
      }

      const infoR = current ? 13 : 11;
      const infoX = Math.min(size.width - infoR - 8, labelBox.x + labelBox.w + infoR + 6);
      const infoY = labelBox.y + labelBox.h / 2;
      ctx.beginPath();
      ctx.arc(infoX, infoY, infoR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(87,199,255,0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(87,199,255,0.46)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = `900 ${current ? 14 : 12}px "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = '#c9f6ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('i', infoX, infoY + 0.5);
      ctx.restore();

      runtime.hitRegions.push({
        type: 'node',
        id: node.id,
        x: Math.min(cx - ring - 8, labelBox.x),
        y: Math.min(cy - ring - 8, labelBox.y),
        w: Math.max(labelBox.x + labelBox.w, cx + ring + 8) - Math.min(cx - ring - 8, labelBox.x),
        h: Math.max(labelBox.y + labelBox.h, cy + ring + 8) - Math.min(cy - ring - 8, labelBox.y),
      });
      runtime.hitRegions.push({ type: 'info', id: node.id, x: infoX - infoR - 4, y: infoY - infoR - 4, w: (infoR + 4) * 2, h: (infoR + 4) * 2 });
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
    else if (hit.type === 'node') this.showRealWorldMapInterior(hit.id);
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
      const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
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

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.dataset.realWorldMapNativeInput = 'bound';

    runtime.nativeInputViewport = viewport;
    runtime.nativeInputCleanup = () => {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      if (viewport.dataset.realWorldMapNativeInput === 'bound') viewport.dataset.realWorldMapNativeInput = 'stale';
      if (runtime.nativeInputViewport === viewport) runtime.nativeInputViewport = null;
    };
  },

  realWorldMapWheel(event) {
    event.preventDefault?.();
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.realWorldMapRuntime().liveView || this.ensureMapView(map);
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
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.realWorldMapRuntime().liveView || this.ensureMapView(map);
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
    if (event.button !== 0 || event.target.closest('button, .real-world-map-interior-panel')) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.realWorldMapRuntime().liveView || this.ensureMapView(map);
    this.realWorldMapRuntime().pan = {
      pointerId: event.pointerId,
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
    this.commitRealWorldMapView(pan.view);
    runtime.pan = null;
    if (shouldTap) this.realWorldMapHandleCanvasTap(event);
  },

  openRealWorldMapGraph() {
    this.openRealWorldFunctionPanel?.('map');
    requestAnimationFrame(() => this.fitRealWorldMapView());
  },

  toggleRealWorldMapNode(id) { window.GameModules.realWorldMap.toggle(this, id); },
  showRealWorldMapInfo(id) { window.GameModules.realWorldMap.showInfo(this, id); },
  closeRealWorldMapInfo() { window.GameModules.realWorldMap.closeInfo(this); },

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
    return text ? `居住人：${text}` : '居住人：未知';
  },

  openRealWorldMapRoom(roomId) {
    const { room } = window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), roomId);
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorRoomId = String(roomId || '');
    this.realWorldMap = { ...map };
    if (room?.hasLayout || room?.layout || room?.layoutTemplateId) {
      requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
    }
  },

  realWorldMapInteriorNode() { return window.GameModules.realWorldMap.interiorNode(this.realWorldMap); },

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
      return room ? `${room.number || room.name} 房间详情` : node.name;
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
    const node = this.realWorldMapInteriorNode();
    return String(node?.interiorLayout?.summary || '').trim();
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
    if (!room?.residentsText) return '居住人：未知';
    return `居住人：${room.residentsText}`;
  },

  renderRealWorldMapRoomCanvas() {
    const room = this.realWorldMapSelectedRoom();
    const canvas = document.querySelector('.real-world-map-room-canvas');
    if (!room || !canvas) return;
    const layout = window.GameModules.realWorldMapInterior.resolveRoomLayout(room);
    if (!layout) return;
    window.GameModules.realWorldMapInterior.drawRoomLayout(canvas, layout);
  },

  realWorldMapSelectedRoomTemplateLabel() {
    const room = this.realWorldMapSelectedRoom();
    if (!room?.layoutTemplateId) return '布局：待推演';
    const item = window.GameModules.realWorldMapInteriorTemplates?.list?.().find((row) => row.id === room.layoutTemplateId);
    return item ? `布局：${item.name}` : '布局：已记录模板';
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

  realWorldMapInfoNode() { return window.GameModules.realWorldMap.infoNode(this.realWorldMap); },

  realWorldMapInfoFacts() {
    const node = this.realWorldMapInfoNode();
    if (!node) return [];
    return window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, window.GameModules.realWorldMapFacts.nowLabel(this)) || [];
  },

  realWorldMapFactText(fact, index) {
    return window.GameModules.realWorldMapFacts?.formatFact?.(fact, index) || '';
  },
};
