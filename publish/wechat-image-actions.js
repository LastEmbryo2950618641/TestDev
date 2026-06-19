window.GameModules = window.GameModules || {};
window.GameModules.wechatImageActions = {
  async appendWechatPendingImageMessage(characterId, state = {}, contact = {}, imageIntent = {}) {
    const contactName = state?.profile?.name || contact.name || '联系人';
    const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const imageDescription = String(imageIntent.imageDescription || imageIntent.contentDescription || '一张联系人发送的近照。').trim().slice(0, 180);
    const time = this.wechatMemoryTime?.() || { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim() };
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const imageRecord = this.wechatImageRecordText(contactName, label, imageId, imageDescription);
    this.appendWechatMessage(characterId, { side: 'other', name: contactName, mark: contactName.slice(0, 1), text: '', characterId, imagePending: true, imageStatus: 'pending', imageIntent: { ...imageIntent, imageDescription }, imageId, imageDescription, imageRecord, imageUnreadBy: ['玩家'], imageReadBy: [] });
    await this.recordWechatImageOffer?.({ ...contact, id: characterId, characterId, name: contactName }, time, imageRecord, imageId, imageIntent);
  },

  wechatImageRecordText(contactName, label, imageId, imageDescription) {
    return `${contactName || '联系人'}（${label || '时间未知'}）已发送图片[${imageId}]（状态：未读人（玩家），已读人（），图片内容：${imageDescription || '一张联系人发送的近照。'}）`;
  },

  async recordWechatImageOffer(contact = {}, time = {}, imageRecord = '', imageId = '', imageIntent = {}) {
    const characterId = String(contact.characterId || contact.id || '').trim();
    if (!characterId || contact.group || !imageRecord) return;
    const cm = window.GameModules.characterMemory;
    const impression = Math.max(0, Math.min(100, Math.round(Number(imageIntent.impression) || 35)));
    for (const id of [characterId, 'player-self']) {
      const memory = cm.ensure(id);
      const item = cm.memoryItem(this, { text: imageRecord, source: 'wechat-image', place: '微信', time, impression });
      memory.shortTerm.recent.push(item);
      cm.promote(memory, item);
      await cm.compact(id, memory);
    }
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const seed = window.GameModules.rpgState.seed(`${time.label}-${characterId}-${imageId}`);
    const event = { eventId: `wx_img_${seed}`, name: `微信图片：${contact.name || '联系人'}`, time: label, detail: imageRecord, status: '已记录' };
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    await this.appendWorldlineEvent?.(this.realWorldlineState, event, '现实情节');
  },

  openWechatImageConfirm(msg = {}) {
    if (msg.imageStatus !== 'pending') return;
    this.wechatImageConfirmMessage = msg;
    this.wechatImageConfirmOpen = true;
  },

  closeWechatImageConfirm() { if (!this.wechatImageGenerating) this.wechatImageConfirmOpen = false; },

  wechatRealPhotoForContact(characterId = this.wechatSelectedContact) {
    const raw = this.wechatAlbumPhotos?.[characterId];
    const list = Array.isArray(raw) ? raw : (raw?.url ? [raw] : []);
    return list.find((item) => item?.url && item.real) || null;
  },

  wechatMemorySections(characterId = '') {
    const memory = window.GameModules.characterMemory?.ensure?.(characterId);
    if (!memory) return { shortText: '无', longText: '无' };
    const cm = window.GameModules.characterMemory;
    const shortText = [cm.section('刚发生记忆', memory.shortTerm?.recent), cm.section('归纳总结区', memory.shortTerm?.summaryBuffer), cm.section('近发生记忆', memory.shortTerm?.summarized), cm.section('遗忘区', memory.shortTerm?.forgotten)].join('\n');
    const longText = [cm.section('难以忘记的记忆', memory.longTerm?.vivid), cm.section('不可忘记的记忆', memory.longTerm?.permanent)].join('\n');
    return { shortText, longText };
  },

  wechatWearingContext(state = {}) {
    const list = this.wearingItems?.(state) || [];
    return list.map((item) => `- ${this.wearingName?.(item) || item?.name || '未穿戴'}：${this.wearingDetail?.(item) || ''}`).join('\n') || '无当前穿戴记录';
  },

  cleanWechatImageTags(text = '') { return this.cleanWechatAlbumTags ? this.cleanWechatAlbumTags(text) : String(text || '').trim(); },

  async buildWechatImageTags(msg = {}) {
    const characterId = msg.characterId || this.wechatSelectedContact;
    const contact = this.wechatContacts?.().find((item) => item.id === characterId) || this.wechatSelected?.() || {};
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId) || await this.ensureWechatUserProfile?.(contact);
    const memory = this.wechatMemorySections(characterId);
    const prompt = await window.GameModules.promptTemplates.render('wechat-image-prompt-collect', {
      联系人资料区: this.wechatContactProfileText(contact),
      目标状态快照: window.GameModules.promptSections.stateSnapshot(this, state),
      短期记忆区: memory.shortText,
      长期记忆区: memory.longText,
      当前穿戴区: this.wechatWearingContext(state),
      微信历史: this.wechatHistoryText(characterId),
      自拍意图: [msg.imageIntent?.reason || '', msg.imageIntent?.imageDescription || '', msg.imageIntent?.tagsHint || ''].filter(Boolean).join('\n') || '发送一张当前自拍照',
    });
    const models = await window.dzmm.models.list().catch((err) => { console.error('[微信图片] 模型列表获取失败:', err.code, err.message, err.stack); return { defaultModel: 'nalang-turbo-0826', models: [] }; });
    const model = models.defaultModel || models.models?.[0]?.internalName || 'nalang-turbo-0826';
    const tokenRecordId = window.GameModules.tokenStats?.record?.('wechat-image-prompt-collect', prompt, { model, maxTokens: 500, title: `微信图片提示词收集｜${contact.name || '联系人'}`, category: '图片生成', summary: '根据微信联系人记忆和穿戴生成图片编辑动态标签。', kind: 'completion' });
    let output = '';
    await window.dzmm.completions({ model, messages: [{ role: 'user', content: prompt }], maxTokens: 500 }, (chunk) => { const text = String(chunk || ''); output = window.GameModules.jsonUtils?.mergeStreamText?.(output, text) ?? (output + text); });
    window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, output);
    return this.applyPictureGenerateSensitiveReplacements?.(this.cleanWechatImageTags(output)).slice(0, 1000) || this.cleanWechatImageTags(output).slice(0, 1000);
  },

  updateWechatImageMessage(targetMsg = {}, patch = {}) {
    const key = targetMsg.characterId || this.wechatSelectedContact;
    const same = (msg) => msg.imagePending && msg.time === targetMsg.time && msg.characterId === targetMsg.characterId;
    const list = (this.wechatMessagesByContact?.[key] || []).map((msg) => same(msg) ? { ...msg, ...patch } : msg);
    this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}), [key]: list };
    this.wechatImageConfirmMessage = list.find(same) || null;
  },

  async confirmWechatImageReceive() {
    const msg = this.wechatImageConfirmMessage;
    if (!msg || this.wechatImageGenerating) return;
    const photo = this.wechatRealPhotoForContact(msg.characterId);
    if (!photo?.url) { this.wechatError = '请先在相册中标记一张角色真实照片'; this.wechatImageConfirmOpen = false; return; }
    const reqId = (this.wechatImageRequestId || 0) + 1;
    this.wechatImageRequestId = reqId;
    this.wechatImageGenerating = true;
    this.updateWechatImageMessage(msg, { imageStatus: 'generating' });
    try {
      const tags = await this.buildWechatImageTags(msg);
      const prompt = await window.GameModules.promptTemplates.render('common-image-edit-generate', { 动态标签: tags });
      const drawOptions = { prompt: prompt.slice(0, 2000), images: [photo.url], dimension: '2:3', model: 'lite' };
      const tokenRecordId = window.GameModules.tokenStats?.record?.('draw-edit-wechat-image', drawOptions.prompt, { model: drawOptions.model, title: '微信图片编辑生成', category: '图片生成', summary: '使用角色真实照片编辑生成微信图片。', kind: 'draw' });
      const result = await this.wechatDrawWithRetry(() => window.dzmm.draw.edit(drawOptions));
      window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, JSON.stringify(result || {}, null, 2), result?.images || []);
      if (reqId !== this.wechatImageRequestId) return;
      const url = result?.images?.[0] || '';
      if (!url) throw new Error('图片编辑完成但没有返回图片');
      this.updateWechatImageMessage(msg, { imageStatus: 'done', imageUrl: url, taskId: result.taskId || '', text: '[图片]' });
      await this.save?.();
      this.wechatImageConfirmOpen = false;
    } catch (err) {
      if (reqId !== this.wechatImageRequestId) return;
      console.error('[微信图片] 图片生成失败:', err.code, err.message, err.stack);
      this.wechatError = err.message || '图片生成失败';
      this.updateWechatImageMessage(msg, { imageStatus: 'pending' });
    } finally {
      if (reqId === this.wechatImageRequestId) this.wechatImageGenerating = false;
    }
  },
};
