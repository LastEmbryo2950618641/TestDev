window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentContext = {
  limit(text, max = 1200) {
    return String(text || '').trim().slice(0, max);
  },

  baseSnapshot(store, action = '') {
    const realWorld = window.GameModules.realWorld2026 || {};
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const companies = this.companyNames(store);
    const recent = this.recentLog(store, 3);
    const recentWorldline = this.recentWorldlineRecords(store, 5000, 6000);
    const longing = store.prepareRealWorldLongingContext?.() || '';
    const shared = store.sharedControlState?.();
    const sharedProfile = shared?.profile || {};
    const sharedLocation = shared ? store.controlLinkLocationText?.(shared) || '当前位置未登记' : '';
    const sharedBody = shared ? this.characterBodyText(shared) : '';
    return [
      `世界：${realWorld.label || '2026 现代都市现实世界'}`,
      `背景：${realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。'}`,
      `关系边界：${realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。'}`,
      `桌面时间：${store.phoneDateText?.() || '未知'} ${store.phoneTimeText?.() || ''}`,
      `时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds，代码会用它推进桌面时间。`,
      `玩家资料：${store.playerSetupSummary?.() || store.playerName || '玩家'}`,
      `玩家属性：${this.limit(store.playerIdentitySummary?.() || '玩家本人属性尚未生成。', 1000)}`,
      `玩家财富：${store.playerWealthText?.(store.playerProfile || {}) || `${Number(store.playerProfile?.wealthAmount || 0).toLocaleString('zh-CN')}元`}`,
      `现实身体状态：${this.vitalsText(store, store.playerIdentityState?.())}`,
      `主体ID规则：\n${window.GameModules.promptSections?.subjectIdRules?.(store) || '玩家本人固定 id:player-self；未知角色直接写完整姓名，禁止自造前缀。'}`,
      ...(shared ? [`同世界附身控制：当前上线对象为${sharedProfile.name || shared.name || '未知角色'}；身份：${sharedProfile.role || '未知'}；所在位置：${sharedLocation}。玩家意识已附身接管该角色身体，可直接控制其动作、视线、表情、触觉、嗅觉、味觉、听觉、身体反馈与局部反应；同时玩家现实本体仍由同一个意识维持控制，属于一心多用。描写时以第二人称“你”的附身镜头为主，重点写被控角色身体内的视角、动作执行、感官回流和外界反应；不要写成单纯远程旁观，也不要让玩家本体消失或失控。`, `被控角色身体与状态：${sharedBody}`] : []),
      `当前场景：${store.realWorldSceneTitle || '现实世界'}`,
      `当前地点：${store.realWorldLocationName || map.current || '尚未生成具体地点'}`,
      `当前目标：${store.realWorldQuest || '确认现实处境'}`,
      `当前组织名称：${companies || '暂无公司名称'}`,
      `势力资料库：\n${window.GameModules.factionArchive?.contextFor?.(store, action, 1600) || '暂无势力资料库记录。'}`,
      ...(longing ? [`角色思念上下文：\n${longing}`] : []),
      `## 最近发送的世界线\n需严格跟着世界线续写，保证正文对最新世界线连续性。\n${recentWorldline}`,
      `最近记录摘要：\n${recent}`,
      `本次行动：${action || '继续观察现实世界'}`,
    ].join('\n');
  },

  vitalsText(store, state = null) {
    const values = state?.values || {};
    const percent = (pool) => pool?.max ? Math.round((pool.current / pool.max) * 100) : 100;
    const row = (key, label) => {
      const pool = values[key] || {};
      const value = percent(pool);
      const note = values.vital_update_notes?.[key]?.reason || '';
      return `${label}${value}/100${note ? `（上次变化：${note}）` : ''}`;
    };
    return state?.values ? [row('stamina_pool', '精力'), row('satiety', '饱食度'), row('hydration', '水分'), row('fatigue', '疲劳度'), row('mental_stability', '精神稳定')].join('；') : '玩家本人状态尚未生成。';
  },

  characterBodyText(state = null) {
    const v = state?.values || {}, p = state?.profile || {};
    const names = (list) => (list || []).map((item) => item?.slot ? `${item.slot}:${item.name || '未穿戴'}` : (item?.name || item)).slice(0, 12).join('、') || '无';
    const base = [`性别${p.gender || v.gender || '未知'}`, `年龄${v.age ?? p.age ?? '未知'}`, `身份${p.role || p.job || state?.name || '未知'}`];
    if (v.level) base.push(`等级${v.level}`, `力量${v.strength}`, `敏捷${v.agility}`, `体质${v.constitution}`, `智力${v.intelligence}`, `感知${v.perception}`, `意志${v.willpower}`, `魅力${v.charisma}`);
    base.push(`穿着${names(v.wearing)}`, `物品${names(v.items)}`);
    if (v.intimacy?.bodyStatus) base.push(`身体状态${String(v.intimacy.bodyStatus).slice(0, 80)}`);
    return this.limit(base.join('｜'), 900);
  },

  companyNames(store) {
    const list = store.companyState?.companies || [];
    if (!list.length) return store.currentCompany?.()?.name || '';
    return list.map((item) => `${item.name}${item.id === store.companyState?.currentCompanyId ? '（当前）' : ''}`).join('、');
  },

  recentLog(store, limit = 3) {
    const rows = (store.realWorldLog || []).filter((entry) => entry.type !== 'system').slice(-limit);
    return rows.map((entry) => entry.type === 'user'
      ? `玩家行动：${entry.text}`
      : `地点：${entry.locationName || store.realWorldLocationName || '未知'}｜结果：${this.limit(entry.narration || entry.text || '', 260)}`).join('\n') || '暂无现实世界推演记录。';
  },

  worldlineRecordText(event = {}) {
    return [
      `记录编号：${event.eventId || event.id || '未知记录'}`,
      `时间：${event.time || '未知'}`,
      `标题：${event.name || '现实事件'}`,
      `情节：${event.plotId || event.summary || '未归纳'}`,
      `状态：${event.status || '已记录'}`,
      `详细：${String(event.detail || '').trim()}`,
    ].filter(Boolean).join('\n');
  },

  recentWorldlineRecords(store, targetChars = 5000, maxChars = 6000) {
    const line = store.realWorldline?.() || {};
    const events = (line.events || []).filter((event) => String(event.detail || '').trim());
    const picked = [];
    let total = 0;
    const separator = '\n\n---\n\n';
    for (const event of events.slice().reverse()) {
      const text = this.worldlineRecordText(event);
      const nextTotal = total + text.length + (picked.length ? separator.length : 0);
      if (nextTotal > maxChars) break;
      picked.push(text);
      total = nextTotal;
      if (total >= targetChars) break;
    }
    return picked.length ? picked.reverse().join(separator) : '暂无符合长度上限的最近世界线记录。';
  },

  buildLoadedText(items = []) {
    if (!items.length) return '本轮尚未动态载入额外资料。';
    return items.map((item, index) => `### 资料${index + 1}｜${item.title}\n${this.limit(item.text, item.max || 1600)}`).join('\n\n');
  },

  recentWorldline(store, limit = 800, separator = '\n') {
    return this.recentWorldlineRecords(store, limit, limit).split(/\n\n---\n\n/u).join(separator);
  },

  recentSummary(store, count = 4) {
    return this.recentLog(store, count);
  },

  materialHash(text = '') {
    let hash = 0;
    String(text || '').split('').forEach((char) => { hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0; });
    return `material-${Math.abs(hash).toString(36)}`;
  },

  materialStableId(item = {}, fallback = '') {
    const text = `${item.id || item.eventId || ''}\n${item.title || ''}\n${item.text || ''}\n${fallback || ''}`;
    const explicit = String(item.eventId || item.id || '').trim()
      || (text.match(/记录编号[:：]\s*([^\n\s]+)/u) || [])[1]
      || (text.match(/"eventId"\s*:\s*"([^"]+)"/u) || [])[1]
      || (text.match(/"id"\s*:\s*"([^"]+)"/u) || [])[1];
    return String(explicit || this.materialHash(text)).trim();
  },

  materialSimilarityText(text = '') {
    return String(text || '')
      .replace(/记录编号[:：][^\n]+/gu, '')
      .replace(/[\s"'“”‘’`.,，。！？!?:：；;、()[\]{}<>《》|｜\-—_+=~～\\/]+/gu, '')
      .slice(0, 1000);
  },

  materialSimilarity(a = '', b = '') {
    const left = this.materialSimilarityText(a);
    const right = this.materialSimilarityText(b);
    if (!left || !right) return 0;
    const leftHead = left.slice(0, Math.min(90, left.length));
    const rightHead = right.slice(0, Math.min(90, right.length));
    if ((leftHead.length > 40 && right.includes(leftHead)) || (rightHead.length > 40 && left.includes(rightHead))) return 1;
    const grams = (text) => {
      const out = new Set();
      for (let i = 0; i < text.length - 1; i += 1) out.add(text.slice(i, i + 2));
      return out;
    };
    const aSet = grams(left), bSet = grams(right);
    if (!aSet.size || !bSet.size) return 0;
    let hit = 0;
    aSet.forEach((gram) => { if (bSet.has(gram)) hit += 1; });
    return hit / Math.min(aSet.size, bSet.size);
  },

  recentWorldlineReferenceEvents(store = null) {
    const line = store?.realWorldline?.() || {};
    const picked = [];
    let total = 0;
    for (const event of (line.events || []).slice().reverse()) {
      const text = `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
      const nextTotal = total + text.length;
      if (nextTotal > 6000) break;
      picked.push(event);
      total = nextTotal;
      if (total >= 5000) break;
    }
    return picked;
  },

  materialReferenceCandidates(store = null, loaded = [], current = []) {
    const worldline = this.recentWorldlineReferenceEvents(store).map((event) => ({
      id: this.materialStableId(event),
      label: `${event.name || '世界线记录'}｜${event.time || '未知时间'}`,
      text: `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`,
    }));
    const dynamic = [...loaded, ...current].map((item, index) => ({
      id: this.materialStableId(item, `loaded-${index}`),
      label: item.title || `已载入资料${index + 1}`,
      text: item.text || '',
    }));
    return [...worldline, ...dynamic].filter((item) => item.id && this.materialSimilarityText(item.text).length > 40);
  },

  materialReferenceFor(text = '', refs = []) {
    const id = this.materialStableId({ text });
    return refs.find((ref) => ref.id === id || this.materialSimilarity(text, ref.text) >= 0.82) || null;
  },

  materialReferenceText(ref = null) {
    return ref ? `文本内容参照${ref.id}(唯一id)\n参照对象：${ref.label}` : '';
  },

  normalizeMaterialToken(value = '') {
    return String(value || '').trim().replace(/\s+/g, '');
  },

  normalizeMaterialWorld(value = '') {
    const token = this.normalizeMaterialToken(value || window.GameModules.realWorld2026?.label || '现实世界');
    if (!token || token === '现实世界') return this.normalizeMaterialToken(window.GameModules.realWorld2026?.label || '现实世界');
    return token;
  },

  materialRequestKey(skill = '', method = '', params = {}, materials = window.GameModules.realWorldMaterials) {
    const cleanSkill = String(skill || '').trim();
    const cleanMethod = String(method || '').trim();
    const p = params && typeof params === 'object' ? params : {};
    const world = this.normalizeMaterialWorld(p.world || p.worldTag);
    if (cleanSkill === 'character.query') {
      const name = this.normalizeMaterialToken(p.name || p.characterName || p.characterId || p.target || '');
      if (name && (/searchCharacterProfile|CurrentCharacterStatus/u.test(cleanMethod))) return `${cleanSkill}:characterProfile:${world}:${name}`;
    }
    if (cleanSkill === 'realworld.location.query') {
      const location = this.normalizeMaterialToken(p.locationName || p.name || p.keyword || '');
      if (location && /getLocationDetail|searchLocation/u.test(cleanMethod)) return `${cleanSkill}:location:${world}:${location}`;
      if (cleanMethod === 'getCurrentLocationContext') return `${cleanSkill}:currentLocation:${world || 'default'}`;
    }
    const req = { skill: cleanSkill, method: cleanMethod, params: p };
    return materials?.keyOf?.(req) || `${cleanSkill}:${cleanMethod}:${JSON.stringify(p)}`;
  },

  worldLabel() {
    return window.GameModules.realWorld2026?.label || '2026现代都市现实世界';
  },

  splitChineseRequestLine(line = '') {
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    return body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean);
  },

  guidedMaterialRequestCatalog(mode = 'real') {
    const world = () => this.worldLabel();
    return [
      { mode: 'both', category: '角色查询', action: '搜索角色卡', skill: 'character.query', method: 'searchCharacterProfile', buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '角色查询', action: '已知角色列表', skill: 'character.query', method: 'listKnownCharacters', buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '当前地点上下文', skill: 'realworld.location.query', method: 'getCurrentLocationContext', buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '查询附近地点', skill: 'realworld.location.query', method: 'getNearbyLocations', buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '地点查询', action: '搜索地点', skill: 'realworld.location.query', method: 'searchLocationOne', buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按关键词搜索', skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按时间搜索', skill: 'realworld.history.query', method: 'searchWorldlineByTime', buildParams: (p) => ({ time: p[0] || '', keyword: p[1] || '', world: p[2] || world() }) },
      { mode: 'both', category: '记忆查询', action: '搜索角色记忆窗口', skill: 'memory.query', method: 'searchCharacterMemoryWindow', buildParams: (p) => ({ characterId: p[0] || '', keyword: p[1] || '' }) },
      { mode: 'real', category: '微信查询', action: '联系人列表', skill: 'wechat.query', method: 'listContacts', buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '微信查询', action: '会话片段', skill: 'wechat.query', method: 'getThread', buildParams: (p) => ({ contactId: p[0] || '', count: Number(p[1]) || 5 }) },
      { mode: 'real', category: '公司查询', action: '工作上下文', skill: 'company.query', method: 'getWorkContext', buildParams: (p) => ({ companyName: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '搜索势力', skill: 'faction.query', method: 'searchFactionOne', buildParams: (p) => ({ keyword: p[0] || '' }) },
      { mode: 'both', category: '物品查询', action: '角色物品', skill: 'item.query', method: 'listCharacterItems', buildParams: (p) => ({ target: p[0] || '' }) },
      { mode: 'both', category: '物品查询', action: '搜索已知物品', skill: 'item.query', method: 'searchKnownItem', buildParams: (p) => ({ keyword: p[0] || '' }) },
    ];
  },

  stage1MaterialCatalogText(mode = 'real') {
    const lines = [];
    const seen = new Map();
    this.guidedMaterialRequestCatalog(mode).forEach((item) => {
      if (!(item.mode === 'both' || item.mode === mode)) return;
      const list = seen.get(item.category) || [];
      if (!list.includes(item.action)) list.push(item.action);
      seen.set(item.category, list);
    });
    seen.forEach((actions, category) => lines.push(`${category}：${actions.join('、')}`));
    return lines.join('\n') || '无可请求资料';
  },

  redactPromptPollution(text = '') {
    const banned = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|$)/gu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /正文必须[^\n]*/gu,
      /场景锚定报告[^\n]*/gu,
      /需严格跟着世界线续写[^\n]*/gu,
      /生日[^\n]*/gu,
      /具体地址：[^\n]*/gu,
      /财富[^\n]*/gu,
      /固定收入：[^\n]*/gu,
      /性经验次数：[^\n]*/gu,
      /父母去世原因：[^\n]*/gu,
      /世界观补全：暂无[^\n]*/gu,
      /势力资料库：[\s\S]*?暂无[^\n]*(?=\n|$)/gu,
      /全部情绪值：[^\n]*/gu,
      /全部对玩家感觉值：[^\n]*/gu,
      /全部穿着槽：[^\n]*/gu,
      /全部物品：[^\n]*/gu,
      /全部技能：[^\n]*/gu,
      /全部核心属性数值：[^\n]*/gu,
      /全部身体状态细项：[^\n]*/gu,
    ];
    const promptLeakLine = (line = '') => /final|role[- ]?card|RPG/iu.test(line)
      && /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|听见|看见|通信|微信|当前行动|当前状态|状态|标题|场景/u.test(line);
    return banned.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !promptLeakLine(line))
      .join('\n');
  },

  sanitizeLoadedTitle(title = '', index = 0) {
    const cleaned = this.redactPromptPollution(title || '').trim();
    const methodLike = /(^|[^\p{Script=Han}])(?:[a-z][\w-]*\.)+(?:[a-z][\w-]*)(?=$|[^\p{Script=Han}])/iu;
    const skillWords = /\b(?:skill|query|method)\b/iu;
    return cleaned && !methodLike.test(cleaned) && !skillWords.test(cleaned) ? cleaned : `资料${index + 1}`;
  },

  loadedRoutingSummary(items = []) {
    if (!items.length) return '无';
    return items.map((item, index) => {
      const title = this.sanitizeLoadedTitle(item?.title || '', index);
      const text = this.redactPromptPollution(item?.text || '');
      return `资料${index + 1}：${title}\n${this.limit(text, 260)}`;
    }).filter(Boolean).join('\n') || '无';
  },

  scheduleNameForId(store, id = '', entry = {}) {
    const state = store?.rpgStates?.[id] || window.GameModules.sqliteSave?.getCharacterState?.(id);
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
    const match = text.match(/(.{0,16}?(?:小区|公寓|宿舍|家|住宅|楼|栋|单元|号|室))/u);
    return String(match?.[1] || '').trim();
  },

  scheduleLocationsAdjacent(a = '', b = '') {
    const left = this.cleanScheduleLocation(a);
    const right = this.cleanScheduleLocation(b);
    if (!left || !right || this.unknownScheduleLocation(left) || this.unknownScheduleLocation(right)) return false;
    if (left === right) return false;
    if (left.includes(right) || right.includes(left)) return true;
    const leftKey = this.householdLocationKey(left);
    const rightKey = this.householdLocationKey(right);
    if (leftKey && rightKey && (leftKey.includes(rightKey) || rightKey.includes(leftKey) || leftKey === rightKey)) return true;
    const homeWords = /房间|卧室|客厅|厨房|走廊|卫生间|浴室|门口|家/u;
    return homeWords.test(left) && homeWords.test(right) && Boolean(leftKey || rightKey);
  },

  scheduleParticipantHints(store, action = '', currentLocation = '') {
    const schedules = store?.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {};
    const location = this.cleanScheduleLocation(currentLocation || store?.realWorldLocationName || store?.realWorldMap?.current || '');
    const hostArray = store?.constructor?.constructor?.('return Array')?.() || Array;
    const makeList = () => new hostArray();
    const out = { sameLocation: makeList(), nearbyLocation: makeList(), offstage: makeList(), unknown: makeList() };
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
    const cloneList = (items, limit) => {
      const list = makeList();
      items.slice(0, limit).forEach((item) => list.push(item));
      return list;
    };
    return {
      sameLocation: cloneList(out.sameLocation, 3),
      nearbyLocation: cloneList(out.nearbyLocation, Math.max(0, 3 - out.sameLocation.length)),
      offstage: cloneList(out.offstage, 5),
      unknown: cloneList(out.unknown, 5),
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

  buildStage1RoutingContext({ store, action, loaded = [], config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    const player = store?.playerName || store?.playerProfile?.name || '玩家';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前位置：${location}`,
      `当前时间：${time}`,
      `当前对象线索：${player}`,
      `已加载资料摘要：\n${this.loadedRoutingSummary(loaded)}`,
      `可请求资料目录：\n${this.stage1MaterialCatalogText(config?.mode || 'real')}`,
    ].join('\n');
  },

  loadedAnchorSummary(items = []) {
    if (!items.length) return '无';
    const anchorKeywords = /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|听见|看见|通信|微信|当前行动|当前状态/u;
    const pollutionKeywords = /全部情绪|全部对玩家感觉|全部穿着槽|全部物品|全部技能|全部核心属性数值|全部身体状态细项|性经验次数|财富|生日|父母去世|等级|力量|敏捷|体质|智力|感知|意志|魅力/u;
    const promptLeakLine = (line = '') => /final|role[- ]?card|RPG/iu.test(line) && anchorKeywords.test(line);
    const titlePollutionKeywords = /final|role[- ]?card|RPG|全部情绪|全部对玩家感觉|全部穿着槽|全部物品|全部技能|全部核心属性数值|全部身体状态细项|性经验次数|财富|生日|父母去世|等级|力量|敏捷|体质|智力|感知|意志|魅力/iu;
    const keepLine = (line = '') => anchorKeywords.test(line) && !pollutionKeywords.test(line) && !promptLeakLine(line);
    return items.map((item, index) => {
      const title = titlePollutionKeywords.test(item?.title || '') ? `资料${index + 1}` : this.sanitizeLoadedTitle(item?.title || '', index);
      const lines = this.redactPromptPollution(item?.text || '').split(/\r?\n/u).filter(keepLine).slice(0, 8);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), 420)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },

  redactNarrationPollution(text = '') {
    const removeBlocks = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /subject\.id 规则[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|\n## |$)/gu,
      /势力资料库：[\s\S]*?(?:暂无记录|暂无势力资料库记录。?)[^\n]*(?=\n|$)/gu,
      /需严格跟着世界线续写，保证正文对最新世界线连续性。?/gu,
      /文本内容参照material-[^\n]*/giu,
      /参照对象：[^\n]*/gu,
      /来源ID：[^\n]*/gu,
      /关键词查询：[^\n]*/gu,
      /除非玩家提出新的未知地点[^\n]*request_context[^\n]*/gu,
      /不要继续[^\n]*request_context[^\n]*/gu,
      /不要重复[^\n]*(?:资料请求|request_context)[^\n]*/gu,
      /资料请求\d*：[^\n]*/gu,
      /request_context[^\n]*/giu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /结算边界：[^\n]*/gu,
      /暂无记录。?/gu,
      /未填写/gu,
    ];
    const methodLike = /(^|[^\p{Script=Han}])(?:[a-z][\w-]*\.)+(?:[a-z][\w-]*)(?=$|[^\p{Script=Han}])/iu;
    const protocolLine = (line = '') => methodLike.test(line) || /\b(?:skill|query|method|Top3)\b/iu.test(line);
    return removeBlocks.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !protocolLine(line))
      .join('\n');
  },

  safeNarrationTitle(title = '', index = 0) {
    const cleaned = this.redactNarrationPollution(title || '').trim();
    return cleaned ? this.sanitizeLoadedTitle(cleaned, index) : `资料${index + 1}`;
  },

  loadedNarrationSummary(items = []) {
    if (!items.length) return '无';
    const factKeywords = /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|离开|等待|回应|听见|看见|可听见|可看见|通信|微信|事实|关系|历史|当前状态|当前行动|状态/u;
    const protocolKeywords = /文本内容参照|参照对象|关键词查询|资料请求|request_context|不要继续|不要重复|Top3|elapsedSeconds|subject\.id|主体ID规则|结算对象|类型完成|更新N|Skill：|激活条件|返回格式/u;
    return items.map((item, index) => {
      const title = this.safeNarrationTitle(item?.title || '', index);
      const lines = this.redactNarrationPollution(item?.text || '')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line && factKeywords.test(line) && !protocolKeywords.test(line))
        .slice(0, 10);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), 700)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },

  buildNarrationContext({ store, action, config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const recentWorldline = this.redactNarrationPollution(this.recentWorldline(store, 800, '\n'));
    const recent = this.redactNarrationPollution(this.recentSummary(store, 4));
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前地点：${store?.realWorldLocationName || map.current || '未知地点'}`,
      `当前场景：${store?.realWorldSceneTitle || '现实世界'}`,
      `当前时间提示：${[store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间'}`,
      `玩家可写资料：${store?.playerSetupSummary?.() || store?.playerName || '玩家'}`,
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
      `最近世界线摘要：\n${recentWorldline || '无'}`,
      `最近记录摘要：\n${recent || '无'}`,
    ].join('\n');
  },

  sceneParticipantBoundary(trace = []) {
    const items = Array.isArray(trace) ? trace : [];
    const mergeByName = (key) => {
      const seen = new Set();
      return items.flatMap((item) => Array.isArray(item?.[key]) ? item[key] : []).filter((item) => {
        const name = String(item?.name || item?.idOrName || item?.id || item?.characterName || '').trim();
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      });
    };
    const names = (group = [], label = '理由') => group.map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${label}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = items.flatMap((item) => item.randomActiveEvents || []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '场外事件'}｜${item.motivation || ''}`).join('；') || '无';
    const latestCondition = [...items].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入';
    return [
      `强制出场：${names(mergeByName('forcedParticipants'), '出场理由')}`,
      `高优先候选：${names(mergeByName('priorityCandidates'), '候选理由')}`,
      `戏剧候选：${names(mergeByName('dramaCandidates'), '候选理由')}`,
      `禁止出场：${names(mergeByName('forbiddenParticipants'), '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${latestCondition}`,
    ].join('\n');
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || store?.realWorldSceneTitle || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前场景位置：${location}`,
      `当前时间提示：${time}`,
      `空间边界线索：仅保留门口、房间、走廊、相邻空间、可听见/可看见/可进入条件。`,
      `参与者边界：\n${this.sceneParticipantBoundary(trace)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
    ].join('\n');
  },

  parseChineseMaterialRequest(line = '', options = {}) {
    const mode = options.mode || 'real';
    const parts = this.splitChineseRequestLine(line);
    if (parts.length < 2) return null;
    let [category, action, ...params] = parts;
    if (category === '地点查询' && /^查询[^附近]/u.test(action)) {
      params = [action.replace(/^查询/u, '').trim(), ...params];
      action = '搜索地点';
    }
    const entry = this.guidedMaterialRequestCatalog(mode).find((item) => (item.mode === 'both' || item.mode === mode) && item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, options);
    if (Object.values(built).some((value) => value === '')) return null;
    return { skill: entry.skill, method: entry.method, params: built, sourceText: String(line || '').trim() };
  },

  participantProfileRequests(data = {}) {
    const forbidden = new Set((data.forbiddenParticipants || []).map((item) => String(item?.name || item || '').trim()).filter(Boolean));
    const seen = new Set();
    const requests = [];
    const add = (items = []) => {
      for (const item of items || []) {
        const name = String(item?.name || item || '').trim();
        if (!name || forbidden.has(name) || seen.has(name) || requests.length >= 3) continue;
        seen.add(name);
        requests.push({ skill: 'character.query', method: 'searchCharacterProfile', params: { name, world: this.worldLabel() } });
      }
    };
    add(data.forcedParticipants);
    add(data.priorityCandidates);
    add(data.dramaCandidates);
    return requests;
  },

  sceneAnchorRequests(data = {}) {
    const queries = data.sceneQueries || {};
    const requests = [{ skill: 'realworld.location.query', method: 'getCurrentLocationContext', params: { world: this.worldLabel() } }];
    (queries.location || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'realworld.location.query', method: 'searchLocationOne', params: { keyword: text, world: this.worldLabel() } });
    });
    (queries.causality || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', params: { keyword: text, world: this.worldLabel() } });
    });
    (queries.conflict || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'memory.query', method: 'searchCharacterMemoryWindow', params: { characterId: '', keyword: text } });
    });
    return requests.slice(0, 4);
  },

  randomActiveEventCandidates(store, action = '', options = {}) {
    const blocked = new Set([...(options.blockedNames || []), ...String(action || '').match(/[\p{Script=Han}A-Za-z0-9_]{2,}/gu) || []]);
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      (Array.isArray(options[key]) ? options[key] : []).forEach((item) => {
        const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || item || '').trim();
        if (name) blocked.add(name);
      });
    });
    const states = [...Object.values(store?.rpgStates || {}), ...(window.GameModules.sqliteSave.listCharacterStates?.() || [])];
    const seen = new Set();
    return states.map((state) => ({ id: state.id || state.profile?.name || state.name, name: state.profile?.name || state.name }))
      .filter((item) => item.name && !blocked.has(item.name) && !seen.has(item.name) && seen.add(item.name))
      .slice(0, 3);
  },

  async autoLoadForStep(store, action = '', loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials, memoryIds = new Set(), step = 1, loaded = [], current = []) {
    if (step !== 1) return [];
    const actionText = String(action || '');
    const states = [...Object.values(store?.rpgStates || {}), ...(window.GameModules.sqliteSave.listCharacterStates?.() || [])];
    const seen = new Set();
    const hits = states.filter((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      const id = String(state?.id || '').trim();
      const key = id || name;
      if (!name || seen.has(key) || !actionText.includes(name)) return false;
      seen.add(key);
      return window.GameModules.characterQuery?.worldMatches?.(window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', state.worldTag || state.profile?.work);
    }).slice(0, 3);
    const out = [];
    for (const state of hits) {
      const name = state.profile?.name || state.name;
      const req = { skill: 'character.query', method: 'searchCharacterProfile', params: { name, world: window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', auto: true } };
      const key = this.materialRequestKey(req.skill, req.method, req.params, materials);
      if (loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const text = window.GameModules.characterQuery?.stateText?.(state, req.params.world, 3200) || '';
      if (!text) continue;
      materials?.record?.(materialSession, req, `自动资料：${name}角色卡`, text);
      out.push({ title: `自动资料：${name}角色卡`, text, max: 3200, participants: [{ type: 'character', id: state.id || name, name, role: 'loaded-role-card' }] });
    }
    return out;
  },

  async skillText() {
    const ids = ['emotion.feeling.wearing.assess', 'memory.query', 'character.query', 'past.event.query', 'company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query', 'lexicon.query', 'item.query', 'wechat.query', 'wechat.message.incoming', 'realworld.vitals.adjust'];
    const texts = await Promise.all(ids.map((id) => window.GameModules.skillLoader?.instruction?.(id) || ''));
    const crossWorld = ['# 跨世界资料查询', '每个 request.params 可写 world/worldTag 指定资料所属世界；默认现实世界。需要作品/异世界资料时写作品名，并用 worklore.query 查询。', window.GameModules.workLoreMaterials?.skillText?.() || ''].filter(Boolean).join('\n');
    return [crossWorld, ...texts.filter(Boolean)].join('\n\n');
  },

  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials, memoryIds = new Set(), loaded = [], current = [], options = {}) {
    const out = [];
    for (const req of requests.slice(0, options.limit || 3)) {
      const skill = String(req?.skill || '').trim();
      const method = String(req?.method || '').trim();
      const params = req?.params && typeof req.params === 'object' ? req.params : {};
      const key = this.materialRequestKey(skill, method, params, materials);
      if (!skill || !method || loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const material = materials?.optionFor?.({ skill, method, params });
      const max = material?.maxChars || this.maxFor(skill);
      const text = await this.dispatch(store, action, skill, method, { ...params, maxChars: max });
      if (text) {
        const title = `${skill}.${method}`;
        const ref = this.materialReferenceFor(text, this.materialReferenceCandidates(store, loaded, [...current, ...out]));
        const finalText = ref ? this.materialReferenceText(ref) : text;
        materials?.record?.(materialSession, { skill, method, params }, title, finalText);
        out.push({ title, text: finalText, max: ref ? 260 : max, referenceId: ref?.id });
      }
    }
    return out;
  },

  maxFor(skill) {
    if (skill === 'past.event.query') return 5200;
    if (skill === 'character.query') return 3200;
    if (skill === 'realworld.location.query') return 1500;
    if (skill === 'memory.query') return 1600;
    if (skill === 'realworld.history.query') return 1800;
    if (skill === 'company.query') return 1400;
    if (skill === 'faction.query') return 1600;
    if (skill === 'worklore.query') return 1800;
    if (skill === 'lexicon.query') return 1200;
    return 1000;
  },

  unsupportedMaterialText(skill = '', method = '') {
    const allowed = ['company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query', 'memory.query', 'character.query', 'past.event.query', 'lexicon.query', 'item.query', 'wechat.query', 'worklore.query'];
    return [
      `资料请求未执行：${skill || '未知 skill'}.${method || '未知 method'} 不是当前资料阶段可用 skill。`,
      `可用 skill：${allowed.join('、')}。`,
      '请基于已载入资料判断是否足够；只有缺口会直接改变本次行动结果时，才改用当前资料清单中的可用 skill 重新请求。',
    ].join('\n');
  },

  async dispatch(store, action, skill, method, params) {
    if (skill === 'company.query') return this.company(store, method, params);
    if (skill === 'faction.query') return this.faction(store, method, params);
    if (skill === 'realworld.location.query') return this.location(store, method, params, action);
    if (skill === 'realworld.history.query') return this.history(store, method, params);
    if (skill === 'memory.query') return await this.memory(store, action, method, params);
    if (skill === 'character.query') return window.GameModules.characterQuery?.query?.(store, method, params) || '';
    if (skill === 'past.event.query') return window.GameModules.pastEventQuery?.query?.(store, method, { question: action, ...params }) || '';
    if (skill === 'lexicon.query') return await this.lexicon(store, method, params);
    if (skill === 'item.query') return await this.itemQuery(store, method, params);
    if (skill === 'wechat.query') return window.GameModules.realWorldAgentWechat?.wechat?.(store, method, params) || '';
    if (skill === 'worklore.query') return await window.GameModules.workLoreQuery?.dispatch?.(store, action, method, params) || '';
    return this.unsupportedMaterialText(skill, method);
  },

  company(store, method, params = {}) {
    const current = store.currentCompany?.();
    const list = store.companyState?.companies || (current ? [current] : []);
    const keyword = String(params.keyword || params.companyName || params.name || '').trim();
    if (method === 'listPlayerCompanies') return list.map((c) => `- ${c.name}：${c.type || '组织'}｜${c.industry || '行业未知'}｜${c.location || '地点未知'}`).join('\n') || '暂无公司。';
    const company = list.find((c) => !keyword || c.name.includes(keyword)) || current || list[0];
    if (!company) return '暂无公司资料。';
    if (method === 'searchCompany' && keyword && !JSON.stringify(company).includes(keyword)) return '未命中公司资料。';
    if (method === 'getWorkContext') return this.workContext(store, company);
    return this.companySummary(store, company);
  },

  companySummary(store, company = {}) {
    const work = company.workMode || {};
    const salary = company.salary || {};
    const org = (company.organization || []).slice(0, 4).map((d) => `${d.name}：${(d.jobs || []).map((j) => `${j.title}(${(j.people || []).join('、')})`).join('；')}`).join('\n');
    return [`公司：${company.name}`, `类型/行业：${company.type || '未知'}｜${company.industry || '未知'}`, `地点：${company.location || '未知'}`, `规模：${company.scale || '未知'}`, `制度：${work.type || '员工'}｜${work.workDays || ''}｜${work.startTime || ''}-${work.endTime || ''}`, `薪资：${salary.monthlyBase || 0}${salary.currency || 'CNY'}｜绩效${salary.performanceMonths || 0}个月`, `组织：\n${org || '暂无组织架构。'}`, `规则：${(company.rules || []).join('；') || '暂无规则。'}`].join('\n');
  },

  workContext(store, company = {}) {
    const stats = store.companyState?.workStats || {};
    const pay = store.monthlyPayPreview?.() || {};
    return [this.companySummary(store, company), `本月状态：迟到${stats.lateCount || 0}次｜旷班${stats.absentCount || 0}次｜绩效${stats.performance ?? 100}/100`, `收入预估：底薪${pay.base || 0}｜日薪${pay.daily || 0}｜本月完整上班${pay.workDays || 0}天`].join('\n');
  },

  location(store, method, params = {}) {
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const keyword = String(params.keyword || params.locationName || params.name || '').trim();
    if (method === 'getCurrentLocationContext') return this.locationDetail(map, map.current || store.realWorldLocationName);
    if (method === 'getNearbyLocations') return this.nearby(map, keyword || map.current);
    if (method === 'listTopLocations') return this.topLocations(map);
    if (method === 'searchLocation') return this.searchLocation(map, keyword);
    return this.locationDetail(map, keyword || map.current);
  },

  locationDetail(map, name = '') {
    const node = (map.nodes || []).find((item) => item.name === name || item.id === name) || (map.nodes || [])[0];
    if (!node) return '暂无地点资料。';
    const parent = (map.nodes || []).find((item) => item.id === node.parentId)?.name || '无';
    const children = (map.nodes || []).filter((item) => item.parentId === node.id).map((item) => item.name).join('、') || '无';
    const facts = (node.descriptionFacts || []).map((fact, i) => window.GameModules.realWorldMapFacts.formatFact(fact, i)).join('') || node.description || '暂无说明。';
    return `地点：${node.name}\n上级地点：${parent}\n子地点：${children}\n说明：${facts}`;
  },

  searchLocation(map, keyword = '') {
    if (!keyword) return this.topLocations(map);
    const hits = (map.nodes || []).filter((node) => `${node.name} ${node.description || ''} ${JSON.stringify(node.descriptionFacts || [])}`.includes(keyword)).slice(0, 8);
    return hits.map((node) => this.locationDetail(map, node.name)).join('\n\n') || '未命中地点。';
  },

  nearby(map, name = '') {
    const node = (map.nodes || []).find((item) => item.name === name) || (map.nodes || [])[0];
    if (!node) return '暂无附近地点。';
    const rows = (map.nodes || []).filter((item) => item.parentId === node.parentId || item.parentId === node.id || item.id === node.parentId).slice(0, 10);
    return rows.map((item) => `- ${item.name}${item.id === node.id ? '（当前）' : ''}`).join('\n') || '暂无附近地点。';
  },

  topLocations(map) {
    return (map.nodes || []).filter((node) => !node.parentId).slice(0, 12).map((node) => `- ${node.name}`).join('\n') || '暂无顶层地点。';
  },

  async memory(store, action, method, params = {}) {
    const keyword = String(params.keyword || action || '').trim();
    if (method === 'searchMemoryArchive') return await store.searchMemoryArchive?.('player-self', keyword) || '未命中记忆归档。';
    if (method === 'getCharacterMemory') return this.limit(store.getCharacterMemory?.('player-self') || '', 1600);
    return store.searchCharacterMemory?.('player-self', keyword) || store.memoryQueryContext?.('player-self', keyword) || '未命中相关记忆。';
  },
};
