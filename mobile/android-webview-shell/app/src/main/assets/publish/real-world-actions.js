/**
 * 手机时间与现实世界推演界面。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldActions = {
  realWorldActionText(value) {
    if (value && typeof value === 'object') return String(window.GameModules.ai?.choiceText?.(value) || '').trim();
    return String(value || '').trim();
  },

  async submitRealWorldAction(action = '') {
    if (!this.isRealCurrentWorld?.()) {
      const text = this.realWorldActionText(action) || this.realWorldActionText(this.realWorldInput);
      if (text) {
        this.realWorldInput = '';
        return this.submitAction?.(text);
      }
      return this.routeCurrentWorldAction?.();
    }
    const rawText = this.realWorldActionText(action) || this.realWorldActionText(this.realWorldInput);
    const text = this.realWorldActionWithMatter?.(rawText) || rawText;
    if (!rawText || this.realWorldBusy || !this.validateRealWorldFreedom?.()) return;
    this.realWorldInput = '';
    this.realWorldBusy = true;
    const start = this.phoneDate();
    const startMs = start.getTime();
    const baseId = `real-${startMs}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: start.toISOString() };
    const responseCreatedAt = new Date(startMs + 1).toISOString();
    const savedTotalBeforeAppend = window.GameModules.realWorldLogStore?.count?.() || this.realWorldLogTotal || 0;
    if (savedTotalBeforeAppend > 0) this.refreshRealWorldLogPage?.(Math.max(1, Math.ceil(savedTotalBeforeAppend / (Number(this.realWorldLogPageSize) || 12))));
    const userEntry = { id: `${baseId}-user`, type: 'user', text: rawText, matter: this.activeRealWorldMatter?.() || null, time: startTime, createdAt: start.toISOString() };
    const entry = { id: `${baseId}-ai`, type: 'ai', narration: '现实世界正在推演…', thinking: '', thinkingSections: [], thinkingOpen: false, settlementThinking: '', settlementThinkingSections: [], settlementThinkingOpen: false, streaming: true, playerText: rawText, actionText: text, time: startTime, createdAt: responseCreatedAt };
    entry.promptPack = { systemPrompt: '现实世界 Loop Agent 将按步骤动态载入上下文。', userPrompt: text, model: this.modelId, promptTokens: 0 };
    this.realWorldLog = this.normalizeRealWorldLog([...(this.realWorldLog || []), userEntry, entry]).slice(-Math.max(1, Number(this.realWorldLogPageSize) || 12));
    this.realWorldLogTotal = Math.max(this.realWorldLogTotal || 0, window.GameModules.realWorldLogStore?.count?.() || 0) + 2;
    this.realWorldLogPage = this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1;
    this.scrollRealWorldLogBottom?.();
    try {
      await window.GameModules.realWorldLogStore?.append?.(userEntry);
      await window.GameModules.realWorldLogStore?.append?.(entry);
      const savedTotal = window.GameModules.realWorldLogStore?.count?.() || this.realWorldLogTotal;
      this.realWorldLogTotal = savedTotal;
      this.realWorldLogPage = this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1;
      this.scrollRealWorldLogBottom?.();
      this.prepareEventsForRealWorldAction?.(text, entry.id);
      const result = await window.GameModules.realWorldAi.generate(this, '', text, entry.id);
      if (result.promptPack) entry.promptPack = result.promptPack;
      const currentUserEntry = window.GameModules.realWorldLogStore?.get?.(userEntry.id) || userEntry;
      await this.applyRealWorldResult(entry.id, { ...result, playerEntry: currentUserEntry });
      window.GameModules.factionArchive?.recordRealWorld?.(this, text, result);
      await this.recordPlayerRealWorldMemory(text, result);
      await this.save();
    } catch (err) {
      console.error('现实推演请求失败:', err.code, err.message, err.stack);
      await this.markRealWorldActionFailed(entry.id, err);
    } finally {
      this.realWorldBusy = false;
    }
  },

  realWorldActionErrorText(err = null) {
    const message = String(err?.message || '').trim();
    if (/insufficient balance|HTTP 402/i.test(message)) return 'AI请求失败：DeepSeek 账户余额不足，请充值或更换可用 Key';
    if (/API Key|AUTH_REQUIRED|未配置/i.test(`${err?.code || ''} ${message}`)) return 'AI请求失败：DeepSeek API Key 未配置或不可用';
    return message ? `AI请求失败：${message}` : 'AI请求失败，请重试';
  },

  async markRealWorldActionFailed(id, err = null) {
    await window.GameModules.realWorldLogStore?.remove?.(id);
    const userId = String(id || '').replace(/-ai$/u, '-user');
    if (userId && userId !== id) await window.GameModules.realWorldLogStore?.remove?.(userId);
    this.realWorldLogTotal = Math.max(0, (this.realWorldLogTotal || 2) - (userId && userId !== id ? 2 : 1));
    const narration = this.realWorldActionErrorText(err);
    this.realWorldLog = (this.realWorldLog || []).map((entry) => (entry.id === id ? { ...entry, narration, thinking: '', thinkingSections: [], settlementThinking: '', settlementThinkingSections: [], streamTrace: [], streaming: false, transientError: true, promptPack: null, characterCardChanges: [], agentTrace: [] } : entry));
    this.scrollRealWorldLogBottom?.();
  },

  async applyRealWorldResult(id, result) {
    result = window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.(result) || result;
    if (!result._genericUpdatesNormalized) {
      result = {
        ...result,
        genericUpdates: window.GameModules.updateRegistry?.normalizeUpdates?.(result, this) || result.genericUpdates || [],
        _genericUpdatesNormalized: true,
      };
    }
    const legacyResult = window.GameModules.updateRegistry?.expandGenericForLegacy?.(result, this) || result;
    const state = this.playerIdentityState?.();
    const settlement = [];
    settlement.push(...await window.GameModules.realWorldTargetUpdates.applyMetrics(this, legacyResult));
    settlement.push(...await window.GameModules.realWorldTargetUpdates.applyLexicon(this, legacyResult.lexiconUpdates || []));
    result.solidifyCards = await this.collectSolidifiableCharacters?.(result, 'real') || [];
    await this.syncNarrationWearing?.(result);
    result.solidifyOpen = false;
    result.solidifySelectedKey = this.solidifyKey?.(result.solidifyCards[0]) || '';
    result.itemActionResults = await this.applyRealWorldItemActions?.(legacyResult.itemActions || []) || [];
    settlement.push(...this.realWorldItemActionSettlement(result.itemActionResults));
    const elapsedSeconds = window.GameModules.ai.clampElapsed?.(result.elapsedSeconds, 300) || 300;
    result.elapsedSeconds = elapsedSeconds;
    const allVitalUpdates = Array.isArray(legacyResult.vitalUpdates) ? legacyResult.vitalUpdates : [];
    const playerTarget = state?.id || 'player-self';
    result.vitalUpdates = window.GameModules.realWorldVitals.normalize(allVitalUpdates, elapsedSeconds, result.narration || '', playerTarget, true);
    settlement.push(...this.realWorldVitalSettlement(state, result.vitalUpdates));
    await this.applyRealWorldVitalUpdates(state, result.vitalUpdates);
    const vitalTargets = [...new Set(allVitalUpdates.map((item) => String(item?.target || item?.subject?.id || '').trim()).filter((target) => target && target !== playerTarget && target !== 'player-self'))];
    for (const target of vitalTargets) {
      const targetState = this.itemSkillState?.(target);
      const targetUpdates = window.GameModules.realWorldVitals.normalize(allVitalUpdates, elapsedSeconds, result.narration || '', target, false);
      if (!targetState || !targetUpdates.length) continue;
      settlement.push(...this.realWorldVitalSettlement(targetState, targetUpdates));
      await this.applyRealWorldVitalUpdates(targetState, targetUpdates);
    }
    settlement.push(...this.realWorldFactionSettlement(
      window.GameModules.updateRegistry?.orgNamesFromGenericUpdates?.(result.genericUpdates, this)?.map((name) => ({ factionName: name, action: 'generic' })) || [],
    ));
    const orgTerritoryTypes = new Set(['territory-control', 'org-structure-node', 'org-overview-panel', 'membership', 'org-status', 'faction-structure', 'faction-overview']);
    const orgTerritoryUpdates = (result.genericUpdates || []).filter((item) => orgTerritoryTypes.has(item?.updateType));
    const legacyHandled = new Set(['vital', 'emotion', 'feeling', 'item', 'faction-structure', 'faction-overview', 'territory-control', 'org-structure-node', 'org-overview-panel', 'membership', 'org-status']);
    if (orgTerritoryUpdates.length) {
      const orgLines = window.GameModules.app?.orgTerritory?.settlementActions?.applySettlementUpdates?.(this, orgTerritoryUpdates) || [];
      orgLines.forEach((line) => { if (line) settlement.push(line); });
    }
    const remainingGeneric = (result.genericUpdates || []).filter((item) => !legacyHandled.has(item?.updateType));
    await window.GameModules.updateRegistry?.applyGeneric?.(this, remainingGeneric);
    const settledEvents = this.addEventsFromSettlement?.(result.events || [], { logId: id }) || [];
    if (settledEvents.length) settlement.push(`事件：已写入${settledEvents.length}条事件。`);
    settlement.push(...(await window.GameModules.realWorldProfileStage5?.applyPatches?.(this, result.profilePatches || []) || []));
    const initApplied = await window.GameModules.initPromptRegistry?.apply?.(this, result.initUpdates || []) || [];
    if (initApplied.length) settlement.push(`初始化：已写入${initApplied.length}条初始化记录。`);
    delete result.characterMetricUpdates;
    result.characterCardChanges = settlement;
    const startedAt = this.phoneDate().toISOString();
    this.advancePhoneTime(elapsedSeconds);
    const propertySettlement = window.GameModules.realWorldLocationGraph?.settleUsageContracts?.(this, this.phoneDate?.() || new Date()) || null;
    if (propertySettlement?.settled?.length || propertySettlement?.debts?.length) {
      const settledCount = propertySettlement.settled?.length || 0;
      const debtCount = propertySettlement.debts?.length || 0;
      settlement.push(`房产合同：已结算${settledCount}条，欠款/催债${debtCount}条。`);
    }
    await this.applyWechatActions?.(result.wechatActions || []);
    const longingEvents = await this.settleRealWorldLongingMeters?.(elapsedSeconds, new Date(startedAt).getTime(), this.phoneDate().getTime()) || [];
    if (longingEvents.length) settlement.push(`角色思念：${longingEvents.length}次思念事件等待下次现实推演体现。`);
    this.clearPreparedRealWorldLongingEvents?.();
    this.refreshRealWorldMatterStatus?.();
    this.checkWorkReminder?.();
    window.GameModules.realWorldMap.update(this, result.locationName || this.realWorldLocationName, result);
    const currentGraphNode = window.GameModules.realWorldLocationGraph?.getNode?.(this, this.realWorldMap?.currentId || result.locationName || this.realWorldLocationName);
    if (currentGraphNode?.id) window.GameModules.realWorldLocationGraph?.setCharacterCurrentNode?.(this, 'player-self', currentGraphNode.id, { reason: '现实推演结算后的主角当前位置。', time: this.phoneDate?.()?.toISOString?.() || '' });
    let fogResult = {};
    try {
      fogResult = await window.GameModules.realWorldMapFog?.afterLocationUpdate?.(this, { ...result, logId: id }) || {};
    } finally {
      // Stage9 可能已追加到 pending 会话；回写存档后再清，保证续玩能续上前缀。
      const pending = window.GameModules.realWorldAgentLoop?.pendingKvCacheSession?.(this, 'real');
      if (pending) window.GameModules.realWorldAgentLoop?.persistAgentConversation?.(this, pending, 'real');
      window.GameModules.realWorldAgentLoop?.clearPendingKvCacheSession?.(this, 'real');
    }
    if (fogResult.unlocked?.length) settlement.push(`地图解锁：${fogResult.unlocked.join('、')}`);
    if (fogResult.characterLocationApplied?.length) {
      settlement.push(
        `出场人物位置：已写入${fogResult.characterLocationApplied.map((item) => item.name || item.characterId).filter(Boolean).join('、')}`,
      );
    }
    // Ensure schedule locations written by surround-unlock are mirrored onto live rpgStates + store.
    const locField = window.GameModules.currentLocationField;
    const scheduleRows = Object.entries(this.characterSchedules || {});
    for (const [characterId, schedule] of scheduleRows) {
      const full = String(schedule?.profileCurrentLocation || '').trim();
      if (!locField?.isValidProfileFormat?.(full)) continue;
      const live = window.GameModules.realWorldMapFog?.ensureLiveCharacter?.(this, characterId, schedule?.characterName)
        || this.rpgStates?.[characterId]
        || window.GameModules.characterStateStore?.get?.(characterId, this);
      if (!live?.profile) continue;
      if (String(live.profile.currentLocation || '').trim() === full) {
        // Still refresh values.current_location so identity/fromCharacterState stay valid.
        if (!locField.isValidProfileFormat(live.values?.current_location?.currentLocation || '')) {
          live.values = live.values && typeof live.values === 'object' ? live.values : {};
          live.values.current_location = locField.stateValueFromText(
            full,
            this,
            '周围解锁后回填 values.current_location。',
            live.worldTag || live.profile?.work || '',
          );
          await window.GameModules.characterStateStore?.save?.(live, this);
        }
        continue;
      }
      window.GameModules.realWorldMapFog?.writeCharacterProfileLocation?.(this, live, full, {
        characterId,
        reason: '周围解锁后回填角色卡当前位置。',
        source: '电子地图周围解锁回填',
      });
      await window.GameModules.characterStateStore?.save?.(live, this);
    }
    if (this.realWorldFunctionOpen && this.realWorldFunctionView === 'map' && this.realWorldMap?.interiorNodeId) {
      this.showRealWorldMapInterior?.(this.realWorldMap.interiorNodeId);
    }
    this.ensureControlRoleLocation?.(state, '现实推演后更新玩家当前位置。');
    // Persist any scene-healed locations (including possessed NPCs) into character_state.
    const needing = window.GameModules.realWorldMapFog?.charactersNeedingProfileLocation?.(this) || [];
    for (const row of needing) {
      const healed = locField?.buildSceneProfileLocation?.(this, row.character) || '';
      if (!locField?.isValidProfileFormat?.(healed)) continue;
      window.GameModules.realWorldMapFog?.writeCharacterProfileLocation?.(this, row.character, healed, {
        characterId: row.id,
        reason: '推演结算后场景回填并写入角色卡库。',
        source: '推演结算场景回填',
      });
      await window.GameModules.characterStateStore?.save?.(row.character, this);
    }
    // Repair older slots where Stage4 only stamped schedules / appearingLocationById.
    await window.GameModules.realWorldMapFog?.flushAppearingLocationsToCharacterDb?.(this);
    if (state?.values?.current_location) {
      const playerFull = locField?.fromCharacterState?.(state) || '';
      if (locField?.isValidProfileFormat?.(playerFull)) {
        state.profile = state.profile || {};
        state.profile.currentLocation = playerFull;
        state.values.current_location = locField.stateValue(state.profile, this, '现实推演后保留合法角色卡当前位置。');
        if (this.playerProfile) this.playerProfile.currentLocation = playerFull;
      } else {
        state.values.current_location.name = this.realWorldLocationName || result.locationName || state.values.current_location.name;
      }
    }
    const shared = this.sharedControlState?.();
    if (shared) {
      const sharedFull = locField?.fromCharacterState?.(shared) || '';
      if (locField?.isValidProfileFormat?.(sharedFull)) {
        shared.profile = shared.profile || {};
        shared.profile.currentLocation = sharedFull;
        shared.values = shared.values || {};
        shared.values.current_location = locField.stateValueFromText(
          sharedFull,
          this,
          '共享感官推演后保留合法角色卡当前位置。',
          window.GameModules.realWorld2026?.label || shared.worldTag || shared.profile?.work || '未知世界',
        );
      } else {
        this.ensureControlRoleLocation?.(shared, '共享感官现实推演后同步位置。');
      }
      await window.GameModules.characterStateStore?.save?.(shared);
    }
    if (state) await window.GameModules.characterStateStore?.save?.(state);
    await this.refreshControlLinkStates?.();
    this.realWorldSceneTitle = result.sceneTitle || this.realWorldSceneTitle;
    this.realWorldQuest = result.quest || this.realWorldQuest;
    this.realWorldStatus = result.status || this.realWorldStatus;
    this.realWorldChoices = result.choices || this.realWorldChoices;
    const time = { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: this.phoneDate().toISOString(), startedAt, elapsedSeconds };
    const { playerEntry, ...cleanResult } = result;
    const existingEntry = this.realWorldLog.find((entry) => entry.id === id) || {};
    const nextThinkingSections = Array.isArray(cleanResult.thinkingSections) && cleanResult.thinkingSections.length ? cleanResult.thinkingSections : (existingEntry.thinkingSections || []);
    const nextThinking = String(cleanResult.thinking || '').trim() || String(existingEntry.thinking || '').trim();
    const nextSettlementThinkingSections = Array.isArray(cleanResult.settlementThinkingSections) && cleanResult.settlementThinkingSections.length ? cleanResult.settlementThinkingSections : (existingEntry.settlementThinkingSections || []);
    const nextSettlementThinking = String(cleanResult.settlementThinking || '').trim() || String(existingEntry.settlementThinking || '').trim();
    const next = { ...existingEntry, ...cleanResult, thinking: nextThinking, thinkingSections: nextThinkingSections, thinkingOpen: false, settlementThinking: nextSettlementThinking, settlementThinkingSections: nextSettlementThinkingSections, settlementThinkingOpen: false, type: 'ai', streaming: false, statusText: '', streamTrace: [], time, agentTrace: result.agentTrace || [] };
    await this.assignRealWorldlineEntry(next);
    if (playerEntry?.id) await window.GameModules.realWorldLogStore?.append?.(playerEntry);
    await window.GameModules.realWorldLogStore?.append?.(next);
    this.realWorldLog = this.normalizeRealWorldLog([...this.realWorldLog.filter((entry) => entry.id !== playerEntry?.id && entry.id !== id), ...(playerEntry?.id ? [playerEntry] : []), next]);
    this.realWorldLogTotal = window.GameModules.realWorldLogStore?.count?.() || this.realWorldLogTotal;
    this.refreshRealWorldLogPage?.(this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1);
    this.scrollRealWorldLogBottom?.();
  },
};
