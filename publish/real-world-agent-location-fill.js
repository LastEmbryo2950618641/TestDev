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
      if ((method === 'searchLocation' || method === 'getLocationDetail') && keyword) {
        const existing = this.findLocationHit(map, keyword);
        if (existing) return this.locationDetail(map, existing.name);
        if (this.shouldFillCharacterLocation(store, keyword, action)) return await this.fillCharacterLocation(store, keyword, action);
      }
      return baseLocation ? baseLocation(store, method, params) : '';
    },

    findLocationHit(map, keyword = '') {
      const key = String(keyword || '').trim();
      if (!key) return null;
      return (map.nodes || []).find((node) => `${node.name} ${node.description || ''} ${JSON.stringify(node.descriptionFacts || [])}`.includes(key));
    },

    shouldFillCharacterLocation(store, keyword = '', action = '') {
      const text = `${keyword} ${action || store.realWorldInput || ''}`;
      if (/房间|卧室|住所|住处|家里|妹妹|姐姐|哥哥|弟弟|母亲|父亲/u.test(text)) return true;
      return Boolean(this.findCharacterForLocationKeyword(store, text));
    },

    findCharacterForLocationKeyword(store, keyword = '') {
      const states = (window.GameModules.sqliteSave.listCharacterStates?.() || []).concat(Object.values(store.rpgStates || {}));
      return states.find((state) => {
        const profile = state?.profile || state || {};
        const text = [state?.id, state?.name, profile.name, profile.role, profile.relationships, profile.detail].filter(Boolean).join(' ');
        return text && (keyword.includes(profile.name) || keyword.includes(state?.name) || (/妹妹/u.test(keyword) && /妹妹/u.test(text)));
      }) || null;
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
      const node = window.GameModules.realWorldMap.addLocation(store, payload, window.GameModules.realWorldMap.factTime(store));
      return `地图未命中“${keyword}”，已视为现实世界地点未加载完全并补齐地点。\n${this.locationDetail(map, node?.name || payload.name)}`;
    },

    locationFillClue(store, keyword = '', character = null, action = '') {
      const profile = character?.profile || character || {};
      return [
        `查询关键词：${keyword}`,
        `本次行动：${action || store.realWorldInput || '现实行动中需要前往该人物相关地点'}`,
        `人物资料：${profile.name || character?.name || '未知人物'}｜${profile.role || ''}｜${profile.relationships || ''}｜${profile.detail || ''}`,
        '已有地图没有命中该人物地点，说明现实世界地图尚未加载完全；请补齐玩家当前合理知道且可前往的具体地点。若线索是去妹妹房间，优先把地点作为当前住处下的房间子地点。',
      ].join('\n');
    },

    locationFactsText(map) {
      return (map.nodes || []).map((node) => `${node.name}：${(node.descriptionFacts || []).map((fact, i) => window.GameModules.realWorldMapFacts.formatFact(fact, i)).join('') || node.description || '暂无说明'}`).join('\n') || '暂无地点说明。';
    },

    validateLocationFill(raw = {}) {
      const name = window.GameModules.realWorldMap.cleanName(raw.name || raw.locationName);
      if (!name || window.GameModules.realWorldMap.isAbstractName(name)) throw new Error('地点名缺失或过于抽象');
      const facts = Array.isArray(raw.descriptionFacts) ? raw.descriptionFacts.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3) : [String(raw.description || '根据现实行动补齐的人物相关地点。')];
      return { name, parentName: window.GameModules.realWorldMap.cleanName(raw.parentName || raw.parentLocationName || ''), descriptionFacts: facts };
    },

    fallbackLocationFill(store, keyword = '', character = null) {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const profile = character?.profile || character || {};
      const name = profile.name ? `${profile.name}的房间` : window.GameModules.realWorldMap.cleanName(keyword.replace(/地点|信息|位置/gu, ''));
      return { name: name || '相关人物房间', parentName: map.current || store.realWorldLocationName || '', descriptionFacts: [`这是根据本次现实行动补齐的人物相关地点，玩家当前知道可以前往这里。`] };
    },
  });
})();
