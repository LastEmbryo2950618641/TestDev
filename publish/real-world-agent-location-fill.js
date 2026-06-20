window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.locationFillInstalled) return;
  const baseLocation = ctx.location?.bind(ctx);

  Object.assign(ctx, {
    locationFillInstalled: true,

    async location(store, method, params = {}, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const keyword = String(params.keyword || params.locationName || params.name || '').trim();
      if (method === 'getCurrentLocationContext') {
        const current = this.ensurePlayerCurrentLocation(store, action);
        return this.locationDetail(map, current?.name || map.current || store.realWorldLocationName);
      }
      if ((method === 'searchLocation' || method === 'getLocationDetail') && keyword) {
        const existing = this.findLocationHit(map, keyword);
        if (existing) return this.locationDetail(map, existing.name);
        if (this.shouldFillCharacterLocation(store, keyword, action)) return await this.fillCharacterLocation(store, this.locationTargetKeyword(store, `${keyword} ${action}`) || keyword, action);
      }
      return baseLocation ? baseLocation(store, method, params) : '';
    },

    async actionLocationForStep(store, action = '', characters = [], reason = '', loadedKeys = new Set()) {
      const text = `${action} ${reason} ${characters.map((item) => `${item?.id || item} ${item?.name || ''}`).join(' ')}`;
      const wantsPerson = /房间|卧室|找|去|前往|位置|所在|妹妹|姐姐|哥哥|弟弟|母亲|父亲/u.test(text);
      if (!wantsPerson) return null;
      const key = `realworld.location.auto:${this.locationPersonKey(store, text) || text.slice(0, 24)}`;
      if (loadedKeys.has(key)) return null;
      loadedKeys.add(key);
      this.ensurePlayerCurrentLocation(store, action);
      const target = this.locationTargetKeyword(store, text);
      if (!target) return null;
      const existing = this.findLocationHit(window.GameModules.realWorldMap.ensure(store, store.playerProfile || {}), target);
      const detail = existing ? this.locationDetail(window.GameModules.realWorldMap.ensure(store, store.playerProfile || {}), existing.name) : await this.fillCharacterLocation(store, target, action);
      return { title: 'realworld.location.query.autoCharacterRoute', text: detail, max: 1800 };
    },

    findLocationHit(map, keyword = '') {
      const key = String(keyword || '').trim();
      if (!key) return null;
      const tokens = this.locationKeywordTokens(key);
      const needsRoom = /房间|卧室/u.test(key);
      return (map.nodes || []).find((node) => {
        const text = `${node.name} ${node.description || ''} ${JSON.stringify(node.descriptionFacts || [])}`;
        if (text.includes(key)) return true;
        if (needsRoom) return /房间|卧室/u.test(text) && tokens.some((token) => !/房间|卧室/u.test(token) && text.includes(token));
        return tokens.some((token) => text.includes(token));
      });
    },

    locationKeywordTokens(keyword = '') {
      const text = String(keyword || '');
      const clean = text.replace(/位置|信息|当前|状态|地点|路线|环境|获取|需要|相关|上下文|以便|确定|前往|的|和|与/gu, ' ');
      const names = [...clean.matchAll(/[\u4e00-\u9fa5]{2,4}/gu)].map((m) => m[0]).filter((x) => !/房间|卧室/u.test(x));
      const family = ['妹妹', '姐姐', '哥哥', '弟弟', '母亲', '父亲'].filter((x) => text.includes(x));
      const rooms = /房间|卧室/u.test(text) ? ['房间', '卧室'] : [];
      return [...new Set([...names, ...family, ...rooms])].filter((x) => x.length >= 2);
    },

    shouldFillCharacterLocation(store, keyword = '', action = '') {
      const text = `${keyword} ${action || store.realWorldInput || ''}`;
      if (/房间|卧室|住所|住处|家里|妹妹|姐姐|哥哥|弟弟|母亲|父亲/u.test(text)) return true;
      return Boolean(this.findCharacterForLocationKeyword(store, text));
    },

    findCharacterForLocationKeyword(store, keyword = '') {
      const states = (window.GameModules.sqliteSave.listCharacterStates?.() || []).concat(Object.values(store.rpgStates || {}));
      const hits = states.map((state) => {
        const profile = state?.profile || state || {};
        const text = [state?.id, state?.name, profile.name, profile.role, profile.relationships, profile.detail].filter(Boolean).join(' ');
        let score = 0;
        if (profile.name && keyword.includes(profile.name)) score += 50;
        if (state?.name && keyword.includes(state.name)) score += 40;
        if (state?.id && keyword.includes(state.id)) score += 20;
        if (/妹妹/u.test(keyword) && /妹妹/u.test(text)) score += 25;
        if (state?.id === 'player-self') score -= 45;
        return { state, score, text };
      }).filter((item) => item.text && item.score > 0).sort((a, b) => b.score - a.score);
      return hits[0]?.state || null;
    },

    locationPersonKey(store, text = '') {
      const hit = this.findCharacterForLocationKeyword(store, text);
      return hit?.id || hit?.profile?.name || hit?.name || '';
    },

    locationTargetKeyword(store, text = '') {
      const hit = this.findCharacterForLocationKeyword(store, text);
      const profile = hit?.profile || hit || {};
      if (profile.name) return `${profile.name}的房间`;
      const match = String(text || '').match(/([\u4e00-\u9fa5]{2,4})(?:的)?(?:房间|卧室|位置|所在)/u);
      return match?.[1] ? `${match[1]}的房间` : '';
    },

    ensurePlayerCurrentLocation(store, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      if (map.current && !window.GameModules.realWorldMap.isAbstractName(map.current)) return this.findLocationHit(map, map.current);
      const fallback = this.playerHomeLocationName(store, action);
      return fallback ? window.GameModules.realWorldMap.addLocation(store, {
        name: fallback,
        descriptionFacts: [`玩家当前位于${fallback}，这是本次现实推演的路线起点。`],
      }, window.GameModules.realWorldMap.factTime(store)) : null;
    },

    playerHomeLocationName(store, action = '') {
      const profile = store.playerProfile || {};
      const text = [profile.refinedCity, profile.homeLocation, profile.locationName, profile.refinedLivingStatus, action].filter(Boolean).join(' ');
      const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9-]+小区[^，。；\s]{0,24}(?:号|室)?)/u);
      return window.GameModules.realWorldMap.cleanName(match?.[1] || profile.refinedCity || profile.homeLocation || store.realWorldLocationName || '');
    },

    async fillCharacterLocation(store, keyword = '', action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const character = this.findCharacterForLocationKeyword(store, `${keyword} ${action}`);
      const clue = this.locationFillClue(store, keyword, character, action);
      let payload = null;
      try {
        const prompt = window.GameModules.promptTemplates.render('real-world-map-location-add', {
          手机时间: `${store.phoneDateText?.() || ''} ${store.phoneTimeText?.() || ''}`.trim(),
          当前地点: map.current || store.realWorldLocationName || '未知',
          现实地图: map.lastText || window.GameModules.realWorldMap.render(map),
          地点说明: this.locationFactsText(map),
          新地点线索: clue,
        });
        payload = await window.GameModules.jsonUtils.generateJsonWithRetry({
          source: 'real-world-location-fill', model: store.modelId, timeoutMs: 45000, prompt, format: prompt, max: 2,
          parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
          validate: (raw) => this.validateLocationFill(raw),
        });
      } catch (err) {
        console.warn('现实人物地点补齐失败，使用保守兜底:', err.code, err.message, err.stack);
        payload = this.fallbackLocationFill(store, keyword, character);
      }
      const time = window.GameModules.realWorldMap.factTime(store);
      const routeNodes = this.applyRouteNodes(store, payload.routeNodes || [], time);
      const node = window.GameModules.realWorldMap.addLocation(store, payload, time);
      return [`地图未命中“${keyword}”，已视为现实世界地点未加载完全并补齐地点。`, this.routeSummary(routeNodes, node), this.locationDetail(map, node?.name || payload.name), '补齐结论：玩家当前地点、目标人物地点、从当前地点前往目标地点的中间路线和当前可用上下文已经足够用于本次现实推演；除非玩家提出新的未知地点，不要继续为同一人物地点或路线重复 request_context。'].join('\n');
    },

    locationFillClue(store, keyword = '', character = null, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const profile = character?.profile || character || {};
      return [
        `查询关键词：${keyword}`,
        `玩家当前地点：${map.current || store.realWorldLocationName || '未知'}`,
        `本次行动：${action || store.realWorldInput || '现实行动中需要前往该人物相关地点'}`,
        `人物资料：${profile.name || character?.name || '未知人物'}｜${profile.role || ''}｜${profile.relationships || ''}｜${profile.detail || ''}`,
        '已有地图没有命中该人物地点，说明现实世界地图尚未加载完全；请先判断玩家当前地点，再推理从当前地点到目标人物地点的路线。若中间经过走廊、楼梯、二楼平台、卧室门口等地图中没有的新地点，必须放入 routeNodes 自动补齐。目标地点 descriptionFacts 要写清完整路线，例如“从客厅沿楼梯上二楼，穿过二楼走廊后右手第二间”。禁止写“根据本次现实行动补齐”“玩家当然知道可以前往这里”这类兜底说明。',
      ].join('\n');
    },

    applyRouteNodes(store, routeNodes = [], time = '') {
      return (Array.isArray(routeNodes) ? routeNodes : []).slice(0, 5).map((item) => {
        try { return window.GameModules.realWorldMap.addLocation(store, this.validateRouteNode(item), time); }
        catch (_) { return null; }
      }).filter(Boolean);
    },

    routeSummary(routeNodes = [], target = null) {
      const names = [...routeNodes.map((node) => node.name), target?.name].filter(Boolean);
      return names.length ? `路线节点：${names.join(' → ')}` : '路线节点：已根据当前地点和目标地点补齐。';
    },

    locationFactsText(map) {
      return (map.nodes || []).map((node) => `${node.name}：${(node.descriptionFacts || []).map((fact, i) => window.GameModules.realWorldMapFacts.formatFact(fact, i)).join('') || node.description || '暂无说明'}`).join('\n') || '暂无地点说明。';
    },

    validateLocationFill(raw = {}) {
      const item = this.validateRouteNode(raw);
      const routeNodes = Array.isArray(raw.routeNodes) ? raw.routeNodes.map((node) => this.validateRouteNode(node)).slice(0, 5) : [];
      return { ...item, routeNodes };
    },

    validateRouteNode(raw = {}) {
      const name = window.GameModules.realWorldMap.cleanName(raw.name || raw.locationName);
      if (!name || window.GameModules.realWorldMap.isAbstractName(name)) throw new Error('地点名缺失或过于抽象');
      const facts = Array.isArray(raw.descriptionFacts) ? raw.descriptionFacts.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3) : [String(raw.description || '')];
      if (!facts.length || facts.some((x) => /补齐|当然知道|可以前往|人物相关地点/u.test(x)) || !facts.join('').match(/左|右|上楼|下楼|走廊|门|房间|卧室|客厅|楼梯|尽头|旁边|对面|第二间|第一间|经过|穿过/u)) throw new Error('地点说明缺少具体方位路线');
      return { name, parentName: window.GameModules.realWorldMap.cleanName(raw.parentName || raw.parentLocationName || ''), descriptionFacts: facts };
    },

    fallbackLocationFill(store, keyword = '', character = null) {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const profile = character?.profile || character || {};
      const name = profile.name ? `${profile.name}的房间` : window.GameModules.realWorldMap.cleanName(keyword.replace(/地点|信息|位置/gu, ''));
      const route = map.current ? `从${map.current}出发，沿住处内部走廊或楼梯前往，房门位于家庭卧室区域的第二间。` : '从当前室内位置出发，沿走廊前往家庭卧室区域，目标房门在第二间。';
      return { name: name || '相关人物房间', parentName: map.current || store.realWorldLocationName || '', descriptionFacts: [route], routeNodes: [{ name: '住处内部走廊', parentName: map.current || store.realWorldLocationName || '', descriptionFacts: [`从${map.current || '当前室内位置'}出来后先进入连接各房间的走廊。`] }] };
    },
  });
})();
