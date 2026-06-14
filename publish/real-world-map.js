/**
 * 现实世界文字地图：用地点节点和连线表达大致方位。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMap = {
  defaultState(profile = {}) {
    const home = this.cleanName(profile.homeLocation || profile.locationName || '玩家住处');
    return { current: home, nodes: [home], edges: [], lastText: home };
  },

  cleanName(name) {
    return String(name || '现实地点').replace(/[\n\r|]+/g, ' ').trim().slice(0, 18) || '现实地点';
  },

  ensure(state, profile = {}) {
    if (!state.realWorldMap || typeof state.realWorldMap !== 'object') state.realWorldMap = this.defaultState(profile);
    state.realWorldMap.current = this.cleanName(state.realWorldMap.current || state.realWorldLocationName || profile.refinedCity);
    state.realWorldMap.nodes = this.unique(state.realWorldMap.nodes?.length ? state.realWorldMap.nodes : [state.realWorldMap.current]);
    state.realWorldMap.edges = Array.isArray(state.realWorldMap.edges) ? state.realWorldMap.edges : [];
    state.realWorldLocationName = this.cleanName(state.realWorldLocationName || state.realWorldMap.current);
    state.realWorldMap.lastText = this.render(state.realWorldMap);
    return state.realWorldMap;
  },

  update(state, locationName, result = {}) {
    const map = this.ensure(state, state.playerProfile || {});
    const next = this.cleanName(locationName || result.locationName || map.current);
    const prev = map.current;
    map.current = next;
    map.nodes = this.unique([...map.nodes, next]);
    if (prev && prev !== next) this.addEdge(map, prev, next);
    if (Array.isArray(result.mapLinks)) result.mapLinks.forEach((link) => this.addEdge(map, link?.from, link?.to));
    state.realWorldLocationName = next;
    map.lastText = this.render(map);
    return map;
  },

  addEdge(map, a, b) {
    const from = this.cleanName(a), to = this.cleanName(b);
    if (!from || !to || from === to) return;
    const key = [from, to].sort().join('---');
    if (!map.edges.some((edge) => edge.key === key)) map.edges.push({ key, from, to });
  },

  unique(items = []) {
    return [...new Set(items.map((x) => this.cleanName(x)).filter(Boolean))].slice(-12);
  },

  render(map) {
    const nodes = this.unique(map.nodes || []);
    if (!nodes.length) return '现实地点';
    const linked = [];
    const add = (name) => { if (name && !linked.includes(name)) linked.push(name); };
    for (const edge of map.edges || []) { add(edge.from); add(edge.to); }
    nodes.forEach(add);
    return linked.map((name) => (name === map.current ? `【${name}】` : name)).join('-----');
  },
};
