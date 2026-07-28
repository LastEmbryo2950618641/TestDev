window.GameModules = window.GameModules || {};

/**
 * Stage11：正文后串行结算
 * 1) 生命层次经验（击杀吸收 / 能力吸收）
 * 2) 知识/技能/职业经验（AI 按正文练习与使用结算）
 */
window.GameModules.inferenceLifeEnergyStage = {
  parseGainsPayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { gains: [], learnedGains: [], done: true };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const gains = Array.isArray(data.gains) ? data.gains : (Array.isArray(data.expGains) ? data.expGains : []);
      const learnedGains = Array.isArray(data.learnedGains)
        ? data.learnedGains
        : (Array.isArray(data.learnedExpGains) ? data.learnedExpGains : []);
      return { gains, learnedGains, done: data.done !== false, raw: data };
    } catch (_) {
      return { gains: [], learnedGains: [], done: true };
    }
  },

  participantLevelLines(store, participants = []) {
    const energy = window.GameModules.progressionLifeEnergy;
    const lines = [];
    const seen = new Set();
    for (const item of Array.isArray(participants) ? participants : []) {
      const state = energy?.resolveSubjectState?.(store, item) || null;
      if (!state?.values) continue;
      const id = String(state.id || item.id || '').trim();
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      const name = state.profile?.name || state.name || item.name || id || '未知';
      const level = Number(state.values.level) || 1;
      const exp = state.values.exp || {};
      lines.push(`${name}｜${id || '无id'}｜生命层次Lv${level}｜能量经验 ${Number(exp.current) || 0}/${Number(exp.next) || window.GameModules.progression?.nextCharacterExp?.(level) || 0}`);
    }
    const player = store?.playerIdentityState?.();
    if (player?.values && !seen.has(String(player.id || 'player-self'))) {
      const level = Number(player.values.level) || 1;
      const exp = player.values.exp || {};
      lines.push(`${player.profile?.name || '玩家'}｜player-self｜生命层次Lv${level}｜能量经验 ${Number(exp.current) || 0}/${Number(exp.next) || window.GameModules.progression?.nextCharacterExp?.(level) || 0}`);
    }
    return lines.length ? lines.join('\n') : '暂无已载入角色等级。';
  },

  formatLearnedList(label, list = []) {
    const rows = (Array.isArray(list) ? list : [])
      .filter((item) => item && Number(item.level) > 0)
      .slice(0, 16)
      .map((item) => {
        const name = String(item.name || '').trim();
        if (!name) return '';
        const lv = Number(item.level) || 1;
        const cur = Number(item.exp?.current) || 0;
        const next = item.exp?.next === Infinity ? 'max' : (Number(item.exp?.next) || window.GameModules.progression?.learnedNext?.[lv] || '?');
        return `${name} lv.${lv}（${cur}/${next}）`;
      })
      .filter(Boolean);
    return rows.length ? `${label}：${rows.join('；')}` : `${label}：无`;
  },

  participantLearnedLines(store, participants = []) {
    const energy = window.GameModules.progressionLifeEnergy;
    const lines = [];
    const seen = new Set();
    const pushState = (state) => {
      if (!state?.values) return;
      const id = String(state.id || '').trim() || 'unknown';
      if (seen.has(id)) return;
      seen.add(id);
      const name = state.profile?.name || state.name || id;
      lines.push(`${name}｜${id}`);
      lines.push(`  ${this.formatLearnedList('知识', state.profile?.knowledge)}`);
      lines.push(`  ${this.formatLearnedList('技能', state.profile?.skills)}`);
      lines.push(`  ${this.formatLearnedList('职业', state.profile?.professions)}`);
    };
    for (const item of Array.isArray(participants) ? participants : []) {
      pushState(energy?.resolveSubjectState?.(store, item) || null);
    }
    pushState(store?.playerIdentityState?.());
    return lines.length ? lines.join('\n') : '暂无已载入习得列表。';
  },

  bandTableText() {
    const rows = [];
    for (let min = 1; min <= 91; min += 10) {
      const max = Math.min(100, min + 9);
      rows.push(`- 来源 Lv${min}-${max} → 经验 ${min}-${max}`);
    }
    return rows.join('\n');
  },

  buildPrompt({ narration = '', action = '', levelSnapshot = '', learnedSnapshot = '' } = {}) {
    return [
      '# Stage11 经验结算（生命层次 + 习得）',
      '角色：经验结算器。只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '',
      '## A. 生命层次经验 gains（能量积累）',
      '- 合法来源仅 kill（击杀生命体并吸收能量）或 absorb（吸收能力/精魄/能量）。',
      '- 升级由系统处理，禁止直接改 level。',
      '- 禁止因日常行动、社交、单纯学习/锻炼、受伤给 gains。',
      '- 档位硬约束：',
      this.bandTableText(),
      '- quality 仅 low/normal/high/peak，只影响档内高低。',
      '',
      '## B. 知识/技能/职业经验 learnedGains（唯一习得经验来源）',
      '- 仅当正文明确练习、使用、实操、考核、授课相关某项已有知识/技能/职业时才给。',
      '- learnedType：knowledge|skill|profession（或 知识|技能|职业）。',
      '- name 必须精确匹配下方「已有习得列表」中的名称；不得新建条目。',
      '- expGain：1-80 整数；轻微提及取低，持续实操/关键练习取高。',
      '- 满级(lv7)或不存在的名称 → 不要输出。',
      '- 无相关事实 → learnedGains 为空数组。',
      '',
      '## 当前可结算对象生命层次',
      levelSnapshot || '暂无。',
      '',
      '## 当前可结算对象已有习得列表',
      learnedSnapshot || '暂无。',
      '',
      '## 本次行动',
      String(action || '').slice(0, 800),
      '',
      '## 本轮正文（摘要）',
      String(narration || '').slice(0, 4000),
      '',
      '## 输出合约',
      '{"gains":[{"subject":{"id":"player-self","name":"姓名"},"sourceType":"kill|absorb","sourceName":"来源","sourceLevel":12,"quality":"normal","expGain":14,"evidence":"短证据"}],"learnedGains":[{"subject":{"id":"player-self","name":"姓名"},"learnedType":"skill","name":"已有技能名","expGain":12,"evidence":"短证据"}],"done":true}',
      '- 无任何事实：{"gains":[],"learnedGains":[],"done":true}',
    ].join('\n');
  },

  async runAfterSettlement({ store, action, narration, participants, logId, config, loop }) {
    const energy = window.GameModules.progressionLifeEnergy;
    if (!energy) return { gains: [], learnedGains: [], lines: ['经验结算：模块未加载'], skipped: true };
    const levelSnapshot = this.participantLevelLines(store, participants);
    const learnedSnapshot = this.participantLearnedLines(store, participants);
    const prompt = this.buildPrompt({ narration, action, levelSnapshot, learnedSnapshot });
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage11 经验结算…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage11：结算生命层次经验与知识/技能/职业经验。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    let raw = '';
    try {
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        ...config,
        sourceTitle: `${config?.label || ''}Stage11 经验结算`,
        promptId: 'inference-stage10-life-energy-exp',
        reasoningPhase: 'stage11',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
    } catch (err) {
      console.warn('[Stage11经验] 生成失败:', err?.message || err);
      return { gains: [], learnedGains: [], lines: [`经验结算失败：${err?.message || '未知错误'}`], skipped: true, error: err?.message };
    }
    const parsed = this.parseGainsPayload(raw);
    const life = energy.applyGains(store, parsed.gains);
    const learned = energy.applyLearnedGains(store, parsed.learnedGains);
    return {
      gains: parsed.gains,
      learnedGains: parsed.learnedGains,
      lines: [...life.lines, ...learned.lines],
      applied: life.applied,
      appliedLearned: learned.applied,
      raw,
    };
  },
};

