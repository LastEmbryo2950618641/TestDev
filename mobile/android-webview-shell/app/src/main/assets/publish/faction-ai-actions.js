window.GameModules = window.GameModules || {};

window.GameModules.factionAiActions = {
  factionFields: ['name', 'type', 'classification', 'worldTag', 'parentId', 'parentName', 'level', 'location', 'domain', 'scale', 'stance', 'influence', 'description', 'structure', 'rules', 'resources', 'relations'],

  async generateFactionsByAI() {
    this.initFactionSystem?.();
    if (this.factionState) {
      this.factionState.generating = false;
      this.factionState.error = '手动全量检视已移除；势力由正文后 Stage6（createFaction / patchFactionField）写入。';
    }
  },

  async requestFactionText(requestId) {
    let buffer = '';
    const prompt = await this.factionPrompt();
    await window.GameModules.aiRequest.complete({
      source: 'faction-audit', model: this.modelId || this.settingsState?.textModelId, prompt, timeoutMs: 60000,
      ...(window.GameModules.promptSkills?.completionOptions?.('faction-audit') || { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'other' }),
      requireDone: true,
      onChunk: (content, done, info) => {
        if (requestId !== this.factionState.requestId) return;
        buffer = info.buffer;
      },
    });
    return buffer;
  },

  factionPrompt() {
    const p = this.playerProfile || {}, company = this.currentCompany?.() || {};
    return window.GameModules.renderPrompt('faction-audit', { 玩家姓名: p.name || '玩家', 玩家地址: p.refinedCity || p.city || '未知', 玩家身份: p.refinedRole || p.dailyRole || '未知', 当前公司: company.name || p.workplace || '未知公司', 公司行业: company.industry || '未知', 公司地点: company.location || p.refinedCity || p.city || '未知', 已有势力: JSON.stringify(this.factionState.factions || []), 额外要求: this.factionState.customPrompt || '无' });
  },

  parseFactions(text) {
    const source = String(text || '').replace(/```(?:json)?|```/gi, '').trim();
    const objectStart = source.indexOf('{');
    const objectEnd = source.lastIndexOf('}');
    const arrayStart = source.indexOf('[');
    const arrayEnd = source.lastIndexOf(']');
    try {
      const raw = objectStart >= 0 && objectEnd > objectStart ? JSON.parse(source.slice(objectStart, objectEnd + 1)) : JSON.parse(source.slice(arrayStart, arrayEnd + 1));
      const list = Array.isArray(raw) ? raw : raw.factions;
      return Array.isArray(list) ? list.map((x, i) => this.normalizeFaction(x, i)).filter(Boolean) : [];
    } catch (_) { return []; }
  },

  normalizeFaction(item, index) {
    if (!item?.name) return null;
    const id = String(item.id || `faction-${index}-${item.name}`).replace(/\s+/g, '-');
    const parentId = String(item.parentId || '').trim();
    const classification = window.GameModules.orgTerritory?.deriveClassification?.(item) || window.GameModules.orgTerritory?.normalizeClassification?.(item.classification) || '';
    const worldTag = window.GameModules.orgTerritory?.resolveFactionWorldTag?.(item, this)
      || String(item.worldTag || item.所属世界 || this.currentWorldTag?.() || '').trim()
      || '未知世界';
    const faction = { id, name: String(item.name), type: String(item.type || '组织'), classification: classification || 'community', worldTag, parentId, parentName: parentId ? String(item.parentName || '未知势力') : '无势力归属', level: String(item.level || '组织级'), location: String(item.location || '未知'), domain: String(item.domain || '综合'), scale: String(item.scale || '未知'), stance: String(item.stance || '中立'), influence: Number(item.influence) || 30, description: String(item.description || ''), structure: this.normalizeFactionStructure({ structure: Array.isArray(item.structure) ? item.structure : [] }).structure, rules: Array.isArray(item.rules) ? item.rules.map(String) : [], resources: Array.isArray(item.resources) ? item.resources.map(String) : [], relations: Array.isArray(item.relations) ? item.relations : [], fixed: true, updatedAt: this.phoneDate?.().toISOString?.() || new Date().toISOString() };
    faction.fieldReasons = this.completeFactionReasons(faction, item.fieldReasons || {}, 'AI全量检视后给出的字段理由。');
    return faction;
  },

  completeFactionReasons(faction, reasons = {}, fallback = '数据库初始化字段，等待后续全量审计补充。') {
    return this.factionFields.reduce((out, key) => {
      out[key] = String(reasons[key] || fallback);
      return out;
    }, {});
  },

  sameFactionValue(a, b) {
    return JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
  },

  mergeExistingFaction(existing, incoming) {
    const merged = { ...existing, fieldReasons: { ...(existing.fieldReasons || {}) }, changeLog: [...(existing.changeLog || [])] };
    this.factionFields.forEach((key) => {
      const reason = incoming.fieldReasons?.[key] || '';
      const changed = !this.sameFactionValue(existing[key], incoming[key]);
      if (changed && reason) {
        merged[key] = incoming[key];
        merged.changeLog.unshift({ field: key, reason, at: incoming.updatedAt, action: 'adjust' });
      }
      if (changed && !reason) merged.changeLog.unshift({ field: key, reason: 'AI未提供调整理由，数据库原词条保持不变。', at: incoming.updatedAt, action: 'keep' });
      merged.fieldReasons[key] = reason || merged.fieldReasons[key] || '数据库已有词条，本次未给出差异理由，保持原值。';
    });
    merged.fixed = true;
    merged.updatedAt = incoming.updatedAt;
    return merged;
  },

  applyGeneratedFactions(items) {
    const ot = window.GameModules.orgTerritory;
    const map = new Map(this.factionState.factions.map((x) => [x.id, { ...x, fieldReasons: this.completeFactionReasons(x, x.fieldReasons) }]));
    items.forEach((item) => {
      const existing = map.get(item.id);
      const sanitized = ot?.sanitizeAuditFaction?.({ ...(existing || {}), ...item }, this, existing) || item;
      if (existing) map.set(item.id, this.mergeExistingFaction(existing, sanitized));
      else map.set(item.id, { ...sanitized, changeLog: [{ field: 'all', reason: '数据库无该势力，AI根据上下文与部分构成初始化并固化。', at: sanitized.updatedAt, action: 'add' }] });
    });
    this.factionState.factions = [...map.values()].map((item) => this.normalizeFactionStructure(item));
    this.syncCompanyFaction();
    // Attach role-card titles only onto orgs AI already created.
    this.syncRoleCardMemberships?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(this);
    if (!this.selectedFaction()) this.factionState.selectedId = this.factionState.factions[0]?.id || '';
  },
};
