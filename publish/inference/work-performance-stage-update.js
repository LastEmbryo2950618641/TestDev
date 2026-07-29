window.GameModules = window.GameModules || {};

window.GameModules.inferenceWorkPerformanceStageUpdate = {
  allowedStatuses: ['上班', '迟到', '旷班', '假期', '请假', '出差', '居家办公', '加班'],

  parsePayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { update: null, error: '未找到合法 JSON 对象' };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const update = data?.workPerformanceUpdate;
      const error = this.validateUpdate(update);
      return error ? { update: null, error, raw: data } : { update, error: '', raw: data };
    } catch (err) {
      return { update: null, error: `JSON 解析失败：${err?.message || '未知错误'}` };
    }
  },

  validateUpdate(update) {
    if (!update || typeof update !== 'object') return '缺少 workPerformanceUpdate 对象';
    if (typeof update.reviewTriggered !== 'boolean') return 'reviewTriggered 必须为布尔值';
    if (typeof update.reviewSummary !== 'string') return 'reviewSummary 必须为字符串';
    if (!update.attendanceUpdate || typeof update.attendanceUpdate !== 'object') return '缺少 attendanceUpdate';
    if (!this.allowedStatuses.includes(String(update.attendanceUpdate.status || ''))) return 'attendanceUpdate.status 不合法';
    if (typeof update.attendanceUpdate.detail !== 'string') return 'attendanceUpdate.detail 必须为字符串';
    if (typeof update.attendanceUpdate.reason !== 'string') return 'attendanceUpdate.reason 必须为字符串';
    if (typeof update.attendanceUpdate.canCheckIn !== 'boolean') return 'attendanceUpdate.canCheckIn 必须为布尔值';
    if (typeof update.nextPerformanceReviewAt !== 'string' || !update.nextPerformanceReviewAt.trim()) return 'nextPerformanceReviewAt 必须为 ISO 日期字符串';
    if (Number.isNaN(Date.parse(update.nextPerformanceReviewAt))) return 'nextPerformanceReviewAt 不是有效日期';
    if (!update.leaderReview || typeof update.leaderReview !== 'object') return '缺少 leaderReview';
    if (typeof update.leaderReview.summary !== 'string') return 'leaderReview.summary 必须为字符串';
    if (typeof update.leaderReview.detail !== 'string') return 'leaderReview.detail 必须为字符串';
    if (!Number.isFinite(Number(update.leaderReview.score))) return 'leaderReview.score 必须为数值';
    if (!update.employeeReview || typeof update.employeeReview !== 'object') return '缺少 employeeReview';
    if (typeof update.employeeReview.summary !== 'string') return 'employeeReview.summary 必须为字符串';
    if (typeof update.employeeReview.detail !== 'string') return 'employeeReview.detail 必须为字符串';
    if (!Array.isArray(update.contributionItems)) return 'contributionItems 必须为数组';
    for (const item of update.contributionItems) {
      if (!item || typeof item !== 'object') return 'contributionItems 项必须为对象';
      if (typeof item.type !== 'string') return 'contributionItems.type 必须为字符串';
      if (typeof item.title !== 'string') return 'contributionItems.title 必须为字符串';
      if (typeof item.detail !== 'string') return 'contributionItems.detail 必须为字符串';
      if (typeof item.projectName !== 'string') return 'contributionItems.projectName 必须为字符串';
      if (typeof item.valueText !== 'string') return 'contributionItems.valueText 必须为字符串';
      if (!Number.isFinite(Number(item.impactScore))) return 'contributionItems.impactScore 必须为数值';
    }
    if (!Array.isArray(update.characterCardLines) || update.characterCardLines.some((line) => typeof line !== 'string')) return 'characterCardLines 必须为字符串数组';
    return '';
  },

  isReviewDue(nextPerformanceReviewAt = '', now = new Date()) {
    const ts = Date.parse(String(nextPerformanceReviewAt || '').trim());
    return Number.isFinite(ts) && ts <= now.getTime();
  },

  buildPrompt({ companyContext = '', narration = '', action = '', nextPerformanceReviewAt = '', reviewDue = false, attendance = {}, leaderReview = {}, employeeReview = {}, contributionItems = [] } = {}) {
    return [
      '# Stage13 工作与绩效',
      '角色：严格的工作与绩效 JSON 更新器。只返回一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '本阶段用于把单位工作状态、绩效评价与贡献价值同步回工作系统。',
      '',
      '## 规则',
      `1. 只能输出以下顶层结构：{ "workPerformanceUpdate": { ... } }。`,
      `2. attendanceUpdate.status 只能是：${this.allowedStatuses.join('、')}。`,
      '3. 只要本轮正文或上下文出现工作相关变化，就必须立刻更新对应字段，不要等待长期累计。',
      '4. 领导评价、员工评价、贡献价值必须基于已给上下文和本轮正文，不得脱离事实胡编。',
      '5. contributionItems 可为空数组；但若正文出现项目推进、完成、收益、稳定履职、迟到旷班、绩效拉低/拉高等信息，必须写入具体条目。',
      '6. nextPerformanceReviewAt 必须是未来的 ISO 日期字符串。',
      reviewDue
        ? `7. 当前时间已到达或超过下一次评绩效日期 ${nextPerformanceReviewAt}，本轮必须执行评绩效：reviewTriggered 必须为 true，并重写领导评价、员工评价、贡献价值，同时把 nextPerformanceReviewAt 推到未来日期。`
        : `7. 当前下一次评绩效日期为 ${nextPerformanceReviewAt || '未设置'}；若本轮未到日期且无新绩效事实，可保留 reviewTriggered 为 false，但仍要根据正文更新上班状态与即时工作变化。`,
      '8. characterCardLines 用于给结算面板显示简短结果，每行一句，最多 4 行。',
      '',
      '## 当前单位上下文',
      companyContext || '暂无公司上下文。',
      '',
      '## 当前已记录工作状态',
      `- 上班状态：${attendance.status || '未更新'}｜${attendance.detail || '无'}`,
      `- 领导评价：${leaderReview.summary || '暂无'}｜${leaderReview.score ?? 0}`,
      `- 员工评价：${employeeReview.summary || '暂无'}`,
      `- 贡献价值：${(Array.isArray(contributionItems) ? contributionItems : []).map((item) => item.title || item.type).join('；') || '暂无'}`,
      '',
      '## 本次行动',
      String(action || '').slice(0, 800),
      '',
      '## 本轮正文摘要',
      String(narration || '').slice(0, 4000),
      '',
      '## 输出 JSON Schema',
      '{',
      '  "workPerformanceUpdate": {',
      '    "reviewTriggered": true,',
      '    "reviewSummary": "一句话概括本轮工作与绩效变化",',
      '    "nextPerformanceReviewAt": "2026-08-31T10:00:00.000Z",',
      '    "attendanceUpdate": {',
      '      "status": "上班",',
      '      "detail": "今日正常到岗并完成日常工作。",',
      '      "reason": "正文明确写到正常上班与工作推进。",',
      '      "canCheckIn": false',
      '    },',
      '    "leaderReview": {',
      '      "summary": "工作推进稳定。",',
      '      "detail": "按部就班完成安排任务，并对项目有正向推进。",',
      '      "score": 88',
      '    },',
      '    "employeeReview": {',
      '      "summary": "本轮完成既定工作。",',
      '      "detail": "能够独立执行并对项目进度负责。"',
      '    },',
      '    "contributionItems": [',
      '      {',
      '        "type": "project-delivery",',
      '        "title": "独立完成《示例项目》阶段任务",',
      '        "detail": "按要求高质量交付本轮工作内容。",',
      '        "projectName": "示例项目",',
      '        "valueText": "推动项目进入下一阶段",',
      '        "impactScore": 82',
      '      }',
      '    ],',
      '    "characterCardLines": [',
      '      "工作绩效Stage13：同步今日工作状态",',
      '      "工作绩效Stage13：写入领导评价与员工评价"',
      '    ]',
      '  }',
      '}',
    ].join('\n');
  },

  buildLines(update = {}, applied = {}) {
    const lines = [];
    lines.push(`工作绩效Stage13：上班状态更新为${applied.attendanceStatus?.status || update.attendanceUpdate?.status || '未更新'}`);
    if (update.reviewSummary) lines.push(`工作绩效Stage13：${update.reviewSummary}`);
    if (update.leaderReview?.summary) lines.push(`工作绩效Stage13：领导评价 - ${update.leaderReview.summary}`);
    if (update.employeeReview?.summary) lines.push(`工作绩效Stage13：员工评价 - ${update.employeeReview.summary}`);
    if (Array.isArray(update.characterCardLines) && update.characterCardLines.length) lines.push(...update.characterCardLines.slice(0, 4));
    return [...new Set(lines.filter(Boolean))].slice(0, 6);
  },

  applyUpdate(store, update = {}, now = new Date()) {
    store?.initCompanySystem?.();
    if (store?.companyState?.employment?.active === false) {
      return { applied: null, lines: ['工作绩效Stage13：当前未在职，跳过更新。'], skipped: true };
    }
    const nowIso = now.toISOString();
    const dateKey = typeof store?.companyDateKey === 'function'
      ? store.companyDateKey(now)
      : `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const stats = typeof store?.normalizeCompanyWorkStats === 'function'
      ? store.normalizeCompanyWorkStats()
      : (store.companyState.workStats || {});
    const contributions = (Array.isArray(update.contributionItems) ? update.contributionItems : []).map((item, index) => ({
      id: `${item.type || 'contribution'}-${index}-${Date.now()}`,
      type: String(item.type || '').trim(),
      title: String(item.title || '').trim(),
      detail: String(item.detail || '').trim(),
      projectName: String(item.projectName || '').trim(),
      valueText: String(item.valueText || '').trim(),
      impactScore: Number(item.impactScore || 0),
      updatedAt: nowIso,
      source: 'ai',
    }));
    stats.attendanceStatus = {
      dateKey,
      status: update.attendanceUpdate.status,
      detail: update.attendanceUpdate.detail,
      reason: update.attendanceUpdate.reason,
      canCheckIn: update.attendanceUpdate.canCheckIn,
      updatedAt: nowIso,
      source: 'ai',
    };
    stats.nextPerformanceReviewAt = update.nextPerformanceReviewAt;
    stats.leaderReview = {
      score: Number(update.leaderReview.score || 0),
      summary: update.leaderReview.summary,
      detail: update.leaderReview.detail,
      updatedAt: nowIso,
      source: 'ai',
    };
    stats.employeeReview = {
      summary: update.employeeReview.summary,
      detail: update.employeeReview.detail,
      updatedAt: nowIso,
      source: 'ai',
    };
    stats.contributionItems = contributions;
    if (update.reviewTriggered) {
      stats.performanceHistory = Array.isArray(stats.performanceHistory) ? stats.performanceHistory : [];
      stats.performanceHistory.unshift({
        reviewedAt: nowIso,
        summary: update.reviewSummary,
        leaderReview: { ...stats.leaderReview },
        employeeReview: { ...stats.employeeReview },
        contributionItems: contributions,
      });
      stats.performanceHistory = stats.performanceHistory.slice(0, 12);
    }
    console.log('[工作绩效调试] Stage13 apply', {
      reviewTriggered: update.reviewTriggered,
      nextPerformanceReviewAt: stats.nextPerformanceReviewAt,
      attendanceStatus: stats.attendanceStatus,
      contributionCount: contributions.length,
    });
    store.syncCompanyLexicon?.();
    store.save?.();
    return {
      applied: {
        attendanceStatus: stats.attendanceStatus,
        leaderReview: stats.leaderReview,
        employeeReview: stats.employeeReview,
        contributionItems: contributions,
        nextPerformanceReviewAt: stats.nextPerformanceReviewAt,
      },
      lines: this.buildLines(update, { attendanceStatus: stats.attendanceStatus }),
      skipped: false,
    };
  },

  async runAfterSettlement({ store, action, narration, updates, logId, config, loop }) {
    if (config?.mode === 'story') return { lines: [], skipped: true };
    store?.initCompanySystem?.();
    if (store?.companyState?.employment?.active === false) return { lines: ['工作绩效Stage13：当前未在职，跳过更新。'], skipped: true };
    const now = store?.phoneDate?.() || new Date();
    const stats = typeof store?.normalizeCompanyWorkStats === 'function' ? store.normalizeCompanyWorkStats() : (store?.companyState?.workStats || {});
    const reviewDue = this.isReviewDue(stats.nextPerformanceReviewAt, now);
    const prompt = this.buildPrompt({
      companyContext: store?.companyPromptContext?.() || '',
      narration,
      action,
      nextPerformanceReviewAt: stats.nextPerformanceReviewAt || '',
      reviewDue,
      attendance: stats.attendanceStatus || {},
      leaderReview: stats.leaderReview || {},
      employeeReview: stats.employeeReview || {},
      contributionItems: stats.contributionItems || [],
    });
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage13 工作与绩效…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, reviewDue
      ? `Stage13：工作与绩效已到评绩效日期 ${stats.nextPerformanceReviewAt}，强制要求 AI 评绩效并更新公司字段。`
      : 'Stage13：根据正文同步上班状态、领导评价、员工评价与贡献价值。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    console.log('[工作绩效调试] Stage13 request', { reviewDue, nextPerformanceReviewAt: stats.nextPerformanceReviewAt, logId });
    let raw = '';
    try {
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        sourceTitle: `${config?.label || ''}Stage13 工作与绩效`,
        promptId: 'inference-stage13-work-performance-update',
        reasoningPhase: 'stage13',
        outputLimitKind: 'stage4',
      });
      console.log('[工作绩效调试] Stage13 raw', String(raw || '').slice(0, 1200));
      const parsed = this.parsePayload(raw);
      if (!parsed.update) {
        console.warn('[工作绩效调试] Stage13 invalid', parsed.error);
        return { lines: [`工作绩效Stage13：返回无效，未写入（${parsed.error || '未知错误'}）`], raw, skipped: false, error: parsed.error };
      }
      console.log('[工作绩效调试] Stage13 parsed', parsed.update);
      const applied = this.applyUpdate(store, parsed.update, now);
      return { lines: applied.lines, raw, update: parsed.update, applied: applied.applied, skipped: false };
    } catch (err) {
      console.warn('[工作绩效调试] Stage13 failed:', err?.message || err);
      return { lines: [`工作绩效Stage13失败：${err?.message || '未知错误'}`], raw, skipped: false, error: err?.message || String(err || '') };
    }
  },
};
