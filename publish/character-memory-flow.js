/**
 * 人物记忆流转：写入、印象、归纳、长期遗忘。
 */
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.characterMemory, {
  async addManual(characterId, text, store) {
    const memory = this.ensure(characterId);
    const item = this.memoryItem(store, { text: `手动记忆：${text}`, source: 'manual', impression: 70 });
    memory.shortTerm.recent.push(item);
    this.promote(memory, item);
    await this.compact(characterId, memory);
  },

  async recordTurn(store, result) {
    const states = this.relatedStates(store, result);
    const text = this.eventText(store, result);
    for (const state of states) {
      const memory = this.ensure(state.id);
      const item = this.memoryItem(store, { text, source: 'turn', impression: this.impression(store, result, text) });
      memory.shortTerm.recent.push(item);
      this.promote(memory, item);
      await this.compact(state.id, memory);
    }
  },

  async recordWechatExchange(store, contact, playerText, replyText, result = {}) {
    if (!contact?.id || contact.group) return;
    const state = store.rpgStates?.[contact.id];
    if (!state) return;
    const display = store.displayWechatContact?.(contact) || contact;
    const text = [
      '来源：微信发起的对话',
      `联系人：${state.name || display.name}`,
      `玩家发送：${playerText}`,
      `联系人回复：${replyText}`,
      result.mood ? `联系人语气：${result.mood}` : '',
    ].filter(Boolean).join('\n');
    const memory = this.ensure(state.id);
    const item = this.memoryItem(store, { text, source: 'wechat', place: '微信', impression: this.wechatImpression(playerText, replyText, result) });
    memory.shortTerm.recent.push(item);
    this.promote(memory, item);
    await this.compact(state.id, memory);
  },

  relatedStates(store, result) {
    const names = new Set([store.character.name, ...(result.appearedCharacters || []).map((x) => x.name || x)]);
    return Object.values(store.rpgStates).filter((state) => names.has(state.name));
  },

  memoryItem(store, data) {
    const text = this.refine(data.text || '');
    const item = {
      id: `mem_${Date.now()}_${window.GameModules.rpgState.seed(text)}`,
      time: this.gameTime(store),
      place: data.place || store.sceneTitle || '地点未知',
      text,
      summary: this.summary(text, this.limits.summaryTargetChars),
      impression: Math.max(0, Math.min(100, Math.round(data.impression || 20))),
      source: data.source || 'turn',
      sourceIds: data.sourceIds || [],
      linkedLongTermId: '',
      createdAt: new Date().toISOString(),
    };
    return this.withTokens(item);
  },

  eventText(store, result) {
    return [
      `地点：${store.sceneTitle}`,
      `玩家行动：${store.lastAction || '无'}`,
      `流逝时间：${result.elapsedSeconds || 60}秒`,
      `发生：${result.narration || ''}`,
      result.speech ? `她/他说过：${result.speech}` : '',
      result.mind ? `她/他心里想：${result.mind}` : '',
      `目标：${result.quest || store.quest}`,
    ].filter(Boolean).join('\n');
  },

  refine(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  },

  summary(text, max = 180) {
    const raw = String(text || '').replace(/地点：[^ ]+ ?/g, '').replace(/\s+/g, ' ').trim();
    return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
  },

  impression(store, result, text) {
    const all = `${text} ${result.narration || ''} ${result.mind || ''} ${result.quest || ''}`;
    let score = 25;
    if (/操控|身体|失控|接管|附身/.test(all)) score += 18;
    if (/受伤|死亡|战斗|血|痛|杀|危险/.test(all)) score += 18;
    if (/秘密|真相|契约|背叛|承诺|觉醒|圣杯/.test(all)) score += 16;
    if (/告白|拯救|保护|亲吻|拥抱|泪|崩溃/.test(all)) score += 16;
    score += this.metricImpact(result.metricUpdates);
    const profile = `${store.character?.role || ''} ${store.character?.detail || ''} ${store.character?.personality || ''}`;
    if (/幼|弱|病|囚|虐|恐|孤|樱|间桐|虫|牺牲|受害/.test(profile)) score += 8;
    return Math.max(0, Math.min(100, score));
  },

  metricImpact(updates) {
    const list = [...(updates?.emotions || []), ...(updates?.playerFeelings || [])];
    const total = list.reduce((sum, item) => sum + Math.abs(Number(item.delta) || 0), 0);
    return Math.min(20, Math.round(total / 8));
  },

  wechatImpression(playerText, replyText, result = {}) {
    const all = `${playerText || ''} ${replyText || ''} ${result.mood || ''}`;
    let score = 35;
    if (/秘密|真心|承诺|喜欢|爱|想你|依赖|家人|哥哥|妹妹/.test(all)) score += 18;
    if (/害怕|担心|哭|难过|生气|吃醋|占有|保护/.test(all)) score += 14;
    if (/约见|见面|回家|等你|别走|陪我/.test(all)) score += 10;
    return Math.max(0, Math.min(100, score));
  },

  promote(memory, item) {
    if (item.impression >= this.limits.vividThreshold && !memory.longTerm.vivid.some((x) => x.id === item.id)) {
      memory.longTerm.vivid.push({ ...item, source: 'vivid' });
      item.linkedLongTermId = item.id;
    }
    if (item.impression >= this.limits.permanentThreshold) this.addPermanent(memory, item);
  },

  addPermanent(memory, item) {
    const p = memory.longTerm.permanent;
    if (p.some((x) => x.id === item.id)) return;
    p.push({ ...item, source: 'permanent' });
    while (this.stats(p, this.limits.permanent).tokens > this.limits.permanent && p.length > 1) {
      const weakest = p.reduce((best, x, i) => (x.impression < p[best].impression ? i : best), 0);
      if (p[weakest].id === item.id) { p.splice(weakest, 1); break; }
      p.splice(weakest, 1);
    }
  },

  async compact(characterId, memory) {
    this.moveOverflow(memory.shortTerm.recent, memory.shortTerm.summaryBuffer, this.limits.recent);
    if (this.stats(memory.shortTerm.summaryBuffer, this.limits.summaryBuffer).tokens > this.limits.summaryBuffer) {
      const summary = this.summarizeBuffer(memory.shortTerm.summaryBuffer);
      memory.shortTerm.summarized.push(summary);
      await window.GameModules.sqliteSave.saveMemoryArchive(characterId, this.archiveItem(characterId, summary, memory.shortTerm.summaryBuffer.map((x) => x.text).join('\n')));
      memory.shortTerm.summaryBuffer = [];
    }
    this.moveOverflow(memory.shortTerm.summarized, memory.shortTerm.forgotten, this.limits.summarized);
    this.trimFifo(memory.shortTerm.forgotten, this.limits.forgotten);
    this.trimVivid(memory.longTerm.vivid, this.limits.vivid);
    memory.updatedAt = new Date().toISOString();
    memory.archive = this.archiveStats(characterId);
    await window.GameModules.sqliteSave.saveCharacterMemory(characterId, memory);
  },

  summarizeBuffer(items) {
    const first = items[0]; const last = items[items.length - 1] || first;
    const text = items.map((x) => x.summary || x.text).join(' ');
    return this.withTokens({ id: `sum_${Date.now()}_${window.GameModules.rpgState.seed(text)}`, time: { label: `${first.time?.label || '时间未知'}-${last.time?.label || '时间未知'}`, value: first.time?.value || null }, place: first.place || last.place || '地点未知', text, summary: this.summary(text, this.limits.summaryTargetChars), impression: Math.max(...items.map((x) => x.impression || 0), 30), source: 'summary', sourceIds: items.map((x) => x.id), linkedLongTermId: '', createdAt: new Date().toISOString() });
  },

  moveOverflow(from, to, maxTokens) {
    while (this.stats(from, maxTokens).tokens > maxTokens && from.length) to.push(from.shift());
  },

  trimFifo(items, maxTokens) {
    while (this.stats(items, maxTokens).tokens > maxTokens && items.length) items.shift();
  },

  trimVivid(items, maxTokens) {
    while (this.stats(items, maxTokens).tokens > maxTokens && items.length > 1) {
      let weakest = 0;
      items.forEach((item, i) => {
        if (item.impression < items[weakest].impression || (item.impression === items[weakest].impression && item.createdAt < items[weakest].createdAt)) weakest = i;
      });
      items.splice(weakest, 1);
    }
  },
});
