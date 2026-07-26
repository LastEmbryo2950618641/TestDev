window.GameModules = window.GameModules || {};

/**
 * 微信外联连续性：意图链 + 原文记录 ID + 时间跨度后果。
 * 同意好友 / 来信回复共用同一套上下文块。
 */
window.GameModules.wechatOutreachContext = {
  ACCEPT_PLAYER_TEXT: '我通过了你的好友申请',

  normalizeIntentChain(raw = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const cause = String(raw.cause || raw.起因 || '').trim().slice(0, 160);
    const process = String(raw.process || raw.过程 || '').trim().slice(0, 160);
    const result = String(raw.result || raw.结果 || '').trim().slice(0, 160);
    const whyPlayer = String(raw.whyPlayer || raw.找主角 || raw.why || '').trim().slice(0, 160);
    if (!cause && !process && !result && !whyPlayer) return null;
    return { cause, process, result, whyPlayer };
  },

  intentChainFromInboxItem(item = {}) {
    const want = String(item.want || item.agenda?.short || '').trim();
    const why = String(item.needPlayerWhy || item.agenda?.needPlayerWhy || '').trim();
    return this.normalizeIntentChain({
      cause: want || why || '对方有事想联系主角',
      process: want ? `为此忙着「${want}」` : '对方先按自己的节奏处理手头事',
      result: why || want ? '事情推进到需要主角配合的一步' : '尚未收束',
      whyPlayer: why || (want ? `需要主角帮忙对接「${want}」` : '需要联系主角'),
    });
  },

  intentChainFromReason(reason = '', extras = {}) {
    const text = String(reason || '').trim();
    return this.normalizeIntentChain({
      cause: extras.cause || text || '对方有事找主角',
      process: extras.process || (text ? '对方已主动发起联系/申请' : ''),
      result: extras.result || '等待主角回应',
      whyPlayer: extras.whyPlayer || text || '需要主角回应',
    });
  },

  resolveSourceRecordId(store = {}, explicit = '') {
    const id = String(explicit || store.realWorldSettlementLogId || '').trim();
    return id.slice(0, 120);
  },

  lookupRecordText(store = {}, recordId = '') {
    const id = String(recordId || '').trim();
    if (!id) return '';
    const fromMem = (store.realWorldLog || []).find((entry) => entry && entry.id === id);
    const fromStore = !fromMem && window.GameModules.realWorldLogStore?.get?.(id);
    const entry = fromMem || fromStore || null;
    if (!entry) return '';
    const parts = [
      entry.narration,
      entry.text,
      entry.actionText,
      entry.playerText,
      entry.detail,
      entry.summary,
    ].map((x) => String(x || '').trim()).filter(Boolean);
    return parts.join('\n').slice(0, 2400);
  },

  hoursBetween(openedAt = '', nowDate = null) {
    const start = new Date(openedAt);
    const end = nowDate instanceof Date ? nowDate : new Date();
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
    return Math.max(0, (end.getTime() - start.getTime()) / 3600000);
  },

  timeSpanGuidance(hours = 0) {
    if (hours < 2) {
      return [
        '时间跨度：较短（约数小时内）。',
        '可基本按当初意图接话，但仍要像真实微信：自然、简短。',
      ].join('\n');
    }
    if (hours < 24) {
      return [
        `时间跨度：约 ${Math.round(hours)} 小时。`,
        '必须体现事后发展：',
        '1. 人物反应：按性格可能催一下、略带埋怨、或装作随意。',
        '2. 意图是否仍成立：若忙已推进/将尽，要在口气里点出时间变化。',
      ].join('\n');
    }
    const days = Math.max(1, Math.round(hours / 24));
    return [
      `时间跨度：约 ${days} 天（较大）。`,
      '必须体现事后发展（强制）：',
      '1. 人物反应：按性格与关系——质问为何才回、冷着、高兴终于通过、或不在意等，禁止当成刚发完秒回。',
      '2. 意图可能已变：帮忙是否已近尾声/已过/已另寻他法；要提醒时间变化，并说明现在还找不找主角、找什么。',
      '当初意图链是开线真相；当前口气必须以「事后」为准。',
    ].join('\n');
  },

  formatIntentChain(chain = null) {
    const c = this.normalizeIntentChain(chain || {}) || { cause: '', process: '', result: '', whyPlayer: '' };
    return [
      `起因：${c.cause || '未记录'}`,
      `过程：${c.process || '未记录'}`,
      `结果：${c.result || '未记录'}`,
      `找主角原由：${c.whyPlayer || '未记录'}`,
    ].join('\n');
  },

  buildOutreachPromptBlock(store = {}, outreach = {}) {
    const sourceRecordId = String(outreach.sourceRecordId || '').trim();
    const openedAt = String(outreach.openedAt || outreach.sentAt || '').trim();
    const now = store.phoneDate?.() || new Date();
    const hours = this.hoursBetween(openedAt, now);
    const original = this.lookupRecordText(store, sourceRecordId);
    const sourceLabel = outreach.source === 'friend-accept' || outreach.source === 'friend-request'
      ? '好友申请通过后的首回'
      : '对方主动来信后的回复';
    return [
      '## 本线外联上下文（强制，保证接上当初为何找你）',
      `情境：你正在微信中扮演该联系人；本次属于「${sourceLabel}」。`,
      '### 当初意图链条（开线时冻结）',
      this.formatIntentChain(outreach.intentChain),
      `### 当初原文（记录ID：${sourceRecordId || '无'}）`,
      original || '（未找到记录原文；仍须按意图链与时间跨度接话，勿编造未给出的情节细节。）',
      '### 时间跨度与事后发展',
      `开线/来信时间：${openedAt || '未知'}`,
      `当前手机时间：${now.toISOString?.() || String(now)}`,
      this.timeSpanGuidance(hours),
    ].join('\n');
  },

  findOpenOutreach(store = {}, contact = {}) {
    const key = store.wechatMessageKey?.(contact) || contact?.id || contact?.characterId || '';
    if (contact?.outreachOpen?.sourceRecordId || contact?.outreachOpen?.intentChain) {
      return contact.outreachOpen;
    }
    const messages = store.wechatMessagesByContact?.[key] || [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg?.side !== 'other') continue;
      if (msg.sourceRecordId || msg.intentChain) {
        return {
          sourceRecordId: msg.sourceRecordId || '',
          intentChain: msg.intentChain || null,
          openedAt: msg.openedAt || msg.atIso || msg.createdAt || '',
          source: msg.outreachSource || 'incoming',
        };
      }
    }
    const req = (store.wechatFriendRequests || []).find((item) => (
      item
      && item.status === 'accepted'
      && (
        (contact.characterId && item.fromCharacterId === contact.characterId)
        || (contact.id && item.fromCharacterId === contact.id)
        || (contact.name && item.fromName === contact.name)
      )
    ));
    if (req && (req.sourceRecordId || req.intentChain)) {
      return {
        sourceRecordId: req.sourceRecordId || '',
        intentChain: req.intentChain || this.intentChainFromReason(req.reason),
        openedAt: req.createdAt || req.resolvedAt || '',
        source: 'friend-accept',
      };
    }
    return null;
  },

  shouldSkipAiIncoming(store = {}, action = {}) {
    const type = String(action.action || action.method || '').trim();
    if (!['sendIncomingNow', 'sendIncomingPast'].includes(type)) return false;
    const key = String(action.contactId || action.characterId || action.name || '').trim();
    if (!key) return false;
    const preparedIds = new Set(store.socialInboxPreparedIds || []);
    return (store.socialInbox || []).some((item) => {
      if (!item || !preparedIds.has(item.id)) return false;
      if (item.channel !== 'wechat' || !item.hasWechatContact) return false;
      return item.actorId === key || item.actorName === key;
    });
  },

  attachOutreachMeta(payload = {}, store = {}, extras = {}) {
    const sourceRecordId = this.resolveSourceRecordId(store, extras.sourceRecordId || payload.sourceRecordId);
    const intentChain = this.normalizeIntentChain(payload.intentChain || extras.intentChain)
      || this.intentChainFromReason(payload.reason || extras.reason || '', extras)
      || this.intentChainFromInboxItem(extras.item || payload);
    const openedAt = String(extras.openedAt || payload.openedAt || (store.phoneDate?.() || new Date()).toISOString?.() || new Date().toISOString());
    return {
      ...payload,
      sourceRecordId,
      intentChain,
      openedAt,
      outreachSource: extras.source || payload.outreachSource || 'incoming',
    };
  },
};
