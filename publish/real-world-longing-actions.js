window.GameModules = window.GameModules || {};

window.GameModules.realWorldLongingActions = {
  realWorldLongingRoster() {
    const byId = new Map();
    (this.wechatContacts?.() || []).filter((c) => !c.group).forEach((contact) => {
      const id = this.wechatMessageKey?.(contact) || contact.id;
      const state = this.itemSkillState?.(id) || this.rpgStates?.[id] || window.GameModules.characterStateStore?.get?.(id);
      if (id && state?.id && state.id !== 'player-self') byId.set(state.id, { contact, state });
    });
    Object.values(this.rpgStates || {}).forEach((state) => {
      if (state?.id && state.id !== 'player-self' && !byId.has(state.id)) byId.set(state.id, { contact: null, state });
    });
    return [...byId.values()];
  },

  longingStateFor(state) {
    state.values = state.values || {};
    const raw = state.values.longing_to_player || {};
    const base = Number(this.phoneFixedTime) || Date.now();
    return { value: Math.max(0, Math.min(999, Number(raw.value) || 0)), updatedAt: Number(raw.updatedAt) || base };
  },

  async settleRealWorldLongingMeters(elapsedSeconds, startMs, endMs) {
    const delta = Math.max(0, Number(endMs) - Number(startMs));
    if (!delta) return [];
    const events = [];
    for (const item of this.realWorldLongingRoster()) {
      const feeling = Number(item.state?.metrics?.playerFeelings?.濂芥劅) || 0;
      const meter = this.longingStateFor(item.state);
      const triggers = this.longingTriggersFor(item, meter, feeling, elapsedSeconds, startMs, endMs);
      item.state.values.longing_to_player = triggers.meter;
      if (triggers.events.length) events.push(...triggers.events);
      this.rpgStates = { ...(this.rpgStates || {}), [item.state.id]: item.state };
      await window.GameModules.characterStateStore?.save?.(item.state);
    }
    this.realWorldLongingEvents = [...(this.realWorldLongingEvents || []), ...events].slice(-20);
    return events;
  },

  longingTriggersFor(item, meter, feeling, elapsedSeconds, startMs, endMs) {
    if (feeling < 20) return { meter: { ...meter, updatedAt: endMs }, events: [] };
    const gain = (0.3 + 0.7 * Math.random()) * feeling * (Math.max(0, Number(elapsedSeconds) || 0) / 172800);
    const total = meter.value + gain;
    const count = Math.floor(total / 100);
    const next = { value: total % 100, updatedAt: endMs };
    if (count < 1) return { meter: { ...next, value: total }, events: [] };
    return { meter: next, events: this.makeLongingEvents(item, count, startMs, endMs, feeling) };
  },

  makeLongingEvents(item, count, startMs, endMs, feeling) {
    const profile = item.state.profile || {};
    const contact = item.contact || { id: item.state.id, name: profile.name || item.state.name };
    return Array.from({ length: count }, (_, index) => {
      const last = index === count - 1;
      const ratio = last ? 1 : (0.6 + 0.4 * Math.random()) * ((index + 1) / count);
      const at = new Date(startMs + (endMs - startMs) * ratio);
      return {
        id: `longing-${item.state.id}-${at.getTime()}-${index}`,
        characterId: item.state.id,
        contactId: contact.id || item.state.id,
        name: profile.name || contact.name || item.state.name,
        relation: contact.relation || profile.role || '',
        personality: profile.personality || profile.detail || '',
        feeling,
        missed: !last,
        timeIso: at.toISOString(),
      };
    });
  },

  prepareRealWorldLongingContext() {
    const pending = (this.realWorldLongingEvents || []).filter((e) => e?.id);
    if (!pending.length) return '';
    this.realWorldLongingPreparedIds = pending.map((e) => e.id);
    const events = pending.map((e) => `- ${e.missed ? '杩囧幓閿欒繃' : '褰撳墠瑙﹀彂'}锝?{e.timeIso}锝?{e.name}(${e.characterId})锝滆仈绯讳汉:${e.contactId || '鏈‘璁?}锝?{e.relation || '鍏崇郴鏈煡'}锝滃ソ鎰?{e.feeling}锝滄€ф牸:${e.personality || '鏈褰?}`).join('\n');
    return [`## 鏈疆瑙﹀彂鐨勮鑹叉€濆康浜嬩欢`, `浠ヤ笅浜嬩欢蹇呴』鍦?final.narration 涓槑纭綋鐜般€傝繃鍘婚敊杩囦簨浠跺啓鎴愯鑹插湪瀵瑰簲杩囧幓鏃堕棿鎯宠捣鐜╁銆佽瘯鍥捐仈绯绘垨闈犺繎浣嗙帺瀹舵湭鍥炲簲锛涘綋鍓嶈Е鍙戜簨浠惰瑙掕壊鎸夋€ф牸浠ユ壘鐜╁銆佸彂寰俊銆佹墦鐢佃瘽銆佷笂闂ㄣ€佹墭浜鸿闂瓑鍚堢悊鏂瑰紡琛屽姩銆俙, `鑻ヨ鑹查€夋嫨寰俊鑱旂郴锛屽厛璇锋眰 wechat.query.listWechatSkills / listContacts / getThread 纭鑱旂郴浜哄拰鍙ｅ惢锛沠inal.wechatActions 浣跨敤 sendIncomingPast 鍐欒繃鍘婚敊杩囨秷鎭紝浣跨敤 sendIncomingNow 鍐欏綋鍓嶆秷鎭€備笉瑕佷唬鏇跨帺瀹跺洖澶嶃€俙, events].join('\n');
  },

  clearPreparedRealWorldLongingEvents() {
    const ids = new Set(this.realWorldLongingPreparedIds || []);
    if (ids.size) this.realWorldLongingEvents = (this.realWorldLongingEvents || []).filter((e) => !ids.has(e.id));
    this.realWorldLongingPreparedIds = [];
  },
};


