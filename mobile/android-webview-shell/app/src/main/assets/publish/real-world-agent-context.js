window.GameModules = window.GameModules || {};

const realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContext = {
  ...realWorldAgentContextParts.core,
  ...realWorldAgentContextParts.materialDedup,
  ...realWorldAgentContextParts.materialRequestCatalog,
  ...realWorldAgentContextParts.sceneBoundary,
  ...realWorldAgentContextParts.materialLoader,
  baseSnapshot(store, action = '') {
    const realWorld = window.GameModules.realWorld2026 || {};
    const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
    const companies = this.companyNames(store);
    const recent = this.recentLog(store, 3);
    const recentWorldline = this.recentWorldlineRecords(store, 5000, 6000);
    const longing = store.prepareRealWorldLongingContext?.() || '';
    const socialInbox = store.prepareSocialInboxContext?.() || '';
    const shared = store.sharedControlState?.();
    const sharedProfile = shared?.profile || {};
    const sharedLocation = shared ? store.controlLinkLocationText?.(shared) || '当前位置未登记' : '';
    const sharedBody = shared ? this.characterBodyText(shared) : '';
    return [
      `世界：${realWorld.label || '2026 现代都市现实世界'}`,
      `背景：${realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。'}`,
      window.GameModules.gamePremise?.aiPremiseLine || '',
      `关系边界：${realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。'}`,
      `桌面时间：${store.phoneDateText?.() || '未知'} ${store.phoneTimeText?.() || ''}`,
      `时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds，代码会用它推进桌面时间。`,
    `玩家资料：${store.playerSetupSummary?.() || store.playerName || '玩家'}`,
    `玩家属性：${this.limit(store.playerIdentitySummary?.() || '玩家本人属性尚未生成。', 1000)}`,
    ...(store.playerAspirationSummary?.() ? [`人生取向：${store.playerAspirationSummary()}`] : []),
      `玩家财富：${store.playerWealthText?.(store.playerProfile || {}) || `${Number(store.playerProfile?.wealthAmount || 0).toLocaleString('zh-CN')}元`}`,
      `现实身体状态：${this.vitalsText(store, store.playerIdentityState?.())}`,
      `主体ID规则：\n${window.GameModules.promptSections?.subjectIdRules?.(store) || '玩家本人固定 id:player-self；未知角色直接写完整姓名，禁止自造前缀。'}`,
      ...(shared ? [`同世界附身控制：当前上线对象为${sharedProfile.name || shared.name || '未知角色'}；身份：${sharedProfile.role || '未知'}；所在位置：${sharedLocation}。玩家意识已附身接管该角色身体，可直接控制其动作、视线、表情与身体局部反应；同时玩家现实本体仍由同一个意识维持控制，属于一心多用。描写时以第二人称“你”的附身镜头为主：站在被控肉体感官里写视野、动作执行，以及该身体回传的触觉、痛觉、敏感、舒服、疲惫等；若身体自触自身，同时写执行侧与接收侧体感。穿插被控者意识反应；不要写成单纯远程旁观，也不要让玩家本体消失或失控。`, `被控角色身体与状态：${sharedBody}`] : []),
      `当前场景：${store.realWorldSceneTitle || '现实世界'}`,
      `当前地点：${store.realWorldLocationName || map.current || '尚未生成具体地点'}`,
      `当前目标：${store.realWorldQuest || '确认现实处境'}`,
      `当前组织名称：${companies || '暂无公司名称'}`,
      `组织索引（Org Index）：\n${window.GameModules.orgTerritory?.orgIndexText?.(store, action, 800) || '暂无已知组织。'}`,
      `组织热点（Org Hot）：\n${window.GameModules.orgTerritory?.orgHotText?.(store, action, 1200) || '暂无已接触组织细节。'}`,
      `控势摘要（Territory Hot）：\n${window.GameModules.orgTerritory?.territoryHotText?.(store, 600) || '暂无已揭示地点控势。'}`,
      `势力资料库：\n${window.GameModules.factionArchive?.contextFor?.(store, action, 1600) || '暂无势力资料库记录。'}`,
      ...(longing ? [`角色思念上下文：\n${longing}`] : []),
      ...(window.GameModules.socialEventBoundary?.divisionBlock?.()
        ? [window.GameModules.socialEventBoundary.divisionBlock()]
        : []),
      ...(socialInbox ? [`社交主动上下文：\n${socialInbox}`] : []),
      `## 最近发送的世界线\n需严格跟着世界线续写，保证正文对最新世界线连续性。\n${recentWorldline}`,
      `系统级补充记录（日历/通信/世界线节点等；不含角色行动复述）：\n${this.recentSystemRecords(store, 8, 1200)}`,
      `最近记录摘要：\n${recent}`,
      `本次行动：${action || '继续观察现实世界'}`,
    ].join('\n');
  },

  vitalsText(store, state = null) {
    const values = state?.values || {};
    const percent = (pool) => pool?.max ? Math.round((pool.current / pool.max) * 100) : 100;
    const row = (key, label) => {
      const pool = values[key] || {};
      const value = percent(pool);
      const note = values.vital_update_notes?.[key]?.reason || '';
      return `${label}${value}/100${note ? `（上次变化：${note}）` : ''}`;
    };
    return state?.values ? [row('vitality', '生命力'), row('stamina_pool', '精力'), row('satiety', '饱食度'), row('hydration', '水分'), row('fatigue', '疲劳'), row('mental_stability', '精神稳定')].join('；') : '玩家本人状态尚未生成。';
  },

  characterBodyText(state = null) {
    const v = state?.values || {}, p = state?.profile || {};
    const names = (list) => (list || []).map((item) => item?.slot ? `${item.slot}:${item.name || '未穿戴'}` : (item?.name || item)).slice(0, 12).join('、') || '无';
    const base = [`性别${p.gender || v.gender || '未知'}`, `年龄${v.age ?? p.age ?? '未知'}`, `身份${p.role || p.job || state?.name || '未知'}`];
    if (v.level) base.push(`等级${v.level}`, `力量${v.strength}`, `敏捷${v.agility}`, `体质${v.constitution}`, `智力${v.intelligence}`, `感知${v.perception}`, `意志${v.willpower}`, `魅力${v.charisma}`);
    base.push(`穿着${names(v.wearing)}`, `物品${names(v.items)}`);
    if (v.intimacy?.bodyStatus) base.push(`身体状态${String(v.intimacy.bodyStatus).slice(0, 80)}`);
    return this.limit(base.join('｜'), 900);
  },

  companyNames(store) {
    const list = store.companyState?.companies || [];
    if (!list.length) return store.currentCompany?.()?.name || '';
    return list.map((item) => `${item.name}${item.id === store.companyState?.currentCompanyId ? '（当前）' : ''}`).join('、');
  },

  buildStage1RoutingContext({ store, action, loaded = [], config = null } = {}) {
    const realWorld = window.GameModules.realWorld2026 || {};
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    const playerState = store?.playerIdentityState?.() || store?.rpgStates?.['player-self'] || null;
    const player = store?.playerName || store?.playerProfile?.name || playerState?.profile?.name || playerState?.name || '玩家';
    const playerLocation = playerState?.profile?.currentLocation || playerState?.values?.current_location?.name || '';
    const kvMode = window.GameModules.realWorldAgentLoop?.kvMode?.(config) || config?.mode || 'real';
    const priorCount = store?.realWorldAgentKvByMode?.[kvMode]?.messages?.length || 0;
    const wechatInContext = window.GameModules.realWorldAgentLoop?.summarizeWechatInAgentContext?.(store, kvMode);
    const actionText = String(action || '');
    const orgTerritoryHint = /夺控|法域|归属|控势|起义|独立|领土|管辖|组织|势力|公司|社区|政府/u.test(actionText)
      ? `组织/控势线索：base 已含 Org Index 与 Territory Hot（仅已揭示）。优先资料请求：控势查询，控势摘要，${location}；或势力查询，势力档案，关键词。brief 不足且 step≥3 才请求势力详情/地点控势详情。禁止 Stage1 写入势力或改控势。`
      : '';
    return [
      `模式：${config?.label || '现实'}`,
      `当前世界：${realWorld.label || '2026 现代都市现实世界'}`,
      `背景设定：${realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前位置：${location}`,
      `当前时间：${time}`,
      `当前被控主体：${player}(player-self)`,
      playerLocation ? `玩家角色卡当前位置：${playerLocation}` : '',
      orgTerritoryHint,
      this.scheduleCandidateHintText(store, action, location),
      priorCount
        ? `前轮完整推演上下文：已通过对话链继承（${priorCount} 条消息）。持久链会按当前模型输入窗口在超过 97% 时直接抽取旧消息，优先移除旧阶段提示词/返回与记录，保留旧正文；最新一轮完整保留。前轮资料、微信对话追加与之后的结算/正文变更都可综合使用；请对照当前桌面时间与本轮行动，判断现有上下文是否已能支撑正文。仅当缺失、冲突或无法可靠还原时才重新请求。`
        : '',
      ...(wechatInContext?.hint ? [wechatInContext.hint] : []),
    ].filter(Boolean).join('\n');
  },

  buildNarrationContext({ store, action, config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const recentWorldline = this.redactNarrationPollution(this.recentWorldline(store, 800, '\n'));
    const recent = this.redactNarrationPollution(this.recentSummary(store, 4));
    const lifeOrientation = String(store?.playerAspirationSummary?.() || '').trim();
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前地点：${store?.realWorldLocationName || map.current || '未知地点'}`,
      `当前场景：${store?.realWorldSceneTitle || '现实世界'}`,
      `当前时间提示：${[store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间'}`,
      `玩家可写资料：${store?.playerSetupSummary?.() || store?.playerName || '玩家'}`,
      ...(lifeOrientation ? [`人生取向：\n${this.limit(lifeOrientation, 1800)}`] : []),
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
      `最近世界线摘要：\n${recentWorldline || '无'}`,
      `最近记录摘要：\n${recent || '无'}`,
    ].join('\n');
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], effectiveSceneLayers = null, config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || store?.realWorldSceneTitle || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前场景位置：${location}`,
      `当前时间提示：${time}`,
      `空间边界线索：仅保留门口、房间、走廊、相邻空间、可听见/可看见/可进入条件。`,
      this.scheduleCandidateHintText(store, action, location),
      `参与者边界：\n${this.sceneParticipantBoundary(trace, effectiveSceneLayers)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
    ].join('\n');
  },
};

// 若资料查询脚本早于本文件执行，或 context 被重建，重新挂载 skill 实现
window.GameModules.installFactionQuery?.();
window.GameModules.installMaterialQuery?.();
