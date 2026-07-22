window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.mapShellViewHelpers = {
  panelTitle() {
    return '电子地图';
  },

  locationText() {
    const map = this.realWorldMap || {};
    const anchorId = map.mapAnchorId || map.currentId || '';
    const anchor = (map.nodes || []).find((node) => node.id === anchorId);
    const exterior = window.GameModules.realWorldMap?.mapExteriorName?.(anchor?.name || map.current || this.realWorldLocationName || '');
    return String(exterior || anchor?.name || map.current || this.realWorldLocationName || '').trim() || '当前位置待推演';
  },

  emptyMapText() {
    return '电子地图暂无建筑节点。玩家初始化只登记当前房间；周边建筑、楼层、房间和距离会随推演逐步揭示。';
  },

  panelView() {
    const map = this.realWorldMap || {};
    return {
      title: this.realWorldMapPanelTitle(),
      locationText: this.realWorldMapLocationText(),
      emptyMapText: this.realWorldMapEmptyText(),
      hasGraphNodes: Array.isArray(map.nodes) && map.nodes.some((node) => node && node.name && node.mapVisible !== false),
    };
  },
};
