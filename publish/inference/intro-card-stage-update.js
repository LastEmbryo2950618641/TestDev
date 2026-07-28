window.GameModules = window.GameModules || {};

/**
 * Stage5：介绍卡更新入口。
 *
 * 把 Stage4 发现的 appearedCharacters / solidifiableCharacters 落到介绍卡存储；
 * 对仍没有完整角色卡的人物/存在，使用正文后共享 KV 上下文做一次 AI 增量更新。
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

  async buildPrompt({ loop, participants, introCards, narration, updates }) {
    const vars = {
      本回合参与者: this.participantsText(participants),
      候选介绍卡: this.cardsText(introCards),
      本轮正文: String(narration || '').slice(0, 5000),
      Stage4结算摘要: this.stage4Summary(updates),
    };
    if (loop?.renderPrompt) return await loop.renderPrompt('inference-stage5-intro-card-update', vars);
    return await window.GameModules.renderPrompt?.('inference-stage5-intro-card-update', vars);
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
        rejected.push({ op, reason: '已有完整角色卡，Stage5 不独立推演' });
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
    if (applied.length) lines.push(`介绍卡Stage5：AI 更新 ${applied.length} 条`);
    if (rejected.length) lines.push(`介绍卡Stage5：拒绝 ${rejected.length} 条非法操作`);
    return { lines, applied, rejected, saved };
  },

  async runAfterSettlement({ store, updates = {}, logId, config = {}, loop = null, participants = [], narration = '' } = {}) {
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage5 介绍卡更新…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage5：同步本轮新出现人物/存在的介绍卡；已有完整角色卡不再由介绍卡独立推演。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });

    const introApi = window.GameModules.characterIntroCard;
    if (!introApi?.ensure) return { lines: [], cards: [], skipped: true };

    const cards = [];
    const lines = [];
    for (const item of this.candidates(updates)) {
      try {
        const saved = await introApi.ensure(store, item, 'stage5');
        if (!saved) continue;
        const synced = saved.displayType === 'role' ? await this.saveCard(this.syncRoleToIntro(saved) || saved) : saved;
        const finalCard = saved.displayType === 'role' && synced ? { ...synced, displayType: 'role', roleState: saved.roleState } : saved;
        cards.push(finalCard);
        const type = saved.displayType === 'role' ? '已有完整角色卡' : '介绍卡';
        lines.push(`介绍卡Stage5：${saved.name} 已同步为${type}`);
      } catch (err) {
        lines.push(`介绍卡Stage5：${item?.name || '未知人物'} 同步失败：${err?.message || '未知错误'}`);
      }
    }
    const aiCards = cards.filter((card) => card?.displayType !== 'role' && !introApi.roleCardExists?.(card));
    if (!aiCards.length || !loop?.completeConfiguredStep) {
      return { lines, cards, applied: [], rejected: [], skipped: !cards.length };
    }

    let raw = '';
    try {
      const prompt = await this.buildPrompt({
        loop,
        participants,
        introCards: aiCards,
        narration,
        updates,
      });
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        ...config,
        sourceTitle: `${config?.label || ''}Stage5 介绍卡更新`,
        promptId: 'inference-stage5-intro-card-update',
        reasoningPhase: 'stage5',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
    } catch (err) {
      console.warn('[Stage5介绍卡] 生成失败:', err?.message || err);
      return { lines: [...lines, `介绍卡Stage5失败：${err?.message || '未知错误'}`], cards, applied: [], rejected: [], skipped: false, error: err?.message };
    }
    const parsed = this.parseOpsPayload(raw);
    const applied = await this.applyOps(store, aiCards, parsed.ops);
    return {
      lines: [...lines, ...applied.lines],
      cards,
      ops: parsed.ops,
      applied: applied.applied,
      rejected: applied.rejected,
      raw,
      skipped: !cards.length,
    };
  },
};
