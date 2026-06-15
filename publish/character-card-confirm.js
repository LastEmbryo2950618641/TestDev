window.GameModules = window.GameModules || {};

window.GameModules.characterCardConfirm = {
  state() {
    return { open: false, pending: [], selected: {}, message: '', resolve: null };
  },

  async request(store, characters) {
    const pending = this.missingCharacters(store, characters);
    if (!pending.length || pending.length <= 5) return null;
    if (store.characterCardConfirm?.open) throw new Error('已有角色卡确认弹窗，请先完成当前选择。');
    return await new Promise((resolve) => {
      store.characterCardConfirm = {
        open: true,
        pending,
        selected: Object.fromEntries(pending.map((item) => [item.id, true])),
        message: `本次 AI 推演需要生成 ${pending.length} 张完整角色卡。请选择允许生成的角色。`,
        resolve,
      };
    });
  },

  missingCharacters(store, characters) {
    const seen = new Set();
    return (characters || []).map((raw) => this.normalize(raw, store)).filter((item) => {
      if (!item.id || seen.has(item.id) || this.hasReusableState(store, item)) return false;
      seen.add(item.id);
      return true;
    });
  },

  normalize(raw, store) {
    const data = typeof raw === 'object' && raw ? raw : { name: String(raw || '无名路人') };
    const work = data.work || store?.character?.work || '原创世界';
    const name = String(data.name || '无名路人').slice(0, 16);
    const id = data.id || `npc-${this.slug(work)}-${this.slug(name)}`;
    return { ...data, id, name, work, role: data.role || (data.isMinor ? '路人' : '出场人物') };
  },

  hasReusableState(store, item) {
    const existing = store?.rpgStates?.[item.id] || (window.GameModules.cache?.enabled?.('generatedProfiles') ? window.GameModules.sqliteSave.getCharacterState(item.id) : null);
    return Boolean(existing?.profile && window.GameModules.characterProfile?.isReusableRoleCard?.(existing.profile));
  },

  confirm(store) {
    const dialog = store.characterCardConfirm;
    if (!dialog?.resolve) return;
    const allowed = new Set(dialog.pending.filter((item) => dialog.selected[item.id]).map((item) => item.id));
    dialog.resolve(allowed);
    store.characterCardConfirm = this.state();
  },

  cancel(store) {
    const dialog = store.characterCardConfirm;
    if (dialog?.resolve) dialog.resolve(new Set());
    store.characterCardConfirm = this.state();
  },

  toggleAll(store, value) {
    const dialog = store.characterCardConfirm;
    if (!dialog?.pending) return;
    dialog.selected = Object.fromEntries(dialog.pending.map((item) => [item.id, Boolean(value)]));
  },

  slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${window.GameModules.rpgState.seed(text)}`;
  },
};
