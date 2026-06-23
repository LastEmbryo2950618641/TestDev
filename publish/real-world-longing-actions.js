window.GameModules = window.GameModules || {};

window.GameModules.realWorldLongingActions = {
  realWorldLongingRoster() {
    const byId = new Map();
    (this.wechatContacts?.() || []).filter((c) => !c.group).forEach((contact) => {
      const id = this.wechatMessageKey?.(contact) || contact.id;
      const state = this.itemSkillState?.(id) || this.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id);
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
      const feeling = Number(item.state?.metrics?.playerFeelings?.好感) || 0;
      const meter = this.longingStateFor(item.state);
      const triggers = this.longingTriggersFor(item, meter, feeling, elapsedSeconds, startMs, endMs);
      item.state.values.longing_to_player = triggers.meter;
      if (triggers.events.length) events.push(...triggers.events);
      this.rpgStates = { ...(this.rpgStates || {}), [item.state.id]: item.state };
      await window.GameModules.sqliteSave.saveCharacterState?.(item.state);
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
    const pending = this.realWorldLongingEvents || [];
    this.realWorldLongingPreparedIds = pending.map((e) => e.id);
    const roster = this.realWorldLongingRoster().map(({ contact, state }) => {
      const profile = state.profile || {};
      const meter = this.longingStateFor(state);
      const feeling = Number(state.metrics?.playerFeelings?.好感) || 0;
      return `- ${profile.name || contact?.name || state.name}｜id:${state.id}｜关系:${contact?.relation || profile.role || '未知'}｜好感度:${feeling}｜思念度:${meter.value.toFixed(1)}｜性格:${profile.personality || '未记录'}｜微信:${contact?.id || '未确认'}`;
    }).join('\n') || '暂无可追踪角色。';
    const events = pending.map((e) => `- ${e.missed ? '过去错过' : '当前触发'}｜${e.timeIso}｜${e.name}(${e.characterId})｜${e.relation || '关系未知'}｜好感${e.feeling}｜性格:${e.personality || '未记录'}`).join('\n') || '暂无已触发事件。';
    return [`## 角色思念系统`, `规则：好感度<20不增长；否则按 elapsedSeconds/172800、随机系数0.3-1.0、好感度累积思念度；满100触发一次，溢出保留余数。`, `本轮已触发的思念事件必须在 final.narration 中体现；过去错过事件可写成未读微信或未接触达，当前触发事件应让角色以符合性格的方式联系或靠近玩家。`, `若角色选择微信联系，final.wechatActions 使用 sendIncomingNow 或 sendIncomingPast 写入消息；过去错过事件使用 sendIncomingPast。`, `### 当前角色思念状态\n${roster}`, `### 待注入思念事件\n${events}`].join('\n');
  },

  clearPreparedRealWorldLongingEvents() {
    const ids = new Set(this.realWorldLongingPreparedIds || []);
    if (ids.size) this.realWorldLongingEvents = (this.realWorldLongingEvents || []).filter((e) => !ids.has(e.id));
    this.realWorldLongingPreparedIds = [];
  },
};
