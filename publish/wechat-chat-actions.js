window.GameModules = window.GameModules || {};

window.GameModules.wechatChatActions = {
  selectWechatContact(id) {
    this.wechatSelectedContact = id || this.wechatThreads()[0]?.id || 'player-self';
    const current = (this.wechatUsers || []).find((item) => item.id === this.wechatSelectedContact);
    const mappedId = this.wechatCharacterId?.(current) || current?.id;
    if (current && mappedId && mappedId !== current.id) {
      this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}), [mappedId]: this.wechatMessagesByContact?.[mappedId] || this.wechatMessagesByContact?.[current.id] || [] };
      this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === current.id ? { ...item, id: mappedId, characterId: mappedId } : item);
      this.wechatSelectedContact = mappedId;
    }
    const selected = (this.wechatUsers || []).find((item) => item.id === this.wechatSelectedContact);
    const profile = this.rpgStates?.[this.wechatSelectedContact]?.profile;
    if (selected && !window.GameModules.characterProfile.isConcreteName(profile?.name)) {
      this.ensureWechatUserProfile?.(selected).then(() => this.save?.()).catch((err) => console.warn('[微信] 选中联系人资料补全失败:', err.code, err.message, err.stack));
    }
    const renamed = this.syncWechatContactsFromRpgStates?.();
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === this.wechatSelectedContact ? { ...item, unread: 0 } : item);
    this.wechatView = 'chat';
    if (renamed) this.save?.();
  },

  wechatMessages() {
    const target = this.wechatSelected();
    const stored = this.wechatMessagesByContact?.[target?.id] || [];
    if (stored.length) return stored;
    if (target?.group) return [{ side: 'other', name: '系统', mark: '系', text: '新手机已激活，微信数据同步完成。' }];
    return [{ side: 'other', name: target?.name, mark: target?.mark, text: target?.latest || '资料已同步。' }];
  },

  async sendWechatMessage() {
    const text = String(this.wechatInput || '').trim();
    const target = this.wechatSelected();
    if (!text || this.wechatSending || !target) return;
    this.wechatError = '';
    this.wechatInput = '';
    this.appendWechatMessage(target.id, { side: 'self', name: this.playerDisplayCharacter?.().name || this.playerName || '我', mark: '我', text });
    if (target.group) await this.recordWechatWorldline(target, text, '');
    await this.save?.();
    if (target.group) return;
    await this.replyWechatContact(target, text);
  },

  appendWechatMessage(id, msg) {
    const key = id || 'group-main';
    const time = msg.time || this.wechatMessageTime();
    const list = [...(this.wechatMessagesByContact?.[key] || []), { ...msg, at: time.label, atDisplay: time.display, time: time.value }].slice(-40);
    this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}), [key]: list };
    if (msg.text) this.updateWechatLatest(key, msg.text, msg.side === 'other');
  },

  async recordWechatWorldline(contact, playerText, replyText = '', result = {}) {
    const display = this.displayWechatContact?.(contact) || contact || {};
    const time = this.wechatMemoryTime?.() || { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim() };
    const label = time.label || '时间未知';
    const playerName = this.playerDisplayCharacter?.().name || this.playerName || '玩家';
    const detail = [
      '以下来自微信对话。',
      `${playerName}（${label}）：${playerText}`,
      replyText ? `${display.name || '微信联系人'}（${label}）：${replyText}` : '',
    ].filter(Boolean).join('\n');
    const seed = window.GameModules.rpgState.seed(`${time.label}-${contact?.id}-${playerText}-${replyText}`);
    const event = { eventId: `wx_${seed}`, name: `微信对话：${display.name || '联系人'}`, time: label, detail, status: '已记录' };
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    await this.appendWorldlineEvent?.(this.realWorldlineState, event, '现实情节');
  },

  wechatMessageTime() {
    const d = this.phoneDate?.() || new Date();
    return { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), display: this.wechatTimeDisplay(d), value: this.wechatTimeValue(d) };
  },

  wechatMemoryTime() {
    const d = this.phoneDate?.() || new Date();
    return { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), value: this.wechatTimeValue(d) };
  },

  wechatTimeValue(d) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
  },

  wechatTimeDisplay(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  updateWechatLatest(id, latest, incoming = false) {
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === id ? { ...item, latest: String(latest).slice(0, 80), unread: incoming && this.wechatSelectedContact !== id ? (Number(item.unread) || 0) + 1 : item.unread } : item);
  },

  async replyWechatContact(contact, playerText) {
    this.wechatSending = true;
    const reqId = (this.wechatReplyRequestId || 0) + 1;
    this.wechatReplyRequestId = reqId;
    try {
      const result = await this.generateWechatReply(contact, playerText);
      if (reqId !== this.wechatReplyRequestId) return;
      const characterId = this.wechatCharacterId?.(contact) || contact.characterId || contact.id;
      const state = this.rpgStates?.[characterId];
      result.characterCardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(state, result.lexiconUpdates || []) || [];
      await this.applyMetricUpdatesToState?.(state, result.metricUpdates);
      await this.applyInventoryUpdatesToState?.(state, result.lexiconUpdates || []);
      this.advancePhoneTime?.(result.elapsedSeconds || 60);
      this.appendWechatMessage(contact.id, { side: 'other', name: contact.name, mark: contact.mark, text: result.reply, characterCardChanges: result.characterCardChanges, cardChangesOpen: false });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, contact, playerText, result.reply, result);
      await this.recordWechatWorldline(contact, playerText, result.reply, result);
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatReplyRequestId) return;
      console.error('[微信] 联系人回复生成失败:', err.code, err.message, err.stack);
      this.wechatError = err.message || '联系人暂时没有回复';
      const fallback = '我这边刚刚有点卡，等下再说。';
      this.advancePhoneTime?.(60);
      this.appendWechatMessage(contact.id, { side: 'other', name: contact.name, mark: contact.mark, text: fallback });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, contact, playerText, fallback, { mood: '通讯异常' });
      await this.recordWechatWorldline(contact, playerText, fallback, { mood: '通讯异常' });
      await this.save?.();
    } finally {
      if (reqId === this.wechatReplyRequestId) this.wechatSending = false;
    }
  },

  async generateWechatReply(contact, playerText) {
    if (!window.dzmm?.completions) return { reply: this.fallbackWechatReply(contact, playerText), elapsedSeconds: 60, impression: 20 };
    try { await this.ensureWechatUserProfile?.(contact); }
    catch (err) { console.warn('[微信] 回复前资料补全失败，继续用现有资料:', err.code, err.message, err.stack); }
    const prompt = await this.wechatReplyPrompt(contact, playerText);
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source: 'wechat-chat-reply', model: this.modelId || 'nalang-turbo-0826', maxTokens: 500, timeoutMs: 60000, prompt, format: prompt, max: 2,
      parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
      validate: (raw) => this.validateWechatReply(raw, contact),
    });
  },

  async wechatReplyPrompt(contact, playerText) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const stateSkill = await window.GameModules.skillLoader?.instruction?.('emotion.feeling.wearing.assess') || '';
    return window.GameModules.promptTemplates.render('wechat-chat-reply', {
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      联系人资料区: this.wechatContactProfileText(contact),
      手机时间: `${this.phoneDateText?.() || '未知'} ${this.phoneTimeText?.() || ''}`,
      现实场景: this.realWorldSceneTitle || '现实世界',
      现实地点: this.realWorldLocationName || '未确认',
      现实状态: this.realWorldStatus || '现实稳定',
      目标状态快照: sections.stateSnapshot(this, this.rpgStates?.[this.wechatCharacterId?.(contact) || contact.characterId || contact.id]),
      微信历史: this.wechatHistoryText(contact.id),
      玩家消息: playerText,
      状态判定Skill: stateSkill,
    });
  },

  wechatContactProfileText(contact) {
    const display = this.displayWechatContact?.(contact) || contact;
    const characterId = this.wechatCharacterId?.(contact) || contact.characterId || contact.id;
    const state = this.rpgStates?.[characterId];
    const profile = state?.profile || {};
    const rows = [
      ['姓名', profile.name || display.name], ['微信关系', display.relation || display.subtitle], ['角色定位', profile.role || display.context],
      ['背景', profile.detail || contact.latest], ['外貌', profile.appearance], ['性格', profile.personality], ['关系', profile.relationships],
    ];
    return rows.map(([label, value]) => `- ${label}：${String(value || '未记录')}`).join('\n');
  },

  wechatHistoryText(id) {
    const list = (this.wechatMessagesByContact?.[id] || []).slice(-12);
    if (!list.length) return '暂无历史消息。';
    return list.map((msg) => `${msg.side === 'self' ? '玩家' : '联系人'}：${msg.text}`).join('\n');
  },

  validateWechatReply(raw, contact) {
    const reply = String(raw?.reply || '').trim().slice(0, 120) || this.fallbackWechatReply(contact, '');
    const impression = Math.max(0, Math.min(100, Math.round(Number(raw?.impression) || 20)));
    return { reply, mood: String(raw?.mood || '平常').slice(0, 20), elapsedSeconds: Math.max(20, Math.min(1800, Number(raw?.elapsedSeconds) || 60)), impression, metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(raw?.metricUpdates) || {}, lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(raw?.lexiconUpdates, { character: { work: '2026 现代都市现实世界' } }) || [] };
  },

  fallbackWechatReply(contact, text) {
    const rel = String(contact?.relation || '你').replace(/之一|之二/g, '');
    if (/在吗|你好|嗨|哈喽/.test(text)) return `在呀，怎么突然找我？`;
    return `我看到啦，等我想一下再回你。`;
  },
};
