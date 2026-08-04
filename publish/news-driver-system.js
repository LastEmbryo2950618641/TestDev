window.GameModules = window.GameModules || {};

window.GameModules.newsDriverSystem = {
  CHANNELS: [
    { id: 'gov-region', label: '政务地区', shortLabel: '政务', tone: '公共事务、政策、地区治理、国际关系' },
    { id: 'society-law', label: '社会法治', shortLabel: '社会', tone: '治安、案件、监管、公共安全、社会舆论' },
    { id: 'finance-business', label: '财经商业', shortLabel: '财经', tone: '市场、消费、就业、公司、行业趋势' },
    { id: 'tech-science', label: '科技科学', shortLabel: '科技', tone: 'AI、互联网、硬件、科研、航天、数据安全' },
    { id: 'health-medical', label: '健康医疗', shortLabel: '健康', tone: '医院、疾病、药品、心理健康、公共卫生' },
    { id: 'environment-weather', label: '环境天气', shortLabel: '天气', tone: '天气、灾害、污染、停电、环境变化' },
    { id: 'culture-entertainment', label: '文娱影视', shortLabel: '文娱', tone: '影视、音乐、演出、明星、粉圈、票房' },
    { id: 'sports-events', label: '体育赛事', shortLabel: '体育', tone: '职业联赛、电竞赛事、校赛、健身与城市赛事' },
    { id: 'bilibili-community', label: 'B站社区', shortLabel: 'B站', tone: 'UP 主、直播、二创、弹幕梗、平台规则、社区争议' },
    { id: 'games-anime', label: '游戏二次元', shortLabel: '游戏', tone: '游戏、番剧、漫画、虚拟偶像、漫展、玩家社区' },
    { id: 'education-campus', label: '教育校园', shortLabel: '校园', tone: '考试、学校、社团、竞赛、招生、校园生活' },
    { id: 'career-jobs', label: '职场招聘', shortLabel: '职场', tone: '岗位、面试、劳动关系、办公室变化、职业机会' },
    { id: 'local-life', label: '本地生活', shortLabel: '本地', tone: '商超、交通、租房、餐饮、服装店、社区服务' },
    { id: 'military-security', label: '军事安全', shortLabel: '安全', tone: '战争、军警、安全组织、边境、武装冲突' },
    { id: 'faction-organization', label: '势力组织', shortLabel: '势力', tone: '公司、学校、社团、家族、帮派、教会、异能组织、政体变化' },
  ],
  SCOPES: ['global', 'national', 'city', 'local', 'org', 'community'],
  SCOPE_LABELS: {
    global: '全球',
    national: '国家',
    city: '城市',
    local: '本地',
    org: '组织',
    community: '社区',
  },
  TASK_POTENTIALS: ['none', 'soft', 'strong'],
  TASK_LABELS: { none: '背景', soft: '可成话题', strong: '可驱动任务' },
  TRENDS: ['new', 'up', 'down', 'stable'],
  TREND_LABELS: { new: '新上榜', up: '上升', down: '下降', stable: '稳定' },
  MAX_ITEMS_PER_CHANNEL: 20,
  MAX_RECENT_OPS: 30,

  channelIds() {
    return new Set(this.CHANNELS.map((item) => item.id));
  },

  channelById(id = '') {
    const key = String(id || '').trim();
    return this.CHANNELS.find((item) => item.id === key) || null;
  },

  channelLabel(id = '') {
    return this.channelById(id)?.label || '未知频道';
  },

  defaultState() {
    return {
      open: false,
      enabled: true,
      channelId: 'all',
      filter: 'all',
      selectedId: '',
      lastTickAt: '',
      lastAiSettlementAt: '',
      message: '',
      channels: this.CHANNELS.map((item) => ({ ...item })),
      items: [],
      promotedEventIds: [],
      recentOps: [],
    };
  },

  nowIso(store = null) {
    const value = store?.phoneDate?.();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    return new Date().toISOString();
  },

  makeId(prefix = 'news') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },

  clampNumber(value, min = 0, max = 100, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  },

  splitList(value = '') {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
    return String(value || '').split(/[、,，;；\n]/u).map((item) => item.trim()).filter(Boolean);
  },

  normalizeScope(value = '') {
    const raw = String(value || '').trim().toLowerCase();
    const cn = {
      全球: 'global',
      国际: 'global',
      国家: 'national',
      全国: 'national',
      城市: 'city',
      本地: 'local',
      地区: 'local',
      组织: 'org',
      势力: 'org',
      社区: 'community',
      圈层: 'community',
    };
    const scope = cn[raw] || raw;
    return this.SCOPES.includes(scope) ? scope : 'national';
  },

  normalizeTaskPotential(value = '') {
    const raw = String(value || '').trim().toLowerCase();
    const cn = { 无: 'none', 背景: 'none', 弱: 'soft', 软: 'soft', 话题: 'soft', 强: 'strong', 任务: 'strong' };
    const next = cn[raw] || raw;
    return this.TASK_POTENTIALS.includes(next) ? next : 'none';
  },

  normalizeTrend(value = '') {
    const raw = String(value || '').trim().toLowerCase();
    const cn = { 新: 'new', 新上榜: 'new', 上升: 'up', 下降: 'down', 稳定: 'stable' };
    const next = cn[raw] || raw;
    return this.TRENDS.includes(next) ? next : 'stable';
  },

  normalizeNewsItem(raw = {}, options = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const channelId = String(raw.channelId || raw.primaryChannelId || raw.channel || '').trim();
    if (!this.channelById(channelId)) return null;
    const title = String(raw.title || raw.name || '').trim().slice(0, 80);
    const summary = String(raw.summary || raw.content || raw.detail || '').trim().slice(0, 520);
    const tags = this.splitList(raw.tags || raw.tagText).slice(0, 5).map((item) => item.slice(0, 18));
    if (options.requireContent !== false && (!title || !summary || !tags.length)) return null;
    const source = String(raw.source || options.source || 'system').trim().slice(0, 24);
    const now = String(options.nowIso || raw.updatedAt || raw.createdAt || new Date().toISOString());
    const id = String(raw.id || '').trim() || this.makeId('news');
    const secondary = this.splitList(raw.secondaryChannelIds || raw.secondaryChannels)
      .filter((item) => item !== channelId && this.channelById(item))
      .slice(0, 3);
    return {
      id,
      channelId,
      title: title || '未命名新闻',
      summary: summary || '暂无摘要。',
      tags,
      scope: this.normalizeScope(raw.scope || raw.sourceScope),
      secondaryChannelIds: secondary,
      location: String(raw.location || raw.place || '').trim().slice(0, 40),
      orgName: String(raw.orgName || raw.organization || raw.factionName || '').trim().slice(0, 40),
      heat: this.clampNumber(raw.heat ?? raw.score ?? 50, 0, 100, 50),
      rank: Math.max(1, Math.round(Number(raw.rank) || 1)),
      rankReason: String(raw.rankReason || raw.reasonForRank || raw.reason || '').trim().slice(0, 240),
      trend: this.normalizeTrend(raw.trend || (raw.isNew ? 'new' : 'stable')),
      taskPotential: this.normalizeTaskPotential(raw.taskPotential),
      behaviorHooks: this.splitList(raw.behaviorHooks || raw.hooks || raw.behaviors).slice(0, 8).map((item) => item.slice(0, 18)),
      source,
      sourceLogId: String(raw.sourceLogId || options.sourceLogId || '').trim().slice(0, 120),
      startsAt: String(raw.startsAt || raw.startAt || raw.createdAt || now),
      expiresAt: String(raw.expiresAt || raw.endAt || this.defaultExpiry(now, raw.scope || raw.sourceScope)),
      status: String(raw.status || 'active') === 'expired' ? 'expired' : 'active',
      placeholder: raw.placeholder === true || source === 'placeholder',
      createdAt: String(raw.createdAt || now),
      updatedAt: now,
    };
  },

  defaultExpiry(nowIso = new Date().toISOString(), scope = '') {
    const base = Date.parse(nowIso);
    const now = Number.isFinite(base) ? base : Date.now();
    const normalized = this.normalizeScope(scope);
    const hours = normalized === 'local' || normalized === 'community' ? 36 : (normalized === 'org' ? 72 : 120);
    return new Date(now + hours * 3600 * 1000).toISOString();
  },

  newsDateLabel(nowIso = new Date().toISOString()) {
    const date = new Date(nowIso);
    if (Number.isNaN(date.getTime())) return '今日';
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  ensureBaselineMinimum(state = {}, store = null, nowIso = this.nowIso(store), minPerChannel = 5) {
    const next = this.normalizeState(state);
    const baseline = this.baselineItems(store, nowIso);
    const list = (next.items || []).filter((item) => {
      const isLegacySeed = !item.placeholder && item.source === 'system';
      return !isLegacySeed;
    });
    this.CHANNELS.forEach((channel) => {
      const activeCount = list.filter((item) => item.channelId === channel.id && item.status !== 'expired').length;
      if (activeCount >= minPerChannel) return;
      const existingKeys = new Set(list.map((item) => `${item.channelId}::${item.title}`));
      baseline
        .filter((item) => item.channelId === channel.id && !existingKeys.has(`${item.channelId}::${item.title}`))
        .slice(0, minPerChannel - activeCount)
        .forEach((item) => list.push(item));
    });
    next.items = this.rankItems(list);
    return next;
  },

  normalizeState(state = {}) {
    const base = this.defaultState();
    const merged = { ...base, ...(state || {}) };
    merged.channels = this.CHANNELS.map((item) => ({ ...item }));
    merged.channelId = merged.channelId === 'all' || this.channelById(merged.channelId) ? merged.channelId : 'all';
    merged.filter = ['all', 'local', 'org', 'hot', 'task'].includes(String(merged.filter || 'all')) ? merged.filter : 'all';
    merged.items = this.rankItems((Array.isArray(merged.items) ? merged.items : [])
      .map((item) => this.normalizeNewsItem(item, { requireContent: false }))
      .filter(Boolean));
    merged.promotedEventIds = Array.isArray(merged.promotedEventIds) ? [...new Set(merged.promotedEventIds.map(String))] : [];
    merged.recentOps = Array.isArray(merged.recentOps) ? merged.recentOps.slice(-this.MAX_RECENT_OPS) : [];
    return merged;
  },

  rankItems(items = []) {
    const normalized = (Array.isArray(items) ? items : []).filter(Boolean);
    const byChannel = new Map();
    normalized.forEach((item) => {
      if (!byChannel.has(item.channelId)) byChannel.set(item.channelId, []);
      byChannel.get(item.channelId).push(item);
    });
    const ranked = [];
    byChannel.forEach((list) => {
      list
        .sort((a, b) => (Number(b.heat) || 0) - (Number(a.heat) || 0) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .slice(0, this.MAX_ITEMS_PER_CHANNEL)
        .forEach((item, index) => ranked.push({ ...item, rank: index + 1 }));
    });
    return ranked.sort((a, b) => String(a.channelId).localeCompare(String(b.channelId)) || a.rank - b.rank);
  },

  decayItems(items = [], elapsedSeconds = 0, nowIso = new Date().toISOString()) {
    const hours = Math.max(0, Number(elapsedSeconds) || 0) / 3600;
    const nowMs = Date.parse(nowIso);
    return this.rankItems((Array.isArray(items) ? items : []).map((item) => {
      const expires = Date.parse(item.expiresAt || '');
      const expired = Number.isFinite(expires) && Number.isFinite(nowMs) && expires <= nowMs;
      const decay = Math.max(0, Math.floor(hours / 3));
      return {
        ...item,
        status: expired ? 'expired' : item.status,
        heat: expired ? Math.max(0, (Number(item.heat) || 0) - 15) : Math.max(0, (Number(item.heat) || 0) - decay),
        trend: expired ? 'down' : ((Number(item.heat) || 0) - decay < (Number(item.heat) || 0) ? 'down' : item.trend),
        updatedAt: expired ? nowIso : item.updatedAt,
      };
    }));
  },

  baselineItems(store = null, nowIso = this.nowIso(store)) {
    const rows = this.unknownBaselineRows(nowIso);
    return rows.map(([channelId, title, summary, tags, scope, locationValue, taskPotential, heat, rankReason, orgValue]) => this.normalizeNewsItem({
      channelId,
      title,
      summary,
      tags,
      scope,
      location: ['local', 'city', 'community'].includes(scope) ? locationValue : '',
      orgName: scope === 'org' ? orgValue : '',
      heat,
      rankReason,
      taskPotential,
      trend: 'stable',
      behaviorHooks: [],
      source: 'system',
      placeholder: true,
    }, { nowIso, requireConcrete: false })).filter(Boolean);
  },

  unknownBaselineRows(nowIso = this.nowIso()) {
    const now = String(nowIso || new Date().toISOString());
    return this.CHANNELS.flatMap((channel) => Array.from({ length: 5 }, (_, index) => [
      channel.id,
      '未知',
      '未知',
      ['未知'],
      'national',
      '',
      'none',
      0,
      '未知',
      '',
      now,
      index + 1,
    ]));
  },

  defaultBehaviorHooks(scope = 'national', taskPotential = 'none') {
    if (taskPotential === 'strong' && ['local', 'city'].includes(this.normalizeScope(scope))) return ['查路线', '出门处理', '分享话题'];
    if (taskPotential === 'soft') return ['刷手机', '分享话题', '闲聊提及'];
    return ['浏览新闻'];
  },

  replacementSlot(list = [], channelId = '') {
    const rows = (Array.isArray(list) ? list : [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item?.channelId === channelId);
    const vacancy = rows.find(({ item }) => item.placeholder || item.title === '未知');
    if (vacancy) return { ...vacancy, kind: 'placeholder' };
    const expired = rows
      .filter(({ item }) => item.status === 'expired')
      .sort((left, right) => (Number(left.item.heat) || 0) - (Number(right.item.heat) || 0))[0];
    if (expired) return { ...expired, kind: 'expired' };
    const active = rows.filter(({ item }) => item.status !== 'expired');
    if (active.length < this.MAX_ITEMS_PER_CHANNEL) return { index: -1, item: null, kind: 'empty' };
    const lowest = active.sort((left, right) => (
      (Number(left.item.heat) || 0) - (Number(right.item.heat) || 0)
      || String(left.item.updatedAt || '').localeCompare(String(right.item.updatedAt || ''))
    ))[0];
    return lowest ? { ...lowest, kind: 'lowest-heat' } : { index: -1, item: null, kind: 'empty' };
  },

  applyOps(state = {}, ops = [], options = {}) {
    const nowIso = options.nowIso || new Date().toISOString();
    const next = this.normalizeState(state);
    const applied = [];
    const promoted = [];
    const list = [...next.items];
    (Array.isArray(ops) ? ops : []).slice(0, 20).forEach((opRaw) => {
      if (!opRaw || typeof opRaw !== 'object') return;
      const op = String(opRaw.op || opRaw.method || '').trim();
      if (op === 'bump') {
        const id = String(opRaw.id || '').trim();
        const index = list.findIndex((item) => item.id === id);
        if (index < 0) return;
        const delta = this.clampNumber(opRaw.deltaHeat, -50, 50, 0);
        const oldHeat = list[index].heat;
        list[index] = { ...list[index], heat: this.clampNumber(oldHeat + delta, 0, 100, oldHeat), trend: delta > 0 ? 'up' : (delta < 0 ? 'down' : list[index].trend), updatedAt: nowIso };
        applied.push(this.opRecord('bump', opRaw, nowIso));
        return;
      }
      if (op === 'expire') {
        const id = String(opRaw.id || '').trim();
        const index = list.findIndex((item) => item.id === id);
        if (index < 0) return;
        list[index] = { ...list[index], status: 'expired', heat: Math.max(0, (Number(list[index].heat) || 0) - 20), trend: 'down', updatedAt: nowIso };
        applied.push(this.opRecord('expire', opRaw, nowIso));
        return;
      }
      if (op === 'replace') {
        const channelId = String(opRaw.channelId || opRaw.item?.channelId || '').trim();
        if (!this.channelById(channelId)) return;
        const item = this.normalizeNewsItem({ ...opRaw.item, channelId, source: 'ai' }, { nowIso, source: 'ai', sourceLogId: options.logId || '' });
        if (!item) return;
        const replacement = { ...item, id: this.makeId('news'), rank: 1, createdAt: nowIso, updatedAt: nowIso };
        const slot = this.replacementSlot(list, channelId);
        if (slot.index >= 0) list[slot.index] = replacement;
        else list.push(replacement);
        applied.push({
          ...this.opRecord('replace', opRaw, nowIso),
          replacedId: slot.item?.id || '',
          placement: slot.kind,
        });
        return;
      }
      if (op === 'promoteToEvent') {
        const id = String(opRaw.id || '').trim();
        const item = list.find((entry) => entry.id === id && entry.status !== 'expired');
        if (!item || next.promotedEventIds.includes(id)) return;
        promoted.push({ item, reason: String(opRaw.reason || '').slice(0, 160) });
        next.promotedEventIds.push(id);
        applied.push(this.opRecord('promoteToEvent', opRaw, nowIso));
      }
    });
    next.items = this.rankItems(list);
    next.recentOps = [...(next.recentOps || []), ...applied].slice(-this.MAX_RECENT_OPS);
    next.promotedEventIds = [...new Set(next.promotedEventIds)].slice(-200);
    return { state: next, applied, promoted };
  },

  opRecord(op = '', raw = {}, at = new Date().toISOString()) {
    return {
      op,
      id: String(raw.id || raw.targetId || '').slice(0, 80),
      channelId: String(raw.channelId || raw.item?.channelId || '').slice(0, 40),
      title: String(raw.item?.title || raw.title || '').slice(0, 80),
      reason: String(raw.reason || '').slice(0, 180),
      at,
    };
  },

  filterItems(state = {}, channelId = 'all', filter = 'all') {
    const normalized = this.normalizeState(state);
    return (normalized.items || [])
      .filter((item) => item.status !== 'expired')
      .filter((item) => channelId === 'all' || item.channelId === channelId)
      .filter((item) => {
        if (filter === 'local') return ['city', 'local', 'community'].includes(item.scope);
        if (filter === 'org') return item.scope === 'org' || item.orgName;
        if (filter === 'hot') return (Number(item.heat) || 0) >= 70;
        if (filter === 'task') return item.taskPotential === 'strong';
        return true;
      })
      .sort((a, b) => (channelId === 'all' ? (Number(b.heat) || 0) - (Number(a.heat) || 0) : a.rank - b.rank));
  },

  promptItems(state = {}, options = {}) {
    const limit = Math.max(3, Math.min(24, Number(options.limit) || 14));
    const active = this.filterItems(state, 'all', 'all');
    const high = active.filter((item) => (Number(item.heat) || 0) >= 70);
    const task = active.filter((item) => item.taskPotential === 'strong');
    const local = active.filter((item) => ['city', 'local', 'community', 'org'].includes(item.scope));
    const byId = new Map([...task, ...local, ...high, ...active].map((item) => [item.id, item]));
    return [...byId.values()].slice(0, limit);
  },

  promptLine(item = {}) {
    return [
      `#${item.rank || '?'} ${this.channelLabel(item.channelId)}｜${item.title}`,
      `热度:${item.heat}`,
      `范围:${this.SCOPE_LABELS[item.scope] || item.scope}`,
      item.location ? `地点:${item.location}` : '',
      item.orgName ? `组织:${item.orgName}` : '',
      `标签:${(item.tags || []).join('、') || '无'}`,
      `任务潜力:${this.TASK_LABELS[item.taskPotential] || item.taskPotential}`,
      item.behaviorHooks?.length ? `可触发行为:${item.behaviorHooks.join('、')}` : '',
      `摘要:${item.summary || '无'}`,
    ].filter(Boolean).join('；');
  },

  formatPromptContext(state = {}, options = {}) {
    const items = this.promptItems(state, options);
    if (!items.length) return '';
    return [
      '## 世界新闻热榜（News Driver）',
      ...items.map((item, index) => `${index + 1}. ${this.promptLine(item)}`),
    ].join('\n');
  },

  promoteToEventPayload(news = {}, meta = {}) {
    const item = this.normalizeNewsItem(news, { requireContent: false });
    if (!item) return null;
    const today = String(meta.date || item.startsAt || new Date().toISOString()).slice(0, 10);
    const endDate = String(item.expiresAt || item.startsAt || today).slice(0, 10);
    return {
      id: `news-event:${item.id}`,
      type: 'inference',
      title: item.title,
      content: item.summary,
      startDate: today,
      endDate: endDate < today ? today : endDate,
      location: item.location,
      people: ['所有人'],
      tags: [...(item.tags || []), '新闻驱动', this.channelLabel(item.channelId)].slice(0, 10),
      source: 'news-driver',
      sourceLogId: meta.logId || item.sourceLogId || '',
      status: this.TASK_LABELS[item.taskPotential] || '',
    };
  },
};
