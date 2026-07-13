/**
 * 从玩家地址 deterministic 生成政区 map 父链 + 对应 org stub（L1，无 structure）。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapGeopolitical = {
  slug(name = '') {
    return String(name || '').replace(/[^\w\u4e00-\u9fa5]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'region';
  },

  parseAdminChain(profile = {}) {
    const address = [profile.refinedCity, profile.city, profile.homeLocation, profile.locationName]
      .map((x) => String(x || '').trim()).find((x) => x.length >= 4) || '';
    const home = window.GameModules.realWorldMap?.inferHomeName?.(profile) || '';
    const combined = `${address}${home}`.replace(/\s+/g, '');
    if (!combined) return [];

    const parts = [];
    let rest = combined;
    const directCities = ['北京市', '上海市', '天津市', '重庆市'];
    let province = directCities.find((dc) => combined.includes(dc)) || '';
    if (province) {
      parts.push({ level: '省级', name: province, kind: 'admin' });
      rest = combined.slice(combined.indexOf(province) + province.length);
    } else {
      const pm = combined.match(/([\u4e00-\u9fa5]{2,10}(?:省|自治区|特别行政区))/);
      if (pm) {
        province = pm[1];
        parts.push({ level: '省级', name: province, kind: 'admin' });
        rest = combined.slice(combined.indexOf(province) + province.length);
      }
    }

    if (!directCities.includes(province)) {
      const cm = rest.match(/([\u4e00-\u9fa5]{2,10}(?:市|州|盟|地区))/);
      if (cm) {
        parts.push({ level: '市级', name: cm[1], kind: 'admin' });
        rest = rest.slice(rest.indexOf(cm[1]) + cm[1].length);
      }
    }

    const dm = rest.match(/([\u4e00-\u9fa5]{2,10}(?:区|县|旗))/);
    if (dm) {
      parts.push({ level: '区县级', name: dm[1], kind: 'admin' });
      rest = rest.slice(rest.indexOf(dm[1]) + dm[1].length);
    }

    const sm = rest.match(/([\u4e00-\u9fa5]{2,12}(?:街道|镇|乡))/);
    if (sm) parts.push({ level: '街道级', name: sm[1], kind: 'admin' });

    const communitySource = home || combined;
    const comm = communitySource.match(/([\u4e00-\u9fa5]{2,14}(?:小区|社区|花园|苑|公寓|里))/);
    if (comm) parts.push({ level: '社区级', name: comm[1], kind: 'community' });

    const seen = new Set();
    return parts.filter((item) => {
      const key = item.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  ensure(store, map, profile = {}) {
    if (!store || !map) return map;
    const mapMod = window.GameModules.realWorldMap;
    const otActions = window.GameModules.orgTerritoryActions;
    const chain = this.parseAdminChain(profile);
    if (!chain.length) return map;

    store.initFactionSystem?.();
    let parentNodeId = '';
    let lastAdminOrgId = '';
    let communityOrgId = '';
    let communityNodeId = '';

    chain.forEach((item) => {
      const node = mapMod.upsertNode(map, {
        name: item.name,
        parentId: parentNodeId,
        description: `${item.name}（政区 stub，接触后细化）`,
        mapVisible: item.kind === 'community',
        onlyIfNew: true,
      });
      if (!node) return;
      node.geopoliticalStub = true;
      if (item.kind !== 'community') node.mapVisible = false;
      parentNodeId = node.id;

      const org = otActions?.ensureAdminOrgStub?.(store, item, lastAdminOrgId);
      if (org?.id) {
        if (item.kind === 'community') {
          communityOrgId = org.id;
          communityNodeId = node.id;
          org.territoryAnchors = [node.id, ...(org.territoryAnchors || [])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
        } else {
          lastAdminOrgId = org.id;
        }
      }
    });

    const homeName = mapMod.inferHomeName?.(profile);
    if (homeName) {
      const homeNode = window.GameModules.orgTerritory?.findMapNode?.(map, homeName)
        || map.nodes.find((n) => n.name === homeName || homeName.includes(n.name) || n.name.includes(homeName));
      if (homeNode && parentNodeId && !homeNode.parentId) homeNode.parentId = parentNodeId;
      if (communityOrgId) otActions?.linkFamilyToCommunity?.(store, communityOrgId, map);
    }

    if (communityOrgId && communityNodeId) {
      otActions?.linkFamilyToCommunity?.(store, communityOrgId, map);
    }

    window.GameModules.orgTerritory?.ensureMapControls?.(map, store);
    return map;
  },
};
