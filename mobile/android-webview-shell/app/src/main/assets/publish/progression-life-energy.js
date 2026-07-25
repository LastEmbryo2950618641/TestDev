window.GameModules = window.GameModules || {};

/**
 * 生命层次经验：能量积累。
 * - 经验 = 击杀生命体吸收能量 / 吸收能力所得
 * - 升级 = 生命层次提升
 * - 经验档位由来源生命层次硬约束，避免 AI 乱给导致越级暴涨
 */
window.GameModules.progressionLifeEnergy = {
  qualityFactors: {
    low: 0.7,
    normal: 1,
    mid: 1,
    medium: 1,
    high: 1.25,
    peak: 1.45,
    极低: 0.7,
    普通: 1,
    中: 1,
    高: 1.25,
    极高: 1.45,
  },

  bandForSourceLevel(sourceLevel = 1) {
    const level = Math.max(1, Math.min(100, Math.round(Number(sourceLevel) || 1)));
    const bandMin = Math.floor((level - 1) / 10) * 10 + 1;
    const bandMax = Math.min(100, bandMin + 9);
    return { sourceLevel: level, bandMin, bandMax };
  },

  qualityFactor(quality = 'normal') {
    const key = String(quality || 'normal').trim().toLowerCase();
    if (this.qualityFactors[key] != null) return this.qualityFactors[key];
    const zh = String(quality || '').trim();
    if (this.qualityFactors[zh] != null) return this.qualityFactors[zh];
    return 1;
  },

  /**
   * 在档位内给出建议值：先按来源等级落在档内线性位置，再乘能量质量，最后钳制到档位。
   */
  suggestedExp(sourceLevel = 1, quality = 'normal') {
    const { bandMin, bandMax, sourceLevel: level } = this.bandForSourceLevel(sourceLevel);
    const span = Math.max(0, bandMax - bandMin);
    const t = span ? ((level - bandMin) / 9) : 0;
    const raw = bandMin + span * t * this.qualityFactor(quality);
    return Math.max(bandMin, Math.min(bandMax, Math.round(raw)));
  },

  clampExpGain(sourceLevel = 1, expGain = 0, quality = 'normal') {
    const band = this.bandForSourceLevel(sourceLevel);
    let amount = Math.round(Number(expGain));
    if (!Number.isFinite(amount) || amount <= 0) {
      amount = this.suggestedExp(band.sourceLevel, quality);
    }
    amount = Math.max(band.bandMin, Math.min(band.bandMax, amount));
    return { ...band, expGain: amount, quality: String(quality || 'normal').trim() || 'normal' };
  },

  resolveSubjectState(store, subject = {}) {
    if (!store) return null;
    const raw = subject && typeof subject === 'object' ? subject : { name: subject };
    const id = String(raw.id || raw.characterId || raw.subjectId || '').trim();
    const name = String(raw.name || raw.subject || raw.displayName || '').trim();
    if (id === 'player-self' || /^(?:你|玩家|player)$/iu.test(name) || /^(?:你|玩家|player)$/iu.test(id)) {
      return store.playerIdentityState?.() || store.rpgStates?.['player-self'] || null;
    }
    if (id && typeof store.itemSkillState === 'function') {
      const byId = store.itemSkillState(id);
      if (byId) return byId;
    }
    if (name && typeof store.itemSkillState === 'function') {
      const byName = store.itemSkillState(name);
      if (byName) return byName;
    }
    if (id && store.rpgStates?.[id]) return store.rpgStates[id];
    const states = Object.values(store.rpgStates || {});
    const hit = states.find((state) => {
      const n = String(state?.profile?.name || state?.name || '').trim();
      return n && (n === name || n === id);
    });
    return hit || null;
  },

  normalizeGain(raw = {}) {
    const sourceType = /absorb|吸收|能力/iu.test(String(raw.sourceType || raw.type || '')) ? 'absorb' : 'kill';
    const sourceLevel = Math.max(1, Math.min(100, Math.round(Number(raw.sourceLevel ?? raw.level ?? raw.powerLevel) || 1)));
    const quality = String(raw.quality || raw.energyQuality || 'normal').trim() || 'normal';
    const clamped = this.clampExpGain(sourceLevel, raw.expGain ?? raw.exp ?? raw.amount, quality);
    return {
      subject: raw.subject && typeof raw.subject === 'object'
        ? raw.subject
        : { id: String(raw.subjectId || raw.id || '').trim(), name: String(raw.subject || raw.subjectName || raw.name || '').trim() },
      sourceType,
      sourceName: String(raw.sourceName || raw.targetName || raw.victim || raw.abilityName || '未知来源').trim() || '未知来源',
      sourceLevel: clamped.sourceLevel,
      quality: clamped.quality,
      expGain: clamped.expGain,
      bandMin: clamped.bandMin,
      bandMax: clamped.bandMax,
      evidence: String(raw.evidence || raw.reason || '').trim(),
    };
  },

  applyGain(store, rawGain = {}) {
    const gain = this.normalizeGain(rawGain);
    const state = this.resolveSubjectState(store, gain.subject);
    if (!state?.values) {
      return { ok: false, line: `生命层次经验：无法定位结算对象 ${gain.subject?.name || gain.subject?.id || '未知'}`, gain };
    }
    if (!state.values.exp || typeof state.values.exp !== 'object') {
      const level = Math.max(1, Number(state.values.level) || 1);
      state.values.exp = {
        current: 0,
        next: window.GameModules.progression?.nextCharacterExp?.(level) || Math.round(100 * level ** 1.65),
        curve: 'nextExp=round(100*level^1.65)',
      };
    }
    if (!Number.isFinite(Number(state.values.level))) state.values.level = 1;
    const beforeLevel = Number(state.values.level) || 1;
    const beforeExp = Number(state.values.exp?.current) || 0;
    const scaled = window.GameModules.progression.scaleExpByGrowthPotential(state.values, gain.expGain);
    window.GameModules.progression.addExp(state.values, scaled.expGain, state.profile || {});
    const afterLevel = Number(state.values.level) || beforeLevel;
    const afterExp = Number(state.values.exp?.current) || 0;
    if (store.rpgStates && state.id) store.rpgStates = { ...store.rpgStates, [state.id]: state };
    const who = state.profile?.name || state.name || gain.subject?.name || state.id || '未知';
    const typeLabel = gain.sourceType === 'absorb' ? '吸收能力' : '击杀吸收';
    const levelNote = afterLevel > beforeLevel ? `，生命层次 ${beforeLevel}→${afterLevel}` : '';
    const potNote = `潜力${Math.round(scaled.effectivePotential)}/${scaled.basePotential}`;
    return {
      ok: true,
      gain,
      appliedExp: scaled.expGain,
      scaled,
      state,
      line: `生命层次经验：${who} 因${typeLabel}「${gain.sourceName}」(约Lv${gain.sourceLevel}/${gain.quality}) AI经验 ${gain.expGain}→实际 ${scaled.expGain}（${potNote}；档位 ${gain.bandMin}-${gain.bandMax}；${beforeExp}→${afterExp}${levelNote}）`,
    };
  },

  applyGains(store, gains = []) {
    const lines = [];
    const applied = [];
    for (const item of (Array.isArray(gains) ? gains : []).slice(0, 20)) {
      const result = this.applyGain(store, item);
      if (result.line) lines.push(result.line);
      if (result.ok) applied.push(result);
    }
    return { lines, applied };
  },

  learnedTypeKey(raw = '') {
    const text = String(raw || '').trim().toLowerCase();
    if (/^(?:knowledge|知识)$/u.test(text)) return 'knowledge';
    if (/^(?:skill|skills|技能)$/u.test(text)) return 'skills';
    if (/^(?:profession|professions|job|职业)$/u.test(text)) return 'professions';
    return '';
  },

  learnedTypeLabel(key = '') {
    return { knowledge: '知识', skills: '技能', professions: '职业' }[key] || '习得';
  },

  findLearnedItem(values = {}, listKey = '', name = '') {
    const target = String(name || '').trim();
    if (!target || !values) return null;
    const list = Array.isArray(values[listKey]) ? values[listKey] : [];
    return list.find((item) => String(item?.name || '').trim() === target)
      || list.find((item) => String(item?.name || '').trim().includes(target) || target.includes(String(item?.name || '').trim()))
      || null;
  },

  clampLearnedExpGain(expGain = 0) {
    const amount = Math.round(Number(expGain) || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.max(1, Math.min(80, amount));
  },

  normalizeLearnedGain(raw = {}) {
    const listKey = this.learnedTypeKey(raw.learnedType || raw.type || raw.kind || raw.category);
    const name = String(raw.name || raw.learnedName || raw.itemName || '').trim();
    const expGain = this.clampLearnedExpGain(raw.expGain ?? raw.exp ?? raw.amount);
    return {
      subject: raw.subject && typeof raw.subject === 'object'
        ? raw.subject
        : { id: String(raw.subjectId || raw.id || '').trim(), name: String(raw.subject || raw.subjectName || '').trim() },
      listKey,
      learnedType: this.learnedTypeLabel(listKey),
      name,
      expGain,
      evidence: String(raw.evidence || raw.reason || '').trim(),
    };
  },

  applyLearnedGain(store, rawGain = {}) {
    const gain = this.normalizeLearnedGain(rawGain);
    if (!gain.listKey || !gain.name || !gain.expGain) {
      return { ok: false, line: `习得经验：条目无效（需 learnedType+name+expGain）`, gain };
    }
    const state = this.resolveSubjectState(store, gain.subject);
    if (!state?.values) {
      return { ok: false, line: `习得经验：无法定位结算对象 ${gain.subject?.name || gain.subject?.id || '未知'}`, gain };
    }
    const item = this.findLearnedItem(state.values, gain.listKey, gain.name);
    if (!item) {
      return { ok: false, line: `习得经验：${state.profile?.name || state.name || '角色'} 未拥有${gain.learnedType}「${gain.name}」，已忽略`, gain };
    }
    if (!window.GameModules.progression?.hasLearnedLevel?.(item) || Number(item.level) >= 7) {
      return { ok: false, line: `习得经验：${gain.learnedType}「${gain.name}」已满级或不可升级，已忽略`, gain };
    }
    const beforeLevel = Number(item.level) || 1;
    const beforeExp = Number(item.exp?.current) || 0;
    const ok = window.GameModules.progression.addLearnedExp(item, gain.expGain);
    if (!ok) {
      return { ok: false, line: `习得经验：写入失败「${gain.name}」`, gain };
    }
    const afterLevel = Number(item.level) || beforeLevel;
    const afterExp = Number(item.exp?.current) || 0;
    if (store.rpgStates && state.id) store.rpgStates = { ...store.rpgStates, [state.id]: state };
    const who = state.profile?.name || state.name || gain.subject?.name || state.id || '未知';
    const levelNote = afterLevel > beforeLevel ? `，等级 ${beforeLevel}→${afterLevel}` : '';
    return {
      ok: true,
      gain,
      appliedExp: gain.expGain,
      state,
      item,
      line: `习得经验：${who} 的${gain.learnedType}「${gain.name}」+${gain.expGain}（${beforeExp}→${afterExp}${levelNote}；${gain.evidence || '正文练习/使用'}）`,
    };
  },

  applyLearnedGains(store, gains = []) {
    const lines = [];
    const applied = [];
    for (const item of (Array.isArray(gains) ? gains : []).slice(0, 12)) {
      const result = this.applyLearnedGain(store, item);
      if (result.line) lines.push(result.line);
      if (result.ok) applied.push(result);
    }
    return { lines, applied };
  },
};
