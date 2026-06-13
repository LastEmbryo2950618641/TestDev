window.GameModules = window.GameModules || {};

window.GameModules.factionAiActions = {
  factionFields: ['name', 'type', 'parentId', 'parentName', 'level', 'location', 'domain', 'scale', 'stance', 'influence', 'description', 'structure', 'rules', 'resources', 'relations'],

  async generateFactionsByAI() {
    this.initFactionSystem();
    if (this.factionState.generating) return;
    const requestId = (this.factionState.requestId || 0) + 1;
    Object.assign(this.factionState, { generating: true, error: '', requestId });
    try {
      const text = await Promise.race([this.requestFactionText(requestId), new Promise((resolve) => setTimeout(() => resolve(''), 35000))]);
      if (requestId !== this.factionState.requestId) return;
      const factions = this.parseFactions(text);
      if (factions.length) this.applyGeneratedFactions(factions);
      else this.factionState.error = 'AI未返回有效势力，已保留数据库内已固化势力。';
      this.save?.();
    } catch (err) {
      console.error('AI生成势力失败:', err.code, err.message, err.stack);
      this.factionState.error = 'AI生成暂时不可用，已保留数据库内已固化势力。';
    } finally {
      if (requestId === this.factionState.requestId) this.factionState.generating = false;
    }
  },

  async requestFactionText(requestId) {
    let buffer = '';
    await window.dzmm.completions({ model: this.modelId || 'nalang-turbo-0826', maxTokens: 3000, messages: [{ role: 'user', content: this.factionPrompt() }] }, (content) => {
      if (requestId !== this.factionState.requestId) return;
      buffer += content;
    });
    return buffer;
  },

  factionPrompt() {
    const p = this.playerProfile || {};
    const company = this.currentCompany?.() || {};
    const existing = JSON.stringify(this.factionState.factions || []);
    return `你是现代现实世界势力数据库初始化与审计器。只返回严格JSON，不要Markdown。返回格式：{"factions":[...] }。势力定义：任何具有组织形式的实体都算势力；每个势力必须有parentId和parentName，无上级时parentId为空且parentName为“无势力归属”；所有公司必须归属于国家级势力。字段固定：id,name,type,parentId,parentName,level,location,domain,scale,stance,influence,description,structure,rules,resources,relations,fieldReasons。structure数组项为{name,roles}；relations数组项为{target,relation,detail}。fieldReasons必须覆盖除id外每个字段，每个字段都写一句审计理由。规则：1. 首次初始化时，根据上下文推演当前已存在势力和已知部分构成；数据库没有的势力，可按部分构成推演大致组织结构并固化。2. 数据库已有势力不能随意重写；发现不同处只能调整或增加，并且每个被调整/新增词条必须在fieldReasons里给合理理由。3. 全量检视每个势力，每个词条都必须有理由；无变化也说明为什么保持。4. 保留国家与当前公司，公司归属于国家。玩家资料：姓名=${p.name || '玩家'}，地址=${p.refinedCity || p.city || '未知'}，身份=${p.refinedRole || p.dailyRole || '未知'}。当前公司：${company.name || p.workplace || '未知公司'}，行业=${company.industry || '未知'}，地点=${company.location || p.refinedCity || p.city || '未知'}。数据库现有势力：${existing}。额外调整要求：${this.factionState.customPrompt || '无'}。`;
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
    const faction = { id, name: String(item.name), type: String(item.type || '组织'), parentId, parentName: parentId ? String(item.parentName || '未知势力') : '无势力归属', level: String(item.level || '组织级'), location: String(item.location || '未知'), domain: String(item.domain || '综合'), scale: String(item.scale || '未知'), stance: String(item.stance || '中立'), influence: Number(item.influence) || 30, description: String(item.description || ''), structure: Array.isArray(item.structure) ? item.structure : [], rules: Array.isArray(item.rules) ? item.rules.map(String) : [], resources: Array.isArray(item.resources) ? item.resources.map(String) : [], relations: Array.isArray(item.relations) ? item.relations : [], fixed: true, updatedAt: this.phoneDate?.().toISOString?.() || new Date().toISOString() };
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
    const map = new Map(this.factionState.factions.map((x) => [x.id, { ...x, fieldReasons: this.completeFactionReasons(x, x.fieldReasons) }]));
    items.forEach((item) => {
      const existing = map.get(item.id);
      if (existing) map.set(item.id, this.mergeExistingFaction(existing, item));
      else map.set(item.id, { ...item, changeLog: [{ field: 'all', reason: '数据库无该势力，AI根据上下文与部分构成初始化并固化。', at: item.updatedAt, action: 'add' }] });
    });
    this.factionState.factions = [...map.values()];
    this.syncCompanyFaction();
    if (!this.selectedFaction()) this.factionState.selectedId = this.factionState.factions[0]?.id || '';
  },
};
