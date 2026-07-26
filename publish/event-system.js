window.GameModules = window.GameModules || {};

window.GameModules.eventSystem = {
  // inference = 大地图/活动类事件（非人员日常驱动）；人员找主角走 Social Inbox。
  EVENT_TYPES: ['random', 'inference', 'periodic'],
  TYPE_LABELS: { random: '随机事件', inference: '大地图事件', periodic: '周期事件' },

  defaultState() {
    const inboxBudgetTiers = window.GameModules.socialInbox?.defaultBudgetTiers?.()
      || [
        { maxSeconds: 30 * 60, expected: 0, hardCap: 1, label: '不足 30 分钟' },
        { maxSeconds: 3 * 3600, expected: 0.45, hardCap: 1, label: '30 分钟 – 3 小时' },
        { maxSeconds: 12 * 3600, expected: 1.2, hardCap: 2, label: '3 – 12 小时' },
        { maxSeconds: 48 * 3600, expected: 2.2, hardCap: 3, label: '12 – 48 小时' },
        { maxSeconds: null, expected: 3.2, hardCap: 4, label: '48 小时及以上' },
      ];
    return {
      open: false,
      primaryTab: 'events', // inbox | events | tempo
      inboxFilter: 'pending', // pending | prepared | consumed | all
      inboxSelectedId: '',
      inboxBudgetTiers,
      tab: 'random',
      selectedId: '',
      message: '',
      currentContext: null,
      randomProbability: 10,
      events: [],
      draft: this.defaultDraft('random'),
    };
  },

  defaultDraft(type = 'random') {
    return {
      type: this.normalizeWritableType(type),
      title: '',
      startDate: '',
      endDate: '',
      location: '',
      content: '',
      peopleText: '',
      tagsText: '',
      probability: 10,
    };
  },

  normalizeType(type = '') {
    const value = String(type || '').trim().toLowerCase();
    if (['random', '随机事件', 'random-event'].includes(value)) return 'random';
    if (['inference', '推演事件', '大地图事件', '地图事件', '活动事件', 'story', 'derived', 'map-event', 'world-event'].includes(value)) {
      return 'inference';
    }
    if (['periodic', '周期事件', 'cycle', 'recurring'].includes(value)) return 'periodic';
    return 'random';
  },

  normalizeWritableType(type = '') {
    const normalized = this.normalizeType(type);
    return this.EVENT_TYPES.includes(normalized) ? normalized : 'random';
  },

  isWritableType(type = '') {
    return this.EVENT_TYPES.includes(this.normalizeType(type));
  },

  typeLabel(type = '') {
    const key = this.normalizeType(type);
    return this.TYPE_LABELS[key] || this.TYPE_LABELS.random;
  },

  splitList(value = '') {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
    return String(value || '').split(/[、,，;；\n]/u).map((item) => item.trim()).filter(Boolean);
  },

  isoDate(value = '', fallback = '') {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const text = String(value || '').trim();
    if (!text) return fallback || '';
    const iso = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/u);
    if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
    const cn = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/u);
    if (cn) return `${cn[1]}-${String(cn[2]).padStart(2, '0')}-${String(cn[3]).padStart(2, '0')}`;
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    return fallback || '';
  },

  normalizeEvent(raw = {}, store = null) {
    const type = this.normalizeType(raw.type || raw.eventType || raw['事件类型']);
    const now = store?.phoneDate?.() || new Date();
    const today = this.isoDate(now);
    const startDate = this.isoDate(raw.startDate || raw.start || raw.timeStart || raw['开始时间'] || raw['事件开始时间'] || raw['事件发生时间段'], today);
    const endDate = this.isoDate(raw.endDate || raw.end || raw.timeEnd || raw['结束时间'] || raw['事件结束时间'], startDate);
    const title = String(raw.title || raw.name || raw.eventName || raw['事件名'] || '').replace(/^【[^】]+】/u, '').trim() || '未命名事件';
    const id = String(raw.id || raw.eventId || '').trim() || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // 大地图/周期：受众默认「所有人」；禁止用具体熟人名单冒充人员日常驱动
    const defaultPeople = (type === 'periodic' || type === 'inference') ? '所有人' : '';
    const people = this.splitList(raw.people || raw.relatedPeople || raw.participants || raw['事件相关人'] || defaultPeople);
    const tags = this.splitList(raw.tags || raw.eventTags || raw['事件标签']);
    return {
      id,
      type,
      title,
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      location: String(raw.location || raw.place || raw['事件发生地点'] || '').trim(),
      content: String(raw.content || raw.detail || raw.summary || raw['事件内容'] || '').trim(),
      people: people.length ? people : ((type === 'periodic' || type === 'inference') ? ['所有人'] : []),
      tags,
      probability: type === 'random' ? Math.max(0, Math.min(100, Math.round(Number(raw.probability ?? raw.chance ?? raw['发生概率'] ?? store?.eventState?.randomProbability ?? 10)))) : 100,
      source: String(raw.source || raw.origin || '').trim(),
      sourceLogId: raw.sourceLogId || raw.logId || '',
      memoryIds: Array.isArray(raw.memoryIds) ? raw.memoryIds.slice(0, 8) : [],
      status: String(raw.status || '').trim(),
      recurrence: type === 'periodic' ? (raw.recurrence || 'yearly') : '',
      triggeredCount: Math.max(0, Math.round(Number(raw.triggeredCount) || 0)),
      lastTriggeredAt: raw.lastTriggeredAt || '',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  },

  dateInRange(dateValue, event = {}) {
    const date = this.isoDate(dateValue);
    if (!date || !event.startDate) return false;
    if (event.type === 'periodic' && event.recurrence === 'yearly') {
      const md = date.slice(5);
      const start = String(event.startDate || '').slice(5);
      const end = String(event.endDate || event.startDate || '').slice(5);
      return start <= end ? md >= start && md <= end : md >= start || md <= end;
    }
    return date >= event.startDate && date <= (event.endDate || event.startDate);
  },

  isExpired(event = {}, now = new Date()) {
    if (event.type === 'periodic') return false;
    const today = this.isoDate(now);
    return Boolean(event.endDate && today > event.endDate);
  },

  eventDisplayName(event = {}) {
    return `【${this.typeLabel(event.type)}】${event.title || '未命名事件'}`;
  },

  scoreEvent(event = {}, context = {}) {
    const haystack = [
      context.action,
      context.location,
      context.sceneTitle,
      ...(Array.isArray(context.people) ? context.people : []),
      ...(Array.isArray(context.tags) ? context.tags : []),
    ].join(' ');
    let score = 0;
    // 大地图事件优先按地点/标签匹配，弱化具体人名（避免当作成熟人人际驱动）
    if (event.type === 'inference') {
      if (event.location && haystack.includes(event.location)) score += 8;
      (event.tags || []).forEach((tag) => { if (haystack.includes(tag)) score += 5; });
      (event.people || []).forEach((person) => {
        if (person === '所有人') score += 1;
      });
      return score;
    }
    (event.people || []).forEach((person) => {
      if (person === '所有人') score += 1;
      else if (haystack.includes(person)) score += 6;
    });
    (event.tags || []).forEach((tag) => { if (haystack.includes(tag)) score += 4; });
    if (event.location && haystack.includes(event.location)) score += 5;
    return score;
  },

  promptLine(event = {}) {
    const audienceLabel = event.type === 'inference' ? '影响范围' : '相关人';
    return [
      this.eventDisplayName(event),
      `时间段:${event.startDate || '未知'}-${event.endDate || event.startDate || '未知'}`,
      `地点:${event.location || '未指定'}`,
      `${audienceLabel}:${(event.people || []).join('、') || '未指定'}`,
      `标签:${(event.tags || []).join('、') || '无'}`,
      `内容:${event.content || '无'}`,
    ].join('；');
  },
};
