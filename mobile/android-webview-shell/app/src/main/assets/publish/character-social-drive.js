window.GameModules = window.GameModules || {};

/**
 * 社交驱动（介绍卡 social/agenda 与角色卡 profile.socialDrive 共用规范化）。
 * 用于日常主动找人：关系门闩、熟识、上次沟通、当前议程。
 */
window.GameModules.characterSocialDrive = {
  CHANNELS: ['wechat', 'scene', 'call', 'none'],
  REACH: ['wechat', 'call', 'scene'],
  PRESENCE_KINDS: ['individual', 'group'],
  PRESENCE_LABELS: { individual: '具体的一个人', group: '一类人（团体原型）' },

  emptyAgenda() {
    return {
      short: '',
      deadline: '',
      needPlayer: false,
      needPlayerWhy: '',
      urgency: 0,
      cooldownUntil: '',
    };
  },

  emptyIdeas() {
    return [];
  },

  empty() {
    return {
      relationToPlayer: '',
      relationDetail: '',
      familiarity: 0,
      lastContactAt: '',
      lastContactChannel: 'none',
      reach: [],
      agenda: this.emptyAgenda(),
      ideas: this.emptyIdeas(),
    };
  },

  presenceKindLabel(kind = 'individual') {
    const key = this.normalizePresenceKind(kind);
    return this.PRESENCE_LABELS[key] || this.PRESENCE_LABELS.individual;
  },

  normalizePresenceKind(raw = '', fallback = 'individual') {
    const text = String(raw || '').trim().toLowerCase();
    if (['group', '一类人', '团体', '团体原型', '群体', 'archetype', 'collective'].includes(text)) return 'group';
    if (['individual', '具体的一个人', '个人', '人物', 'person', 'single'].includes(text)) return 'individual';
    return this.PRESENCE_KINDS.includes(fallback) ? fallback : 'individual';
  },

  /** 一类人：学院女学生 / 女仆团女仆 / xxx们 等标签名，而非具体姓名。 */
  looksLikeGroupLabel(name = '', role = '') {
    const text = `${String(name || '').trim()} ${String(role || '').trim()}`;
    if (!String(name || '').trim()) return false;
    const n = String(name || '').trim();
    if (/(?:们)$/u.test(n)) return true;
    if (/^(?:一群|一批|几名|若干|一队|一组)/u.test(n)) return true;
    if (/(?:学院|大学|高中|中学|小学|公司|店|馆|团|队|组|班|会|社).{0,16}(?:学生|女生|男生|女仆|队员|店员|职员|员工|成员|侍者|服务员)/u.test(n)) return true;
    if (/(?:女仆团|应援团|啦啦队|志愿队|保安队)/u.test(n)) return true;
    if (/(?:女学生|男学生|女仆|店员|路人|职员|队员)$/u.test(n) && n.length >= 4) return true;
    if (/一类人|团体原型|群体意识/u.test(text)) return true;
    return false;
  },

  inferPresenceKind(raw = {}) {
    const explicit = raw.presenceKind ?? raw.人物形态 ?? raw.kind ?? raw.identity?.presenceKind;
    if (explicit != null && String(explicit).trim()) {
      return this.normalizePresenceKind(explicit);
    }
    const name = String(raw.name || raw.characterName || '').trim();
    const role = String(raw.role || raw.identity?.role || '').trim();
    if (this.looksLikeGroupLabel(name, role)) return 'group';
    return 'individual';
  },

  clamp01(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(1, num));
  },

  clamp100(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(100, Math.round(num)));
  },

  normalizeChannel(raw = '', fallback = 'none') {
    const text = String(raw || '').trim().toLowerCase();
    if (this.CHANNELS.includes(text)) return text;
    if (/微信|weixin/u.test(text)) return 'wechat';
    if (/电话|call|手机/u.test(text)) return 'call';
    if (/当面|场景|上门|scene/u.test(text)) return 'scene';
    return fallback;
  },

  normalizeReach(raw = []) {
    const list = Array.isArray(raw) ? raw : String(raw || '').split(/[、,，;/｜|]/u);
    const out = [];
    list.forEach((item) => {
      const ch = this.normalizeChannel(item, '');
      if (this.REACH.includes(ch) && !out.includes(ch)) out.push(ch);
    });
    return out.slice(0, 3);
  },

  normalizeDeadline(raw = '') {
    const text = String(raw || '').trim();
    if (!text) return '';
    const m = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) {
      return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    return text.slice(0, 32);
  },

  normalizeAgenda(raw = {}) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      short: String(src.short || src.content || src.text || '').trim().slice(0, 160),
      deadline: this.normalizeDeadline(src.deadline || src.due || ''),
      needPlayer: Boolean(src.needPlayer ?? src.need_player),
      needPlayerWhy: String(src.needPlayerWhy || src.need_player_why || src.why || '').trim().slice(0, 120),
      urgency: this.clamp01(src.urgency, 0),
      cooldownUntil: String(src.cooldownUntil || src.cooldown_until || '').trim().slice(0, 40),
    };
  },

  normalizeIdea(raw = {}, index = 0) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const title = String(src.title || src.name || src.short || src.content || src.text || '').trim().slice(0, 80);
    const detail = String(src.detail || src.description || src.reason || '').trim().slice(0, 160);
    const status = ['active', 'completed', 'cancelled', 'replaced'].includes(String(src.status || '').trim())
      ? String(src.status).trim()
      : 'active';
    const id = String(src.id || `idea-${index + 1}`).trim().slice(0, 64) || `idea-${index + 1}`;
    return {
      id,
      title,
      detail,
      status,
      reason: String(src.reason || src.why || '').trim().slice(0, 160),
      createdAt: String(src.createdAt || '').trim().slice(0, 40),
      updatedAt: String(src.updatedAt || '').trim().slice(0, 40),
    };
  },

  normalizeIdeas(raw = []) {
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((item, index) => this.normalizeIdea(item, index))
      .filter((item) => item.title || item.detail);
  },

  normalize(raw = {}, options = {}) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const agendaSrc = src.agenda && typeof src.agenda === 'object' ? src.agenda : src;
    const base = this.empty();
    const relationToPlayer = String(
      src.relationToPlayer || src.relation || src.relationship || options.relationFallback || '',
    ).trim().slice(0, 40);
    const reach = this.normalizeReach(src.reach || src.channels || []);
    return {
      relationToPlayer,
      relationDetail: String(src.relationDetail || src.relation_detail || '').trim().slice(0, 80),
      familiarity: this.clamp100(src.familiarity ?? src.熟识度, base.familiarity),
      lastContactAt: String(src.lastContactAt || src.last_contact_at || '').trim().slice(0, 40),
      lastContactChannel: this.normalizeChannel(src.lastContactChannel || src.last_contact_channel, 'none'),
      reach: reach.length ? reach : (relationToPlayer && relationToPlayer !== '本人' ? ['scene'] : []),
      agenda: this.normalizeAgenda(agendaSrc),
      ideas: this.normalizeIdeas(src.ideas || src.想法 || []),
    };
  },

  /** 角色卡 Part8 / 玩家本人：无「找自己」 */
  normalizeForRoleCard(raw = {}, base = {}) {
    const isPlayer = base.id === 'player-self' || Boolean(base.isPlayer);
    const drive = this.normalize(raw, {
      relationFallback: isPlayer ? '本人' : '',
    });
    if (isPlayer) {
      drive.relationToPlayer = drive.relationToPlayer || '本人';
      drive.agenda.needPlayer = false;
      drive.agenda.needPlayerWhy = '';
      drive.ideas = this.normalizeIdeas(drive.ideas);
      if (!drive.reach.length) drive.reach = [];
    }
    return drive;
  },

  slug(text = '') {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fff-]+/g, '')
      .slice(0, 48) || 'unknown';
  },

  makeIntroId(name = '', worldTag = '') {
    return `intro-${this.slug(worldTag)}-${this.slug(name)}`.slice(0, 80);
  },

  /** 与角色卡共用的权威 ID（rel-ai-* / npc-* 等）；legacy intro-* 不算。 */
  isSharedCharacterId(id = '') {
    const text = String(id || '').trim();
    if (!text || /^(?:pending|new|待建卡|\?)$/iu.test(text)) return false;
    if (/^intro-/iu.test(text)) return false;
    if (window.GameModules.characterIdEnsure?.isRealCharacterId?.(text)) return true;
    return text === 'player-self' || /^rel-ai-[\w-]+$/iu.test(text) || /^npc-[\w-]+$/iu.test(text);
  },

  /** 介绍卡与角色卡统一主键：优先共享 ID，其次显式 id，最后才生成 intro-* 兼容旧档。 */
  resolveSharedCardId(raw = {}, name = '', worldTag = '') {
    const explicit = String(raw.id || '').trim();
    const linked = String(raw.links?.roleCardId || raw.roleCardId || '').trim();
    if (this.isSharedCharacterId(linked)) return linked.slice(0, 80);
    if (this.isSharedCharacterId(explicit)) return explicit.slice(0, 80);
    if (explicit) return explicit.slice(0, 80);
    if (linked) return linked.slice(0, 80);
    return this.makeIntroId(name, worldTag);
  },

  normalizeTagList(raw = [], max = 8, each = 12) {
    const list = Array.isArray(raw)
      ? raw
      : String(raw || '').split(/[、,，;/｜|]/u).map((x) => x.trim()).filter(Boolean);
    return list.map((item) => String(item || '').trim().slice(0, each)).filter(Boolean).slice(0, max);
  },

  normalizeIntroCard(raw = {}, store = null, source = 'ai') {
    const name = String(raw.name || raw.characterName || '').trim().slice(0, 24);
    if (!name) return null;
    const worldTag = String(
      store?.currentWorldTag?.()
      || (source === 'real' || source === 'scene'
        ? (window.GameModules.realWorld2026?.label || '2026 现代都市现实世界')
        : (raw.worldTag || raw.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界')),
    ).trim().slice(0, 40);
    const role = String(raw.role || raw.identity?.role || raw.identity || '出场人物').trim().slice(0, 40);
    const presenceKind = this.inferPresenceKind({ ...raw, name, role });
    const defaultBackground = presenceKind === 'group'
      ? '本回合出现的一类人/团体原型；字段表示群体意识与集体行动倾向，细节尚未固化。'
      : '本回合被提及或出现的人物，细节尚未固化。';
    const background = String(
      raw.persona?.background || raw.background || raw.intro || raw.detail || raw.description || raw.summary
      || defaultBackground,
    ).trim().slice(0, 200);
    const appearance = String(
      raw.persona?.appearance || raw.appearance || raw.wearing || '',
    ).trim().slice(0, 120);
    const personality = String(raw.persona?.personality || raw.personality || '').trim().slice(0, 120);
    const socialRaw = raw.social && typeof raw.social === 'object' ? raw.social : raw;
    const social = this.normalize({
      ...socialRaw,
      relationToPlayer: socialRaw.relationToPlayer || raw.relationToPlayer || raw.relation || '',
      affection: undefined,
    });
    const affection = this.clamp100(
      raw.social?.affection ?? raw.affection ?? raw.好感 ?? 0,
      0,
    );
    const agenda = this.normalizeAgenda(raw.agenda || raw.social?.agenda || raw);
    const ideas = this.normalizeIdeas(raw.ideas || raw.social?.ideas || []);
    const now = new Date().toISOString();
    const id = this.resolveSharedCardId(raw, name, worldTag);
    const sharedLink = this.isSharedCharacterId(id) ? id : String(raw.links?.roleCardId || raw.roleCardId || '').slice(0, 64);
    const identity = {
      role,
      age: String(raw.identity?.age ?? raw.age ?? '').trim().slice(0, 8),
      gender: String(raw.identity?.gender ?? raw.gender ?? '').trim().slice(0, 8),
      job: String(raw.identity?.job ?? raw.job ?? '').trim().slice(0, 40),
      baseLocation: String(raw.identity?.baseLocation ?? raw.baseLocation ?? '').trim().slice(0, 60),
    };
    const persona = {
      appearance,
      personality,
      background,
      preferences: this.normalizeTagList(raw.persona?.preferences ?? raw.preferences, 8, 12),
      attraction: this.normalizeTagList(raw.persona?.attraction ?? raw.attraction, 6, 12),
      voice: String(raw.persona?.voice || raw.voice || '').trim().slice(0, 60),
    };
    const routineTags = this.normalizeTagList(raw.routine?.tags ?? raw.routineTags ?? raw.tags, 6, 16);
    return {
      id,
      name,
      worldTag,
      presenceKind,
      identity,
      persona,
      social: {
        relationToPlayer: social.relationToPlayer,
        relationDetail: social.relationDetail,
        affection,
        familiarity: social.familiarity,
        lastContactAt: social.lastContactAt,
        lastContactChannel: social.lastContactChannel,
        reach: social.reach,
      },
      agenda,
      ideas,
      routine: { tags: routineTags },
      memory: {
        facts: this.normalizeTagList(raw.memory?.facts ?? raw.facts, 5, 40),
      },
      links: {
        scheduleId: String(raw.links?.scheduleId || id).slice(0, 80),
        wechatContactId: String(raw.links?.wechatContactId || raw.wechatContactId || '').slice(0, 64),
        // 与角色卡共用同一 ID；空壳阶段也写上，便于 byId 查询（完整与否另看 stub 标记）
        roleCardId: String(sharedLink || (this.isSharedCharacterId(id) ? id : '')).slice(0, 64),
      },
      meta: {
        source: String(raw.meta?.source || source || 'ai').slice(0, 24),
        solidifyStatus: String(raw.meta?.solidifyStatus || raw.solidifyStatus || 'none').slice(0, 16),
        createdAt: String(raw.meta?.createdAt || raw.createdAt || now),
        updatedAt: String(raw.meta?.updatedAt || now),
      },
      // 兼容旧读取路径
      role,
      intro: background,
      work: worldTag,
    };
  },
};
