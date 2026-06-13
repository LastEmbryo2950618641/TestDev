/**
 * 角色反馈流式修正：必须等 done 后解析，半截 JSON 只做安全兜底。
 */
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.characterFeedback, {
  async initial(store) {
    this.ensureExperience(store);
    const fallback = this.fallback(store);
    console.log('[角色反馈] 初始请求准备:', { character: store.character?.name, model: 'nalang-turbo-0826', controlMode: store.controlMode, hasCompletions: Boolean(window.dzmm?.completions) });
    if (!window.dzmm?.completions) return fallback;
    let buffer = '';
    let doneSeen = false;
    try {
      const prompt = await this.prompt(store);
      console.log('[角色反馈] completions 调用:', { promptLength: prompt.length });
      let resolveDone;
      const donePromise = new Promise((resolve) => { resolveDone = resolve; });
      const request = window.dzmm.completions({
        model: 'nalang-turbo-0826',
        maxTokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }, (chunk, done) => {
        buffer = this.merge(buffer, chunk);
        if (done) {
          doneSeen = true;
          console.log('[角色反馈] 流式 done:', { length: buffer.length });
          resolveDone();
        }
      });
      await Promise.race([Promise.all([request, donePromise]), new Promise((_, reject) => setTimeout(() => reject(new Error('角色反馈生成超时')), 18000))]);
      if (!doneSeen) throw new Error('角色反馈流式未完成');
      console.log('[角色反馈] AI返回完成:', { length: buffer.length, preview: buffer.slice(0, 120) });
      return this.parse(buffer, fallback, store);
    } catch (err) {
      console.warn('角色反馈生成失败，使用兜底:', err.code, err.message, err.stack);
      return fallback;
    }
  },

  prompt(store) {
    const base = store.character || {};
    const card = store.characterProfiles?.[base.id] || {};
    const skills = (card.skills || base.skills || []).map((item) => typeof item === 'string' ? item : `${item.name || ''}${item.desc ? `：${item.desc}` : ''}`).filter(Boolean).join('；');
    const worldValues = card.worldValues ? Object.entries(card.worldValues).map(([key, value]) => `${key}：${value}`).join('；') : '';
    const line = (label, value) => value ? `${label}：${value}` : '';
    const profile = [
      line('姓名', card.name || base.name), line('性别', card.gender || base.gender), line('年龄', store.characterAge),
      line('作品/世界', base.work || card.work), line('身份', card.role || base.role), line('人际关系', card.relationships || base.relationships),
      line('外貌', card.appearance || base.appearance), line('性格', card.personality || base.personality), line('人物说明', card.detail || base.detail),
      line('势力', card.faction || base.faction), line('职业', card.job || base.job), line('等级', card.rank || base.rank), line('技能', skills),
      line('属性/世界词条', worldValues), line('摘要', card.summary),
    ].filter(Boolean).join('\n');
    const experience = this.experience(store);
    const outputJson = JSON.stringify({ mind: '角色第一人称内心，40到70字', intent: `${base.name}自己下一步想做什么，30到50字`, mood: '冷静', resistance: 0, controlFeeling: '疑惑/恐惧/愤怒等短语', adaptation: 0, experienceSummary: '40字内', choices: ['4个行动选项，每个12字内'] });
    return window.GameModules.promptTemplates.render('character-feedback', { 角色: `${base.name}｜${base.role}｜${base.work}`, 年龄: store.characterAge || '未知', 操控方式: store.controlMode, 当前场景: store.entryCurrentAction || '未知', 人物资料: profile.slice(0, 1600), 上线次数: experience.onlineCount, 上线感觉: experience.feeling, 适应度: experience.adaptation, 上线摘要: experience.summary, 输出示例: outputJson });
  },

  parse(text, fallback, store) {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(text);
      return this.normalizeFeedbackData(data, fallback, store, 'ai');
    } catch (err) {
      if (err.message === 'JSON incomplete') {
        const recovered = this.recoverFeedbackFields(text);
        if (recovered.mind || recovered.intent) return this.normalizeFeedbackData(recovered, fallback, store, 'partial');
        console.warn('[角色反馈] JSON未完整，使用兜底:', { length: String(text || '').length });
        return fallback;
      }
      console.warn('角色反馈解析失败:', err.message);
      return fallback;
    }
  },

  normalizeFeedbackData(data, fallback, store, source) {
    const completeMetrics = this.hasCompleteInitialMetrics(data.metricUpdates);
    if (!data.mind && !data.intent) throw new Error('角色反馈缺少 mind/intent');
    const result = {
      mind: String(data.mind || fallback.mind).slice(0, 80),
      intent: String(data.intent || fallback.intent).slice(0, 80),
      mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
      resistance: this.clamp(data.resistance, fallback.resistance),
      controlFeeling: String(data.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40),
      adaptation: this.clamp(data.adaptation, fallback.adaptation),
      experienceSummary: String(data.experienceSummary || fallback.experienceSummary).slice(0, 80),
      metricUpdates: completeMetrics ? window.GameModules.ai.normalizeInitialMetricUpdates(data.metricUpdates, null, store) : fallback.metricUpdates,
      choices: this.normalizeChoices(data.choices, fallback.choices),
      source,
    };
    console.log('[角色反馈] AI解析成功:', { source, mindLength: result.mind.length, intentLength: result.intent.length, metrics: completeMetrics ? 'ai' : 'fallback' });
    return result;
  },

  recoverFeedbackFields(text) {
    const pick = (key) => {
      const match = String(text || '').match(new RegExp(`"${key}"\\s*:\\s*"([^"\\]*(?:\\\\.[^"\\]*)*)`));
      return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
    };
    return { mind: pick('mind'), intent: pick('intent'), controlFeeling: pick('controlFeeling'), experienceSummary: pick('experienceSummary') };
  },
});
