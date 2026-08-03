window.GameModules = window.GameModules || {};

window.GameModules.inferenceWorkPerformanceStageUpdate = {
  allowedStatuses: ['上班', '迟到', '旷班', '假期', '请假', '出差', '居家办公', '加班', '接单中', '交付中', '空档期'],

  parsePayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { update: null, error: '未找到合法 JSON 对象' };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const profile = data?.careerProfile && typeof data.careerProfile === 'object' ? data.careerProfile : null;
      const workUnitProfile = data?.workUnitProfile && typeof data.workUnitProfile === 'object' ? data.workUnitProfile : null;
      const freelanceProfile = data?.freelanceProfile && typeof data.freelanceProfile === 'object' ? data.freelanceProfile : null;
      const freelanceProfiles = Array.isArray(data?.freelanceProfiles) ? data.freelanceProfiles.filter((item) => item && typeof item === 'object') : (freelanceProfile ? [freelanceProfile] : []);
      const update = data?.workPerformanceUpdate && typeof data.workPerformanceUpdate === 'object' ? data.workPerformanceUpdate : null;
      const freelanceUpdate = data?.freelancePerformanceUpdate && typeof data.freelancePerformanceUpdate === 'object' ? data.freelancePerformanceUpdate : null;
      const freelanceUpdates = Array.isArray(data?.freelancePerformanceUpdates) ? data.freelancePerformanceUpdates.filter((item) => item && typeof item === 'object') : (freelanceUpdate ? [freelanceUpdate] : []);
      const lines = Array.isArray(data?.characterCardLines) ? data.characterCardLines.map((line) => String(line || '').trim()).filter(Boolean) : [];
      return { profile, workUnitProfile, freelanceProfile, freelanceProfiles, update, freelanceUpdate, freelanceUpdates, lines, error: (update || freelanceUpdates.length) ? '' : '未找到 workPerformanceUpdate 或 freelancePerformanceUpdate 对象', raw: data };
    } catch (err) {
      return { profile: null, workUnitProfile: null, freelanceProfile: null, freelanceProfiles: [], update: null, freelanceUpdate: null, freelanceUpdates: [], lines: [], error: `JSON 解析失败：${err?.message || '未知错误'}` };
    }
  },

  isReviewDue(nextPerformanceReviewAt = '', now = new Date()) {
    const ts = Date.parse(String(nextPerformanceReviewAt || '').trim());
    return Number.isFinite(ts) && ts <= now.getTime();
  },

  hasCareerArchive(store = {}) {
    const company = store?.companyState || {};
    const work = company.workUnitProfile || company.careerProfile || null;
    const freelance = Array.isArray(company.freelanceProfiles) ? company.freelanceProfiles : [];
    return Boolean(work?.organizationName || work?.positionTitle || freelance.some((item) => item?.organizationName || item?.positionTitle));
  },

  hasCareerUpdateSignal(store = {}, action = '', narration = '') {
    const text = `${String(action || '')}\n${String(narration || '')}`.slice(0, 6000);
    if (!text) return false;
    const company = store?.companyState || {};
    const names = [
      company.workUnitProfile?.organizationName,
      company.workUnitProfile?.positionTitle,
      ...(Array.isArray(company.freelanceProfiles) ? company.freelanceProfiles.flatMap((item) => [item?.organizationName, item?.positionTitle]) : []),
    ].map((item) => String(item || '').trim()).filter(Boolean);
    if (names.some((name) => name.length >= 2 && text.includes(name))) return true;
    return /(上班|下班|打卡|迟到|旷班|请假|加班|出差|居家办公|公司|单位|部门|同事|领导|老板|项目|绩效|晋升|辞职|入职|工资|薪资|客户|接单|订单|交付|稿件|外包|自由职业|工作)/u.test(text);
  },

  shouldRequestCareerSync(store = {}, action = '', narration = '') {
    if (!this.hasCareerArchive(store)) return { shouldRequest: true, reason: 'create' };
    if (this.hasCareerUpdateSignal(store, action, narration)) return { shouldRequest: true, reason: 'career-change' };
    return { shouldRequest: false, reason: 'no-career-change' };
  },

  async buildPrompt(store, { companyContext = '', narration = '', action = '', nextPerformanceReviewAt = '', reviewDue = false, attendance = {}, leaderReview = {}, employeeReview = {}, contributionItems = [] } = {}) {
    const player = store?.playerIdentityState?.() || { profile: store?.playerProfile || {} };
    const factions = Array.isArray(store?.factionState?.factions) ? store.factionState.factions : [];
    const factionIndex = factions.slice(0, 40).map((item) => ({
      id: item.id || '',
      name: item.name || '',
      type: item.type || '',
      domain: item.domain || '',
      location: item.location || '',
      scale: item.scale || '',
    }));
    const workStats = store?.companyState?.workStats || {};
    const freelanceStats = store?.companyState?.freelanceStats || {};
    const statusText = (stats = {}, title = '') => {
      const status = stats.attendanceStatus || {};
      const leader = stats.leaderReview || {};
      const employee = stats.employeeReview || {};
      return [
        `- ${title}状态：${status.status || '未更新'}｜${status.detail || '无'}`,
        `- ${title}评价：${leader.summary || '暂无'}｜${leader.score ?? 0}`,
        `- ${title}自评：${employee.summary || '暂无'}`,
        `- ${title}贡献价值：${(Array.isArray(stats.contributionItems) ? stats.contributionItems : []).map((item) => item.title || item.type).join('；') || '暂无'}`,
      ].join('\n');
    };
    return await window.GameModules.renderPrompt('inference-stage13-career-update', {
      当前日期: store?.phoneDateText?.() || new Date().toLocaleString('zh-CN'),
      玩家资料: JSON.stringify(player?.profile || player || {}, null, 2).slice(0, 6000),
      当前工作单位旧档: JSON.stringify(store?.companyState?.workUnitProfile || {}, null, 2).slice(0, 6000),
      当前自由职业旧档: JSON.stringify(store?.companyState?.freelanceProfiles || [], null, 2).slice(0, 9000),
      当前职业生涯旧档: JSON.stringify(store?.companyState?.careerProfile || {}, null, 2).slice(0, 3000),
      当前工作单位状态: statusText(workStats, '工作单位'),
      当前自由职业状态: statusText(freelanceStats, '自由职业'),
      可参考势力索引: factionIndex.length ? JSON.stringify(factionIndex, null, 2).slice(0, 8000) : '无。势力缺失不影响职业生涯创建。',
      当前职业上下文: companyContext || '暂无职业上下文。',
      当前已记录工作状态: [
        `- 上班状态：${attendance.status || '未更新'}｜${attendance.detail || '无'}`,
        `- 领导评价：${leaderReview.summary || '暂无'}｜${leaderReview.score ?? 0}`,
        `- 员工评价：${employeeReview.summary || '暂无'}`,
        `- 贡献价值：${(Array.isArray(contributionItems) ? contributionItems : []).map((item) => item.title || item.type).join('；') || '暂无'}`,
      ].join('\n'),
      下一次评绩效日期: nextPerformanceReviewAt || '未设置',
      是否到达评绩效日期: reviewDue ? '是' : '否',
      允许上班状态: this.allowedStatuses.join('、'),
      本次行动: String(action || '').slice(0, 800),
      本轮正文摘要: String(narration || '').slice(0, 5000),
    });
  },

  buildLines(update = {}, applied = {}) {
    const lines = [];
    lines.push(`职业生涯Stage13：上班状态更新为${applied.attendanceStatus?.status || update.attendanceUpdate?.status || '未更新'}`);
    if (update.reviewSummary) lines.push(`职业生涯Stage13：${update.reviewSummary}`);
    if (update.leaderReview?.summary) lines.push(`职业生涯Stage13：领导评价 - ${update.leaderReview.summary}`);
    if (update.employeeReview?.summary) lines.push(`职业生涯Stage13：员工评价 - ${update.employeeReview.summary}`);
    if (Array.isArray(update.characterCardLines) && update.characterCardLines.length) lines.push(...update.characterCardLines.slice(0, 4));
    return [...new Set(lines.filter(Boolean))].slice(0, 6);
  },

  findFreelanceProfileIndex(list = [], incoming = {}, raw = {}) {
    const targetId = String(raw.mergeTargetId || raw.targetId || raw.freelanceId || incoming.id || '').trim();
    if (targetId) {
      const byId = list.findIndex((item) => item.id === targetId);
      if (byId >= 0) return byId;
    }
    return -1;
  },

  mergeFreelanceProfile(existing = {}, incoming = {}) {
    return {
      ...existing,
      ...incoming,
      id: existing.id || incoming.id,
      createdAt: existing.createdAt || incoming.createdAt,
    };
  },

  applyCareerProfile(store, profile = {}, now = new Date(), target = '') {
    store?.initCompanySystem?.();
    const normalized = typeof store?.normalizeCareerProfile === 'function'
      ? store.normalizeCareerProfile(profile)
      : { ...profile };
    const nowIso = now.toISOString();
    normalized.updatedAt = nowIso;
    const isFreelance = target === 'freelance' || store.isFreelanceProfile?.(normalized);
    const slot = isFreelance ? 'freelanceProfile' : 'workUnitProfile';
    normalized.workMode = { ...(normalized.workMode || {}), type: isFreelance ? '自由职业' : '员工制' };
    if (!normalized.createdAt) normalized.createdAt = store.companyState?.[slot]?.createdAt || nowIso;
    if (isFreelance) {
      const list = Array.isArray(store.companyState.freelanceProfiles) ? store.companyState.freelanceProfiles : [];
      const index = this.findFreelanceProfileIndex(list, normalized, profile);
      let appliedProfile = normalized;
      if (index >= 0) {
        list[index] = this.mergeFreelanceProfile(list[index], normalized);
        appliedProfile = list[index];
      } else {
        list.push(normalized);
      }
      store.companyState.freelanceProfiles = list;
      if (!store.companyState.selectedFreelanceId) store.companyState.selectedFreelanceId = appliedProfile.id;
      store.companyState.freelanceProfile = store.selectedFreelanceProfile?.() || appliedProfile;
      normalized.id = appliedProfile.id;
    } else {
      store.companyState[slot] = normalized;
    }
    store.companyState.careerProfile = store.companyState.activeCareerApp === 'freelance'
      ? (store.selectedFreelanceProfile?.() || normalized)
      : (store.companyState.workUnitProfile || normalized);
    if (!isFreelance) {
      store.companyState.employment = {
        ...(store.companyState.employment || {}),
        active: normalized.active !== false,
        activeCompanyId: normalized.factionId || '',
        startAt: store.companyState.employment?.startAt || nowIso,
        resignedAt: normalized.active === false ? (store.companyState.employment?.resignedAt || nowIso) : '',
        resignedCompany: normalized.active === false ? (normalized.organizationName || '') : '',
      };
      store.companyState.currentCompanyId = normalized.factionId || '';
    }
    if (!isFreelance && normalized.active !== false) {
      const records = Array.isArray(store.companyState.employmentRecords) ? store.companyState.employmentRecords : [];
      let record = records.find((item) => item.status === '在职' && item.company === normalized.organizationName);
      if (!record) {
        record = { id: `career-${Date.now()}`, company: normalized.organizationName || '未命名职业主体', status: '在职', startAt: store.companyState.employment.startAt, endAt: '', duration: '0天' };
        records.unshift(record);
      }
      record.positionTitle = normalized.positionTitle || record.positionTitle || '';
      record.department = normalized.department || record.department || '';
      record.duration = store.employmentDurationText?.(record.startAt, nowIso) || record.duration || '';
      store.companyState.employmentRecords = records;
    }
    if (isFreelance) store.normalizeFreelanceStats?.();
    else store.normalizeCompanyWorkStats?.();
    store.syncCompanyLexicon?.();
    return normalized;
  },

  applyFreelanceReputation(store, update = {}, nowIso = '') {
    const profile = store?.selectedFreelanceProfile?.();
    if (!profile) return null;
    const currentTitle = profile.reputationTitle && typeof profile.reputationTitle === 'object' ? profile.reputationTitle : {};
    const delta = Number(update.reputationDelta ?? update.reputationChange ?? update.reputationGain ?? update.fameDelta ?? 0);
    const promoted = Boolean(update.reputationPromoted ?? update.promoted ?? update.titlePromoted);
    const promotion = update.reputationPromotion && typeof update.reputationPromotion === 'object' ? update.reputationPromotion : {};
    const max = Number(currentTitle.max || 100);
    let current = Math.max(0, Number(currentTitle.current || 0) + delta);
    let title = String(currentTitle.title || '').trim();
    let nextTitle = String(currentTitle.nextTitle || '').trim();
    let review = String(currentTitle.review || currentTitle.evaluation || '').trim();
    let nextMax = max;
    if (promoted) {
      title = String(promotion.title || update.newReputationTitle || nextTitle || title || '').trim();
      nextTitle = String(promotion.nextTitle || update.nextReputationTitle || '').trim();
      review = String(promotion.review || promotion.evaluation || update.reputationReview || update.reputationEvaluation || review).trim();
      nextMax = Math.max(max, Number(promotion.max || update.reputationMax || max));
      current = Math.min(current, nextMax);
    } else {
      review = String(update.reputationReview || update.reputationEvaluation || review).trim();
      current = Math.min(current, max);
    }
    profile.reputationTitle = { title, current, max: promoted ? nextMax : max, nextTitle, review };
    profile.reputationUpdatedAt = nowIso;
    return profile.reputationTitle;
  },

  applyUpdate(store, update = {}, now = new Date(), target = 'work') {
    store?.initCompanySystem?.();
    if (target !== 'freelance' && store?.companyState?.employment?.active === false) {
      return { applied: null, lines: ['职业生涯Stage13：当前未在职，跳过工作绩效更新。'], skipped: true };
    }
    const nowIso = now.toISOString();
    const dateKey = typeof store?.companyDateKey === 'function'
      ? store.companyDateKey(now)
      : `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const stats = target === 'freelance'
      ? (typeof store?.normalizeFreelanceStats === 'function' ? store.normalizeFreelanceStats() : (store.companyState.freelanceStats || {}))
      : (typeof store?.normalizeCompanyWorkStats === 'function' ? store.normalizeCompanyWorkStats() : (store.companyState.workStats || {}));
    const attendanceUpdate = update.attendanceUpdate && typeof update.attendanceUpdate === 'object' ? update.attendanceUpdate : {};
    const leaderReview = update.leaderReview && typeof update.leaderReview === 'object' ? update.leaderReview : {};
    const employeeReview = update.employeeReview && typeof update.employeeReview === 'object' ? update.employeeReview : {};
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
      status: String(attendanceUpdate.status || stats.attendanceStatus?.status || '上班'),
      detail: String(attendanceUpdate.detail || stats.attendanceStatus?.detail || '本轮未提供详细上班状态。'),
      reason: String(attendanceUpdate.reason || 'AI 返回内容直接填充。'),
      canCheckIn: Boolean(attendanceUpdate.canCheckIn),
      updatedAt: nowIso,
      source: 'ai',
    };
    stats.nextPerformanceReviewAt = String(update.nextPerformanceReviewAt || stats.nextPerformanceReviewAt || nowIso);
    stats.leaderReview = {
      score: Number(leaderReview.score || stats.leaderReview?.score || 0),
      summary: String(leaderReview.summary || stats.leaderReview?.summary || ''),
      detail: String(leaderReview.detail || stats.leaderReview?.detail || ''),
      updatedAt: nowIso,
      source: 'ai',
    };
    stats.employeeReview = {
      summary: String(employeeReview.summary || stats.employeeReview?.summary || ''),
      detail: String(employeeReview.detail || stats.employeeReview?.detail || ''),
      updatedAt: nowIso,
      source: 'ai',
    };
    const existingContributions = Array.isArray(stats.contributionItems) ? stats.contributionItems : [];
    stats.contributionItems = contributions.length
      ? [...contributions, ...existingContributions].slice(0, 24)
      : existingContributions;
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
    const reputationTitle = target === 'freelance' ? this.applyFreelanceReputation(store, update, nowIso) : null;
    console.log('[职业生涯调试] Stage13 apply', {
      target,
      reviewTriggered: update.reviewTriggered,
      nextPerformanceReviewAt: stats.nextPerformanceReviewAt,
      attendanceStatus: stats.attendanceStatus,
      contributionCount: contributions.length,
      reputationTitle,
    });
    store.syncCompanyLexicon?.();
    store.save?.();
    return {
      applied: {
        attendanceStatus: stats.attendanceStatus,
        leaderReview: stats.leaderReview,
        employeeReview: stats.employeeReview,
        contributionItems: stats.contributionItems,
        nextPerformanceReviewAt: stats.nextPerformanceReviewAt,
        reputationTitle,
      },
      lines: this.buildLines(update, { attendanceStatus: stats.attendanceStatus }),
      skipped: false,
    };
  },

  async runAfterSettlement({ store, action, narration, updates, logId, config, loop }) {
    if (config?.mode === 'story') return { lines: [], skipped: true };
    store?.initCompanySystem?.();
    store?.initFactionSystem?.();
    const now = store?.phoneDate?.() || new Date();
    const stats = typeof store?.normalizeCompanyWorkStats === 'function' ? store.normalizeCompanyWorkStats() : (store?.companyState?.workStats || {});
    const reviewDue = this.isReviewDue(stats.nextPerformanceReviewAt, now);
    const requestDecision = this.shouldRequestCareerSync(store, action, narration);
    if (!requestDecision.shouldRequest) {
      return { lines: ['职业生涯Stage13：已有职业档案，本轮无职业相关事实，未请求更新。'], skipped: true, reason: requestDecision.reason };
    }
    const prompt = await this.buildPrompt(store, {
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
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage13 职业生涯…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, reviewDue
      ? `Stage13：本轮存在职业变化，职业生涯已到评绩效日期 ${stats.nextPerformanceReviewAt}，同步评绩效与职业档案。`
      : 'Stage13：本轮存在职业变化，同步职业档案、上班状态、领导评价、员工评价与贡献价值。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    console.log('[职业生涯调试] Stage13 request', { reason: requestDecision.reason, reviewDue, nextPerformanceReviewAt: stats.nextPerformanceReviewAt, logId });
    let raw = '';
    try {
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        sourceTitle: `${config?.label || ''}Stage13 职业生涯`,
        promptId: 'inference-stage13-career-update',
        reasoningPhase: 'stage13',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
      console.log('[职业生涯调试] Stage13 raw', String(raw || '').slice(0, 1200));
      const parsed = this.parsePayload(raw);
      if (!parsed.update && !parsed.freelanceUpdates.length) {
        console.warn('[职业生涯调试] Stage13 invalid', parsed.error);
        return { lines: [`职业生涯Stage13：返回无效，未写入（${parsed.error || '未知错误'}）`], raw, skipped: false, error: parsed.error };
      }
      console.log('[职业生涯调试] Stage13 parsed', parsed.raw);
      const workCareer = parsed.workUnitProfile ? this.applyCareerProfile(store, parsed.workUnitProfile, now, 'work') : null;
      const freelanceCareers = parsed.freelanceProfiles.map((item) => this.applyCareerProfile(store, item, now, 'freelance'));
      const legacyCareer = parsed.profile ? this.applyCareerProfile(store, parsed.profile, now) : null;
      const applied = parsed.update ? this.applyUpdate(store, parsed.update, now, 'work') : { lines: [], applied: null };
      const freelanceAppliedList = parsed.freelanceUpdates.map((item, index) => {
        const targetId = item.freelanceId || item.profileId || item.id || freelanceCareers[index]?.id || store.companyState.selectedFreelanceId;
        if (targetId) store.companyState.selectedFreelanceId = targetId;
        return this.applyUpdate(store, item, now, 'freelance');
      });
      const lines = parsed.lines.length ? parsed.lines : [
        ...(workCareer ? [`职业生涯Stage13：已同步工作单位 ${workCareer.organizationName || '未命名'} / ${workCareer.positionTitle || '职业角色'}`] : []),
        ...freelanceCareers.map((item) => `职业生涯Stage13：已同步自由职业 ${item.organizationName || '未命名'} / ${item.positionTitle || '职业角色'}`),
        ...(legacyCareer && !workCareer && !freelanceCareers.length ? [`职业生涯Stage13：已同步 ${legacyCareer.organizationName || '职业主体'} / ${legacyCareer.positionTitle || '职业角色'}`] : []),
        ...applied.lines,
        ...freelanceAppliedList.flatMap((item) => item.lines || []),
      ];
      return { lines, raw, update: parsed.update, freelanceUpdates: parsed.freelanceUpdates, workUnitProfile: parsed.workUnitProfile, freelanceProfiles: parsed.freelanceProfiles, applied: { workUnitProfile: workCareer, freelanceProfiles: freelanceCareers, legacyCareerProfile: legacyCareer, workPerformance: applied.applied, freelancePerformance: freelanceAppliedList.map((item) => item.applied) }, skipped: false };
    } catch (err) {
      console.warn('[职业生涯调试] Stage13 failed:', err?.message || err);
      return { lines: [`职业生涯Stage13失败：${err?.message || '未知错误'}`], raw, skipped: false, error: err?.message || String(err || '') };
    }
  },
};
