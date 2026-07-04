window.GameModules = window.GameModules || {};

window.GameModules.realWorldProfileStage5 = {
  DRESSED_DESC_MIN: 120,
  DRESSED_DESC_MAX: 170,

  bodyParts() {
    return window.GameModules.characterProfile?.bodyProfileParts?.() || [];
  },

  formatParticipants(participants = [], store = null) {
    return (Array.isArray(participants) ? participants : []).slice(0, 12).map((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || '').trim();
      const role = String(item?.role || '').trim();
      return role ? `${name}（${role}）` : name;
    }).filter(Boolean).join('、') || '无';
  },

  resolveCharacterState(store, subject = '') {
    const key = String(subject || '').trim();
    if (!key) return null;
    return store?.itemSkillState?.(key)
      || window.GameModules.sqliteSave?.getCharacterStateByName?.(key)
      || null;
  },

  hasDressedProfile(state) {
    const list = state?.profile?.dressedProfile;
    return Array.isArray(list) && list.some((item) => String(item?.description || '').trim());
  },

  summarizeDressedProfiles(store, participants = []) {
    const cp = window.GameModules.characterProfile;
    return (Array.isArray(participants) ? participants : []).slice(0, 8).map((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || '').trim();
      if (!name) return '';
      const state = this.resolveCharacterState(store, name);
      if (!this.hasDressedProfile(state)) return `${name}：未初始化盛装`;
      const brief = (state.profile.dressedProfile || [])
        .filter((entry) => String(entry?.description || '').trim())
        .slice(0, 4)
        .map((entry) => `${entry.part}=${String(entry.description).slice(0, 36)}`)
        .join('；');
      return `${name}：${brief || '无摘要'}`;
    }).filter(Boolean).join('\n') || '无';
  },

  summarizeWearingChanges(genericUpdates = []) {
    const rows = (Array.isArray(genericUpdates) ? genericUpdates : [])
      .filter((item) => item?.updateType === 'wearing-state')
      .slice(0, 8)
      .map((item) => {
        const subject = String(item?.subject?.name || item?.subject?.id || '').trim();
        const field = String(item?.field || '').trim();
        const value = item?.change?.value ?? item?.change?.after ?? item?.value ?? '';
        const reason = (item?.reasons || []).map((r) => r?.evidence || r?.trigger).filter(Boolean).join('；');
        return `${subject || '未知'} ${field} → ${typeof value === 'object' ? JSON.stringify(value).slice(0, 80) : String(value).slice(0, 80)}${reason ? `（${reason.slice(0, 60)}）` : ''}`;
      });
    return rows.length ? rows.join('\n') : '无（与 Stage4 并行，请主要依据正文）';
  },

  wearingSlotToParts(slot = '') {
    const map = {
      head: ['头发', '脸部', '耳朵'],
      neck: ['脖颈', '脸部'],
      innerwearTop: ['胸部', '双臂'],
      top: ['胸部', '双臂', '小腹'],
      outerwear: ['胸部', '双臂', '小腹'],
      gloves: ['双臂'],
      waist: ['小腹', '臀部'],
      innerwearBottom: ['臀部', '神秘花园'],
      bottom: ['臀部', '双大腿', '双小腿'],
      socks: ['双小腿', '双大腿'],
      shoes: ['双小腿'],
    };
    const key = String(slot || '').trim();
    return map[key] || ['头发', '脸部'];
  },

  normalizeGateTargets(gate = {}, store = null) {
    const allowed = new Set(this.bodyParts());
    return (Array.isArray(gate?.targets) ? gate.targets : [])
      .filter((item) => !item?.profileType || item.profileType === 'dressedProfile')
      .slice(0, 2)
      .map((item) => {
        const subject = String(item?.subject || '').trim();
        const state = this.resolveCharacterState(store, subject);
        const parts = (Array.isArray(item?.parts) ? item.parts : [])
          .filter((part) => allowed.has(part))
          .slice(0, 3);
        if (!subject || !parts.length || !this.hasDressedProfile(state)) return null;
        return {
          subject,
          subjectId: state?.id || subject,
          profileType: 'dressedProfile',
          parts,
          reason: String(item?.reason || '').slice(0, 120),
          evidence: String(item?.evidence || '').slice(0, 200),
        };
      })
      .filter(Boolean);
  },

  inferTargetsFromWearing(store, genericUpdates = [], existingSubjects = new Set()) {
    const allowed = new Set(this.bodyParts());
    const out = [];
    (Array.isArray(genericUpdates) ? genericUpdates : [])
      .filter((item) => item?.updateType === 'wearing-state')
      .slice(0, 4)
      .forEach((item) => {
        const subject = String(item?.subject?.name || item?.subject?.id || '').trim();
        if (!subject || existingSubjects.has(subject)) return;
        const state = this.resolveCharacterState(store, subject);
        if (!this.hasDressedProfile(state)) return;
        const field = String(item?.field || '');
        const slotMatch = field.match(/\.(\w+)$/u) || field.match(/(\w+)$/u);
        const slot = slotMatch?.[1] || '';
        const parts = this.wearingSlotToParts(slot).filter((part) => allowed.has(part)).slice(0, 3);
        if (!parts.length) return;
        existingSubjects.add(subject);
        out.push({
          subject,
          subjectId: state?.id || subject,
          profileType: 'dressedProfile',
          parts,
          reason: '穿着状态已变化',
          evidence: this.summarizeWearingChanges([item]),
        });
      });
    return out.slice(0, 2);
  },

  mergeTargetsFromWearing(store, gateTargets = [], genericUpdates = []) {
    const seen = new Set(gateTargets.map((item) => item.subject));
    const extra = this.inferTargetsFromWearing(store, genericUpdates, seen);
    return [...gateTargets, ...extra].slice(0, 2);
  },

  async runGate({ store, narration, participants, logId, config, loop }) {
    const agentLoop = loop || window.GameModules.realWorldAgentLoop;
    const prompt = await agentLoop.renderPrompt('inference-stage5-profile-gate', {
      本回合参与者: this.formatParticipants(participants, store),
      穿着状态变化: '无（与 Stage4 并行，请主要依据正文）',
      当前盛装摘要: this.summarizeDressedProfiles(store, participants),
      本轮正文: String(narration || '').slice(0, 2400),
    });
    agentLoop.markConfiguredStep(store, logId, `${config.label}并行判定盛装外观更新…`, config, { keepNarration: true });
    const raw = await agentLoop.completeConfiguredStep(store, prompt, logId, false, {
      ...config,
      sourceTitle: `${config.label}Stage5盛装判定`,
      promptId: 'inference-stage5-profile-gate',
      reasoningPhase: 'stage5',
      jsonMode: true,
    });
    return window.GameModules.jsonUtils.parseLoose(raw);
  },

  validatePatchData(data, base = {}, targetParts = []) {
    if (!data || String(data.name || '').trim() !== String(base.name || '').trim()) throw new Error('姓名不匹配');
    const list = Array.isArray(data.dressedProfile) ? data.dressedProfile : [];
    const returnedParts = list.map((item) => String(item?.part || '').trim()).filter(Boolean);
    const missing = targetParts.filter((part) => !returnedParts.includes(part));
    if (missing.length) throw new Error(`缺少部位：${missing.join('、')}`);
    const extra = returnedParts.filter((part) => !targetParts.includes(part));
    if (extra.length) throw new Error(`多余部位：${extra.join('、')}`);
    list.forEach((item) => {
      const desc = String(item?.description || '').trim();
      const len = [...desc].length;
      if (len < this.DRESSED_DESC_MIN || len > this.DRESSED_DESC_MAX) {
        throw new Error(`${item.part} 描写应为 ${this.DRESSED_DESC_MIN}-${this.DRESSED_DESC_MAX} 汉字（当前 ${len}）`);
      }
    });
    return data;
  },

  patchDescriptionText(dressedProfile = [], parts = []) {
    return (Array.isArray(parts) ? parts : [])
      .map((part) => {
        const item = (Array.isArray(dressedProfile) ? dressedProfile : []).find((entry) => entry?.part === part);
        const desc = String(item?.description || '').trim();
        return desc ? `${part}：${desc}` : '';
      })
      .filter(Boolean)
      .join('\n');
  },

  async patchSubject({ store, target, narration, wearingSummary, logId, config, loop }) {
    const agentLoop = loop || window.GameModules.realWorldAgentLoop;
    const cp = window.GameModules.characterProfile;
    const stage5Config = config;
    const state = this.resolveCharacterState(store, target.subject);
    if (!state?.profile) return null;
    agentLoop.markConfiguredStep(store, logId, `${config.label}更新${target.subject}盛装（${target.parts.join('、')}）…`, stage5Config, { keepNarration: true });
    const profile = state.profile;
    const base = { id: state.id, name: profile.name || state.name };
    const allowedParts = cp.bodyProfileParts();
    const targetParts = (Array.isArray(target.parts) ? target.parts : []).filter((part) => allowedParts.includes(part)).slice(0, 3);
    if (!targetParts.length) return null;
    const existing = Array.isArray(profile.dressedProfile) ? profile.dressedProfile : [];
    const currentLines = targetParts.map((part) => {
      const item = existing.find((entry) => entry?.part === part);
      const idx = allowedParts.indexOf(part) + 1;
      return `${idx}.${part}：${String(item?.description || '暂无').slice(0, 100)}`;
    }).join('\n');
    const vars = {
      part1Summary: cp.part1Summary(profile),
      part4Summary: cp.part4Summary(profile),
      part5Summary: cp.bodyProfileSummary(profile.bodyProfile),
      角色姓名: base.name,
      更新部位: targetParts.join('、'),
      当前部位描写: currentLines,
      更新原因: String(target.reason || '穿着或外观变化').slice(0, 200),
      更新证据: String(target.evidence || '').slice(0, 400),
      穿着变化摘要: String(wearingSummary || '无').slice(0, 400),
      本轮正文摘要: String(narration || '').slice(0, 800),
    };
    const promptId = 'inference-stage5-dressed-profile-patch';
    const prompt = await window.GameModules.renderPrompt(promptId, vars);
    const partialTemplate = {
      name: base.name,
      dressedProfile: targetParts.map((part) => ({ index: allowedParts.indexOf(part) + 1, part, description: '' })),
    };
    const format = [prompt, '', '## 局部模板（只输出以下部位）', JSON.stringify(partialTemplate, null, 2)].join('\n');
    let raw = '';
    try {
      raw = await agentLoop.completeConfiguredStep(store, format, logId, false, {
        ...stage5Config,
        sourceTitle: `${config.label}Stage5盛装Patch`,
        promptId,
        reasoningPhase: 'stage5',
        jsonMode: true,
      });
      let data;
      try {
        data = this.validatePatchData(cp.parse(raw), base, targetParts);
      } catch (validationErr) {
        const repairFormat = `${format}\n\n## 修复要求\n${validationErr.message}；每项 description 必须 ${this.DRESSED_DESC_MIN}-${this.DRESSED_DESC_MAX} 汉字，写造型、妆容、饰品、面料、位移与遮挡效果。`;
        raw = await agentLoop.completeConfiguredStep(store, repairFormat, logId, false, {
          ...stage5Config,
          sourceTitle: `${config.label}Stage5盛装Patch重试`,
          promptId,
          reasoningPhase: 'stage5',
          jsonMode: true,
        });
        data = this.validatePatchData(cp.parse(raw), base, targetParts);
      }
      const merged = cp.mergeDressedProfilePatch(existing, data.dressedProfile);
      return {
        subject: target.subject,
        subjectId: target.subjectId || state.id,
        parts: targetParts,
        reason: target.reason,
        evidence: target.evidence,
        dressedProfile: merged,
        descriptionText: this.patchDescriptionText(merged, targetParts),
      };
    } catch (err) {
      console.warn('Stage5 patch 解析失败:', err.message, raw ? raw.slice(0, 120) : '');
      return null;
    }
  },

  async run({ store, narration, participants, genericUpdates = [], logId, config, loop }) {
    if (config?.mode === 'story') return { patches: [], gate: null, skipped: true };
    try {
      const gate = await this.runGate({ store, narration, participants, logId, config, loop });
      let targets = this.normalizeGateTargets(gate, store);
      if (!gate?.needsUpdate && !targets.length) {
        return { patches: [], gate, skipped: true };
      }
      if (!targets.length && gate?.needsUpdate) {
        return { patches: [], gate, skipped: true };
      }
      const wearingSummary = this.summarizeWearingChanges(genericUpdates);
      const patches = [];
      for (const target of targets) {
        const patch = await this.patchSubject({ store, target, narration, wearingSummary, logId, config, loop });
        if (patch) patches.push(patch);
      }
      return { patches, gate, skipped: !patches.length };
    } catch (err) {
      console.warn('Stage5 盛装更新失败:', err.message);
      return { patches: [], gate: null, skipped: true, error: err.message };
    }
  },

  async runParallelWithStage4({ store, narration, participants, logId, config, loop, stage4Promise }) {
    if (config?.mode === 'story') {
      const updates = await stage4Promise;
      return { patches: [], gate: null, skipped: true, updates };
    }
    const gatePromise = this.runGate({ store, narration, participants, logId, config, loop });
    const [gate, updates] = await Promise.all([gatePromise, stage4Promise]);
    let targets = this.normalizeGateTargets(gate, store);
    targets = this.mergeTargetsFromWearing(store, targets, updates?.genericUpdates || []);
    const wearingChanged = (updates?.genericUpdates || []).some((item) => item?.updateType === 'wearing-state');
    if (!targets.length && !gate?.needsUpdate && !wearingChanged) {
      return { patches: [], gate, skipped: true, updates };
    }
    if (!targets.length) {
      return { patches: [], gate, skipped: true, updates };
    }
    const wearingSummary = this.summarizeWearingChanges(updates?.genericUpdates || []);
    const patches = [];
    for (const target of targets) {
      const patch = await this.patchSubject({ store, target, narration, wearingSummary, logId, config, loop });
      if (patch) patches.push(patch);
    }
    return { patches, gate, skipped: !patches.length, updates };
  },

  async applyPatches(store, patches = []) {
    const settlement = window.GameModules.realWorldSettlementActions;
    const rows = [];
    for (const patch of Array.isArray(patches) ? patches : []) {
      const state = store?.itemSkillState?.(patch?.subjectId || patch?.subject);
      if (!state?.profile || !Array.isArray(patch?.dressedProfile)) continue;
      state.profile.dressedProfile = patch.dressedProfile;
      if (store?.rpgStates && state.id) store.rpgStates[state.id] = state;
      await window.GameModules.sqliteSave?.saveCharacterState?.(state);
      const subjectName = patch.subject || state.profile?.name || state.name || '角色';
      const card = settlement?.resolveCharacterSettlementCard?.(store, state.id || patch.subjectId || patch.subject, subjectName)
        || { id: `role:${state.id}`, title: subjectName, section: '角色卡' };
      const reason = [patch.reason, patch.evidence].map((item) => String(item || '').trim()).filter(Boolean).join('；') || '本轮正文确认的外观变化';
      if (settlement?.realWorldSettlementRecordForCharacter) {
        rows.push(settlement.realWorldSettlementRecordForCharacter(
          '盛装外观',
          (patch.parts || []).join('、'),
          patch.descriptionText || this.patchDescriptionText(patch.dressedProfile, patch.parts),
          reason,
          store,
          state.id || patch.subjectId || patch.subject,
          subjectName,
        ));
      } else if (settlement?.realWorldSettlementRecord) {
        rows.push(settlement.realWorldSettlementRecord(
          '盛装外观',
          (patch.parts || []).join('、'),
          patch.descriptionText || this.patchDescriptionText(patch.dressedProfile, patch.parts),
          reason,
          card.title,
          card,
        ));
      } else {
        rows.push(`外观更新：${subjectName}（${(patch.parts || []).join('、')}）`);
      }
    }
    return rows;
  },
};
