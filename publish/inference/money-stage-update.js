window.GameModules = window.GameModules || {};

window.GameModules.inferenceMoneyStageUpdate = {
  parsePayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    const arrayStart = source.indexOf('[');
    const arrayEnd = source.lastIndexOf(']');
    try {
      if (start >= 0 && end > start) {
        const data = JSON.parse(source.slice(start, end + 1));
        const changes = data.changes
          || data.moneyChanges
          || data['金钱变化']
          || data['现金变化']
          || data['金钱结算'];
        return {
          changes: Array.isArray(changes) ? changes : [],
          done: data.done !== false,
          raw: data,
        };
      }
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        return { changes: JSON.parse(source.slice(arrayStart, arrayEnd + 1)), done: true, raw: null };
      }
    } catch (error) {
      return { changes: [], done: true, raw: null, error: error?.message || 'JSON 解析失败' };
    }
    return { changes: [], done: true, raw: null, error: '未找到金钱结算 JSON' };
  },

  parseDelta(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const text = String(value ?? '')
      .replace(/[，,\s￥¥元人民币CNY]/giu, '')
      .replace(/[−－]/gu, '-');
    if (!text || !/[+-]?\d+(?:\.\d+)?/u.test(text)) return null;
    const number = Number(text.match(/[+-]?\d+(?:\.\d+)?/u)?.[0]);
    return Number.isFinite(number) ? number : null;
  },

  buildMoneySettlementPrompt({ store, action = '', narration = '', updates = {}, participants = [], priorStageSummary = null } = {}) {
    const profile = store?.playerProfile || {};
    const playerName = String(store?.playerName || profile.name || '玩家').trim() || '玩家';
    const balance = Number(profile.wealthAmount);
    const career = store?.companyState?.workUnitProfile || store?.companyState?.careerProfile || {};
    const location = String(store?.realWorldLocationLabel?.() || store?.realWorldLocationName || store?.realWorldMap?.current || '').trim();
    return [
      '# Stage4-15 金钱结算',
      '你是现实推演的金钱结算器，只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '本阶段只处理玩家统一钱包 playerProfile.wealthAmount，不创建独立钱包，不修改财富等级、遗产、资产估值、NPC钱包或职业档案金额字段。',
      '根据本轮行动、正文和前序结算上下文识别已经发生的现金收入与支出。收入可以来自正文明确成立的工资、报酬、退款、现金收款或其他现实获得；支出可以来自正文明确成立的购物、交通、餐饮、服务费、赔偿或其他现实支付。以上只是类别说明，不是固定事件清单，必须根据上下文自由判断。',
      '只有上下文明确出现实际收款、付款、退款或金额事实时才产生变化；没有明确金钱事实必须返回 changes=[]。不要因为拥有职业、发生行动、经过时间或推测生活成本而自动加减钱。',
      '每笔明确交易单独返回，按正文发生顺序排列；delta 为对玩家余额的整数增减，收入为正数、支出为负数，不能把当前余额误写成 delta。金额有明确数值时照实使用；金额无法从上下文确定时不要编造数值。',
      'reason 必须引用正文、行动或前序结算中的具体金钱事实。subject 固定写 player-self 或玩家姓名。',
      '',
      `玩家：${playerName}（player-self）`,
      `玩家当前钱包余额（只读基线）：${Number.isFinite(balance) ? balance : 0} 元`,
      `当前地点：${location || '未提供'}`,
      `当前职业档案摘要：${JSON.stringify({ organizationName: career.organizationName || '', positionTitle: career.positionTitle || '', salary: career.salary || {} })}`,
      `本次行动：${String(action || '').slice(0, 1200)}`,
      `本轮正文：${String(narration || '').slice(0, 6000)}`,
      `本轮前序结算结果：${JSON.stringify(updates || {}).slice(0, 9000)}`,
      `前序阶段摘要：${JSON.stringify(priorStageSummary || {}).slice(0, 9000)}`,
      '',
      '输出格式：{"changes":[{"subject":"player-self","delta":-35,"reason":"正文明确购买午餐并支付35元"}],"done":true}',
      '没有明确现金变化时输出：{"changes":[],"done":true}',
    ].join('\n');
  },

  applyChanges(store, changes = []) {
    const profile = store?.playerProfile;
    const before = Number(profile?.wealthAmount);
    let balance = Number.isFinite(before) ? before : 0;
    const applied = [];
    (Array.isArray(changes) ? changes : []).forEach((item) => {
      const delta = this.parseDelta(item?.delta ?? item?.change ?? item?.amount ?? item?.value);
      if (!Number.isFinite(delta) || delta === 0) return;
      balance += delta;
      applied.push({
        subject: String(item?.subject || 'player-self').trim() || 'player-self',
        delta,
        reason: String(item?.reason || item?.evidence || '本轮明确现金事实').trim(),
      });
    });
    if (profile && applied.length) {
      const next = { ...profile, wealthAmount: balance };
      if (typeof store.normalizePlayerWealth === 'function') Object.assign(profile, store.normalizePlayerWealth(next));
      else profile.wealthAmount = balance;
    }
    const lines = applied.length
      ? applied.map((item) => `金钱结算：钱包 ${item.delta > 0 ? '+' : ''}${item.delta} 元：${item.reason}`)
      : ['金钱结算：本轮没有明确现金收入或支出。'];
    return {
      changes: Array.isArray(changes) ? changes : [],
      applied,
      balanceBefore: Number.isFinite(before) ? before : 0,
      balanceAfter: profile && applied.length ? balance : (Number.isFinite(before) ? before : 0),
      lines,
    };
  },

  async runAfterStage4({ store, action, narration, updates, participants, logId, config, loop, priorStageSummary = null } = {}) {
    if (!store?.playerProfile || config?.mode === 'story') return { changes: [], applied: [], lines: [], skipped: true };
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage4-15 金钱结算…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage4-15：根据本轮上下文结算玩家现金收入与支出。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    const prompt = this.buildMoneySettlementPrompt({ store, action, narration, updates, participants, priorStageSummary });
    let raw = '';
    try {
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        ...config,
        sourceTitle: `${config?.label || ''}Stage4-15 金钱结算`,
        promptId: 'inference-stage4-settlement-window',
        reasoningPhase: 'stage4-15',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
    } catch (error) {
      console.warn('[Stage4-15金钱] 生成失败:', error?.message || error);
      return { changes: [], applied: [], lines: [`金钱结算失败：${error?.message || '未知错误'}`], skipped: true, error: error?.message || '未知错误' };
    }
    const parsed = this.parsePayload(raw);
    const applied = this.applyChanges(store, parsed.changes);
    return {
      ...applied,
      lines: parsed.error ? [`金钱结算解析失败：${parsed.error}`] : applied.lines,
      raw,
      parsed,
      participants,
      skipped: false,
    };
  },
};
