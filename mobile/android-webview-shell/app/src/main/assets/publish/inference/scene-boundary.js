window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.sceneBoundary = {
  scheduleNameForId(store, id = '', entry = {}) {
    const state = store?.rpgStates?.[id] || window.GameModules.characterStateStore?.get?.(id);
    return String(entry.characterName || state?.profile?.name || state?.name || id || '').trim();
  },


  cleanScheduleLocation(location = '') {
    return String(location || '').trim();
  },


  unknownScheduleLocation(location = '') {
    return !this.cleanScheduleLocation(location) || /^当前位置未知|未知地点|现实地点|当前位置$/u.test(this.cleanScheduleLocation(location));
  },


  householdLocationKey(location = '') {
    const text = this.cleanScheduleLocation(location);
    const explicitRoom = text.match(/^(.{0,40}?[0-9一二三四五六七八九十百千万]+(?:号|室))/u);
    if (explicitRoom) return explicitRoom[1].trim();
    const explicitUnit = text.match(/^(.{0,40}?[0-9一二三四五六七八九十百千万]+(?:栋|楼)(?:[0-9一二三四五六七八九十百千万]+单元)?)/u);
    return String(explicitUnit?.[1] || '').trim();
  },


  scheduleLocationsAdjacent(a = '', b = '') {
    const left = this.cleanScheduleLocation(a);
    const right = this.cleanScheduleLocation(b);
    if (!left || !right || this.unknownScheduleLocation(left) || this.unknownScheduleLocation(right)) return false;
    if (left === right) return false;
    const leftKey = this.householdLocationKey(left);
    const rightKey = this.householdLocationKey(right);
    if (!leftKey || !rightKey) return false;
    return leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey);
  },


  scheduleParticipantHints(store, action = '', currentLocation = '') {
    const schedules = store?.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {};
    const location = this.cleanScheduleLocation(currentLocation || store?.realWorldLocationName || store?.realWorldMap?.current || '');
    const out = { sameLocation: [], nearbyLocation: [], offstage: [], unknown: [] };
    Object.entries(schedules).forEach(([id, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const name = this.scheduleNameForId(store, id, entry);
      if (!name) return;
      const current = this.cleanScheduleLocation(entry.currentLocation);
      const item = { id: entry.characterId || id, name, currentLocation: current, currentAction: String(entry.currentAction || '').trim(), availability: entry.availability || '未知', reason: entry.reason || '' };
      if (item.availability === '场外') out.offstage.push(item);
      else if (this.unknownScheduleLocation(current)) out.unknown.push(item);
      else if (current && location && current === location) out.sameLocation.push(item);
      else if (this.scheduleLocationsAdjacent(current, location)) out.nearbyLocation.push(item);
    });
    return {
      sameLocation: out.sameLocation.slice(0, 3),
      nearbyLocation: out.nearbyLocation.slice(0, Math.max(0, 3 - out.sameLocation.length)),
      offstage: out.offstage.slice(0, 5),
      unknown: out.unknown.slice(0, 5),
    };
  },


  scheduleHintLine(items = [], label = '') {
    const text = (items || []).map((item) => `${item.name}（${[item.currentLocation, item.currentAction].filter(Boolean).join('，') || '无详情'}）`).join('、');
    return `${label}：${text || '无'}`;
  },


  scheduleCandidateHintText(store, action = '', currentLocation = '') {
    const hints = this.scheduleParticipantHints(store, action, currentLocation);
    if (!Object.values(hints).some((items) => items.length)) return '日程候选提示：无';
    return [
      '日程候选提示：',
      this.scheduleHintLine(hints.sameLocation, '同地点'),
      this.scheduleHintLine(hints.nearbyLocation, '同住/相邻'),
      this.scheduleHintLine(hints.offstage, '明确场外'),
      this.scheduleHintLine(hints.unknown, '未知位置'),
      '规则：同地点/同住/相邻可作为高优先候选或戏剧候选，但不是强制出场；明确场外不得作为可出场候选；每轮最多选择3个日程候选。',
    ].join('\n');
  },


  sceneParticipantBoundary(trace = [], effectiveSceneLayers = null) {
    const layers = effectiveSceneLayers || (Array.isArray(trace) ? {
      forcedParticipants: trace.flatMap((item) => Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []),
      priorityCandidates: trace.flatMap((item) => Array.isArray(item?.priorityCandidates) ? item.priorityCandidates : []),
      dramaCandidates: trace.flatMap((item) => Array.isArray(item?.dramaCandidates) ? item.dramaCandidates : []),
      forbiddenParticipants: trace.flatMap((item) => Array.isArray(item?.forbiddenParticipants) ? item.forbiddenParticipants : []),
      randomActiveEvents: trace.flatMap((item) => Array.isArray(item?.randomActiveEvents) ? item.randomActiveEvents : []),
      randomIntrusionCondition: [...trace].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入',
    } : trace || {});
    const seenNames = new Set();
    const clean = (group = []) => (Array.isArray(group) ? group : []).filter((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || item?.characterName || '').trim();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });
    const names = (group = [], label = '理由') => clean(group).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${label}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(layers.randomActiveEvents) ? layers.randomActiveEvents : []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '场外事件'}｜${item.motivation || ''}`).join('；') || '无';
    return [
      `强制出场：${names(layers.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(layers.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(layers.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(layers.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${layers.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },


  randomActiveEventCandidates(store, action = '', options = {}) {
    const blocked = new Set([...(options.blockedNames || []), ...String(action || '').match(/[\p{Script=Han}A-Za-z0-9_]{2,}/gu) || []]);
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      (Array.isArray(options[key]) ? options[key] : []).forEach((item) => {
        const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || item || '').trim();
        if (name) blocked.add(name);
      });
    });
    const states = [...Object.values(store?.rpgStates || {}), ...(window.GameModules.characterStateStore?.list?.() || [])];
    const seen = new Set();
    return states.map((state) => ({ id: state.id || state.profile?.name || state.name, name: state.profile?.name || state.name }))
      .filter((item) => item.name && !blocked.has(item.name) && !seen.has(item.name) && seen.add(item.name))
      .slice(0, 3);
  },

};
