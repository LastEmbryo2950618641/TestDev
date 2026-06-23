window.GameModules = window.GameModules || {};

window.GameModules.factionArchiveActions = {
  ensureFactionArchiveView() {
    this.initFactionSystem?.();
    window.GameModules.factionArchive?.ensure?.(this);
    this.factionState.selectedArchiveDocId = this.factionState.selectedArchiveDocId || '';
  },

  factionArchiveKey(faction = null) {
    if (!faction) return '';
    return String(faction.id || faction.name || '').trim();
  },

  factionArchiveDocs(faction = null) {
    this.ensureFactionArchiveView();
    const selected = faction || this.selectedFaction?.();
    const key = this.factionArchiveKey(selected);
    const name = String(selected?.name || '').trim();
    const archives = Object.values(this.factionState.archives || {}).filter((archive) => (
      !key || archive.factionId === key || archive.factionName === name
    ));
    return archives.flatMap((archive) => (archive.docs || []).map((doc) => ({
      ...doc,
      archiveKey: `${archive.factionId || archive.factionName}-${doc.id}`,
      factionId: archive.factionId,
      factionName: archive.factionName || '未知势力',
    }))).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  },

  openFactionArchiveDoc(key = '') {
    this.ensureFactionArchiveView();
    this.factionState.selectedArchiveDocId = key;
  },

  closeFactionArchiveDoc() {
    if (this.factionState) this.factionState.selectedArchiveDocId = '';
  },

  selectedFactionArchiveDoc() {
    const key = this.factionState?.selectedArchiveDocId || '';
    return this.factionArchiveDocs(this.selectedFaction?.()).find((doc) => doc.archiveKey === key) || null;
  },

  factionArchiveDocMeta(doc = null) {
    if (!doc) return '未选择档案';
    const source = (doc.sourceTypes || []).join('、') || '未知来源';
    return `${doc.charCount || 0}字｜${doc.sealed ? '已封档' : '记录中'}｜${source}`;
  },

  factionArchiveParagraphTime(item = {}) {
    if (!item.at) return '时间未知';
    try { return new Date(item.at).toLocaleString('zh-CN'); } catch (_) { return item.at; }
  },
};
