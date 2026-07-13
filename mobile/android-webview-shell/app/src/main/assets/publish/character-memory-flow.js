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
    const characterId = String(contact.id || '').trim();
    if (!characterId) throw new Error('微信记忆写入失败：联系人缺少角色ID');
    const state = store.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId) || null;
    if (state && !store.rpgStates?.[characterId]) store.rpgStates = { ...(store.rpgStates || {}), [characterId]: state };
    const display = store.displayWechatContact?.(contact) || contact;
    const phoneTime = store.wechatMemoryTime?.() || this.gameTime({ entryTimeLabel: () => `${store.phoneDateText?.() || ''} ${store.phoneTimeText?.() || ''}`.trim() });
    const label = store.wechatDialogueTimeLabel?.(phoneTime.label) || phoneTime.label || '时间未知';
    const playerName = store.playerDisplayCharacter?.().name || store.playerName || '玩家';
    const contactName = state?.name || state?.profile?.name || display.name || '微信联系人';
    const text = store.formatWechatDialogueLog?.(playerName, contactName, label, playerText, replyText) || `以下来自微信对话。${playerName}（${label}）：“${playerText}”${contactName}（${label}）：“${replyText}”`;
    const memory = this.ensure(characterId);
    const item = this.memoryItem(store, { text, source: 'wechat', place: '微信', time: phoneTime, impression: this.resultImpression(result) });
    memory.shortTerm.recent.push(item);
    this.promote(memory, item);
    await this.compact(characterId, memory);
    const playerMemoryText = text;
    const playerMemory = this.ensure('player-self');
    const playerItem = this.memoryItem(store, { text: playerMemoryText, source: 'wechat', place: '微信', time: phoneTime, impression: this.resultImpression(result) });
    playerMemory.shortTerm.recent.push(playerItem);
    this.promote(playerMemory, playerItem);
    await this.compact('player-self', playerMemory);
    console.log('[微信记忆] 已写入:', { characterId, contact: contactName, player: 'player-self', stateFound: Boolean(state) });
  },

  relatedStates(store, result) {
    const names = new Set([store.character.name, ...(result.appearedCharacters || []).map((x) => x.name || x)]);
    return Object.values(store.rpgStates).filter((state) => names.has(state.name));
  },

  memoryItem(store, data) {
    const text = this.refine(data.text || '');
    const item = {
      id: `mem_${Date.now()}_${window.GameModules.rpgState.seed(text)}`,
      time: data.time || this.gameTime(store),
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

  resultImpression(result = {}) {
    return Math.max(0, Math.min(100, Math.round(Number(result.impression) || 20)));
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
