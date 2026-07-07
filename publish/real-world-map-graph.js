/**
 * Electronic map graph layout.
 * Visible nodes are building-level POIs; interiors stay inside the selected building drawer.
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapGraph = {
  NODE_H: 96,
  NODE_W_MIN: 220,
  NODE_W_MAX: 340,
  PADDING: 76,
  RING_X: 250,
  RING_Y: 150,

  nodeWidth(name = '') {
    const len = String(name || '').length;
    return Math.min(this.NODE_W_MAX, Math.max(this.NODE_W_MIN, len * 12 + 72));
  },

  displayNodes(map = {}) {
    const mapMod = window.GameModules.realWorldMap;
    const fog = window.GameModules.realWorldMapFog;
    const rawNodes = fog?.visibleNodes?.(map) || (Array.isArray(map.nodes) ? map.nodes : []);
    return rawNodes.filter((node) => mapMod?.isMapDisplayNode?.(node, map));
  },

  edgeKey(from = '', to = '') {
    return [String(from || ''), String(to || '')].sort().join('__');
  },

  edgeLabel(edge = {}) {
    const text = String(edge.distanceText || edge.distance || edge.label || '').trim();
    if (text) return text.slice(0, 18);
    const meters = Number(edge.distanceMeters || edge.meters || edge.lengthMeters);
    if (Number.isFinite(meters) && meters > 0) {
      return meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km` : `${Math.round(meters)} m`;
    }
    return '\u8ddd\u79bb\u5f85\u63a8\u6f14';
  },

  collectEdges(map = {}, nodes = []) {
    const visibleIds = new Set(nodes.map((node) => node.id));
    const edges = [];
    const seen = new Set();
    const push = (raw = {}, fallback = false) => {
      const from = String(raw.fromId || raw.from || raw.sourceId || raw.source || '').trim();
      const to = String(raw.toId || raw.to || raw.targetId || raw.target || '').trim();
      if (!from || !to || from === to || !visibleIds.has(from) || !visibleIds.has(to)) return;
      const key = this.edgeKey(from, to);
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({
        id: raw.id || key,
        from,
        to,
        fallback,
        distanceText: this.edgeLabel(raw),
        basis: String(raw.basis || raw.reason || raw.description || '').trim(),
      });
    };

    (Array.isArray(map.edges) ? map.edges : []).forEach((edge) => push(edge, false));

    if (!edges.length) {
      nodes.forEach((node) => {
        if (node.parentId && visibleIds.has(node.parentId)) push({ from: node.parentId, to: node.id, distanceText: '\u8ddd\u79bb\u5f85\u63a8\u6f14' }, true);
      });
    }

    return edges;
  },

  build(map = {}) {
    const rawNodes = this.displayNodes(map);
    if (!rawNodes.length) {
      return { nodes: [], edges: [], width: 720, height: 420, centerX: 360, centerY: 210 };
    }

    const anchorId = map.mapAnchorId || map.currentId || rawNodes[0]?.id || '';
    const ordered = rawNodes.slice().sort((a, b) => {
      if (a.id === anchorId) return -1;
      if (b.id === anchorId) return 1;
      return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
    });

    const count = ordered.length;
    const width = Math.max(760, this.PADDING * 2 + Math.min(4, Math.max(2, count)) * this.RING_X);
    const height = Math.max(460, this.PADDING * 2 + Math.ceil(Math.max(1, count - 1) / 3) * this.RING_Y + this.NODE_H);
    const cx = width / 2;
    const cy = height / 2;
    const positions = {};

    ordered.forEach((node, index) => {
      const w = this.nodeWidth(node.name);
      let x;
      let y;
      if (index === 0) {
        x = cx - w / 2;
        y = cy - this.NODE_H / 2;
      } else {
        const angle = -Math.PI / 2 + ((index - 1) / Math.max(1, count - 1)) * Math.PI * 2;
        const ring = Math.floor((index - 1) / 8);
        const rx = this.RING_X + ring * 120;
        const ry = this.RING_Y + ring * 82;
        x = cx + Math.cos(angle) * rx - w / 2;
        y = cy + Math.sin(angle) * ry - this.NODE_H / 2;
      }
      positions[node.id] = { x, y, w, h: this.NODE_H, cx: x + w / 2, cy: y + this.NODE_H / 2 };
    });

    const layoutNodes = ordered.map((node) => {
      const box = positions[node.id];
      return {
        id: node.id,
        name: node.name,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        cx: box.cx,
        cy: box.cy,
        current: node.id === anchorId,
        visited: Boolean(node.visited),
        revealed: Boolean(node.revealed),
        parentId: node.parentId || '',
      };
    });

    const edgeLines = this.collectEdges(map, rawNodes).map((edge) => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return null;
      return {
        ...edge,
        x1: from.cx,
        y1: from.cy,
        x2: to.cx,
        y2: to.cy,
        mx: (from.cx + to.cx) / 2,
        my: (from.cy + to.cy) / 2,
      };
    }).filter(Boolean);

    return { nodes: layoutNodes, edges: edgeLines, width, height, centerX: cx, centerY: cy };
  },
};
