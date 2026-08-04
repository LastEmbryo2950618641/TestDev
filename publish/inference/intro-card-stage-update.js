window.GameModules = window.GameModules || {};

/**
 * 人物资料更新入口。
 * Stage4-13 负责完整角色卡社交驱动，Stage4-14 补足角色想法；Stage5-0/5-1/5-2 只负责介绍卡。
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
  introIdeasField: 'ideas',
  roleDriveScalarFields: new Set([
    'socialDrive.relationToPlayer',
    'socialDrive.relationDetail',
    'socialDrive.agenda.short',
    'socialDrive.agenda.deadline',
    'socialDrive.agenda.needPlayer',
    'socialDrive.agenda.needPlayerWhy',
    'socialDrive.agenda.urgency',
  ]),
  roleDriveIdeasField: 'socialDrive.ideas',
  roleDriveDeltaFields: new Set(['socialDrive.familiarity']),

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

  parseCandidatePayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { candidates: [], done: true };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const candidates = Array.isArray(data.candidates) ? data.candidates : (Array.isArray(data.items) ? data.items : []);
      return { candidates, done: data.done !== false, raw: data };
    } catch (_) {
      return { candidates: [], done: true };
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
    if (field === 'agenda.needPlayer' || field === 'socialDrive.agenda.needPlayer') return Boolean(value);
    if (field === 'agenda.urgency' || field === 'socialDrive.agenda.urgency') {
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
      'socialDrive.relationToPlayer': 40,
      'socialDrive.relationDetail': 80,
      'socialDrive.agenda.short': 160,
      'socialDrive.agenda.deadline': 32,
      'socialDrive.agenda.needPlayerWhy': 120,
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

  narrationParticipants(narration = '') {
    const rows = [];
    const seen = new Set();
    const pattern = /<role\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>([^<]+)<\/role>/giu;
    for (const match of String(narration || '').matchAll(pattern)) {
      const id = String(match[1] || '').trim();
      const name = String(match[2] || '').trim();
      const key = id || name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push({ id, name });
    }
    return rows;
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
      ideas: card.ideas || [],
      routine: card.routine || {},
      memory: card.memory || {},
    }));
    return JSON.stringify(slim, null, 2).slice(0, 8000);
  },

  roleCardsText(states = []) {
    const slim = (states || []).map((state) => {
      const profile = state?.profile || {};
      return {
        id: state?.id,
        name: profile.name || state?.name || '',
        worldTag: profile.work || state?.worldTag || '',
        socialDrive: profile.socialDrive || {},
      };
    });
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

  stageTemplateText() {
    return String(window.GameModules.promptTemplates?.inline?.['inference-stage5-intro-card-update'] || '');
  },

  sectionFromTemplate(title = '') {
    const text = this.stageTemplateText();
    const marker = `## ${title}`;
    const start = text.indexOf(marker);
    if (start < 0) return '';
    const rest = text.slice(start);
    const next = rest.slice(marker.length).search(/\n## /u);
    return next >= 0 ? rest.slice(0, marker.length + next).trim() : rest.trim();
  },

  buildSectionPrompt(title = '', rows = []) {
    const section = this.sectionFromTemplate(title) || `## ${title}`;
    return [
      '# Stage5 介绍卡更新',
      section,
      '',
      ...rows,
    ].join('\n');
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
      ideas: window.GameModules.characterSocialDrive?.normalizeIdeas?.(
        socialDrive.ideas ?? card.ideas ?? [],
      ) || [],
    };
    next.role = next.identity.role || next.role || '';
    next.intro = next.persona.background || next.intro || '';
    next.work = next.worldTag || next.work || '';
    return next;
  },

  buildCandidatePrompt({ participants = [], pendingParticipants = [], existingCards = '', narration = '', updates = {} } = {}) {
    return this.buildSectionPrompt('Stage5-0 介绍卡候选判定', [
      '## 本回合参与者',
      this.participantsText(participants),
      '',
      '## Stage1 待建卡候选',
      this.participantsText(pendingParticipants),
      '',
      '## 已有角色卡/介绍卡摘要',
      existingCards || '无',
      '',
      '## 本轮正文',
      String(narration || '').slice(0, 5000),
      '',
      '## Stage4 结算摘要（只作事实参考，不作为建卡来源）',
      this.stage4Summary(updates),
      '',
      '## 输出要求',
      '只输出候选判定 JSON：{ "candidates": [], "done": true }。',
    ]);
  },

  buildCreatePrompt({ participants = [], candidateCards = [], narration = '', updates = {} } = {}) {
    return this.buildSectionPrompt('Stage5-1 介绍卡建卡', [
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
      '{ "cards": [ { "id": "介绍卡ID", "name": "姓名", "worldTag": "世界", "presenceKind": "individual|group", "identity": {}, "persona": {}, "social": {}, "agenda": {}, "ideas": [{ "id": "idea-1", "title": "", "detail": "", "status": "active", "reason": "" }], "routine": { "tags": [] }, "memory": { "facts": [] } } ], "done": true }',
    ]);
  },

  buildUpdatePrompt({ participants = [], introCards = [], narration = '', updates = {} } = {}) {
    return this.buildSectionPrompt('Stage5-2 介绍卡更新', [
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
      '## 想法驱动规则',
      '- agenda 是单条正式事务，只有正文或既有资料明确证明创建、推进、完成、取消或替代时才能修改。',
      '- ideas 是三条非必做的个人想法/想要做的事情；须根据人物性格、情绪、对主角感觉、背景、时间、地点和正文调整，不是正式事务。',
      '- 使用 field="ideas"、op="replace"、value 为完整三条 active 想法数组；每条包含 id、title、detail、status、reason。',
      '- 若卡片 ideas 少于三条，必须补足；不得把固定事件清单或玩家主线当成想法。',
      '',
      '## 输出 JSON Schema',
      '{ "ops": [ { "id": "介绍卡ID", "field": "identity.role", "op": "set", "value": "完整新值", "reason": "正文或资料依据" } ], "done": true }',
    ]);
  },

  buildIntroIdeaFillPrompt({ introCards = [], narration = '', updates = {} } = {}) {
    return [
      '# Stage5-2 介绍卡想法补足',
      '只为没有完整角色卡的介绍卡补足非必做个人想法。不得修改 agenda、social、identity、persona 或其他字段。',
      '每张卡必须最终有三条 active 想法；必须结合卡片中的性格、关系、当前情境和正文生成，不能套用固定事件列表。',
      '只输出 JSON：{ "ops": [], "done": true }。每张卡使用 field="ideas"、op="replace"，value 为完整三条想法数组；每条包含 id、title、detail、status、reason。',
      '',
      '## 介绍卡',
      this.cardsText(introCards),
      '',
      '## 本轮正文',
      String(narration || '').slice(0, 5000),
      '',
      '## Stage4 结算摘要',
      this.stage4Summary(updates),
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

  buildRoleDrivePrompt({ participants = [], roleCards = [], narration = '', updates = {} } = {}) {
    return [
      '# Stage4-13 社交驱动',
      '角色：完整角色卡社交驱动结算器。只更新本轮正文中实际出场角色的社交驱动，不创建介绍卡，不修改其他角色卡字段。',
      '',
      '## 本回合参与者',
      this.participantsText(participants),
      '',
      '## 完整角色卡社交驱动基线',
      this.roleCardsText(roleCards),
      '',
      '## 本轮正文',
      String(narration || '').slice(0, 5000),
      '',
      '## Stage4-1 至 Stage4-12 结算摘要',
      this.stage4Summary(updates),
      '',
      '## 输出规则',
      '- 只输出 JSON：{ "ops": [], "done": true }。',
      '- 每条 op 必须使用完整角色卡 id。正式事务字段只允许 socialDrive.relationToPlayer、socialDrive.relationDetail、socialDrive.familiarity、socialDrive.agenda.short、socialDrive.agenda.deadline、socialDrive.agenda.needPlayer、socialDrive.agenda.needPlayerWhy、socialDrive.agenda.urgency；想法使用 socialDrive.ideas。',
      '- relationToPlayer 是稳定关系描述；好感、信任、依赖、警惕等临时态度属于感觉，不得写入关系。',
      '- agenda 是正式事务：角色当前需要且必须完成的一件事，例如准备考试、准备约会。没有正文事实或既有资料依据时不得凭空创建、替换、推进或结束；事务变化必须有明确证据。',
      '- ideas 是三条非必做的个人想法/想做的事，例如想洗澡、想玩游戏、想出去玩。它们不是任务、不是承诺，也不是关系或情绪字段；必须结合角色性格、当前情绪、对玩家感觉、背景、职业、时间、地点和正文生成，且始终保持三条 active 想法。',
      '- 想法可使用 op=replace 且 value 为完整数组，也可使用 op=add/update/complete/cancel；完成、取消或明显不再符合当前处境时要调整，并由新的上下文想法补足。不要把固定事件清单写进提示词。',
      '- 若基线正式事务为空，只有既有资料和本轮上下文足以确认时才补全；若 ideas 少于三条，必须生成缺少的想法。',
      '- 标量字段 op 只能是 set；socialDrive.familiarity 的 op 只能是 delta，value 为非零数字。',
      '- 每条均须包含 reason；无变化输出空数组。',
    ].join('\n');
  },

  buildRoleIdeaFillPrompt({ roleCards = [], narration = '', updates = {} } = {}) {
    return [
      '# Stage4-14 角色想法补足',
      '只为已有完整角色卡补足非必做的个人想法。正式事务、关系、熟识度和其他字段不得修改。',
      '每个角色必须最终拥有三条 active 想法；想法是基于角色性格、情绪、感觉、背景、职业、地点、时间和本轮正文的可变意向，不是必须完成的正式事务。',
      '只输出 JSON：{ "ops": [], "done": true }。每个缺口角色使用一条 field 为 socialDrive.ideas、op 为 replace 的操作，value 必须是完整的三条想法数组；每条包含 id、title、detail、status、reason。',
      '不要复制其他角色的想法，不要枚举固定事件库，不要把想法写成玩家主线。',
      '',
      '## 角色卡',
      this.roleCardsText(roleCards),
      '',
      '## 本轮正文',
      String(narration || '').slice(0, 5000),
      '',
      '## 前序结算摘要',
      this.stage4Summary(updates),
    ].join('\n');
  },

  async requestRoleDrive(loop, store, prompt, logId, config = {}, sourceTitle = '', reasoningPhase = 'stage4-13') {
    const options = {
      prompt,
      logId,
      ...config,
      sourceTitle,
      promptId: 'inference-stage4-social-drive',
      reasoningPhase,
      jsonMode: true,
      outputLimitKind: 'stage4',
    };
    if (loop?.completeCachedJsonPrompt) return await loop.completeCachedJsonPrompt(store, options);
    return await loop?.completeConfiguredStep?.(store, prompt, logId, false, options);
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
      id: String(candidate.id || raw.id || '').trim(),
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
      ideas: raw.ideas ?? candidate.ideas ?? [],
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
      const field = String(op?.field || op?.path || '').trim();
      if (field.startsWith('socialDrive.')) continue;
      const card = this.findCard(cards, op);
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
      if (field === this.introIdeasField) {
        const result = this.applyRoleIdeaOp(card, op);
        if (!result.changed) {
          rejected.push({ op, reason: result.reason || '想法操作未产生变化' });
          continue;
        }
        applied.push({ id: card.id, name: card.name, field, op: action, reason });
        changed.set(card.id, card);
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

  findRoleCard(states = [], op = {}) {
    const id = String(op?.id || op?.cardId || '').trim();
    const name = String(op?.name || op?.targetName || '').trim();
    return (states || []).find((state) => {
      const profile = state?.profile || {};
      return (id && state?.id === id) || (name && (profile.name === name || state?.name === name));
    }) || null;
  },

  normalizeRoleIdeas(raw = []) {
    return window.GameModules.characterSocialDrive?.normalizeIdeas?.(raw) || [];
  },

  ideaTargetIndex(ideas = [], op = {}) {
    const target = String(op.ideaId || op.targetId || op.target || op.name || '').trim();
    if (!target) return -1;
    return ideas.findIndex((idea) => idea.id === target || idea.title === target);
  },

  applyRoleIdeaOp(drive = {}, op = {}) {
    const action = String(op?.op || op?.action || '').trim().toLowerCase();
    const current = this.normalizeRoleIdeas(drive.ideas);
    if (['replace', 'set'].includes(action)) {
      drive.ideas = this.normalizeRoleIdeas(op.value);
      return { changed: true, value: drive.ideas };
    }
    if (action === 'add') {
      const item = window.GameModules.characterSocialDrive?.normalizeIdea?.(op.value || op.idea || {}, current.length);
      if (!item?.title && !item?.detail) return { changed: false, reason: '新增想法缺少内容' };
      drive.ideas = [...current, item];
      return { changed: true, value: drive.ideas };
    }
    const index = this.ideaTargetIndex(current, op);
    if (index < 0) return { changed: false, reason: '找不到目标想法' };
    if (['complete', 'cancel', 'replace'].includes(action)) {
      const status = action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'replaced';
      drive.ideas = current.map((idea, itemIndex) => itemIndex === index ? { ...idea, status } : idea);
      return { changed: true, value: drive.ideas };
    }
    if (['update', 'merge'].includes(action)) {
      const merged = { ...current[index], ...(op.value || op.idea || {}) };
      const normalized = window.GameModules.characterSocialDrive?.normalizeIdea?.(merged, index);
      drive.ideas = current.map((idea, itemIndex) => itemIndex === index ? normalized : idea);
      return { changed: true, value: drive.ideas };
    }
    return { changed: false, reason: '想法操作必须是 replace/add/update/complete/cancel' };
  },

  async applyRoleDriveOps(store, states = [], ops = []) {
    const lines = [];
    const applied = [];
    const rejected = [];
    const changed = new Map();
    for (const op of (Array.isArray(ops) ? ops : []).slice(0, 40)) {
      const field = String(op?.field || op?.path || '').trim();
      if (!field.startsWith('socialDrive.')) continue;
      const action = String(op?.op || op?.action || '').trim().toLowerCase();
      const reason = String(op?.reason || op?.evidence || '').trim();
      const state = this.findRoleCard(states, op);
      if (!state) {
        rejected.push({ op, reason: '找不到候选完整角色卡' });
        continue;
      }
      state.profile = state.profile || {};
      state.profile.socialDrive = state.profile.socialDrive || {};
      if (field === this.roleDriveIdeasField) {
        const result = this.applyRoleIdeaOp(state.profile.socialDrive, op);
        if (!result.changed) {
          rejected.push({ op, reason: result.reason || '想法操作未产生变化' });
          continue;
        }
        applied.push({ id: state.id, name: state.profile.name || state.name, field, op: action, reason });
        changed.set(state.id, state);
        continue;
      }
      if (this.roleDriveScalarFields.has(field)) {
        if (!['set', 'replace'].includes(action)) {
          rejected.push({ op, reason: '社交驱动标量字段只允许 set' });
          continue;
        }
        this.pathSet(state.profile, field, this.normalizeScalar(field, op.value));
        applied.push({ id: state.id, name: state.profile.name || state.name, field, op: 'set', reason });
        changed.set(state.id, state);
        continue;
      }
      if (this.roleDriveDeltaFields.has(field)) {
        if (!['delta', 'add'].includes(action)) {
          rejected.push({ op, reason: '熟识度只允许 delta' });
          continue;
        }
        const delta = Number(op.delta ?? op.value);
        if (!Number.isFinite(delta) || delta === 0) {
          rejected.push({ op, reason: 'delta 必须是非零数字' });
          continue;
        }
        const current = Number(this.pathGet(state.profile, field)) || 0;
        this.pathSet(state.profile, field, this.clamp100(current + delta));
        applied.push({ id: state.id, name: state.profile.name || state.name, field, op: 'delta', value: delta, reason });
        changed.set(state.id, state);
        continue;
      }
      rejected.push({ op, reason: '字段不属于完整角色卡社交驱动可维护范围' });
    }
    const stateStore = window.GameModules.characterStateStore;
    for (const state of changed.values()) {
      state.profile.socialDrive = window.GameModules.characterSocialDrive?.normalizeForRoleCard?.(
        state.profile.socialDrive,
        { id: state.id, name: state.profile.name || state.name, isPlayer: false },
      ) || state.profile.socialDrive;
      await stateStore?.save?.(state, store);
    }
    if (applied.length) lines.push(`完整角色卡社交驱动：AI 更新 ${applied.length} 条`);
    if (rejected.length) lines.push(`完整角色卡社交驱动：拒绝 ${rejected.length} 条非法操作`);
    return { lines, applied, rejected };
  },

  roleDriveContactTime(store = {}) {
    const value = store?.phoneDate?.();
    const iso = value?.toISOString?.();
    return iso && !Number.isNaN(Date.parse(iso)) ? iso : new Date().toISOString();
  },

  async touchRoleDriveSceneContacts(store, states = []) {
    const stateStore = window.GameModules.characterStateStore;
    const social = window.GameModules.characterSocialDrive;
    const now = this.roleDriveContactTime(store);
    let changed = 0;
    for (const state of states) {
      if (!state?.profile || state.id === 'player-self') continue;
      const current = social?.normalizeForRoleCard?.(state.profile.socialDrive || {}, {
        id: state.id,
        name: state.profile.name || state.name,
        isPlayer: false,
      }) || state.profile.socialDrive || {};
      const reach = [...new Set([...(Array.isArray(current.reach) ? current.reach : []), 'scene'])];
      if (current.lastContactAt === now && current.lastContactChannel === 'scene' && reach.length === (current.reach || []).length) continue;
      state.profile.socialDrive = social?.normalizeForRoleCard?.({
        ...current,
        lastContactAt: now,
        lastContactChannel: 'scene',
        reach,
      }, {
        id: state.id,
        name: state.profile.name || state.name,
        isPlayer: false,
      }) || { ...current, lastContactAt: now, lastContactChannel: 'scene', reach };
      await stateStore?.save?.(state, store);
      changed += 1;
    }
    return changed;
  },

  async runRoleDriveAfterStage4({ store, updates = {}, logId, config = {}, loop = null, participants = [], narration = '' } = {}) {
    if (!loop) return { lines: [], applied: [], rejected: [], skipped: true };
    const introApi = window.GameModules.characterIntroCard;
    const effectiveParticipants = [
      ...(Array.isArray(participants) ? participants : []),
      ...this.narrationParticipants(narration),
    ];
    const roleCards = [];
    for (const item of effectiveParticipants) {
      const id = String(item?.id || item?.idOrName || '').trim();
      const name = String(item?.name || item?.rawName || '').trim();
      const state = id
        ? window.GameModules.characterStateStore?.get?.(id, store) || store?.rpgStates?.[id]
        : window.GameModules.characterStateStore?.getByName?.(name, store?.currentWorldTag?.(), store);
      if (!state || state.id === 'player-self' || introApi?.isIncompleteRoleStub?.(state)) continue;
      if (!roleCards.some((candidate) => candidate.id === state.id)) roleCards.push(state);
    }
    const missingIdeaCards = Object.values(store?.rpgStates || {}).filter((state) => {
      if (!state || state.id === 'player-self' || introApi?.isIncompleteRoleStub?.(state)) return false;
      const ideas = this.normalizeRoleIdeas(state.profile?.socialDrive?.ideas);
      return ideas.filter((idea) => idea.status === 'active').length < 3;
    });
    const fillCandidates = [
      ...roleCards,
      ...missingIdeaCards.filter((state) => !roleCards.some((candidate) => candidate.id === state.id)),
    ];
    if (!roleCards.length && !fillCandidates.length) return { lines: [], applied: [], rejected: [], skipped: true };

    const sceneContacts = await this.touchRoleDriveSceneContacts(store, roleCards);
    const contactLines = sceneContacts ? [`完整角色卡社交驱动：已记录 ${sceneContacts} 人本轮当面沟通。`] : [];

    loop.markConfiguredStep?.(store, logId, `${config.label || ''}正在进行 Stage4-13 社交驱动…`, config, { keepNarration: true });
    loop.patchConfiguredSettlementThinking?.(store, logId, 'Stage4-13：根据正文事实更新完整角色卡的稳定关系、熟识度与当前事务。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    try {
      let parsed = { ops: [] };
      let first = { lines: [], applied: [], rejected: [] };
      if (roleCards.length) {
        const raw = await this.requestRoleDrive(loop, store, this.buildRoleDrivePrompt({
          participants: effectiveParticipants,
          roleCards,
          narration,
          updates,
        }), logId, config, `${config.label || ''}Stage4-13 社交驱动`, 'stage4-13');
        parsed = this.parseOpsPayload(raw);
        first = await this.applyRoleDriveOps(store, roleCards, parsed.ops);
      }
      const needsIdeaFill = fillCandidates.filter((state) => {
        const ideas = this.normalizeRoleIdeas(state.profile?.socialDrive?.ideas);
        return ideas.filter((idea) => idea.status === 'active').length < 3;
      });
      let fill = { lines: [], applied: [], rejected: [], ops: [] };
      if (needsIdeaFill.length) {
        loop.markConfiguredStep?.(store, logId, `${config.label || ''}正在进行 Stage4-14 角色想法补足…`, config, { keepNarration: true });
        loop.patchConfiguredSettlementThinking?.(store, logId, 'Stage4-14：为完整角色卡补足至三条有效想法，不修改正式事务或关系。', {
          ...config,
          settlementThinking: true,
          settlementThinkingKey: 'settlement-status',
          settlementThinkingLabel: '结算状态',
          livePatch: true,
        });
        const fillRaw = await this.requestRoleDrive(loop, store, this.buildRoleIdeaFillPrompt({
          roleCards: needsIdeaFill,
          narration,
          updates,
        }), logId, config, `${config.label || ''}Stage4-14 角色想法补足`, 'stage4-14');
        const fillParsed = this.parseOpsPayload(fillRaw);
        fill = await this.applyRoleDriveOps(store, needsIdeaFill, fillParsed.ops);
        fill.ops = fillParsed.ops;
      }
      return {
        lines: [...contactLines, ...first.lines, ...fill.lines],
        applied: [...first.applied, ...fill.applied],
        rejected: [...first.rejected, ...fill.rejected],
        ops: [...parsed.ops, ...fill.ops],
        skipped: false,
      };
    } catch (err) {
      console.warn('[Stage4-13社交驱动] 生成失败:', err?.message || err);
      return { lines: [...contactLines, `Stage4-13社交驱动失败：${err?.message || '未知错误'}`], applied: [], rejected: [], skipped: false, error: err?.message };
    }
  },

  isPendingParticipant(item = {}) {
    const id = String(item?.id || item?.idOrName || '').trim();
    return window.GameModules.characterIdEnsure?.isPendingId?.(id) || /^(?:pending|new|待建卡|\?)$/iu.test(id);
  },

  pendingParticipantsFromLayers(layers = {}) {
    const keys = ['forcedParticipants', 'priorityCandidates', 'dramaCandidates'];
    const seen = new Set();
    return keys.flatMap((key) => (Array.isArray(layers?.[key]) ? layers[key] : [])
      .filter((item) => item && this.isPendingParticipant(item))
      .map((item) => ({ ...item, sourceLayer: key })))
      .filter((item) => {
        const name = String(item?.name || item?.characterName || item?.idOrName || '').trim();
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 12);
  },

  existingCardsSummary(store = null) {
    const introCards = (window.GameModules.characterIntroStore?.list?.() || []).map((card) => ({
      type: 'intro',
      id: card.id,
      name: card.name,
      worldTag: card.worldTag || card.work,
      role: card.identity?.role || card.role || '',
    }));
    const roleCards = [
      ...Object.values(store?.rpgStates || {}),
      ...(window.GameModules.characterStateStore?.list?.() || []),
    ].filter((state) => state && !window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(state))
      .map((state) => ({
        type: 'role',
        id: state.id,
        name: state.profile?.name || state.name,
        worldTag: state.worldTag || state.profile?.work,
        role: state.profile?.role || state.profile?.job || '',
      }));
    return JSON.stringify([...roleCards, ...introCards].slice(0, 40), null, 2).slice(0, 8000);
  },

  introCardExistsByName(name = '', worldTag = '', store = null) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    return window.GameModules.characterIntroStore?.get?.(clean, worldTag)
      || (window.GameModules.characterIntroStore?.list?.() || []).find((card) => card?.name === clean && (!worldTag || card.worldTag === worldTag || card.work === worldTag))
      || null;
  },

  roleCardExistsByName(name = '', worldTag = '', store = null) {
    const state = window.GameModules.characterQuery?.stateByName?.(store, name, worldTag)
      || window.GameModules.characterStateStore?.getByName?.(name, worldTag, store);
    return state && !window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(state) ? state : null;
  },

  allocateCreateCandidates(store, candidates = []) {
    const idApi = window.GameModules.characterIdEnsure;
    const social = window.GameModules.characterSocialDrive;
    const worldDefault = store?.currentWorldTag?.() || window.GameModules.realWorld2026?.label || '未知世界';
    const seen = new Set();
    const out = [];
    const rejected = [];
    for (const raw of (Array.isArray(candidates) ? candidates : []).slice(0, 16)) {
      const name = String(raw?.name || raw?.characterName || '').trim().slice(0, 24);
      if (!name) {
        rejected.push({ raw, reason: '缺少候选名称' });
        continue;
      }
      const worldTag = String(raw.worldTag || raw.work || worldDefault).trim().slice(0, 40);
      const key = `${worldTag}::${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (this.roleCardExistsByName(name, worldTag, store)) {
        rejected.push({ raw, reason: '已有完整角色卡' });
        continue;
      }
      if (this.introCardExistsByName(name, worldTag, store)) {
        rejected.push({ raw, reason: '已有介绍卡' });
        continue;
      }
      let id = '';
      for (let i = 0; i < 5 && !id; i += 1) {
        const next = idApi?.allocateId?.(name, worldTag) || `rel-ai-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        if (!window.GameModules.characterIntroStore?.getById?.(next) && !window.GameModules.characterStateStore?.get?.(next, store) && !store?.rpgStates?.[next]) id = next;
      }
      if (!id) {
        rejected.push({ raw, reason: '分配ID失败' });
        continue;
      }
      out.push({
        ...raw,
        id,
        name,
        worldTag,
        work: worldTag,
        presenceKind: social?.normalizePresenceKind?.(raw.presenceKind || raw.人物形态)
          || social?.inferPresenceKind?.({ ...raw, name, role: raw.role })
          || 'individual',
        role: String(raw.role || raw.identity?.role || '').trim().slice(0, 40),
        links: { ...(raw.links || {}), roleCardId: id, scheduleId: id },
      });
    }
    return { candidates: out.slice(0, 8), rejected };
  },

  async runAfterSettlement({ store, updates = {}, logId, config = {}, loop = null, participants = [], narration = '', effectiveSceneLayers = null } = {}) {
    const introApi = window.GameModules.characterIntroCard;
    const introStore = window.GameModules.characterIntroStore;
    if (!introApi?.ensure || !introStore) return { lines: [], cards: [], skipped: true };

    const lines = [];
    const roleSyncedCards = [];
    const existingIntroCards = [];
    const missingCreateCandidates = [];

    const pendingParticipants = this.pendingParticipantsFromLayers(effectiveSceneLayers);
    const effectiveParticipants = [
      ...(Array.isArray(participants) ? participants : []),
      ...this.narrationParticipants(narration),
    ];
    const participantExisting = [];
    for (const item of effectiveParticipants) {
      const id = String(item?.id || item?.idOrName || '').trim();
      const name = String(item?.name || item?.rawName || '').trim();
      const worldTag = store?.currentWorldTag?.() || window.GameModules.realWorld2026?.label || '';
      const roleState = id && id !== '待建卡' ? window.GameModules.characterStateStore?.get?.(id, store) || store?.rpgStates?.[id] : this.roleCardExistsByName(name, worldTag, store);
      if (roleState && !introApi.isIncompleteRoleStub?.(roleState)) continue;
      const intro = (id && id !== '待建卡' ? introStore?.getById?.(id) : null) || this.introCardExistsByName(name, worldTag, store);
      if (intro && !participantExisting.some((card) => card.id === intro.id)) participantExisting.push(intro);
    }
    existingIntroCards.push(...participantExisting);

    let candidateRaw = '';
    let allocated = { candidates: [], rejected: [] };
    if (loop) {
      loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage5-0 介绍卡候选判定…`, config, { keepNarration: true });
      loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage5-0：从Stage1待建卡与正文实际出现人物中判定需要新建介绍卡的候选。', {
        ...config,
        settlementThinking: true,
        settlementThinkingKey: 'settlement-status',
        settlementThinkingLabel: '结算状态',
        livePatch: true,
      });
      try {
        candidateRaw = await this.requestStage5(loop, store, this.buildCandidatePrompt({
          participants: effectiveParticipants,
          pendingParticipants,
          existingCards: this.existingCardsSummary(store),
          narration,
          updates,
        }), logId, config, `${config?.label || ''}Stage5-0 介绍卡候选判定`);
        const parsedCandidates = this.parseCandidatePayload(candidateRaw);
        allocated = this.allocateCreateCandidates(store, parsedCandidates.candidates);
        missingCreateCandidates.push(...allocated.candidates);
        if (allocated.candidates.length) lines.push(`介绍卡Stage5-0：确认 ${allocated.candidates.length} 个待建介绍卡候选并已分配ID`);
        if (allocated.rejected.length) lines.push(`介绍卡Stage5-0：跳过 ${allocated.rejected.length} 个已有或非法候选`);
      } catch (err) {
        console.warn('[Stage5-0介绍卡候选判定] 生成失败:', err?.message || err);
        lines.push(`介绍卡Stage5-0失败：${err?.message || '未知错误'}`);
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
        createRaw = await this.requestStage5(loop, store, this.buildCreatePrompt({ participants: effectiveParticipants, candidateCards: missingCreateCandidates, narration, updates }), logId, config, `${config?.label || ''}Stage5-1 介绍卡建卡`);
        const parsedCreate = this.parseCreatePayload(createRaw);
        const appliedCreate = await this.applyCreateCards(store, missingCreateCandidates, parsedCreate.cards);
        lines.push(...appliedCreate.lines);
        createdCards = appliedCreate.created;
      } catch (err) {
        console.warn('[Stage5-1介绍卡建卡] 生成失败:', err?.message || err);
        lines.push(`介绍卡Stage5-1失败：${err?.message || '未知错误'}`);
      }
    }

    const missingIdeaCards = (introStore?.list?.() || []).filter((card) => {
      if (!card || introApi.roleCardExists?.(card)) return false;
      const ideas = this.normalizeRoleIdeas(card.ideas);
      return ideas.filter((idea) => idea.status === 'active').length < 3;
    });
    const updateCards = [...existingIntroCards, ...createdCards, ...missingIdeaCards].filter((card, index, arr) => {
      if (!card || card.displayType === 'role' || introApi.roleCardExists?.(card)) return false;
      return arr.findIndex((item) => item && item.id === card.id) === index;
    });
    if (!updateCards.length || !loop) {
      return {
        lines,
        cards: [...roleSyncedCards, ...existingIntroCards, ...createdCards],
        applied: [],
        rejected: [],
        candidateRaw,
        createRaw,
        skipped: !lines.length,
      };
    }

    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage5-2 介绍卡更新…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage5-2：只根据正文事实更新已有介绍卡字段。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });

    let updateRaw = '';
    let parsedUpdate = { ops: [] };
    try {
      updateRaw = await this.requestStage5(loop, store, this.buildUpdatePrompt({
        participants: effectiveParticipants,
        introCards: updateCards,
        narration,
        updates,
      }), logId, config, `${config?.label || ''}Stage5-2 介绍卡更新`);
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
    const introApplied = await this.applyOps(store, updateCards, parsedUpdate.ops);
    const needsIdeaFill = updateCards.filter((card) => {
      const ideas = this.normalizeRoleIdeas(card.ideas);
      return ideas.filter((idea) => idea.status === 'active').length < 3;
    });
    let ideaFill = { lines: [], applied: [], rejected: [], ops: [] };
    if (needsIdeaFill.length) {
      try {
        const fillRaw = await this.requestStage5(loop, store, this.buildIntroIdeaFillPrompt({
          introCards: needsIdeaFill,
          narration,
          updates,
        }), logId, config, `${config?.label || ''}Stage5-2 介绍卡想法补足`);
        const fillParsed = this.parseOpsPayload(fillRaw);
        ideaFill = await this.applyOps(store, needsIdeaFill, fillParsed.ops);
        ideaFill.ops = fillParsed.ops;
      } catch (err) {
        console.warn('[Stage5-2介绍卡想法补足] 生成失败:', err?.message || err);
        ideaFill.lines.push(`介绍卡Stage5-2想法补足失败：${err?.message || '未知错误'}`);
      }
    }
    return {
        lines: [...lines, ...introApplied.lines, ...ideaFill.lines],
        cards: [...roleSyncedCards, ...existingIntroCards, ...createdCards],
        ops: [...parsedUpdate.ops, ...ideaFill.ops],
        applied: [...introApplied.applied, ...ideaFill.applied],
        rejected: [...introApplied.rejected, ...ideaFill.rejected],
        candidateRaw,
        createRaw,
        updateRaw,
        skipped: false,
    };
  },
};
