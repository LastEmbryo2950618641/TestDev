window.GameModules = window.GameModules || {};

/**
 * Social Inbox：按时间跨度从熟人圈加权入队，供下轮推演注入。
 * 本模块不发微信、不加好友；无微信降级为 call/scene，并可标记 mayRequestWechat。
 */
window.GameModules.socialInbox = {
  MAX_QUEUE: 30,
  STRANGER_RE: /^(?:陌生|路人|无|未知|本人)?$/u,

  /** maxSeconds=null 表示该档及以上（无上限）。 */
  DEFAULT_BUDGET_TIERS: [
    { maxSeconds: 30 * 60, expected: 0, hardCap: 1, label: '不足 30 分钟' },
    { maxSeconds: 3 * 3600, expected: 0.45, hardCap: 1, label: '30 分钟 – 3 小时' },
    { maxSeconds: 12 * 3600, expected: 1.2, hardCap: 2, label: '3 – 12 小时' },
    { maxSeconds: 48 * 3600, expected: 2.2, hardCap: 3, label: '12 – 48 小时' },
    { maxSeconds: null, expected: 3.2, hardCap: 4, label: '48 小时及以上' },
  ],

  defaultBudgetTiers() {
    return this.DEFAULT_BUDGET_TIERS.map((row) => ({ ...row }));
  },

  normalizeBudgetTiers(tiers) {
    const fallback = this.defaultBudgetTiers();
    const source = Array.isArray(tiers) && tiers.length ? tiers : fallback;
    const rows = source.map((raw, index) => {
      const base = fallback[Math.min(index, fallback.length - 1)] || fallback[fallback.length - 1];
      const maxRaw = raw?.maxSeconds;
      const maxSeconds = (maxRaw === null || maxRaw === undefined || maxRaw === '' || !Number.isFinite(Number(maxRaw)))
        ? null
        : Math.max(1, Math.round(Number(maxRaw)));
      let expected = Number(raw?.expected);
      if (!Number.isFinite(expected)) expected = Number(base.expected) || 0;
      expected = Math.max(0, Math.min(20, Math.round(expected * 100) / 100));
      let hardCap = Math.round(Number(raw?.hardCap));
      if (!Number.isFinite(hardCap)) hardCap = Number(base.hardCap) || 0;
      hardCap = Math.max(0, Math.min(20, hardCap));
      const ceilExpected = Math.ceil(expected);
      if (hardCap < ceilExpected) hardCap = ceilExpected;
      const label = String(raw?.label || base.label || '').trim() || `档位 ${index + 1}`;
      return { maxSeconds, expected, hardCap, label };
    });
    // 保证最后一档为开放上限
    if (rows.length) rows[rows.length - 1].maxSeconds = null;
    rows.sort((a, b) => {
      const av = a.maxSeconds == null ? Number.POSITIVE_INFINITY : a.maxSeconds;
      const bv = b.maxSeconds == null ? Number.POSITIVE_INFINITY : b.maxSeconds;
      return av - bv;
    });
    return rows.length ? rows : fallback;
  },

  resolveBudgetTier(elapsedSeconds = 0, tiers) {
    const sec = Math.max(0, Number(elapsedSeconds) || 0);
    const rows = this.normalizeBudgetTiers(tiers);
    for (let i = 0; i < rows.length; i += 1) {
      const max = rows[i].maxSeconds == null ? Number.POSITIVE_INFINITY : Number(rows[i].maxSeconds);
      if (sec < max) return { ...rows[i] };
    }
    return { ...rows[rows.length - 1] };
  },

  budgetFromElapsed(elapsedSeconds = 0, random = Math.random, tiers) {
    const { expected, hardCap } = this.resolveBudgetTier(elapsedSeconds, tiers);
    const roll = typeof random === 'function' ? random() : Math.random();
    // 泊松近似：用期望 + 抖动取整
    let n = Math.floor(expected + (roll - 0.35));
    if (expected > 0 && n < 1 && roll < expected) n = 1;
    if (expected <= 0) n = roll < 0.08 ? 1 : 0;
    return Math.max(0, Math.min(hardCap, n));
  },

  isRelationEligible(relation = '') {
    const text = String(relation || '').trim();
    if (!text) return false;
    if (text === '本人') return false;
    if (/陌生|路人|无关/u.test(text)) return false;
    return true;
  },

  hasWechatContact(store, actor = {}) {
    const contacts = store?.wechatContacts?.() || store?.wechatUsers || [];
    const id = String(actor.actorId || actor.id || '').trim();
    const name = String(actor.actorName || actor.name || '').trim();
    const linkWx = String(actor.wechatContactId || '').trim();
    return (Array.isArray(contacts) ? contacts : []).some((c) => {
      if (c?.group) return false;
      if (linkWx && (c.id === linkWx || c.characterId === linkWx)) return true;
      if (id && (c.characterId === id || c.id === id)) return true;
      if (name && c.name === name) return true;
      return false;
    });
  },

  resolveChannel({ reach = [], hasWechatContact = false, urgency = 0 } = {}) {
    const list = Array.isArray(reach) ? reach.map((x) => String(x || '').toLowerCase()) : [];
    const wantsWechat = list.includes('wechat');
    if (wantsWechat && hasWechatContact) {
      return { channel: 'wechat', mayRequestWechat: false };
    }
    if (list.includes('call') || wantsWechat) {
      return { channel: 'call', mayRequestWechat: !hasWechatContact };
    }
    if (list.includes('scene') || Number(urgency) >= 0.55) {
      return { channel: 'scene', mayRequestWechat: !hasWechatContact };
    }
    return { channel: 'call', mayRequestWechat: !hasWechatContact };
  },

  actorFromRoleCard(state = {}) {
    if (!state?.id || state.id === 'player-self') return null;
    // 空壳不算完整角色卡：Inbox 池留给同 ID 介绍卡
    if (window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(state)) return null;
    const drive = window.GameModules.characterSocialDrive?.normalizeForRoleCard?.(
      state.profile?.socialDrive || {},
      state,
    ) || state.profile?.socialDrive;
    if (!drive) return null;
    const affection = Number(state.metrics?.playerFeelings?.好感);
    return {
      actorId: state.id,
      actorName: state.profile?.name || state.name || state.id,
      source: 'role',
      relationToPlayer: drive.relationToPlayer || '',
      relationDetail: drive.relationDetail || '',
      familiarity: Number(drive.familiarity) || 0,
      affection: Number.isFinite(affection) ? affection : 0,
      lastContactAt: drive.lastContactAt || '',
      reach: Array.isArray(drive.reach) ? drive.reach : [],
      agenda: drive.agenda || {},
      wechatContactId: '',
      cooldownUntil: drive.agenda?.cooldownUntil || '',
    };
  },

  actorFromIntro(card = {}) {
    if (!card?.name && !card?.id) return null;
    const social = card.social || {};
    const agenda = card.agenda || {};
    const id = card.id || card.links?.scheduleId || card.links?.roleCardId || `intro-${card.name}`;
    // 同 ID 已有完整角色卡时以角色卡为准
    const roleState = window.GameModules.characterStateStore?.get?.(id);
    if (roleState && !window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(roleState)) return null;
    return {
      actorId: id,
      actorName: card.name,
      source: 'intro',
      relationToPlayer: social.relationToPlayer || '',
      relationDetail: social.relationDetail || '',
      familiarity: Number(social.familiarity) || 0,
      affection: Number(social.affection) || 0,
      lastContactAt: social.lastContactAt || '',
      reach: Array.isArray(social.reach) ? social.reach : [],
      agenda,
      wechatContactId: card.links?.wechatContactId || '',
      cooldownUntil: agenda.cooldownUntil || '',
    };
  },

  buildPool(store = {}) {
    const byId = new Map();
    Object.values(store.rpgStates || {}).forEach((state) => {
      const actor = this.actorFromRoleCard(state);
      if (actor) byId.set(actor.actorId, actor);
    });
    const intros = window.GameModules.characterIntroStore?.list?.() || [];
    intros.forEach((card) => {
      const actor = this.actorFromIntro(card);
      if (!actor) return;
      if (byId.has(actor.actorId)) return;
      // 若同名已有角色卡，跳过介绍卡
      const sameNameRole = [...byId.values()].find((a) => a.source === 'role' && a.actorName === actor.actorName);
      if (sameNameRole) return;
      byId.set(actor.actorId, actor);
    });
    return [...byId.values()];
  },

  pendingActorIds(store = {}) {
    return new Set(
      (store.socialInbox || [])
        .filter((item) => item && (item.status === 'pending' || item.status === 'prepared'))
        .map((item) => item.actorId),
    );
  },

  isCooledDown(actor = {}, nowMs = Date.now()) {
    const until = String(actor.cooldownUntil || '').trim();
    if (!until) return false;
    const t = Date.parse(until);
    return Number.isFinite(t) && t > nowMs;
  },

  hoursSinceContact(actor = {}, nowMs = Date.now()) {
    const raw = String(actor.lastContactAt || '').trim();
    if (!raw) return 72;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return 72;
    return Math.max(0, (nowMs - t) / 3600000);
  },

  isEligible(actor = {}, store = {}, nowMs = Date.now()) {
    if (!actor?.actorId) return false;
    if (!this.isRelationEligible(actor.relationToPlayer)) return false;
    if (actor.familiarity > 0 && actor.familiarity < 12 && /同事|同学|邻居|朋友|亲属|家人|姐|妹|兄|弟|父母|母亲|父亲/u.test(actor.relationToPlayer) === false) {
      // 极低熟识且关系词很弱时剔除
      if (actor.familiarity < 8) return false;
    }
    if (this.isCooledDown(actor, nowMs)) return false;
    if (this.pendingActorIds(store).has(actor.actorId)) return false;
    const agenda = actor.agenda || {};
    // 无 needPlayer 且紧迫很低：不进主动办事池
    if (!agenda.needPlayer && Number(agenda.urgency || 0) < 0.35) return false;
    return true;
  },

  weight(actor = {}, nowMs = Date.now()) {
    const agenda = actor.agenda || {};
    const urgency = Math.max(0, Math.min(1, Number(agenda.urgency) || 0));
    const need = agenda.needPlayer ? 1.35 : 0.55;
    const affection = Math.max(0, Math.min(100, Number(actor.affection) || 0)) / 100;
    const familiarity = Math.max(0, Math.min(100, Number(actor.familiarity) || 0)) / 100;
    const stale = Math.min(1, this.hoursSinceContact(actor, nowMs) / 48);
    let w = (0.25 + urgency) * need * (0.35 + affection * 0.65) * (0.4 + familiarity * 0.6) * (0.5 + stale * 0.5);
    if (!agenda.short && !agenda.needPlayerWhy) w *= 0.35;
    return Math.max(0, w);
  },

  weightedSample(scored = [], count = 0, random = Math.random) {
    const pool = scored.filter((row) => row.weight > 0).map((row) => ({ ...row }));
    const out = [];
    const n = Math.max(0, Math.min(count, pool.length));
    for (let i = 0; i < n; i += 1) {
      const total = pool.reduce((sum, row) => sum + row.weight, 0);
      if (total <= 0) break;
      let r = (typeof random === 'function' ? random() : Math.random()) * total;
      let idx = pool.length - 1;
      for (let j = 0; j < pool.length; j += 1) {
        r -= pool[j].weight;
        if (r <= 0) { idx = j; break; }
      }
      out.push(pool[idx].actor);
      pool.splice(idx, 1);
    }
    return out;
  },

  normalizeItem(raw = {}) {
    const channel = ['wechat', 'call', 'scene'].includes(raw.channel) ? raw.channel : 'call';
    return {
      id: String(raw.id || `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 80),
      actorId: String(raw.actorId || '').slice(0, 80),
      actorName: String(raw.actorName || '').slice(0, 24),
      source: raw.source === 'intro' ? 'intro' : 'role',
      channel,
      want: String(raw.want || '').slice(0, 160),
      needPlayerWhy: String(raw.needPlayerWhy || '').slice(0, 120),
      urgency: Math.max(0, Math.min(1, Number(raw.urgency) || 0)),
      relationToPlayer: String(raw.relationToPlayer || '').slice(0, 40),
      affection: Math.max(0, Math.min(100, Math.round(Number(raw.affection) || 0))),
      familiarity: Math.max(0, Math.min(100, Math.round(Number(raw.familiarity) || 0))),
      hasWechatContact: Boolean(raw.hasWechatContact),
      mayRequestWechat: Boolean(raw.mayRequestWechat),
      status: ['pending', 'prepared', 'consumed', 'expired'].includes(raw.status) ? raw.status : 'pending',
      deliverMode: 'context',
      createdAt: String(raw.createdAt || new Date().toISOString()),
      dueAt: String(raw.dueAt || ''),
    };
  },

  buildItem(actor = {}, store = {}, nowMs = Date.now()) {
    const hasWx = this.hasWechatContact(store, actor);
    const resolved = this.resolveChannel({
      reach: actor.reach,
      hasWechatContact: hasWx,
      urgency: actor.agenda?.urgency,
    });
    const agenda = actor.agenda || {};
    return this.normalizeItem({
      actorId: actor.actorId,
      actorName: actor.actorName,
      source: actor.source,
      channel: resolved.channel,
      want: agenda.short || '',
      needPlayerWhy: agenda.needPlayerWhy || '',
      urgency: agenda.urgency,
      relationToPlayer: actor.relationToPlayer,
      affection: actor.affection,
      familiarity: actor.familiarity,
      hasWechatContact: hasWx,
      mayRequestWechat: resolved.mayRequestWechat,
      status: 'pending',
      createdAt: new Date(nowMs).toISOString(),
    });
  },

  settle(store = {}, elapsedSeconds = 0, options = {}) {
    const random = options.random || Math.random;
    const nowMs = Number(options.nowMs) || Number(store.phoneFixedTime) || Date.now();
    const tiers = options.tiers || store.eventState?.inboxBudgetTiers;
    const budget = this.budgetFromElapsed(elapsedSeconds, random, tiers);
    if (budget <= 0) return [];
    const pool = this.buildPool(store).filter((actor) => this.isEligible(actor, store, nowMs));
    const scored = pool.map((actor) => ({ actor, weight: this.weight(actor, nowMs) }));
    const picked = this.weightedSample(scored, budget, random);
    const created = picked.map((actor) => this.buildItem(actor, store, nowMs)).filter((item) => item.actorId);
    store.socialInbox = [...(store.socialInbox || []), ...created].slice(-this.MAX_QUEUE);
    return created;
  },

  buildDeliveryText(item = {}) {
    const why = String(item.needPlayerWhy || '').trim();
    const want = String(item.want || '').trim();
    const nameHint = String(item.relationToPlayer || '').trim();
    if (why && want) return `${why}。我这边在忙：${want}`.slice(0, 180);
    if (why) return why.slice(0, 180);
    if (want) return `在忙「${want}」，想找你对接一下。`.slice(0, 180);
    return nameHint ? `有点事想跟你说一声。` : '在吗？有点事想找你。';
  },

  COOLDOWN_HOURS: 12,

  cooldownUntilIso(fromIso = '', hours = 12) {
    const base = Date.parse(fromIso) || Date.now();
    const ms = Math.max(1, Number(hours) || this.COOLDOWN_HOURS) * 3600000;
    return new Date(base + ms).toISOString();
  },

  nextAgendaAfterOutreach(agenda = {}, item = {}, options = {}) {
    const src = agenda && typeof agenda === 'object' ? agenda : {};
    const urgency = Math.max(0, Math.min(1, Number(src.urgency ?? item.urgency) || 0));
    const short = String(src.short || item.want || '').trim();
    const keepNeedPlayer = !!options.keepNeedPlayer;
    const needPlayerWhy = keepNeedPlayer
      ? String(src.needPlayerWhy || item.needPlayerWhy || '').trim().slice(0, 120)
      : '';
    return window.GameModules.characterSocialDrive?.normalizeAgenda?.({
      short: keepNeedPlayer
        ? (short || '待与主角微信对接').slice(0, 160)
        : (short ? `${short.replace(/（已主动联系）$/u, '')}（已主动联系）`.slice(0, 160) : '已主动联系主角'),
      deadline: src.deadline || '',
      needPlayer: keepNeedPlayer,
      needPlayerWhy,
      urgency: keepNeedPlayer ? Math.max(urgency, 0.35) : Math.min(urgency, 0.25),
      cooldownUntil: '',
    }) || {
      short: short || (keepNeedPlayer ? '待与主角微信对接' : '已主动联系主角'),
      deadline: '',
      needPlayer: keepNeedPlayer,
      needPlayerWhy,
      urgency: keepNeedPlayer ? Math.max(urgency, 0.35) : Math.min(urgency, 0.25),
      cooldownUntil: '',
    };
  },

  /**
   * 联络后回写介绍卡 / 角色卡：lastContact、agenda、冷却。
   */
  async applyOutreachWriteback(store = {}, item = {}, options = {}) {
    const channel = String(options.channel || item.channel || 'call');
    const when = String(options.atIso || (store.phoneDate?.() || new Date()).toISOString?.() || new Date().toISOString());
    const cooldownHours = options.cooldownHours === 0 ? 0 : (Number(options.cooldownHours) || this.COOLDOWN_HOURS);
    const cooldownUntil = cooldownHours > 0 ? this.cooldownUntilIso(when, cooldownHours) : '';
    const id = String(item.actorId || item.fromCharacterId || '').trim();
    const name = String(item.actorName || item.fromName || '').trim();
    const agendaPatch = this.nextAgendaAfterOutreach(item.agenda || {
      short: item.want,
      needPlayer: true,
      needPlayerWhy: item.needPlayerWhy,
      urgency: item.urgency,
    }, item, options);
    agendaPatch.cooldownUntil = cooldownUntil;

    const result = { actorId: id, actorName: name, channel, at: when, cooldownUntil, targets: [] };
    const saves = [];

    const state = store.rpgStates?.[id]
      || Object.values(store.rpgStates || {}).find((s) => s?.name === name || s?.profile?.name === name);
    if (state?.profile) {
      const prev = state.profile.socialDrive || {};
      const reach = Array.isArray(prev.reach) ? [...prev.reach] : [];
      if (options.addWechatReach && !reach.includes('wechat')) reach.push('wechat');
      const drive = window.GameModules.characterSocialDrive?.normalizeForRoleCard?.({
        ...prev,
        lastContactAt: when,
        lastContactChannel: channel,
        reach,
        agenda: agendaPatch,
      }, state) || {
        ...prev,
        lastContactAt: when,
        lastContactChannel: channel,
        reach,
        agenda: agendaPatch,
      };
      state.profile = { ...state.profile, socialDrive: drive };
      store.rpgStates = { ...(store.rpgStates || {}), [state.id]: state };
      const roleSave = window.GameModules.characterStateStore?.save?.(state);
      if (roleSave?.then) saves.push(roleSave);
      result.targets.push('role');
    }

    try {
      const introStore = window.GameModules.characterIntroStore;
      const intro = introStore?.get?.(name)
        || (introStore?.list?.() || []).find((card) => card.id === id || card.name === name);
      if (intro) {
        const social = { ...(intro.social || {}) };
        social.lastContactAt = when;
        social.lastContactChannel = channel;
        if (options.addWechatReach) {
          social.reach = Array.from(new Set([...(social.reach || []), 'wechat']));
        }
        const next = window.GameModules.characterIntroCard?.normalize?.({
          ...intro,
          social,
          agenda: agendaPatch,
          links: {
            ...(intro.links || {}),
            ...(options.wechatContactId ? { wechatContactId: options.wechatContactId } : {}),
          },
        }, store, intro.meta?.source || 'ai');
        if (next) {
          const introSave = introStore?.save?.(next);
          if (introSave?.then) saves.push(introSave);
          result.targets.push('intro');
        }
      }
    } catch (_) { /* ignore intro writeback failures */ }

    if (saves.length) {
      try { await Promise.all(saves); } catch (_) { /* ignore persist races */ }
    }
    return result.targets.length ? result : null;
  },

  touchActorLastContact(store = {}, item = {}, channel = 'wechat', atIso = '') {
    return this.applyOutreachWriteback(store, item, { channel, atIso });
  },

  deliverWechatItems(store = {}, items = []) {
    const outreach = window.GameModules.wechatOutreachContext;
    const list = (Array.isArray(items) ? items : []).filter((item) => (
      item && item.channel === 'wechat' && item.hasWechatContact && !item.deliveredAt
    ));
    const delivered = [];
    const nowIso = (store.phoneDate?.() || new Date()).toISOString?.()
      || new Date().toISOString();
    list.forEach((item) => {
      const contact = store.findWechatIncomingContact?.(item.actorId)
        || store.findWechatIncomingContact?.(item.actorName)
        || (store.wechatContacts?.() || store.wechatUsers || []).find((c) => (
          !c?.group && (c.characterId === item.actorId || c.id === item.actorId || c.name === item.actorName)
        ));
      if (!contact) return;
      const intentChain = outreach?.normalizeIntentChain?.(item.intentChain)
        || outreach?.intentChainFromInboxItem?.(item);
      const sourceRecordId = outreach?.resolveSourceRecordId?.(store, item.sourceRecordId) || '';
      if (!sourceRecordId) return;
      const text = this.buildDeliveryText(item);
      const key = store.wechatMessageKey?.(contact) || contact.id;
      const meta = {
        side: 'other',
        name: item.actorName || contact.name,
        mark: String(item.actorName || contact.name || '?').slice(0, 1),
        text,
        characterId: contact.characterId || contact.id,
        sourceRecordId,
        intentChain,
        openedAt: nowIso,
        outreachSource: 'social-inbox',
      };
      store.appendWechatMessage?.(key, meta);
      const nextContact = {
        ...contact,
        outreachOpen: {
          status: 'open',
          sourceRecordId,
          intentChain,
          openedAt: nowIso,
          source: 'incoming',
        },
      };
      if (Array.isArray(store.wechatUsers)) {
        store.wechatUsers = store.wechatUsers.map((c) => (c.id === contact.id ? nextContact : c));
      }
      store.recordWechatWorldline?.({
        ...contact,
        id: contact.characterId || contact.id,
        characterId: contact.characterId || contact.id,
      }, '', text);
      const wechatMsg = window.GameModules.realWorldAgentLoop?.appendWechatDialogueContext?.(store, {
        contactName: item.actorName || contact.name,
        contactId: contact.characterId || contact.id,
        replyText: text,
        timeLabel: nowIso,
        kind: 'incoming',
      });
      window.GameModules.realWorldAgentLoop?.mirrorExternalContextToRealWorldLog?.(store, {
        content: wechatMsg?.content || '',
        kind: 'wechat',
        contactName: item.actorName || contact.name,
        contactId: contact.characterId || contact.id,
        timeLabel: nowIso,
      });
      item.deliveredAt = nowIso;
      item.deliveryText = text;
      item.sourceRecordId = sourceRecordId;
      item.intentChain = intentChain;
      delivered.push({ ...item, contactId: contact.id, text });
    });
    return delivered;
  },

  formatContext(items = []) {
    const pending = (Array.isArray(items) ? items : []).filter((item) => item && (item.status === 'pending' || item.status === 'prepared'));
    if (!pending.length) return '';
    const lines = pending.map((item) => {
      const flags = [
        item.hasWechatContact ? '已有微信' : '无微信',
        item.mayRequestWechat ? '可发起微信申请' : '',
        item.channel === 'wechat' && item.hasWechatContact ? '本轮结算后来信' : '',
      ].filter(Boolean).join('·');
      return `- pending｜${item.actorName}｜${item.relationToPlayer || '关系未知'}｜好感${item.affection}｜熟识${item.familiarity}｜渠道:${item.channel}｜事务:${item.want || '未说明'}｜理由:${item.needPlayerWhy || '无'}｜紧迫:${item.urgency}｜${flags}`;
    });
    const ops = window.GameModules.socialEventBoundary?.socialInboxOpsRules?.() || [
      '以下是他人因自己的事可能联系主角的候选；不是玩家发起的行动。',
      '须遵守上文「日常驱动与事件系统分工」：此处只处理人员日常驱动，不登记活动/比赛/限运。',
      '规则：',
      '1. 动机主语必须是对方（办事/求助/约定），禁止写成「为了服务玩家剧情」。',
      '2. 关系为陌生或未达门闩的不要强行入场。',
      '3. 渠道为 call/scene：正文必须以电话、上门或合理偶遇体现；高紧迫可进 priorityCandidates；无微信时可提出加微信。',
      '4. 推演只能发起微信好友申请，禁止直接把对方加为已通过好友；未通过前禁止当成微信好友发消息。',
      '5. 渠道为 wechat 且已有好友：系统将在本轮结算后写入未读微信来信；正文可写手机提示/未读，不要编造完整已读长对话，也不要再重复 sendIncoming。',
      '6. 玩家可忽视；忽视不要当成对方消失，可留待后续。',
    ].join('\n');
    return [
      '## 本轮待处理的社交主动（Social Inbox）',
      ops,
      ...lines,
    ].join('\n');
  },
};

window.GameModules.realWorldSocialInboxActions = {
  settleSocialInbox(elapsedSeconds, startMs, endMs) {
    const created = window.GameModules.socialInbox?.settle?.(this, elapsedSeconds, {
      nowMs: Number(endMs) || Number(this.phoneFixedTime) || Date.now(),
    }) || [];
    return created;
  },

  prepareSocialInboxContext() {
    const pending = (this.socialInbox || []).filter((item) => item && (item.status === 'pending' || item.status === 'prepared'));
    if (!pending.length) return '';
    this.socialInboxPreparedIds = pending.map((item) => item.id);
    this.socialInbox = (this.socialInbox || []).map((item) => (
      this.socialInboxPreparedIds.includes(item.id) ? { ...item, status: 'prepared' } : item
    ));
    return window.GameModules.socialInbox.formatContext(pending);
  },

  async clearPreparedSocialInbox() {
    const ids = new Set(this.socialInboxPreparedIds || []);
    if (!ids.size) return { friendRequests: [], wechatDeliveries: [], writebacks: [] };
    const prepared = (this.socialInbox || []).filter((item) => item && ids.has(item.id));
    const nowIso = (this.phoneDate?.() || new Date()).toISOString?.() || new Date().toISOString();
    // 有微信：代码直写未读来信（不依赖本轮 AI sendIncoming）
    const wechatDeliveries = window.GameModules.socialInbox?.deliverWechatItems?.(this, prepared) || [];
    // 无微信且 mayRequestWechat：pending 好友申请
    const friendRequests = this.promoteSocialInboxWechatRequests?.() || [];
    // 回写议程 / 上次沟通 / 冷却（call、scene、wechat 均回写）
    const writebacks = (await Promise.all(prepared.map((item) => {
      const channel = item.channel === 'wechat' && item.hasWechatContact
        ? 'wechat'
        : (item.channel === 'scene' ? 'scene' : 'call');
      const keepNeedPlayer = channel === 'wechat' && item.hasWechatContact;
      return window.GameModules.socialInbox?.applyOutreachWriteback?.(this, item, {
        channel,
        atIso: item.deliveredAt || nowIso,
        keepNeedPlayer,
        cooldownHours: keepNeedPlayer ? 0 : undefined,
      });
    }))).filter(Boolean);
    this.socialInbox = (this.socialInbox || []).map((item) => (
      ids.has(item.id) && (item.status === 'prepared' || item.status === 'pending')
        ? { ...item, status: 'consumed' }
        : item
    ));
    this.socialInboxPreparedIds = [];
    return { friendRequests, wechatDeliveries, writebacks };
  },
};
