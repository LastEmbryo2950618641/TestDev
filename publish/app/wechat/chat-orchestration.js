window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.chatOrchestration = {
  async sendWechatMessage() {
    const text = String(this.wechatInput || '').trim();
    const target = this.wechatSelected();
    if (!text || this.wechatSending || !target) return;
    this.wechatError = '';
    this.wechatInput = '';
    this.wechatMentionPanelOpen = false;
    this.appendWechatMessage(this.wechatMessageKey(target), { side: 'self', name: this.playerDisplayCharacter?.().name || this.playerName || '我', mark: '我', text });
    if (target.group) await this.recordWechatWorldline(target, text, '');
    await this.save?.();
    if (target.group) return;
    await this.replyWechatContact(target, text);
  },

  async replyWechatContact(contact, playerText) {
    this.wechatSending = true;
    const reqId = (this.wechatReplyRequestId || 0) + 1;
    this.wechatReplyRequestId = reqId;
    try {
      const result = await this.generateWechatReply(contact, playerText);
      if (reqId !== this.wechatReplyRequestId) return;
      const characterId = contact.id;
      const state = this.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId) || await this.ensureWechatUserProfile?.(contact);
      result.characterCardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(state, result.lexiconUpdates || []) || [];
      await this.applyMetricUpdatesToState?.(state, result.metricUpdates);
      await this.applyInventoryUpdatesToState?.(state, result.lexiconUpdates || []);
      result.bodyStatusUpdates = await this.applyWechatBodyStatusUpdates?.(state, result.bodyStatusUpdates || []) || result.bodyStatusUpdates || [];
      this.advancePhoneTime?.(result.elapsedSeconds || 60);
      this.appendWechatMessage(characterId, { side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || '').slice(0, 1), text: result.reply, characterId, metricUpdates: result.metricUpdates, lexiconUpdates: result.lexiconUpdates, bodyStatusUpdates: result.bodyStatusUpdates, characterCardChanges: result.characterCardChanges, cardChangesOpen: false, changeReasonsOpen: false });
      if (result.imageIntent?.offer) await this.appendWechatPendingImageMessage(characterId, state, contact, { ...result.imageIntent, impression: result.impression });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: characterId, characterId }, playerText, result.reply, result);
      window.GameModules.factionArchive?.recordWechat?.(this, { ...contact, id: characterId, characterId }, playerText, result.reply, result);
      await this.recordWechatWorldline({ ...contact, id: characterId, characterId }, playerText, result.reply, result);
      this.debugWechatMemory?.({ ...contact, id: characterId, characterId });
      window.GameModules.wechatOutreachContext?.closeOutreach?.(this, { ...contact, id: characterId, characterId });
      const timeLabel = `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim();
      const contactName = state?.profile?.name || contact.name;
      const contactId = characterId;
      const wechatMsg = window.GameModules.realWorldAgentLoop?.appendWechatDialogueContext?.(this, {
        contactName,
        contactId,
        playerText,
        replyText: result.reply,
        timeLabel,
        kind: 'exchange',
      });
      await window.GameModules.realWorldAgentLoop?.mirrorExternalContextToRealWorldLog?.(this, {
        content: wechatMsg?.content || '',
        kind: 'wechat',
        contactName,
        contactId,
        timeLabel,
      });
      await this.runWechatBehaviorShortInference?.(contact, playerText, result.reply, state, { timeLabel, contactName, contactId });
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatReplyRequestId) return;
      console.error('[微信] 联系人回复生成失败:', err.code, err.message, err.stack);
      this.wechatError = err.message || '联系人暂时没有回复';
      const fallback = '我这边刚刚有点卡，等下再说。';
      const characterId = contact.id;
      const state = this.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId);
      this.advancePhoneTime?.(60);
      this.appendWechatMessage(characterId, { side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || contact.mark || '').slice(0, 1), text: fallback, characterId });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      window.GameModules.factionArchive?.recordWechat?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      await this.recordWechatWorldline({ ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      window.GameModules.wechatOutreachContext?.closeOutreach?.(this, { ...contact, id: characterId, characterId });
      const timeLabel = `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim();
      const contactName = state?.profile?.name || contact.name;
      const wechatMsg = window.GameModules.realWorldAgentLoop?.appendWechatDialogueContext?.(this, {
        contactName,
        contactId: characterId,
        playerText,
        replyText: fallback,
        timeLabel,
        kind: 'exchange',
      });
      await window.GameModules.realWorldAgentLoop?.mirrorExternalContextToRealWorldLog?.(this, {
        content: wechatMsg?.content || '',
        kind: 'wechat',
        contactName,
        contactId: characterId,
        timeLabel,
      });
      await this.runWechatBehaviorShortInference?.(contact, playerText, fallback, state, {
        timeLabel,
        contactName,
        contactId: characterId,
        fallbackOnly: true,
      });
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
    const result = await window.GameModules.jsonUtils.generateJsonWithRetry({
      source: 'wechat-chat-reply', promptId: 'wechat-chat-reply', model: this.modelId || this.settingsState?.textModelId, timeoutMs: 60000, prompt, format: prompt, max: 2,
      parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
      validate: (raw) => this.validateWechatReply(raw, contact),
    });
    return this.attachWechatMentionedImageIntent?.(result, playerText, this.wechatMessageKey(contact)) || result;
  },

  async applyWechatBodyStatusUpdates(state, updates = []) {
    const list = Array.isArray(updates) ? updates : [];
    if (!state?.id || !list.length) return [];
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    state.values = state.values || {};
    if (!state.values.bodyStatus || typeof state.values.bodyStatus !== 'object' || Array.isArray(state.values.bodyStatus)) {
      state.values.bodyStatus = {};
    }
    const applied = [];
    for (const item of list) {
      const partKey = String(item?.partKey || '').trim();
      if (!partKey) continue;
      const current = state.values.bodyStatus[partKey];
      const next = {
        ...(current && typeof current === 'object' ? current : {}),
        partKey,
        part: item.part || partKey,
        status: item.status,
        description: item.description || item.status,
        reason: item.reason,
        pendingAiInit: false,
        initializedByAi: true,
        source: '微信对话',
        updatedAt: new Date().toISOString(),
      };
      if (JSON.stringify(current) === JSON.stringify(next)) continue;
      state.values.bodyStatus[partKey] = next;
      applied.push(item);
    }
    if (applied.length) {
      this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
      await window.GameModules.characterStateStore?.save?.(state);
    }
    return applied;
  },

  fallbackWechatBehavior(contact, playerText, replyText, state) {
    const name = state?.profile?.name || contact?.name || '对方';
    const tip = String(replyText || playerText || '').trim().slice(0, 24);
    return {
      narration: `${name}刚回完微信${tip ? `（提到「${tip}${String(replyText || '').trim().length > 24 ? '…' : ''}」）` : ''}，把手机放回一旁，继续手头原来的事。`,
      currentAction: '继续手头事务',
      availability: '场外',
    };
  },

  async wechatBehaviorShortPrompt(contact, playerText, replyText, state, meta = {}) {
    const template = await window.GameModules.promptTemplates.load('wechat-behavior-short');
    const name = meta.contactName || state?.profile?.name || contact?.name || '联系人';
    const id = meta.contactId || state?.id || contact?.characterId || contact?.id || '';
    const schedule = this.characterSchedules?.[id] || {};
    const contactSummary = [
      state?.profile?.role,
      state?.profile?.personality,
      state?.profile?.detail,
    ].map((x) => String(x || '').trim()).filter(Boolean).join('｜').slice(0, 360) || '资料不足';
    const scheduleSummary = [
      schedule.currentLocation ? `地点:${schedule.currentLocation}` : '',
      schedule.currentAction ? `行动:${schedule.currentAction}` : '',
      schedule.availability ? `可用:${schedule.availability}` : '',
    ].filter(Boolean).join('；') || '无';
    return String(template || '')
      .replaceAll('{{contactName}}', name)
      .replaceAll('{{contactId}}', id)
      .replaceAll('{{phoneTime}}', meta.timeLabel || `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim())
      .replaceAll('{{contactSummary}}', contactSummary)
      .replaceAll('{{scheduleSummary}}', scheduleSummary)
      .replaceAll('{{playerText}}', String(playerText || '').slice(0, 400))
      .replaceAll('{{replyText}}', String(replyText || '').slice(0, 400));
  },

  validateWechatBehaviorShort(raw) {
    const narration = String(raw?.narration || '').trim();
    if (narration.length < 20) return null;
    const availability = String(raw?.availability || '').trim();
    const allowed = new Set(['在场', '场外', '暂不可用', '未知', '']);
    if (!allowed.has(availability)) return null;
    return {
      narration: narration.slice(0, 400),
      currentLocation: String(raw?.currentLocation || '').trim().slice(0, 120),
      currentAction: String(raw?.currentAction || '').trim().slice(0, 160),
      availability,
    };
  },

  async runWechatBehaviorShortInference(contact, playerText, replyText, state, meta = {}) {
    const contactName = meta.contactName || state?.profile?.name || contact?.name || '';
    const contactId = meta.contactId || state?.id || contact?.characterId || contact?.id || '';
    const timeLabel = meta.timeLabel || `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim();
    let result = null;
    if (!meta.fallbackOnly && window.dzmm?.completions) {
      try {
        const prompt = await this.wechatBehaviorShortPrompt(contact, playerText, replyText, state, { ...meta, contactName, contactId, timeLabel });
        result = await window.GameModules.jsonUtils.generateJsonWithRetry({
          source: 'wechat-behavior-short',
          promptId: 'wechat-behavior-short',
          model: this.modelId || this.settingsState?.textModelId,
          timeoutMs: 45000,
          prompt,
          format: prompt,
          max: 2,
          parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
          validate: (raw) => this.validateWechatBehaviorShort(raw),
        });
      } catch (err) {
        console.warn('[微信] 人物行为短推演失败，使用回落:', err?.message || err);
      }
    }
    if (!result) result = this.fallbackWechatBehavior(contact, playerText, replyText, state);
    const behaviorMsg = window.GameModules.realWorldAgentLoop?.appendCharacterBehaviorContext?.(this, {
      contactName,
      contactId,
      narration: result.narration,
      currentLocation: result.currentLocation,
      currentAction: result.currentAction,
      availability: result.availability,
      timeLabel,
    });
    await window.GameModules.realWorldAgentLoop?.mirrorExternalContextToRealWorldLog?.(this, {
      content: behaviorMsg?.content || result.narration,
      kind: 'behavior',
      contactName,
      contactId,
      timeLabel,
      locationName: result.currentLocation || '',
    });
    if (contactId && (result.currentLocation || result.currentAction || result.availability)) {
      try {
        window.GameModules.updateRegistry?.applyCharacterScheduleUpdate?.(this, {
          updateType: 'character-schedule',
          subject: { type: 'character', id: contactId, characterId: contactId, name: contactName },
          field: 'characterSchedules',
          change: {
            mode: 'merge',
            value: {
              ...(result.currentLocation ? { currentLocation: result.currentLocation } : {}),
              ...(result.currentAction ? { currentAction: result.currentAction } : {}),
              ...(result.availability ? { availability: result.availability } : {}),
              reason: '微信往来后人物行为短推演',
            },
          },
          reasons: [{ trigger: '微信短推演', evidence: result.narration.slice(0, 120), confidence: 'confirmed' }],
        });
      } catch (err) {
        console.warn('[微信] 短推演人事安排回写失败:', err?.message || err);
      }
    }
    return result;
  },
};
