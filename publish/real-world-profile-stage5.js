window.GameModules = window.GameModules || {};

window.GameModules.realWorldProfileStage5 = {
  DESC_MIN: 120,
  DESC_MAX: 170,

  bodyParts() {
    return window.GameModules.characterProfile?.bodyProfileParts?.() || [];
  },

  tagConfig() {
    return window.GameModules.appearanceProfileTags || null;
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
      || window.GameModules.characterStateStore?.getByName?.(key)
      || null;
  },

  hasBodyProfile(state) {
    const list = state?.profile?.bodyProfile;
    return Array.isArray(list) && list.some((item) => String(item?.description || '').trim());
  },

  hasDressedProfile(state) {
    const list = state?.profile?.dressedProfile;
    return Array.isArray(list) && list.some((item) => String(item?.description || '').trim());
  },

  summarizeBodyProfiles(store, participants = []) {
    const cfg = this.tagConfig();
    return (Array.isArray(participants) ? participants : []).slice(0, 8).map((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || '').trim();
      if (!name) return '';
      const state = this.resolveCharacterState(store, name);
      if (!this.hasBodyProfile(state)) return `${name}：未初始化自然状态`;
      return `${name}：${cfg?.summarizeBodyProfile?.(state.profile) || '有自然状态'}`;
    }).filter(Boolean).join('\n') || '无';
  },

  summarizeDressedProfiles(store, participants = []) {
    const cfg = this.tagConfig();
    return (Array.isArray(participants) ? participants : []).slice(0, 8).map((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || '').trim();
      if (!name) return '';
      const state = this.resolveCharacterState(store, name);
      if (!this.hasDressedProfile(state)) return `${name}：未初始化盛装`;
      return `${name}：${cfg?.summarizeDressedProfile?.(state.profile) || '有盛装'}`;
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

  normalizeUpdateScope(item = {}) {
    const scope = String(item?.updateScope || '').trim();
    if (['meta', 'parts', 'both'].includes(scope)) return scope;
    const parts = Array.isArray(item?.parts) ? item.parts : [];
    const metaFields = Array.isArray(item?.metaFields) ? item.metaFields : [];
    if (parts.length && metaFields.length) return 'both';
    if (metaFields.length) return 'meta';
    return 'parts';
  },

  normalizeGateTargets(gate = {}, store = null) {
    const allowed = new Set(this.bodyParts());
    return (Array.isArray(gate?.targets) ? gate.targets : [])
      .slice(0, 3)
      .map((item) => {
        const subject = String(item?.subject || '').trim();
        const profileType = String(item?.profileType || 'dressedProfile').trim();
        if (!['bodyProfile', 'dressedProfile'].includes(profileType)) return null;
        const state = this.resolveCharacterState(store, subject);
        const updateScope = this.normalizeUpdateScope(item);
        const parts = (Array.isArray(item?.parts) ? item.parts : [])
          .filter((part) => allowed.has(part))
          .slice(0, 3);
        const metaFields = (Array.isArray(item?.metaFields) ? item.metaFields : [])
          .map((field) => String(field || '').trim())
          .filter(Boolean)
          .slice(0, 4);
        if (!subject) return null;
        if (profileType === 'bodyProfile' && !this.hasBodyProfile(state) && updateScope !== 'meta') return null;
        if (profileType === 'dressedProfile' && !this.hasDressedProfile(state) && updateScope !== 'meta') return null;
        if (updateScope === 'parts' && !parts.length) return null;
        if (updateScope === 'meta' && !metaFields.length) return null;
        if (updateScope === 'both' && (!parts.length || !metaFields.length)) return null;
        return {
          subject,
          subjectId: state?.id || subject,
          profileType,
          updateScope,
          parts,
          metaFields,
          reason: String(item?.reason || '').slice(0, 120),
          evidence: String(item?.evidence || '').slice(0, 200),
        };
      })
      .filter(Boolean)
      .slice(0, 2);
  },

  inferTargetsFromWearing(store, genericUpdates = [], existingSubjects = new Set()) {
    const allowed = new Set(this.bodyParts());
    const out = [];
    (Array.isArray(genericUpdates) ? genericUpdates : [])
      .filter((item) => item?.updateType === 'wearing-state')
      .slice(0, 4)
      .forEach((item) => {
        const subject = String(item?.subject?.name || item?.subject?.id || '').trim();
        if (!subject || existingSubjects.has(`${subject}:dressedProfile`)) return;
        const state = this.resolveCharacterState(store, subject);
        if (!this.hasDressedProfile(state)) return;
        const field = String(item?.field || '');
        const slotMatch = field.match(/\.(\w+)$/u) || field.match(/(\w+)$/u);
        const slot = slotMatch?.[1] || '';
        const parts = this.wearingSlotToParts(slot).filter((part) => allowed.has(part)).slice(0, 3);
        if (!parts.length) return;
        existingSubjects.add(`${subject}:dressedProfile`);
        out.push({
          subject,
          subjectId: state?.id || subject,
          profileType: 'dressedProfile',
          updateScope: 'parts',
          parts,
          metaFields: [],
          reason: '穿着状态已变化',
          evidence: this.summarizeWearingChanges([item]),
        });
      });
    return out.slice(0, 2);
  },

  mergeTargetsFromWearing(store, gateTargets = [], genericUpdates = []) {
    const seen = new Set(gateTargets.map((item) => `${item.subject}:${item.profileType}`));
    const extra = this.inferTargetsFromWearing(store, genericUpdates, seen);
    return [...gateTargets, ...extra].slice(0, 2);
  },

  async runGate({ store, narration, participants, logId, config, loop }) {
    const agentLoop = loop || window.GameModules.realWorldAgentLoop;
    const cfg = this.tagConfig();
    const prompt = await agentLoop.renderPrompt('inference-stage5-profile-gate', {
      本回合参与者: this.formatParticipants(participants, store),
      穿着状态变化: '无（与 Stage4 并行，请主要依据正文）',
      当前自然摘要: this.summarizeBodyProfiles(store, participants),
      当前盛装摘要: this.summarizeDressedProfiles(store, participants),
      本轮正文: String(narration || '').slice(0, 2400),
      stage5GateTriggerGuide: cfg?.stage5GateTriggerGuide?.() || '',
    });
    agentLoop.markConfiguredStep(store, logId, `${config.label}并行判定外观更新…`, config, { keepNarration: true });
    const raw = await agentLoop.completeConfiguredStep(store, prompt, logId, false, {
      ...config,
      sourceTitle: `${config.label}Stage5 外观判定`,
      promptId: 'inference-stage5-profile-gate',
      reasoningPhase: 'stage5',
      jsonMode: true,
    });
    return window.GameModules.jsonUtils.parseLoose(raw);
  },

  validatePatchData(data, base = {}, target = {}) {
    const cp = window.GameModules.characterProfile;
    if (!data || String(data.name || '').trim() !== String(base.name || '').trim()) throw new Error('姓名不匹配');
    const updateScope = target.updateScope || 'parts';
    const targetParts = Array.isArray(target.parts) ? target.parts : [];
    if (updateScope === 'parts' || updateScope === 'both') {
      const field = target.profileType === 'bodyProfile' ? 'bodyProfile' : 'dressedProfile';
      const list = Array.isArray(data[field]) ? data[field] : [];
      const returnedParts = list.map((item) => String(item?.part || '').trim()).filter(Boolean);
      const missing = targetParts.filter((part) => !returnedParts.includes(part));
      if (missing.length) throw new Error(`缺少部位：${missing.join('、')}`);
      const extra = returnedParts.filter((part) => !targetParts.includes(part));
      if (extra.length) throw new Error(`多余部位：${extra.join('、')}`);
      list.forEach((item) => {
        const desc = String(item?.description || '').trim();
        const len = [...desc].length;
        if (len < this.DESC_MIN || len > this.DESC_MAX) {
          throw new Error(`${item.part} 描写应为 ${this.DESC_MIN}-${this.DESC_MAX} 汉字（当前 ${len}）`);
        }
        const tagCount = Array.isArray(item.tags) ? item.tags.filter(Boolean).length : 0;
        if (tagCount < 2) throw new Error(`${item.part} tags 至少 2 个`);
      });
    }
    if (updateScope === 'meta' || updateScope === 'both') {
      const metaKey = target.profileType === 'bodyProfile' ? 'bodyProfileMeta' : 'dressedProfileMeta';
      if (!data[metaKey] || typeof data[metaKey] !== 'object') throw new Error(`缺少 ${metaKey}`);
    }
    return data;
  },

  patchDescriptionText(profileType, profile = {}, parts = []) {
    const list = profileType === 'bodyProfile' ? profile.bodyProfile : profile.dressedProfile;
    const cfg = this.tagConfig();
    return (Array.isArray(parts) ? parts : [])
      .map((part) => {
        const item = (Array.isArray(list) ? list : []).find((entry) => entry?.part === part);
        const desc = String(item?.description || '').trim();
        const tags = cfg?.formatPartTags?.(item) || '';
        if (!desc) return '';
        return tags ? `${part}[${tags}]：${desc}` : `${part}：${desc}`;
      })
      .filter(Boolean)
      .join('\n');
  },

  partLines(profile, profileType, targetParts = []) {
    const cp = window.GameModules.characterProfile;
    const allowedParts = cp.bodyProfileParts();
    const list = profileType === 'bodyProfile' ? profile.bodyProfile : profile.dressedProfile;
    const cfg = this.tagConfig();
    return targetParts.map((part) => {
      const item = (Array.isArray(list) ? list : []).find((entry) => entry?.part === part);
      const idx = allowedParts.indexOf(part) + 1;
      const tags = cfg?.formatPartTags?.(item) || '暂无';
      return `${idx}.${part} tags=${tags}：${String(item?.description || '暂无').slice(0, 100)}`;
    }).join('\n');
  },

  async patchSubject({ store, target, narration, wearingSummary, logId, config, loop }) {
    const agentLoop = loop || window.GameModules.realWorldAgentLoop;
    const cp = window.GameModules.characterProfile;
    const cfg = this.tagConfig();
    const state = this.resolveCharacterState(store, target.subject);
    if (!state?.profile) return null;
    const profileType = target.profileType || 'dressedProfile';
    const updateScope = target.updateScope || 'parts';
    const reasoningPhase = profileType === 'bodyProfile' ? 'stage6' : 'stage7';
    const stageTitle = profileType === 'bodyProfile' ? 'Stage6 自然外观补丁' : 'Stage7 盛装外观补丁';
    agentLoop.markConfiguredStep(store, logId, `${config.label}${stageTitle}：${target.subject}（${updateScope}）…`, config, { keepNarration: true });
    const profile = state.profile;
    const base = { id: state.id, name: profile.name || state.name };
    const allowedParts = cp.bodyProfileParts();
    const targetParts = (Array.isArray(target.parts) ? target.parts : []).filter((part) => allowedParts.includes(part)).slice(0, 3);
    const promptId = profileType === 'bodyProfile'
      ? 'inference-stage5-body-profile-patch'
      : 'inference-stage5-dressed-profile-patch';
    const currentMeta = profileType === 'bodyProfile' ? profile.bodyProfileMeta : profile.dressedProfileMeta;
    const vars = {
      part1Summary: cp.part1Summary(profile),
      part4Summary: cp.part4Summary(profile),
      part5Summary: cp.bodyProfileSummary(profile.bodyProfile, profile.bodyProfileMeta),
      角色姓名: base.name,
      更新范围: updateScope,
      更新Meta字段: (target.metaFields || []).join('、') || '无',
      更新部位: targetParts.join('、') || '无',
      当前自然Meta: cfg?.formatNaturalMeta?.(profile.bodyProfileMeta || {}) || '无',
      当前盛装Meta: cfg?.formatDressedMeta?.(profile.dressedProfileMeta || {}) || '无',
      当前部位描写: this.partLines(profile, profileType, targetParts) || '无',
      更新原因: String(target.reason || '外观变化').slice(0, 200),
      更新证据: String(target.evidence || '').slice(0, 400),
      穿着变化摘要: String(wearingSummary || '无').slice(0, 400),
      本轮正文摘要: String(narration || '').slice(0, 800),
    };
    const prompt = await window.GameModules.renderPrompt(promptId, vars);
    const partialTemplate = { name: base.name };
    if (updateScope === 'meta' || updateScope === 'both') {
      partialTemplate[profileType === 'bodyProfile' ? 'bodyProfileMeta' : 'dressedProfileMeta'] = currentMeta || (profileType === 'bodyProfile' ? cfg?.naturalMetaTemplate?.() : cfg?.dressedMetaTemplate?.());
    }
    if (updateScope === 'parts' || updateScope === 'both') {
      const field = profileType === 'bodyProfile' ? 'bodyProfile' : 'dressedProfile';
      partialTemplate[field] = targetParts.map((part) => ({ index: allowedParts.indexOf(part) + 1, part, tags: [], description: '' }));
    }
    const format = [prompt, '', '## 局部模板（只输出更新范围要求的字段）', JSON.stringify(partialTemplate, null, 2)].join('\n');
    let raw = '';
    try {
      raw = await agentLoop.completeConfiguredStep(store, format, logId, false, {
        ...config,
        sourceTitle: `${config.label}${stageTitle}`,
        promptId,
        reasoningPhase,
        jsonMode: true,
      });
      let data;
      try {
        data = this.validatePatchData(cp.parse(raw), base, { ...target, parts: targetParts });
      } catch (validationErr) {
        const repairFormat = `${format}\n\n## 修复要求\n${validationErr.message}；每项 description 必须 ${this.DESC_MIN}-${this.DESC_MAX} 汉字；tags 至少 2 个。`;
        raw = await agentLoop.completeConfiguredStep(store, repairFormat, logId, false, {
          ...config,
          sourceTitle: `${config.label}${stageTitle}重试`,
          promptId,
          reasoningPhase,
          jsonMode: true,
        });
        data = this.validatePatchData(cp.parse(raw), base, { ...target, parts: targetParts });
      }
      const patch = { subject: target.subject, subjectId: target.subjectId || state.id, profileType, updateScope, parts: targetParts, metaFields: target.metaFields || [], reason: target.reason, evidence: target.evidence };
      if (profileType === 'bodyProfile') {
        if (data.bodyProfileMeta) patch.bodyProfileMeta = cp.mergeBodyProfileMeta(currentMeta || {}, data.bodyProfileMeta, profile);
        if (data.bodyProfile) patch.bodyProfile = cp.mergeBodyProfilePatch(profile.bodyProfile || [], data.bodyProfile);
      } else {
        if (data.dressedProfileMeta) patch.dressedProfileMeta = cp.mergeDressedProfileMeta(currentMeta || {}, data.dressedProfileMeta, profile);
        if (data.dressedProfile) patch.dressedProfile = cp.mergeDressedProfilePatch(profile.dressedProfile || [], data.dressedProfile);
      }
      patch.descriptionText = [
        patch.bodyProfileMeta || patch.dressedProfileMeta
          ? (profileType === 'bodyProfile' ? cfg?.formatNaturalMeta?.(patch.bodyProfileMeta) : cfg?.formatDressedMeta?.(patch.dressedProfileMeta))
          : '',
        this.patchDescriptionText(profileType, {
          bodyProfile: patch.bodyProfile || profile.bodyProfile,
          dressedProfile: patch.dressedProfile || profile.dressedProfile,
        }, targetParts),
      ].filter(Boolean).join('\n');
      return patch;
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
      console.warn('Stage5 外观更新失败:', err.message);
      return { patches: [], gate: null, skipped: true, error: err.message };
    }
  },

  async runAfterStage4({ store, narration, participants, logId, config, loop, updates }) {
    if (config?.mode === 'story') {
      return { patches: [], gate: null, skipped: true, updates };
    }
    const gate = await this.runGate({ store, narration, participants, logId, config, loop });
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

  async runParallelWithStage4({ store, narration, participants, logId, config, loop, stage4Promise }) {
    const updates = await stage4Promise;
    return this.runAfterStage4({ store, narration, participants, logId, config, loop, updates });
  },

  async applyPatches(store, patches = []) {
    const settlement = window.GameModules.realWorldSettlementActions;
    const rows = [];
    for (const patch of Array.isArray(patches) ? patches : []) {
      const state = store?.itemSkillState?.(patch?.subjectId || patch?.subject);
      if (!state?.profile) continue;
      const profileType = patch.profileType || 'dressedProfile';
      if (profileType === 'bodyProfile') {
        if (Array.isArray(patch.bodyProfile)) state.profile.bodyProfile = patch.bodyProfile;
        if (patch.bodyProfileMeta) state.profile.bodyProfileMeta = patch.bodyProfileMeta;
      } else {
        if (Array.isArray(patch.dressedProfile)) state.profile.dressedProfile = patch.dressedProfile;
        if (patch.dressedProfileMeta) state.profile.dressedProfileMeta = patch.dressedProfileMeta;
      }
      if (store?.rpgStates && state.id) store.rpgStates[state.id] = state;
      await window.GameModules.characterStateStore?.save?.(state);
      await window.GameModules.characterIntroUpdateOperations?.syncRoleToIntro?.(state, null, store);
      const subjectName = patch.subject || state.profile?.name || state.name || '角色';
      const card = settlement?.resolveCharacterSettlementCard?.(store, state.id || patch.subjectId || patch.subject, subjectName)
        || { id: `role:${state.id}`, title: subjectName, section: '角色卡' };
      const category = profileType === 'bodyProfile' ? '自然外观' : '盛装外观';
      const fieldLabel = [
        ...(patch.metaFields || []),
        ...(patch.parts || []),
      ].join('、') || patch.updateScope || '外观';
      const reason = [patch.reason, patch.evidence].map((item) => String(item || '').trim()).filter(Boolean).join('；') || '本轮正文确认的外观变化';
      if (settlement?.realWorldSettlementRecordForCharacter) {
        rows.push(settlement.realWorldSettlementRecordForCharacter(
          category,
          fieldLabel,
          patch.descriptionText || '',
          reason,
          store,
          state.id || patch.subjectId || patch.subject,
          subjectName,
        ));
      } else if (settlement?.realWorldSettlementRecord) {
        rows.push(settlement.realWorldSettlementRecord(
          category,
          fieldLabel,
          patch.descriptionText || '',
          reason,
          card.title,
          card,
        ));
      } else {
        rows.push(`外观更新：${subjectName}（${fieldLabel}）`);
      }
    }
    return rows;
  },
};
