window.GameModules = window.GameModules || {};

window.GameModules.factionAiActions = {
  async generateFactionsByAI() {
    this.initFactionSystem();
    if (this.factionState.generating) return;
    const requestId = (this.factionState.requestId || 0) + 1;
    Object.assign(this.factionState, { generating: true, error: '', requestId });
    try {
      const text = await Promise.race([this.requestFactionText(), new Promise((resolve) => setTimeout(() => resolve(''), 35000))]);
      if (requestId !== this.factionState.requestId) return;
      const factions = this.parseFactions(text);
      if (factions.length) this.applyGeneratedFactions(factions);
      else this.factionState.error = 'AI未返回有效势力，已保留当前固化势力。';
      this.save?.();
    } catch (err) {
      console.error('AI生成势力失败:', err.code, err.message, err.stack);
      this.factionState.error = 'AI生成暂时不可用，已保留当前固化势力。';
    } finally {
      if (requestId === this.factionState.requestId) this.factionState.generating = false;
    }
  },

  async requestFactionText() {
    let buffer = '';
    await window.dzmm.completions({ model: this.modelId || 'nalang-turbo-0826', maxTokens: 2600, messages: [{ role: 'user', content: this.factionPrompt() }] }, (content) => { buffer += content; });
    return buffer;
  },

  factionPrompt() {
    const p = this.playerProfile || {};
    const company = this.currentCompany?.() || {};
    return `你是现代现实世界势力系统设计器。只返回严格JSON数组，不要Markdown。势力定义：任何具有组织形式的实体都算势力，国家、公司、工作室、学校、医院、社团、部门、平台都可以是势力；每个势力必须有归属字段parentId和parentName，无上级时parentId为空且parentName为“无势力归属”；所有公司必须归属于国家级势力。请基于玩家和公司生成6-10个势力，并保留国家与当前公司。字段固定：id,name,type,parentId,parentName,level,location,domain,scale,stance,influence,description,structure,rules,resources,relations。structure是数组，每项{name,roles}，内部组织形式不能写死，要按势力类型合理生成。relations数组每项{target,relation,detail}。玩家资料：姓名=${p.name || '玩家'}，地址=${p.refinedCity || p.city || '未知'}，身份=${p.refinedRole || p.dailyRole || '未知'}。当前公司：${company.name || p.workplace || '未知公司'}，行业=${company.industry || '未知'}，地点=${company.location || p.refinedCity || p.city || '未知'}。额外要求：${this.factionState.customPrompt || '无'}。`;
  },

  parseFactions(text) {
    const source = String(text || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('['); const end = source.lastIndexOf(']');
    if (start < 0 || end < start) return [];
    try { return JSON.parse(source.slice(start, end + 1)).map((x, i) => this.normalizeFaction(x, i)).filter(Boolean); } catch (_) { return []; }
  },

  normalizeFaction(item, index) {
    if (!item?.name) return null;
    const id = String(item.id || `faction-${index}-${item.name}`).replace(/\s+/g, '-');
    const parentId = String(item.parentId || '').trim();
    return { id, name: String(item.name), type: String(item.type || '组织'), parentId, parentName: parentId ? String(item.parentName || '未知势力') : '无势力归属', level: String(item.level || '组织级'), location: String(item.location || '未知'), domain: String(item.domain || '综合'), scale: String(item.scale || '未知'), stance: String(item.stance || '中立'), influence: Number(item.influence) || 30, description: String(item.description || ''), structure: Array.isArray(item.structure) ? item.structure : [], rules: Array.isArray(item.rules) ? item.rules.map(String) : [], resources: Array.isArray(item.resources) ? item.resources.map(String) : [], relations: Array.isArray(item.relations) ? item.relations : [], fixed: true, updatedAt: this.phoneDate?.().toISOString?.() || new Date().toISOString() };
  },

  applyGeneratedFactions(items) {
    const map = new Map(this.factionState.factions.map((x) => [x.id, x]));
    items.forEach((item) => map.set(item.id, { ...(map.get(item.id) || {}), ...item, fixed: true }));
    this.factionState.factions = [...map.values()];
    this.syncCompanyFaction();
    if (!this.selectedFaction()) this.factionState.selectedId = this.factionState.factions[0]?.id || '';
  },
};
