/**
 * 电子地图网状布局：根据 parentId 树生成节点坐标与连线。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapGraph = {
  NODE_H: 48,
  GAP_X: 28,
  GAP_Y: 84,
  PADDING: 56,

  nodeWidth(name = '') {
    const len = String(name || '').length;
    return Math.min(260, Math.max(108, len * 12 + 36));
  },

  build(map = {}) {
    const fog = window.GameModules.realWorldMapFog;
    const rawNodes = fog?.visibleNodes?.(map) || (Array.isArray(map.nodes) ? map.nodes : []);
    if (!rawNodes.length) {
      return { nodes: [], edges: [], width: 360, height: 280, centerX: 180, centerY: 140 };
    }

    const byId = new Map(rawNodes.map((node) => [node.id, node]));
    const childrenOf = (parentId = '') => rawNodes
      .filter((node) => (node.parentId || '') === (parentId || ''))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const roots = rawNodes.filter((node) => {
      const parentId = node.parentId || '';
      return !parentId || !byId.has(parentId);
    });

    const positions = {};
    let leafCursor = 0;

    const place = (node, depth) => {
      const kids = childrenOf(node.id);
      const w = this.nodeWidth(node.name);
      let x;
      if (!kids.length) {
        x = leafCursor;
        leafCursor += w + this.GAP_X;
      } else {
        kids.forEach((child) => place(child, depth + 1));
        const boxes = kids.map((child) => positions[child.id]).filter(Boolean);
        const minX = Math.min(...boxes.map((box) => box.x));
        const maxX = Math.max(...boxes.map((box) => box.x + box.w));
        x = (minX + maxX - w) / 2;
      }
      const y = this.PADDING + depth * (this.NODE_H + this.GAP_Y);
      positions[node.id] = { x, y, w, h: this.NODE_H, cx: x + w / 2, cy: y + this.NODE_H / 2 };
    };

    roots.forEach((root) => place(root, 0));

    const edges = [];
    rawNodes.forEach((node) => {
      if (node.parentId && byId.has(node.parentId)) {
        edges.push({ from: node.parentId, to: node.id });
      }
    });

    const layoutNodes = rawNodes
      .filter((node) => positions[node.id])
      .map((node) => {
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
          current: node.id === (map.mapAnchorId || map.currentId),
          visited: Boolean(node.visited),
          revealed: Boolean(node.revealed),
        };
      });

    let maxX = this.PADDING;
    let maxY = this.PADDING;
    layoutNodes.forEach((node) => {
      maxX = Math.max(maxX, node.x + node.w + this.PADDING);
      maxY = Math.max(maxY, node.y + node.h + this.PADDING);
    });

    const width = Math.max(360, maxX);
    const height = Math.max(280, maxY);
    const edgeLines = edges.map((edge) => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return null;
      return {
        id: `${edge.from}-${edge.to}`,
        x1: from.cx,
        y1: from.y + from.h,
        x2: to.cx,
        y2: to.y,
      };
    }).filter(Boolean);

    return {
      nodes: layoutNodes,
      edges: edgeLines,
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
    };
  },
};
