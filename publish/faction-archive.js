window.GameModules = window.GameModules || {};

window.GameModules.factionArchive = {
  docLimit: 10000,
  paragraphTarget: 100,

  ensure(store) {
    store.initFactionSystem?.();
    store.factionState = store.factionState || {};
    store.factionState.archives = store.factionState.archives && typeof store.factionState.archives === 'object' ? store.factionState.archives : {};
    return store.factionState.archives;
  },

  factionKey(faction = {}) {
    return String(faction.id || faction.name || '').trim();
  },

  relatedFactions(store, text = '', extraNames = []) {
    store.initFactionSystem?.();
    const raw = String(text || '');
    const extras = extraNames.map((x) => String(x || '').trim()).filter(Boolean);
    const rows = store.factionState?.factions || [];
    const hits = rows.filter((faction) => {
      const name = String(faction.name || '').trim();
      if (!name) return false;
      return raw.includes(name) || extras.includes(name) || extras.includes(String(faction.id || ''));
    });
    const currentCompany = store.currentCompany?.()?.name || store.companyState?.companies?.[0]?.name || '';
    if (/公司|上班|岗位|老板|同事|部门|项目|绩效|薪资/.test(raw) && currentCompany) {
      const company = rows.find((f) => f.name === currentCompany || f.id === 'company-main');
      if (company && !hits.some((f) => this.factionKey(f) === this.factionKey(company))) hits.push(company);
    }
    if (/国家|国籍|政府|美国|中国|日本|英国|法国/.test(raw)) {
      const top = rows.find((f) => f.type === '国家' && !f.parentId);
      if (top && !hits.some((f) => this.factionKey(f) === this.factionKey(top))) hits.push(top);
    }
    return hits.slice(0, 6);
  },

  forcePositionNames(state = {}) {
    const profile = state.profile || state || {};
    const list = profile.force_positions || profile.forcePositions || [];
    return Array.isArray(list) ? list.map((item) => item.force || item.faction || item.name).filter(Boolean) : [];
  },

  recordRealWorld(store, action = '', result = {}) {
    const migrated = window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.(result) || result;
    const updateNames = window.GameModules.updateRegistry?.orgNamesFromGenericUpdates?.(migrated.genericUpdates, store) || [];
    const text = [
      `现实行动：${action}`,
      result.locationName ? `地点：${result.locationName}` : '',
      result.sceneTitle ? `场景：${result.sceneTitle}` : '',
      result.narration ? `经过：${result.narration}` : '',
      result.thinking ? `推演依据：${result.thinking}` : '',
      result.quest ? `目标：${result.quest}` : '',
      result.status ? `状态：${result.status}` : '',
    ].filter(Boolean).join('。');
    this.appendForRelated(store, text, updateNames, '现实推演');
  },

  recordWechat(store, contact = {}, playerText = '', replyText = '', result = {}) {
    const state = store.rpgStates?.[contact.id] || window.GameModules.sqliteSave?.getCharacterState?.(contact.id) || {};
    const names = this.forcePositionNames(state);
    const text = [
      `微信对话：${store.playerName || '玩家'}说“${playerText}”`,
      `${state.profile?.name || contact.name || '联系人'}回复“${replyText}”`,
      result.mood ? `语气：${result.mood}` : '',
      result.imageIntent?.imageDescription ? `图片意图：${result.imageIntent.imageDescription}` : '',
    ].filter(Boolean).join('。');
    this.appendForRelated(store, text, names, '微信回复');
  },

  appendForRelated(store, text = '', extraNames = [], source = '记录') {
    const factions = this.relatedFactions(store, text, extraNames);
    if (!factions.length) return [];
    const archives = this.ensure(store);
    const now = store.phoneDate?.().toISOString?.() || new Date().toISOString();
    const paragraphs = this.paragraphs(text);
    factions.forEach((faction) => this.appendArchive(archives, faction, paragraphs, source, now));
    return factions;
  },

  paragraphs(text = '') {
    const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^。！？!?]+[。！？!?]?/g) || [];
    const out = [];
    let current = '';
    sentences.forEach((sentence) => {
      const next = `${current}${sentence}`.trim();
      current = next;
      if (current.length >= this.paragraphTarget) {
        out.push(current);
        current = '';
      }
    });
    if (current) out.push(current);
    return out.map((p) => p.slice(0, 600)).filter(Boolean).slice(0, 20);
  },

  appendArchive(archives, faction = {}, paragraphs = [], source = '', now = '') {
    const key = this.factionKey(faction);
    if (!key || !paragraphs.length) return null;
    const archive = archives[key] || { factionId: faction.id || key, factionName: faction.name || key, docs: [], updatedAt: now };
    archive.factionName = faction.name || archive.factionName;
    archive.docs = Array.isArray(archive.docs) ? archive.docs : [];
    paragraphs.forEach((paragraph) => {
      let doc = archive.docs[archive.docs.length - 1];
      if (!doc || doc.sealed || Number(doc.charCount || 0) >= this.docLimit) {
        const index = archive.docs.length + 1;
        doc = { id: `${key}-archive-${index}`, title: `${archive.factionName}资料档案${index}`, sourceTypes: [], paragraphs: [], charCount: 0, sealed: false, createdAt: now, updatedAt: now };
        archive.docs.push(doc);
      }
      doc.paragraphs.push({ text: paragraph, source, at: now });
      doc.charCount = (doc.paragraphs || []).reduce((sum, item) => sum + String(item.text || '').length, 0);
      doc.updatedAt = now;
      if (source && !doc.sourceTypes.includes(source)) doc.sourceTypes.push(source);
      if (doc.charCount >= this.docLimit) doc.sealed = true;
    });
    archive.docs = archive.docs.slice(-20);
    archive.updatedAt = now;
    archives[key] = archive;
    return archive;
  },

  contextFor(store, seed = '', max = 1800) {
    const archives = this.ensure(store);
    const related = this.relatedFactions(store, seed, []);
    const selected = related.length ? related : (store.factionState?.factions || []).slice(0, 4);
    const rows = selected.map((faction) => this.archiveBrief(archives[this.factionKey(faction)], faction)).filter(Boolean);
    return rows.join('\n\n').slice(0, max) || '暂无势力资料库记录。';
  },

  archiveBrief(archive = null, faction = {}) {
    if (!archive) return `势力：${faction.name || '未知'}｜资料库：暂无记录。`;
    const doc = (archive.docs || [])[archive.docs.length - 1];
    if (!doc) return `势力：${archive.factionName}｜资料库：暂无记录。`;
    const recent = (doc.paragraphs || []).slice(-3).map((p) => `- ${p.text}`).join('\n');
    return [`势力：${archive.factionName}`, `当前档案：${doc.title}｜${doc.charCount || 0}/${this.docLimit}字｜${doc.sealed ? '已封档' : '记录中'}`, recent].filter(Boolean).join('\n');
  },
};
