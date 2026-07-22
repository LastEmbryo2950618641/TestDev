/**
 * Electronic map graph layout.
 * Directly renders the stored map nodes and edges.
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapGraph = {
  NODE_H: 96,
  NODE_W_MIN: 220,
  NODE_W_MAX: 340,
  PADDING: 72,
  RING_X: 240,
  RING_Y: 148,

  nodeWidth(name = '') {
    const len = String(name || '').length;
    return Math.min(this.NODE_W_MAX, Math.max(this.NODE_W_MIN, len * 12 + 72));
  },

  displayNodes(map = {}) {
    return (Array.isArray(map.nodes) ? map.nodes : []).filter((node) => node && node.name && node.mapVisible !== false);
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
    return '距离待推演';
  },

  collectEdges(map = {}, nodes = []) {
    const seen = new Set();
    const edges = [];
    (Array.isArray(map.edges) ? map.edges : []).forEach((raw) => {
      const from = String(raw.fromId || raw.from || raw.sourceId || raw.source || '').trim();
      const to = String(raw.toId || raw.to || raw.targetId || raw.target || '').trim();
      if (!from || !to || from === to) return;
      const key = this.edgeKey(from, to);
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({
        id: raw.id || key,
        from,
        to,
        distanceText: this.edgeLabel(raw),
        distanceMeters: Number(raw.distanceMeters || raw.meters || raw.lengthMeters) || null,
        basis: String(raw.basis || raw.reason || raw.description || '').trim(),
      });
    });
    return edges;
  },

  build(map = {}) {
    const nodes = this.displayNodes(map);
    if (!nodes.length) return { nodes: [], edges: [], width: 720, height: 420, centerX: 360, centerY: 210 };

    const anchorId = map.mapAnchorId || map.currentId || nodes[0]?.id || '';
    const ordered = nodes.slice().sort((a, b) => {
      if (a.id === anchorId) return -1;
      if (b.id === anchorId) return 1;
      return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN');
    });

    const width = Math.max(760, this.PADDING * 2 + Math.min(4, Math.max(2, ordered.length)) * this.RING_X);
    const height = Math.max(460, this.PADDING * 2 + Math.ceil(Math.max(1, ordered.length - 1) / 3) * this.RING_Y + this.NODE_H);
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
        const angle = -Math.PI / 2 + ((index - 1) / Math.max(1, ordered.length - 1)) * Math.PI * 2;
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
        mapVisible: node.mapVisible !== false,
      };
    });

    const edgeLines = this.collectEdges(map, nodes).map((edge) => {
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
