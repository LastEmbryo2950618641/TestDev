/**
 * 鎵嬫満鏃堕棿涓庣幇瀹炰笘鐣屾帹婕旂晫闈€?
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
    const entry = { id: `${baseId}-ai`, type: 'ai', narration: '鐜板疄涓栫晫姝ｅ湪鎺ㄦ紨鈥?, thinking: '', streaming: true, playerText: rawText, actionText: text, time: startTime, createdAt: responseCreatedAt };
    entry.promptPack = { systemPrompt: '鐜板疄涓栫晫 Loop Agent 灏嗘寜姝ラ鍔ㄦ€佽浇鍏ヤ笂涓嬫枃銆?, userPrompt: text, model: this.modelId, promptTokens: 0 };
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
      console.error('鐜板疄鎺ㄦ紨璇锋眰澶辫触:', err.code, err.message, err.stack);
      await this.markRealWorldActionFailed(entry.id);
    } finally {
      this.realWorldBusy = false;
    }
  },

  async markRealWorldActionFailed(id) {
    await window.GameModules.sqliteSave.deleteRealWorldLogEntry?.(id);
    this.realWorldLogTotal = Math.max(0, (this.realWorldLogTotal || 1) - 1);
    this.realWorldLog = (this.realWorldLog || []).map((entry) => (entry.id === id ? { ...entry, narration: 'AI璇锋眰澶辫触锛岃閲嶈瘯', thinking: '', thinkingSections: [], streamTrace: [], streaming: false, transientError: true, promptPack: null, characterCardChanges: [], agentTrace: [] } : entry));
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
      const orgLines = window.GameModules.orgTerritoryActions?.applySettlementUpdates?.(this, orgTerritoryUpdates) || [];
      orgLines.forEach((line) => { if (line) settlement.push(line); });
    }
    const remainingGeneric = (result.genericUpdates || []).filter((item) => !legacyHandled.has(item?.updateType));
    await window.GameModules.updateRegistry?.applyGeneric?.(this, remainingGeneric);
    const settledEvents = this.addEventsFromSettlement?.(result.events || [], { logId: id }) || [];
    if (settledEvents.length) settlement.push(`浜嬩欢锛氬凡鍐欏叆${settledEvents.length}鏉′簨浠躲€俙);
    settlement.push(...(await window.GameModules.realWorldProfileStage5?.applyPatches?.(this, result.profilePatches || []) || []));
    const initApplied = await window.GameModules.initPromptRegistry?.apply?.(this, result.initUpdates || []) || [];
    if (initApplied.length) settlement.push(`鍒濆鍖栵細宸插啓鍏?{initApplied.length}鏉″垵濮嬪寲璁板綍銆俙);
    delete result.characterMetricUpdates;
    result.characterCardChanges = settlement;
    const startedAt = this.phoneDate().toISOString();
    this.advancePhoneTime(elapsedSeconds);
    await this.applyWechatActions?.(result.wechatActions || []);
    const longingEvents = await this.settleRealWorldLongingMeters?.(elapsedSeconds, new Date(startedAt).getTime(), this.phoneDate().getTime()) || [];
    if (longingEvents.length) settlement.push(`瑙掕壊鎬濆康锛?{longingEvents.length}娆℃€濆康浜嬩欢绛夊緟涓嬫鐜板疄鎺ㄦ紨浣撶幇銆俙);
    this.clearPreparedRealWorldLongingEvents?.();
    this.refreshRealWorldMatterStatus?.();
    this.checkWorkReminder?.();
    window.GameModules.realWorldMap.update(this, result.locationName || this.realWorldLocationName, result);
    const fogResult = await window.GameModules.realWorldMapFog?.afterLocationUpdate?.(this, result) || {};
    if (fogResult.unlocked?.length) settlement.push(`鍦板浘瑙ｉ攣锛?{fogResult.unlocked.join('銆?)}`);
    this.ensureControlRoleLocation?.(state, '鐜板疄鎺ㄦ紨鍚庢洿鏂扮帺瀹跺綋鍓嶄綅缃€?);
    if (state?.values?.current_location) state.values.current_location.name = this.realWorldLocationName || result.locationName || state.values.current_location.name;
    const shared = this.sharedControlState?.();
    if (shared) {
      this.ensureControlRoleLocation?.(shared, '鍏变韩鎰熷畼鐜板疄鎺ㄦ紨鍚庡悓姝ヤ綅缃€?);
      shared.values.current_location = { ...(shared.values.current_location || {}), name: this.realWorldLocationName || result.locationName || '鐜板疄褰撳墠浣嶇疆', worldTag: window.GameModules.realWorld2026?.label || '2026 鐜颁唬閮藉競鐜板疄涓栫晫', updatedAt: this.phoneDateText?.() || '', reason: '鍏变韩鎰熷畼鎺у埗涓笌鐜╁鍚屽鐜板疄鎺ㄦ紨浣嶇疆銆? };
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
    const next = { ...existingEntry, ...cleanResult, thinking: nextThinking, thinkingSections: nextThinkingSections, type: 'ai', streaming: false, statusText: '', streamTrace: [], time, agentTrace: result.agentTrace || [] };
    await this.assignRealWorldlineEntry(next);
    if (playerEntry?.id) await window.GameModules.realWorldLogStore?.append?.(playerEntry);
    await window.GameModules.realWorldLogStore?.append?.(next);
    this.realWorldLog = this.normalizeRealWorldLog([...this.realWorldLog.filter((entry) => entry.id !== playerEntry?.id && entry.id !== id), ...(playerEntry?.id ? [playerEntry] : []), next]);
    this.realWorldLogTotal = window.GameModules.realWorldLogStore?.count?.() || this.realWorldLogTotal;
    this.refreshRealWorldLogPage?.(this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1);
    this.scrollRealWorldLogBottom?.();
  },
};


