window.GameModules = window.GameModules || {};

/**
 * Stage5：介绍卡更新入口。
 * Stage5-1 负责真正建介绍卡；Stage5-2 负责已有介绍卡的增量更新。
 */
window.GameModules.inferenceIntroCardStageUpdate = {
  scalarFields: new Set([
    'identity.role',
    'identity.age',
    'identity.gender',
    'identity.job',
    'identity.baseLocation',
    'persona.appearance',
    'persona.personality',
    'persona.background',
    'persona.voice',
    'social.relationToPlayer',
    'social.relationDetail',
    'agenda.short',
    'agenda.deadline',
    'agenda.needPlayer',
    'agenda.needPlayerWhy',
    'agenda.urgency',
  ]),

  deltaFields: new Set(['social.affection', 'social.familiarity']),
  listFields: new Set(['persona.preferences', 'persona.attraction', 'routine.tags', 'memory.facts']),

  candidates(updates = {}) {
    const rows = [
      ...(Array.isArray(updates.appearedCharacters) ? updates.appearedCharacters : []),
      ...(Array.isArray(updates.solidifiableCharacters) ? updates.solidifiableCharacters : []),
    ];
    const seen = new Set();
    return rows.filter((row) => {
      const key = String(row?.id || row?.name || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  },

  parseOpsPayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { ops: [], done: true };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const ops = Array.isArray(data.ops) ? data.ops : (Array.isArray(data.operations) ? data.operations : []);
      return { ops, done: data.done !== false, raw: data };
    } catch (_) {
      return { ops: [], done: true };
    }
  },

  parseCreatePayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { cards: [], done: true };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const cards = Array.isArray(data.cards) ? data.cards : (Array.isArray(data.creates) ? data.creates : []);
      return { cards, done: data.done !== false, raw: data };
    } catch (_) {
      return { cards: [], done: true };
    }
  },

  clamp100(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  },

  pathGet(root = {}, path = '') {
    return String(path || '').split('.').filter(Boolean).reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), root);
  },

  pathSet(root = {}, path = '', value = '') {
    const keys = String(path || '').split('.').filter(Boolean);
    if (!keys.length) return false;
    let cursor = root;
    for (const key of keys.slice(0, -1)) {
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[keys[keys.length - 1]] = value;
    return true;
  },

  normalizeScalar(field = '', value = '') {
    if (field === 'agenda.needPlayer') return Boolean(value);
    if (field === 'agenda.urgency') {
      const num = Number(value);
      return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0;
    }
    const limits = {
      'identity.age': 8,
      'identity.gender': 8,
      'identity.role': 40,
      'identity.job': 40,
      'identity.baseLocation': 60,
      'persona.appearance': 120,
      'persona.personality': 120,
      'persona.background': 200,
      'persona.voice': 60,
      'social.relationToPlayer': 40,
      'social.relationDetail': 80,
      'agenda.short': 160,
      'agenda.deadline': 32,
      'agenda.needPlayerWhy': 120,
    };
    return String(value ?? '').trim().slice(0, limits[field] || 120);
  },

  normalizeListItem(field = '', value = '') {
    const limits = {
      'persona.preferences': 12,
      'persona.attraction': 12,
      'routine.tags': 16,
      'memory.facts': 40,
    };
    return String(value ?? '').trim().slice(0, limits[field] || 24);
  },

  findCard(cards = [], op = {}) {
    const id = String(op.id || op.cardId || '').trim();
    const name = String(op.name || op.targetName || '').trim();
    return (cards || []).find((card) => (id && card.id === id) || (name && card.name === name)) || null;
  },

  stage4Summary(updates = {}) {
    const picked = {
      type: updates.type || '',
      summary: updates.summary || updates.sceneSummary || '',
      appearedCharacters: updates.appearedCharacters || [],
      solidifiableCharacters: updates.solidifiableCharacters || [],
      characterCardChanges: updates.characterCardChanges || [],
      relationshipChanges: updates.relationshipChanges || updates.relationChanges || [],
      memories: updates.memories || updates.memoryChanges || [],
    };
    return JSON.stringify(picked, null, 2).slice(0, 5000);
  },

  participantsText(participants = []) {
    const rows = (Array.isArray(participants) ? participants : [])
      .map((item) => {
        const id = String(item?.id || item?.idOrName || '').trim();
        const name = String(item?.name || item?.rawName || '').trim();
        const role = String(item?.role || item?.reason || '').trim();
        return [name || id || '未知', id && `ID:${id}`, role].filter(Boolean).join('｜');
      })
      .filter(Boolean);
    return rows.length ? rows.slice(0, 16).join('\n') : '无';
  },

  cardsText(cards = []) {
    const slim = (cards || []).map((card) => ({
      id: card.id,
      name: card.name,
      worldTag: card.worldTag,
      presenceKind: card.presenceKind,
      identity: card.identity || {},
      persona: card.persona || {},
      social: card.social || {},
      agenda: card.agenda || {},
      routine: card.routine || {},
      memory: card.memory || {},
    }));
    return JSON.stringify(slim, null, 2).slice(0, 8000);
  },

  candidateText(cards = []) {
    const slim = (cards || []).map((card) => ({
      id: card.id,
      name: card.name,
      worldTag: card.worldTag,
      presenceKind: card.presenceKind,
      roleHint: card.identity?.role || '',
      introHint: card.persona?.background || '',
      relationHint: card.social?.relationToPlayer || '',
    }));
    return JSON.stringify(slim, null, 2).slice(0, 6000);
  },

  tagList(value = [], max = 8, each = 12) {
    const list = Array.isArray(value)
      ? value
      : String(value || '').split(/[、,，;/｜|]/u);
    return list.map((item) => String(item || '').trim().slice(0, each)).filter(Boolean).slice(0, max);
  },

  baseLocationFromCurrentLocation(location = '') {
    const parts = String(location || '').split('·').map((item) => item.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2].slice(0, 60);
    return String(location || '').trim().slice(0, 60);
  },

  roleAge(state = {}, profile = {}) {
    const explicit = profile.age ?? state.age ?? state.characterAge ?? '';
    if (explicit !== '' && explicit !== null && explicit !== undefined) return String(explicit).trim().slice(0, 8);
    if (profile.birthday && window.GameModules.characterProfile?.ageFromBirthday) {
      return String(window.GameModules.characterProfile.ageFromBirthday(profile.birthday) || '').slice(0, 8);
    }
    return '';
  },

  syncRoleToIntro(card = {}) {
    const roleState = card.roleState || window.GameModules.characterIntroCard?.roleCardState?.(card);
    if (!roleState || window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(roleState)) return null;
    const profile = roleState.profile || {};
    const metrics = roleState.metrics || roleState.values?.metrics || {};
    const feelings = metrics.playerFeelings || roleState.values?.feelings || {};
    const socialDrive = profile.socialDrive || {};
    const agenda = socialDrive.agenda || {};
    const name = String(profile.name || roleState.name || card.name || '').trim().slice(0, 24);
    const worldTag = String(profile.work || roleState.worldTag || card.worldTag || '').trim().slice(0, 40);
    const currentLocation = profile.currentLocation || '';
    const next = {
      ...card,
      name: name || card.name,
      worldTag: worldTag || card.worldTag,
      identity: {
        ...(card.identity || {}),
        role: String(profile.role || card.identity?.role || '').trim().slice(0, 40),
        age: this.roleAge(roleState, profile),
        gender: String(profile.gender || card.identity?.gender || '').trim().slice(0, 8),
        job: String(profile.job || profile.profession || card.identity?.job || '').trim().slice(0, 40),
        baseLocation: this.baseLocationFromCurrentLocation(currentLocation) || card.identity?.baseLocation || '',
      },
      persona: {
        ...(card.persona || {}),
        appearance: String(profile.appearance || card.persona?.appearance || '').trim().slice(0, 120),
        personality: String(profile.personality || card.persona?.personality || '').trim().slice(0, 120),
        background: String(profile.detail || card.persona?.background || card.intro || '').trim().slice(0, 200),
        preferences: this.tagList(profile.preferences || card.persona?.preferences, 8, 12),
      },
      social: {
        ...(card.social || {}),
        relationToPlayer: String(socialDrive.relationToPlayer || card.social?.relationToPlayer || '').trim().slice(0, 40),
        relationDetail: String(socialDrive.relationDetail || card.social?.relationDetail || '').trim().slice(0, 80),
        familiarity: this.clamp100(socialDrive.familiarity ?? card.social?.familiarity ?? 0),
        affection: this.clamp100(feelings.好感 ?? feelings.affection ?? card.social?.affection ?? 0),
      },
      agenda: {
        ...(card.agenda || {}),
        short: String(agenda.short || card.agenda?.short || '').trim().slice(0, 160),
        deadline: String(agenda.deadline || card.agenda?.deadline || '').trim().slice(0, 32),
        needPlayer: Boolean(agenda.needPlayer ?? card.agenda?.needPlayer),
        needPlayerWhy: String(agenda.needPlayerWhy || card.agenda?.needPlayerWhy || '').trim().slice(0, 120),
        urgency: Math.max(0, Math.min(1, Number(agenda.urgency ?? card.agenda?.urgency ?? 0) || 0)),
      },
    };
    next.role = next.identity.role || next.role || '';
    next.intro = next.persona.background || next.intro || '';
    next.work = next.worldTag || next.work || '';
    return next;
  },

  buildCreatePrompt({ participants = [], candidateCards = [], narration = '', updates = {} } = {}) {
    return [
      '# Stage5-1 介绍卡建卡',
      '角色：介绍卡首建器。你这一阶段只负责为本轮新出现、尚不存在介绍卡的人物/存在创建完整介绍卡。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '',
      '## 规则',
      '1. 只创建当前“待建介绍卡候选”里的条目；不要更新已有介绍卡。',
      '2. 每张新卡必须尽量一次性补全：id、name、worldTag、presenceKind、identity、persona、social、agenda、routine、memory。',
      '3. 可以结合正文与 Stage4 结算摘要做稳定推演；但不要编造与上下文无关的设定。',
      '4. 若某项细节无法稳定判断，可留空字符串、空数组或 0。',
      '5. 若没有需要新建的介绍卡，返回 { "cards": [], "done": true }。',
      '',
      '## 本回合参与者',
      this.participantsText(participants),
      '',
      '## 待建介绍卡候选',
      this.candidateText(candidateCards),
      '',
      '## 本轮正文',
      String(narration || '').slice(0, 5000),
      '',
      '## Stage4 结算摘要',
      this.stage4Summary(updates),
      '',
      '## 输出 JSON Schema',
      '{ "cards": [ { "id": "介绍卡ID", "name": "姓名", "worldTag": "世界", "presenceKind": "individual|group", "identity": {}, "persona": {}, "social": {}, "agenda": {}, "routine": { "tags": [] }, "memory": { "facts": [] } } ], "done": true }',
    ].join('\n');
  },

  buildUpdatePrompt({ participants = [], introCards = [], narration = '', updates = {} } = {}) {
    return [
      '# Stage5-2 介绍卡更新',
      '角色：介绍卡字段更新器。你这一阶段只负责更新已有介绍卡。',
      '只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '',
      '## 规则',
      '1. 只允许输出介绍卡字段更新 ops；不要创建新卡。',
      '2. 仅在正文或结算摘要提供明确事实变化时更新。',
      '3. 已有完整角色卡的人物，不要在此独立推演介绍卡字段。',
      '4. 标量字段只允许 set；数值字段只允许 delta；集合字段只允许 add/replace/delete。',
      '5. 没有可更新内容时返回 { "ops": [], "done": true }。',
      '',
      '## 本回合参与者',
      this.participantsText(participants),
      '',
      '## 候选介绍卡',
      this.cardsText(introCards),
      '',
      '## 本轮正文',
      String(narration || '').slice(0, 5000),
      '',
      '## Stage4 结算摘要',
      this.stage4Summary(updates),
      '',
      '## 输出 JSON Schema',
      '{ "ops": [ { "id": "介绍卡ID", "field": "identity.role", "op": "set", "value": "完整新值", "reason": "正文或资料依据" } ], "done": true }',
    ].join('\n');
  },

  async saveCard(card = null) {
    if (!card) return null;
    const introStore = window.GameModules.characterIntroStore;
    const { displayType, roleState, ...cleanCard } = card;
    const next = {
      ...cleanCard,
      role: cleanCard.identity?.role || cleanCard.role || '',
      intro: cleanCard.persona?.background || cleanCard.intro || '',
      work: cleanCard.worldTag || cleanCard.work || '',
      meta: {
        ...(cleanCard.meta || {}),
        updatedAt: new Date().toISOString(),
      },
    };
    return await introStore?.save?.(next);
  },

  async requestStage5(loop, store, prompt, logId, config = {}, sourceTitle = '') {
    if (loop?.completeCachedJsonPrompt) {
      return await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        ...config,
        sourceTitle,
        promptId: 'inference-stage5-intro-card-update',
        reasoningPhase: 'stage5',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
    }
    return await loop?.completeConfiguredStep?.(store, prompt, logId, false, {
      ...config,
      sourceTitle,
      promptId: 'inference-stage5-intro-card-update',
      reasoningPhase: 'stage5',
      jsonMode: true,
      outputLimitKind: 'stage4',
    });
  },

  existingIntroCard(card = {}, store = null) {
    const introStore = window.GameModules.characterIntroStore;
    const id = String(card?.id || '').trim();
    const name = String(card?.name || '').trim();
    const worldTag = String(card?.worldTag || card?.work || store?.currentWorldTag?.() || window.GameModules.realWorld2026?.label || '').trim();
    return (id && introStore?.getById?.(id)) || introStore?.get?.(name, worldTag) || null;
  },

  mergeCreateCard(candidate = {}, raw = {}) {
    const merged = {
      ...candidate,
      ...raw,
      id: String(raw.id || candidate.id || '').trim(),
      name: String(raw.name || candidate.name || '').trim(),
      worldTag: String(raw.worldTag || candidate.worldTag || candidate.work || '').trim(),
      presenceKind: String(raw.presenceKind || candidate.presenceKind || 'individual').trim() || 'individual',
      identity: {
        ...(candidate.identity || {}),
        ...(raw.identity || {}),
      },
      persona: {
        ...(candidate.persona || {}),
        ...(raw.persona || {}),
      },
      social: {
        ...(candidate.social || {}),
        ...(raw.social || {}),
      },
      agenda: {
        ...(candidate.agenda || {}),
        ...(raw.agenda || {}),
      },
      routine: {
        ...(candidate.routine || {}),
        ...(raw.routine || {}),
      },
      memory: {
        ...(candidate.memory || {}),
        ...(raw.memory || {}),
      },
    };
    merged.role = merged.identity?.role || merged.role || '';
    merged.intro = merged.persona?.background || merged.intro || '';
    merged.work = merged.worldTag || merged.work || '';
    return merged;
  },

  async applyCreateCards(store, candidateCards = [], payloadCards = []) {
    const introApi = window.GameModules.characterIntroCard;
    const lines = [];
    const created = [];
    const rejected = [];
    const usedKeys = new Set();
    for (const raw of (Array.isArray(payloadCards) ? payloadCards : []).slice(0, 24)) {
      const rawId = String(raw?.id || '').trim();
      const rawName = String(raw?.name || '').trim();
      const candidate = candidateCards.find((item) => ((rawId && item.id === rawId) || (rawName && item.name === rawName))) || null;
      if (!candidate) {
        rejected.push({ raw, reason: '不在待建介绍卡候选中' });
        continue;
      }
      const merged = this.mergeCreateCard(candidate, raw);
      if (!merged.id || !merged.name) {
        rejected.push({ raw, reason: '缺少 id/name' });
        continue;
      }
      if (introApi?.roleCardExists?.(merged)) {
        rejected.push({ raw, reason: '已有完整角色卡，不走介绍卡首建' });
        continue;
      }
      try {
        const saved = await introApi?.ensure?.(store, merged, 'stage5-create');
        if (!saved) {
          rejected.push({ raw, reason: '保存失败' });
          continue;
        }
        created.push(saved);
        usedKeys.add(saved.id || saved.name);
      } catch (err) {
        rejected.push({ raw, reason: err?.message || '保存异常' });
      }
    }
    const unresolved = candidateCards.filter((item) => !usedKeys.has(item.id || item.name));
    if (created.length) lines.push(`介绍卡Stage5-1：新建 ${created.length} 张介绍卡`);
    if (rejected.length) lines.push(`介绍卡Stage5-1：拒绝 ${rejected.length} 条非法建卡输出`);
    if (unresolved.length) lines.push(`介绍卡Stage5-1：仍有 ${unresolved.length} 个待建介绍卡候选未被创建`);
    return { lines, created, rejected, unresolved };
  },

  async applyOps(store, cards = [], ops = []) {
    const lines = [];
    const applied = [];
    const rejected = [];
    const changed = new Map();
    for (const op of (Array.isArray(ops) ? ops : []).slice(0, 40)) {
      const card = this.findCard(cards, op);
      const field = String(op?.field || op?.path || '').trim();
      const action = String(op?.op || op?.action || '').trim().toLowerCase();
      const reason = String(op?.reason || op?.evidence || '').trim();
      if (!card) {
        rejected.push({ op, reason: '找不到候选介绍卡' });
        continue;
      }
      if (!field || !action) {
        rejected.push({ op, reason: '缺少 field/op' });
        continue;
      }
      if (window.GameModules.characterIntroCard?.roleCardExists?.(card)) {
        rejected.push({ op, reason: '已有完整角色卡，Stage5-2 不独立推演' });
        continue;
      }
      if (this.scalarFields.has(field)) {
        if (!['set', 'replace'].includes(action)) {
          rejected.push({ op, reason: '标量字段只允许 set' });
          continue;
        }
        this.pathSet(card, field, this.normalizeScalar(field, op.value));
        applied.push({ id: card.id, name: card.name, field, op: 'set', reason });
        changed.set(card.id, card);
        continue;
      }
      if (this.deltaFields.has(field)) {
        if (!['delta', 'add'].includes(action)) {
          rejected.push({ op, reason: '数值字段只允许 delta' });
          continue;
        }
        const delta = Number(op.delta ?? op.value);
        if (!Number.isFinite(delta) || delta === 0) {
          rejected.push({ op, reason: 'delta 必须是非零数字' });
          continue;
        }
        const current = Number(this.pathGet(card, field)) || 0;
        this.pathSet(card, field, this.clamp100(current + delta));
        applied.push({ id: card.id, name: card.name, field, op: 'delta', value: delta, reason });
        changed.set(card.id, card);
        continue;
      }
      if (this.listFields.has(field)) {
        const list = Array.isArray(this.pathGet(card, field)) ? this.pathGet(card, field) : [];
        const value = this.normalizeListItem(field, op.value);
        const target = this.normalizeListItem(field, op.target ?? op.oldValue ?? '');
        if (action === 'add') {
          if (!value) {
            rejected.push({ op, reason: '新增值为空' });
            continue;
          }
          if (!list.includes(value)) list.push(value);
          this.pathSet(card, field, list);
          applied.push({ id: card.id, name: card.name, field, op: 'add', value, reason });
          changed.set(card.id, card);
          continue;
        }
        if (['delete', 'remove'].includes(action)) {
          const index = list.indexOf(target);
          if (!target || index < 0) {
            rejected.push({ op, reason: '删除目标不存在' });
            continue;
          }
          list.splice(index, 1);
          this.pathSet(card, field, list);
          applied.push({ id: card.id, name: card.name, field, op: 'delete', target, reason });
          changed.set(card.id, card);
          continue;
        }
        if (action === 'replace') {
          const index = list.indexOf(target);
          if (!target || index < 0 || !value) {
            rejected.push({ op, reason: '替换目标不存在或新值为空' });
            continue;
          }
          list[index] = value;
          this.pathSet(card, field, [...new Set(list)]);
          applied.push({ id: card.id, name: card.name, field, op: 'replace', target, value, reason });
          changed.set(card.id, card);
          continue;
        }
        rejected.push({ op, reason: '集合字段只允许 add/replace/delete' });
        continue;
      }
      rejected.push({ op, reason: '字段不属于 Stage5 介绍卡可维护范围' });
    }
    const saved = [];
    for (const card of changed.values()) {
      const result = await this.saveCard(card);
      if (result) saved.push(result);
    }
    if (applied.length) lines.push(`介绍卡Stage5-2：AI 更新 ${applied.length} 条`);
    if (rejected.length) lines.push(`介绍卡Stage5-2：拒绝 ${rejected.length} 条非法操作`);
    return { lines, applied, rejected, saved };
  },

  async runAfterSettlement({ store, updates = {}, logId, config = {}, loop = null, participants = [], narration = '' } = {}) {
    const introApi = window.GameModules.characterIntroCard;
    const introStore = window.GameModules.characterIntroStore;
    if (!introApi?.ensure || !introStore) return { lines: [], cards: [], skipped: true };

    const lines = [];
    const roleSyncedCards = [];
    const existingIntroCards = [];
    const missingCreateCandidates = [];

    for (const item of this.candidates(updates)) {
      const normalized = introApi.normalize?.(item, store, 'stage5-candidate') || item;
      if (!normalized?.name) continue;
      try {
        if (introApi.roleCardExists?.(normalized)) {
          const saved = await introApi.ensure(store, item, 'stage5-sync-role');
          if (!saved) continue;
          const synced = saved.displayType === 'role' ? await this.saveCard(this.syncRoleToIntro(saved) || saved) : saved;
          const finalCard = saved.displayType === 'role' && synced ? { ...synced, displayType: 'role', roleState: saved.roleState } : saved;
          roleSyncedCards.push(finalCard);
          lines.push(`介绍卡Stage5：${finalCard.name} 已同步为已有完整角色卡镜像`);
          continue;
        }
        const existing = this.existingIntroCard(normalized, store);
        if (existing) {
          existingIntroCards.push(existing);
          lines.push(`介绍卡Stage5：${existing.name} 已存在介绍卡，进入 Stage5-2 更新`);
          continue;
        }
        missingCreateCandidates.push(normalized);
      } catch (err) {
        lines.push(`介绍卡Stage5：${item?.name || '未知人物'} 预处理失败：${err?.message || '未知错误'}`);
      }
    }

    let createdCards = [];
    let createRaw = '';
    if (missingCreateCandidates.length && loop) {
      loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage5-1 介绍卡建卡…`, config, { keepNarration: true });
      loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage5-1：为本轮新出现且尚不存在介绍卡的人物/存在真正建卡。', {
        ...config,
        settlementThinking: true,
        settlementThinkingKey: 'settlement-status',
        settlementThinkingLabel: '结算状态',
        livePatch: true,
      });
      try {
        createRaw = await this.requestStage5(loop, store, this.buildCreatePrompt({ participants, candidateCards: missingCreateCandidates, narration, updates }), logId, config, `${config?.label || ''}Stage5-1 介绍卡建卡`);
        const parsedCreate = this.parseCreatePayload(createRaw);
        const appliedCreate = await this.applyCreateCards(store, missingCreateCandidates, parsedCreate.cards);
        lines.push(...appliedCreate.lines);
        createdCards = appliedCreate.created;
      } catch (err) {
        console.warn('[Stage5-1介绍卡建卡] 生成失败:', err?.message || err);
        lines.push(`介绍卡Stage5-1失败：${err?.message || '未知错误'}`);
      }
    }

    const updateCards = [...existingIntroCards, ...createdCards].filter((card, index, arr) => {
      if (!card || card.displayType === 'role' || introApi.roleCardExists?.(card)) return false;
      return arr.findIndex((item) => item && item.id === card.id) === index;
    });
    if (!updateCards.length || !loop) {
      return {
        lines,
        cards: [...roleSyncedCards, ...existingIntroCards, ...createdCards],
        applied: [],
        rejected: [],
        createRaw,
        skipped: !lines.length,
      };
    }

    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage5-2 介绍卡更新…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage5-2：只根据正文事实变化更新已有介绍卡字段。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });

    let updateRaw = '';
    let parsedUpdate = { ops: [] };
    try {
      updateRaw = await this.requestStage5(loop, store, this.buildUpdatePrompt({ participants, introCards: updateCards, narration, updates }), logId, config, `${config?.label || ''}Stage5-2 介绍卡更新`);
      parsedUpdate = this.parseOpsPayload(updateRaw);
    } catch (err) {
      console.warn('[Stage5-2介绍卡更新] 生成失败:', err?.message || err);
      return {
        lines: [...lines, `介绍卡Stage5-2失败：${err?.message || '未知错误'}`],
        cards: [...roleSyncedCards, ...existingIntroCards, ...createdCards],
        applied: [],
        rejected: [],
        createRaw,
        updateRaw,
        skipped: false,
        error: err?.message,
      };
    }
    const applied = await this.applyOps(store, updateCards, parsedUpdate.ops);
    return {
      lines: [...lines, ...applied.lines],
      cards: [...roleSyncedCards, ...existingIntroCards, ...createdCards],
      ops: parsedUpdate.ops,
      applied: applied.applied,
      rejected: applied.rejected,
      createRaw,
      updateRaw,
      skipped: false,
    };
  },
};
