/**
 * 浜虹墿璁板繂娴佽浆锛氬啓鍏ャ€佸嵃璞°€佸綊绾炽€侀暱鏈熼仐蹇樸€?
 */
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.characterMemory, {
  async addManual(characterId, text, store) {
    const memory = this.ensure(characterId);
    const item = this.memoryItem(store, { text: `鎵嬪姩璁板繂锛?{text}`, source: 'manual', impression: 70 });
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
    if (!characterId) throw new Error('寰俊璁板繂鍐欏叆澶辫触锛氳仈绯讳汉缂哄皯瑙掕壊ID');
    const state = store.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId) || null;
    if (state && !store.rpgStates?.[characterId]) store.rpgStates = { ...(store.rpgStates || {}), [characterId]: state };
    const display = store.displayWechatContact?.(contact) || contact;
    const phoneTime = store.wechatMemoryTime?.() || this.gameTime({ entryTimeLabel: () => `${store.phoneDateText?.() || ''} ${store.phoneTimeText?.() || ''}`.trim() });
    const label = store.wechatDialogueTimeLabel?.(phoneTime.label) || phoneTime.label || '鏃堕棿鏈煡';
    const playerName = store.playerDisplayCharacter?.().name || store.playerName || '鐜╁';
    const contactName = state?.name || state?.profile?.name || display.name || '寰俊鑱旂郴浜?;
    const text = store.formatWechatDialogueLog?.(playerName, contactName, label, playerText, replyText) || `浠ヤ笅鏉ヨ嚜寰俊瀵硅瘽銆?{playerName}锛?{label}锛夛細鈥?{playerText}鈥?{contactName}锛?{label}锛夛細鈥?{replyText}鈥漙;
    const memory = this.ensure(characterId);
    const item = this.memoryItem(store, { text, source: 'wechat', place: '寰俊', time: phoneTime, impression: this.resultImpression(result) });
    memory.shortTerm.recent.push(item);
    this.promote(memory, item);
    await this.compact(characterId, memory);
    const playerMemoryText = text;
    const playerMemory = this.ensure('player-self');
    const playerItem = this.memoryItem(store, { text: playerMemoryText, source: 'wechat', place: '寰俊', time: phoneTime, impression: this.resultImpression(result) });
    playerMemory.shortTerm.recent.push(playerItem);
    this.promote(playerMemory, playerItem);
    await this.compact('player-self', playerMemory);
    console.log('[寰俊璁板繂] 宸插啓鍏?', { characterId, contact: contactName, player: 'player-self', stateFound: Boolean(state) });
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
      place: data.place || store.sceneTitle || '鍦扮偣鏈煡',
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
      `鍦扮偣锛?{store.sceneTitle}`,
      `鐜╁琛屽姩锛?{store.lastAction || '鏃?}`,
      `娴侀€濇椂闂达細${result.elapsedSeconds || 60}绉抈,
      `鍙戠敓锛?{result.narration || ''}`,
      result.speech ? `濂?浠栬杩囷細${result.speech}` : '',
      result.mind ? `濂?浠栧績閲屾兂锛?{result.mind}` : '',
      `鐩爣锛?{result.quest || store.quest}`,
    ].filter(Boolean).join('\n');
  },

  refine(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  },

  summary(text, max = 180) {
    const raw = String(text || '').replace(/鍦扮偣锛歔^ ]+ ?/g, '').replace(/\s+/g, ' ').trim();
    return raw.length > max ? `${raw.slice(0, max - 1)}鈥 : raw;
  },

  impression(store, result, text) {
    const all = `${text} ${result.narration || ''} ${result.mind || ''} ${result.quest || ''}`;
    let score = 25;
    if (/鎿嶆帶|韬綋|澶辨帶|鎺ョ|闄勮韩/.test(all)) score += 18;
    if (/鍙椾激|姝讳骸|鎴樻枟|琛€|鐥泑鏉€|鍗遍櫓/.test(all)) score += 18;
    if (/绉樺瘑|鐪熺浉|濂戠害|鑳屽彌|鎵胯|瑙夐啋|鍦ｆ澂/.test(all)) score += 16;
    if (/鍛婄櫧|鎷晳|淇濇姢|浜插惢|鎷ユ姳|娉獆宕╂簝/.test(all)) score += 16;
    score += this.metricImpact(result.metricUpdates);
    const profile = `${store.character?.role || ''} ${store.character?.detail || ''} ${store.character?.personality || ''}`;
    if (/骞紎寮眧鐥厊鍥殀铏恷鎭恷瀛妯眧闂存|铏珅鐗虹壊|鍙楀/.test(profile)) score += 8;
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
    return this.withTokens({ id: `sum_${Date.now()}_${window.GameModules.rpgState.seed(text)}`, time: { label: `${first.time?.label || '鏃堕棿鏈煡'}-${last.time?.label || '鏃堕棿鏈煡'}`, value: first.time?.value || null }, place: first.place || last.place || '鍦扮偣鏈煡', text, summary: this.summary(text, this.limits.summaryTargetChars), impression: Math.max(...items.map((x) => x.impression || 0), 30), source: 'summary', sourceIds: items.map((x) => x.id), linkedLongTermId: '', createdAt: new Date().toISOString() });
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

