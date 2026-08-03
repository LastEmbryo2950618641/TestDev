window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.locationFillInstalled) return;
  const baseLocation = ctx.location?.bind(ctx);

  Object.assign(ctx, {
    locationFillInstalled: true,

    async location(store, method, params = {}, action = '', options = {}) {
      const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
      const keyword = String(params.keyword || params.locationName || params.name || '').trim();
      const queryOnly = Boolean(options.queryOnly || options.noAudit || options.returnJsonOnMiss);
      if (method === 'getCurrentLocationContext') {
        const current = this.ensurePlayerCurrentLocation(store, action);
        return this.locationDetail(map, current?.name || map.current || store.realWorldLocationName);
      }
      if ((method === 'searchLocation' || method === 'searchLocationOne' || method === 'searchLocationWindow' || method === 'getLocationDetail') && keyword) {
        const existing = this.findLocationHit(map, keyword);
        if (existing) return this.locationDetail(map, existing.name);
        if (queryOnly) return this.locationQueryMissText(method, keyword, params);
        const graphHit = await this.ensurePropertyNodeWithAudit(store, keyword, action, options);
        if (this.isResolvedPropertyNodeEnsure(graphHit)) return this.propertyNodeEnsureText(store, graphHit);
        if (this.shouldFillCharacterLocation(store, keyword, action)) return await this.fillCharacterLocation(store, this.locationTargetKeyword(store, `${keyword} ${action}`) || keyword, action, this.locationFillRequestOptions(options));
      }
      return baseLocation ? baseLocation(store, method, params) : '';
    },

    locationQueryMissText(method = '', keyword = '', params = {}) {
      return JSON.stringify({
        ok: true,
        hit: false,
        skill: 'realworld.location.query',
        method,
        keyword,
        result: null,
        results: [],
        note: '地点查询未命中；Stage1 不补地图。若本轮仍需要该地点，请根据上下文做符合逻辑的保守推演；正文结束后由 Stage4 地图更新 / Stage10 电子地图周围解锁根据正文持久化地点、户型、摆件与周围直接相邻地点。',
        params,
      }, null, 2);
    },

    async actionLocationForStep(store, action = '', characters = [], reason = '', loadedKeys = new Set(), options = {}) {
      const text = `${action} ${reason} ${characters.map((item) => `${item?.id || item} ${item?.name || ''}`).join(' ')}`;
      const wantsPerson = /房间|卧室|找|去|前往|位置|所在|妹妹|姐姐|哥哥|弟弟|母亲|父亲/u.test(text);
      if (!wantsPerson) return null;
      const key = `realworld.location.auto:${this.locationPersonKey(store, text) || text.slice(0, 24)}`;
      if (loadedKeys.has(key)) return null;
      loadedKeys.add(key);
      this.ensurePlayerCurrentLocation(store, action);
      const target = this.locationTargetKeyword(store, text);
      if (!target) return null;
      const existing = this.findLocationHit(window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {}), target);
      const graphHit = existing ? null : await this.ensurePropertyNodeWithAudit(store, target, action, options);
      const detail = existing
        ? this.locationDetail(window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {}), existing.name)
        : this.isResolvedPropertyNodeEnsure(graphHit)
          ? this.propertyNodeEnsureText(store, graphHit)
          : await this.fillCharacterLocation(store, target, action, this.locationFillRequestOptions(options));
      return { title: 'realworld.location.query.autoCharacterRoute', text: detail, max: 1800 };
    },

    locationFillRequestOptions(options = {}) {
      const label = String(options.label || '现实');
      const phase = String(options.phase || options.reasoningPhase || '').toLowerCase();
      const isStage1 = phase === 'stage1' || Number(options.guidedStep) > 0;
      const title = options.sourceTitle || (isStage1 ? `${label}Stage1资料路由｜电子地图新增地点` : `${label}Stage4滑动结算｜电子地图新增地点`);
      const outputLimitKind = options.outputLimitKind || (isStage1 ? 'stage1' : 'stage4');
      const summary = isStage1 ? 'Stage1 资料路由中按当前行动补齐玩家已知地点。' : 'Stage4 滑动结算中按正文补齐玩家已知地点。';
      return {
        sourceTitle: title,
        outputLimitKind,
        tokenMeta: {
          title,
          category: '现实推演',
          summary,
          ...(options.tokenMeta || {}),
        },
      };
    },

    ensurePropertyNodeBeforeFill(store, keyword = '', action = '', options = {}) {
      const skills = window.GameModules.realWorldLocationGraphSkills;
      if (!skills?.nodeEnsure) return null;
      try {
        return skills.nodeEnsure(store, {
          stage: String(options.phase || options.reasoningPhase || '').toLowerCase() === 'stage1' || Number(options.guidedStep) > 0 ? 'stage1' : 'stage4',
          intent: 'reuse-or-create',
          targetKeyword: keyword,
          currentLegacyLocationName: store.realWorldMap?.current || store.realWorldLocationName || '',
          requiredScope: ['current-poi', 'path-to-target', 'interior-needed'],
          visibleNeed: `现实行动需要确认地点：${keyword}`,
          actionText: action || store.realWorldInput || '',
        });
      } catch (err) {
        console.warn('[real-world-location-graph] ensure before fill failed:', err.message);
        return null;
      }
    },

    async ensurePropertyNodeWithAudit(store, keyword = '', action = '', options = {}) {
      const skills = window.GameModules.realWorldLocationGraphSkills;
      const precheck = this.ensurePropertyNodeBeforeFill(store, keyword, action, options);
      if (precheck?.decision === 'reuse-existing') return precheck;
      if (!skills?.nodeEnsureAsync) return precheck;
      try {
        return await skills.nodeEnsureAsync(store, {
          stage: String(options.phase || options.reasoningPhase || '').toLowerCase() === 'stage1' || Number(options.guidedStep) > 0 ? 'stage1' : 'stage4',
          intent: 'reuse-or-create',
          targetKeyword: keyword,
          currentLegacyLocationName: store.realWorldMap?.currentId || store.realWorldMap?.current || store.realWorldLocationName || '',
          requiredScope: ['current-poi', 'path-to-target', 'direct-neighbor-poi', 'floor-room-layout'],
          visibleNeed: `现实行动需要确认并补齐地点：${keyword}`,
          actionText: action || store.realWorldInput || '',
        });
      } catch (err) {
        console.warn('[real-world-location-graph] audit ensure before fill failed:', err.message);
        return precheck;
      }
    },

    isResolvedPropertyNodeEnsure(result = null) {
      return Boolean(result?.nodeId && ['reuse-existing', 'patch-existing', 'create-new'].includes(result.decision));
    },

    isDeferredPropertyNodeEnsure(result = null) {
      return result?.decision === 'defer-unknown';
    },

    propertyNodeEnsureText(store, result = {}) {
      const skills = window.GameModules.realWorldLocationGraphSkills;
      const nodeText = skills?.getNode ? skills.getNode(store, { nodeId: result.nodeId }) : '';
      const evidence = (result.queryEvidence || []).map((item) => `${item.skill || 'query'}：${item.summary || ''}`).filter(Boolean).join('\n');
      const verb = result.decision === 'create-new' ? '已按显式地点补全新增' : result.decision === 'patch-existing' ? '已按显式地点补全更新' : '地点图已命中';
      return [
        `${verb}“${result.path?.[result.path.length - 1] || result.nodeId}”，本轮使用地点图节点，不绕过显式补全入口重复新增。`,
        nodeText,
        evidence ? `查询证据：\n${evidence}` : '',
      ].filter(Boolean).join('\n\n');
    },

    propertyNodeDeferText(result = {}) {
      const reason = result.audit?.reason || result.reason || '地点图未收到显式补全 JSON，当前暂不新增。';
      const evidence = (result.queryEvidence || []).map((item) => `${item.skill || 'query'}：${item.summary || ''}`).filter(Boolean).join('\n');
      return [
        `地点图暂不新增“${result.targetKeyword || '未知地点'}”。`,
        `原因：${reason}`,
        evidence ? `查询证据：\n${evidence}` : '',
      ].filter(Boolean).join('\n\n');
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
      const states = (window.GameModules.characterStateStore?.list?.() || []).concat(Object.values(store.rpgStates || {}));
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
      const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
      const graphApi = window.GameModules.realWorldLocationGraph;
      const recorded = graphApi?.getCharacterCurrentNode?.(store, 'player-self');
      if (recorded) return recorded;
      if (map.current && !window.GameModules.realWorldMap.isAbstractName(map.current)) {
        const hit = graphApi?.getNode?.(store, map.currentId || map.current) || this.findLocationHit(map, map.current);
        if (hit?.id) graphApi?.setCharacterCurrentNode?.(store, 'player-self', hit.graphNodeId || hit.id, { reason: '玩家当前地图锚点。' });
        return hit;
      }
      const fallback = this.playerHomeLocationName(store, action);
      const node = fallback ? graphApi?.ensurePoiFromPayload?.(store, {
        name: fallback,
        descriptionFacts: [`玩家当前位于${fallback}，这是本次现实推演的路线起点。`],
        time: window.GameModules.realWorldMap.factTime(store),
      }, { source: 'player-current-location-fallback' }) : null;
      if (node?.id) graphApi?.setCharacterCurrentNode?.(store, 'player-self', node.graphNodeId || node.id, { reason: '玩家当前地点兜底生成。' });
      return node;
    },

    playerHomeLocationName(store, action = '') {
      const profile = store.playerProfile || {};
      const text = [profile.refinedCity, profile.homeLocation, profile.locationName, profile.refinedLivingStatus, action].filter(Boolean).join(' ');
      const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9-]+小区[^，。；\s]{0,24}(?:号|室)?)/u);
      return window.GameModules.realWorldMap.cleanName(match?.[1] || profile.refinedCity || profile.homeLocation || store.realWorldLocationName || '');
    },

    async fillCharacterLocation(store, keyword = '', action = '', requestOptions = {}) {
      const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
      const graphHit = await this.ensurePropertyNodeWithAudit(store, keyword, action, requestOptions);
      if (this.isResolvedPropertyNodeEnsure(graphHit)) return this.propertyNodeEnsureText(store, graphHit);
      if (this.isDeferredPropertyNodeEnsure(graphHit)) return this.propertyNodeDeferText({ ...graphHit, targetKeyword: keyword });
      const character = this.findCharacterForLocationKeyword(store, `${keyword} ${action}`);
      const clue = this.locationFillClue(store, keyword, character, action);
      let payload = null;
      try {
        const prompt = await window.GameModules.renderPrompt('real-world-map-location-add', {
          手机时间: `${store.phoneDateText?.() || ''} ${store.phoneTimeText?.() || ''}`.trim(),
          当前地点: map.current || store.realWorldLocationName || '未知',
          现实地图: map.lastText || window.GameModules.realWorldMap.render(map),
          地点说明: this.locationFactsText(map),
          新地点线索: clue,
        });
        payload = await window.GameModules.jsonUtils.generateJsonWithRetry({
          source: 'real-world-location-fill', sourceTitle: requestOptions.sourceTitle || '现实Stage4滑动结算｜电子地图新增地点', promptId: 'real-world-map-location-add', model: store.modelId, store, useRealWorldKvCache: true, outputLimitKind: requestOptions.outputLimitKind || 'stage4', tokenMeta: requestOptions.tokenMeta, timeoutMs: 45000, prompt, format: prompt, max: 2,
          parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
          validate: (raw) => this.validateLocationFill(raw),
        });
      } catch (err) {
        console.warn('现实人物地点补齐失败，使用保守兜底:', err.code, err.message, err.stack);
        payload = this.fallbackLocationFill(store, keyword, character);
      }
      const time = window.GameModules.realWorldMap.factTime(store);
      const current = this.ensurePlayerCurrentLocation(store, action);
      const routeNodes = this.applyRouteNodes(store, payload.routeNodes || [], time);
      const node = window.GameModules.realWorldLocationGraph?.ensurePoiFromPayload?.(store, { ...payload, time }, { source: 'real-world-location-fill-payload' });
      if (!node) return this.propertyNodeDeferText({ targetKeyword: keyword, reason: '地点图写入入口不可用，暂不通过旧地图入口新增。' });
      window.GameModules.realWorldLocationGraph?.linkRoutePath?.(store, [current, ...routeNodes, node], { source: 'stage1-location-fill-route', basis: 'Stage1 地点路线补齐。', time });
      return [`地图未命中“${keyword}”，已视为现实世界地点未加载完全并补齐地点。`, this.routeSummary(routeNodes, node), this.locationDetail(map, node?.name || payload.name), '补齐结论：玩家当前地点、目标人物地点、从当前地点前往目标地点的中间路线和当前可用上下文已经足够用于本次现实推演；除非玩家提出新的未知地点，不要继续为同一人物地点或路线重复 request_context。'].join('\n');
    },

    locationFillClue(store, keyword = '', character = null, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
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
        try {
          const routeNode = this.validateRouteNode(item);
          const graphHit = this.ensurePropertyNodeBeforeFill(store, routeNode.name, routeNode.descriptionFacts?.join(' ') || '', { phase: 'stage1' });
          if (graphHit?.decision === 'reuse-existing') {
            const name = graphHit.path?.[graphHit.path.length - 1] || routeNode.name;
            return { id: graphHit.nodeId, graphNodeId: graphHit.nodeId, name, descriptionFacts: routeNode.descriptionFacts, reusedFromLocationGraph: true };
          }
          return window.GameModules.realWorldLocationGraph?.ensurePoiFromPayload?.(store, { ...routeNode, time }, { source: 'real-world-route-node' });
        }
        catch (_) { return null; }
      }).filter(Boolean);
    },

    routeSummary(routeNodes = [], target = null) {
      const names = [...routeNodes.map((node) => `${node.name}${node.id ? `(${node.id})` : ''}`), target ? `${target.name}${target.id ? `(${target.id})` : ''}` : ''].filter(Boolean);
      return names.length ? `路线节点：${names.join(' → ')}` : '路线节点：已根据当前地点和目标地点补齐。';
    },

    locationFactsText(map) {
      return (map.nodes || []).map((node) => {
        const infoFacts = window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, '') || [];
        const factsText = infoFacts.map((fact, index) => window.GameModules.ui.realWorld.mapInfoViewHelpers.factText.call(this, fact, index)).filter(Boolean).join('') || node.description || '暂无说明';
        return `${node.name}：${factsText}`;
      }).join('\\n') || '暂无地点说明。';
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
      const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
      const profile = character?.profile || character || {};
      const name = profile.name ? `${profile.name}的房间` : window.GameModules.realWorldMap.cleanName(keyword.replace(/地点|信息|位置/gu, ''));
      const route = map.current ? `从${map.current}出发，沿住处内部走廊或楼梯前往，房门位于家庭卧室区域的第二间。` : '从当前室内位置出发，沿走廊前往家庭卧室区域，目标房门在第二间。';
      return { name: name || '相关人物房间', parentName: map.current || store.realWorldLocationName || '', descriptionFacts: [route], routeNodes: [{ name: '住处内部走廊', parentName: map.current || store.realWorldLocationName || '', descriptionFacts: [`从${map.current || '当前室内位置'}出来后先进入连接各房间的走廊。`] }] };
    },
  });
})();

