window.GameModules = window.GameModules || {};

window.GameModules.inferenceEntityStageUpdate = {
  parsePayload(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const objectStart = source.indexOf('{');
    const objectEnd = source.lastIndexOf('}');
    const arrayStart = source.indexOf('[');
    const arrayEnd = source.lastIndexOf(']');
    try {
      if (objectStart >= 0 && objectEnd > objectStart) {
        const data = JSON.parse(source.slice(objectStart, objectEnd + 1));
        const entities = data.entities || data.entityUpdates || data['实体状态'] || data['实体更新'] || [];
        return { entities: Array.isArray(entities) ? entities : [], done: data.done !== false, raw: data };
      }
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        return { entities: JSON.parse(source.slice(arrayStart, arrayEnd + 1)), done: true, raw: null };
      }
    } catch (error) {
      return { entities: [], done: true, raw: null, error: error?.message || 'JSON 解析失败' };
    }
    return { entities: [], done: true, raw: null, error: '未找到实体状态结算 JSON' };
  },

  currentEntitiesText(store = null, action = '') {
    return window.GameModules.entityStateStore?.contextText?.(store, action, 3600) || '暂无实体状态记录。';
  },

  buildPrompt({ store, action = '', narration = '', updates = {}, participants = [] } = {}) {
    return [
      '# Stage4-17 实体状态结算',
      '你是现实推演的实体实例状态结算器。只输出一个合法 JSON 对象，不要 Markdown、解释或正文。',
      '',
      '目标：把本轮正文和上下文中已经出现、且后续需要追踪“它是谁、在哪里、归谁、当前怎样、过去怎样变化”的实体实例，写入本地实体状态库。',
      '实体状态不是专用术语：术语是概念定义；实体是可变化、可定位、可持有、可移动、可追踪的具体实例。',
      '不要过滤或打回已有 AI 结果；这里只负责根据上下文进行二次整理并输出可落库实体。',
      '',
      '可记录实体类型：',
      '- object：具体物品，如我的钥匙、门禁卡、纸条、包。',
      '- container：容器或可容纳物，如抽屉、柜子、纸箱、背包。',
      '- group：非正式团体或临时集合，如楼下小团体、三人小队、围观人群。',
      '- device / vehicle / animal / clue / document / person / other：设备、载具、动物、线索、文件、未升格人物等。',
      '',
      '边界：',
      '- 正式组织、公司、国家、家庭势力优先由 Stage9 势力系统处理；本阶段只记录未正式升格但需要追踪的群体实例。',
      '- 完整角色卡和介绍卡已有专门系统；只有“未升格但需要追踪的人/人群”才作为实体。',
      '- 地点空间本体优先由地图/地点系统处理；可移动容器、摆件、房间内具体物件可作为实体。',
      '- 角色随身物品已经由 Stage4-9 角色卡物品处理；本阶段补充“位置、容器、指认特征、历史状态链”等跨场景定位信息。',
      '',
      '实体区分规则：',
      '- 同名实体必须靠 owner、currentLocation、container、usage、visibleFeatures、source、identityHints、lastAction、historyAnchors 区分。',
      '- 不要只写“钥匙”；要写清是“谁的钥匙”、用于什么、有什么特征、现在在哪、最近怎么变化。',
      '- 如果无法确认是旧实体还是新实体，仍可输出实体；系统会按指认特征尽量合并或创建。',
      '',
      '每条实体建议字段：',
      '- entityType、name、description、aliases、identityHints、owner、currentLocation、container、currentState、quantity、visibleFeatures、usage、source、lastAction、tags、confidence、reason。',
      '- group 额外字段：memberCount、membersKnown、composition、activity、affiliation、leader。',
      '- historyAnchor：本次状态变化锚点，含 time/code/action/actor/owner/location/container/relatedEntities/keywords/stateSummary/reason。',
      '',
      '历史锚点 code 示例：CREATED、MOVED、PLACED_IN_CONTAINER、REMOVED_FROM_CONTAINER、TRANSFERRED、OWNER_CHANGED、LOST、STATUS_CHANGED、QUANTITY_CHANGED、GROUP_SIZE_CHANGED、GROUP_MOVED、GROUP_DISBANDED。',
      '没有实体新事实时输出 entities=[]。不要为了凑数创造实体；但本轮明确出现并需追踪的位置、归属、容器或群体人数变化必须输出。',
      '',
      `本回合参与者：${JSON.stringify(participants || []).slice(0, 3000)}`,
      `本次行动：${String(action || '').slice(0, 1200)}`,
      `本轮正文：${String(narration || '').slice(0, 7000)}`,
      `前序结算摘要：${JSON.stringify(updates || {}).slice(0, 9000)}`,
      '',
      '已持久化实体状态：',
      this.currentEntitiesText(store, action),
      '',
      '输出格式：',
      '{"entities":[{"entityType":"object","name":"钥匙","description":"刘悠的家门钥匙","aliases":["家门钥匙"],"identityHints":["刘悠所有","用于601室家门","带蓝色钥匙扣"],"owner":"刘悠","currentLocation":"刘悠卧室","container":"床头柜抽屉","currentState":"可用，放在抽屉内","quantity":1,"visibleFeatures":["蓝色钥匙扣"],"usage":"打开家门","source":"玩家原有物品","lastAction":"放入床头柜抽屉","tags":["钥匙","家门","随身物品"],"historyAnchor":{"code":"PLACED_IN_CONTAINER","action":"放入","actor":"刘悠","owner":"刘悠","location":"刘悠卧室","container":"床头柜抽屉","relatedEntities":["钥匙","床头柜抽屉"],"keywords":["钥匙","刘悠","卧室","抽屉","放入"],"stateSummary":"刘悠把自己的钥匙放进床头柜抽屉","reason":"正文明确描述"},"reason":"正文明确描述钥匙被放入床头柜抽屉"}],"done":true}',
      '没有需要新增或更新的实体时输出：{"entities":[],"done":true}',
    ].join('\n');
  },

  async applyEntities(store, entities = []) {
    const applied = await window.GameModules.entityStateStore?.applyEntities?.(store, entities) || [];
    return {
      entities: Array.isArray(entities) ? entities : [],
      applied,
      lines: applied.length
        ? applied.map((entry) => `实体状态结算：${entry.value?.name || entry.name} 已更新。`)
        : ['实体状态结算：本轮没有需要新增或更新的实体。'],
    };
  },

  async runAfterStage4({ store, action, narration, updates, participants, logId, config, loop } = {}) {
    if (config?.mode === 'story' || !window.GameModules.entityStateStore?.isAvailable?.()) return { entities: [], applied: [], lines: [], skipped: true };
    loop?.markConfiguredStep?.(store, logId, `${config?.label || ''}正在进行 Stage4-17 实体状态结算…`, config, { keepNarration: true });
    loop?.patchConfiguredSettlementThinking?.(store, logId, 'Stage4-17：根据本轮上下文新增或更新本地实体状态。', {
      ...config,
      settlementThinking: true,
      settlementThinkingKey: 'settlement-status',
      settlementThinkingLabel: '结算状态',
      livePatch: true,
    });
    const prompt = this.buildPrompt({ store, action, narration, updates, participants });
    let raw = '';
    try {
      raw = await loop.completeCachedJsonPrompt(store, {
        prompt,
        logId,
        ...config,
        sourceTitle: `${config?.label || ''}Stage4-17 实体状态结算`,
        promptId: 'inference-stage4-entity-state',
        reasoningPhase: 'stage4-17',
        jsonMode: true,
        outputLimitKind: 'stage4',
      });
    } catch (error) {
      console.warn('[Stage4-17实体] 生成失败:', error?.message || error);
      return { entities: [], applied: [], lines: [`实体状态结算失败：${error?.message || '未知错误'}`], skipped: true, error: error?.message || '未知错误' };
    }
    const parsed = this.parsePayload(raw);
    const applied = await this.applyEntities(store, parsed.entities);
    return {
      ...applied,
      lines: parsed.error ? [`实体状态结算解析失败：${parsed.error}`] : applied.lines,
      raw,
      parsed,
      participants,
      skipped: false,
    };
  },
};
