window.GameModules = window.GameModules || {};

window.GameModules.characterCardUpdateOperations = {
  collectionFields: new Set(['factions', 'memberships', 'certificates', 'titles']),
  learnedFields: new Set(['skills', 'knowledge', 'professions']),
  scalarPaths: {
    role: 'profile.role',
    job: 'profile.job',
    detail: 'profile.detail',
    personality: 'profile.personality',
    preferences: 'profile.preferences',
    currentLocation: 'profile.currentLocation',
    'socialDrive.relationToPlayer': 'profile.socialDrive.relationToPlayer',
    'socialDrive.relationDetail': 'profile.socialDrive.relationDetail',
    'socialDrive.agenda.short': 'profile.socialDrive.agenda.short',
    'socialDrive.agenda.deadline': 'profile.socialDrive.agenda.deadline',
    'socialDrive.agenda.needPlayer': 'profile.socialDrive.agenda.needPlayer',
    'socialDrive.agenda.needPlayerWhy': 'profile.socialDrive.agenda.needPlayerWhy',
    'socialDrive.agenda.urgency': 'profile.socialDrive.agenda.urgency',
  },

  text(value) {
    return String(value ?? '').trim();
  },

  clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  },

  reject(reason = '操作无效', operation = null) {
    return { applied: false, rejected: true, reason, operation };
  },

  accept(state, operation, value = null) {
    window.GameModules.characterStateStore?.save?.(state);
    return { applied: true, rejected: false, reason: operation.reason, operation, state, value };
  },

  resolveState(store, subject = {}) {
    const id = this.text(subject.id);
    const name = this.text(subject.name);
    if ((id === 'player-self' || subject.type === 'player') && store?.playerIdentityState) {
      const player = store.playerIdentityState();
      if (player) return player;
    }
    if (id && store?.itemSkillState) {
      const direct = store.itemSkillState(id);
      if (direct) return direct;
    }
    const states = window.GameModules.characterStateStore;
    return (id && states?.get?.(id)) || (name && states?.getByName?.(name)) || null;
  },

  normalize(raw = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const subjectRaw = raw.subject;
    const subject = subjectRaw && typeof subjectRaw === 'object'
      ? { id: this.text(subjectRaw.id), name: this.text(subjectRaw.name), type: this.text(subjectRaw.type) }
      : null;
    const field = this.text(raw.field);
    const op = this.text(raw.op).toLowerCase();
    const reason = this.text(raw.reason);
    if (!subject || (!subject.id && !subject.name) || !field || !op || !reason) return null;
    return {
      subject,
      field,
      op,
      target: this.clone(raw.target),
      value: this.clone(raw.value),
      delta: Number(raw.delta),
      reason,
    };
  },

  setPath(root, path, value) {
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return false;
    let cursor = root;
    for (const part of parts.slice(0, -1)) {
      if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {};
      cursor = cursor[part];
    }
    cursor[parts.at(-1)] = value;
    return true;
  },

  item(field, raw, reason = '') {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const valueReason = this.text(raw.reason || reason);
    if (field === 'factions') {
      const faction = this.text(raw.faction);
      const role = this.text(raw.role);
      return faction && role ? { faction, role, reason: valueReason } : null;
    }
    if (field === 'memberships') {
      const orgName = this.text(raw.orgName);
      const title = this.text(raw.title);
      const department = this.text(raw.department);
      return orgName && title ? { orgName, title, ...(department ? { department } : {}), reason: valueReason } : null;
    }
    if (field === 'certificates') {
      const orgName = this.text(raw.orgName);
      const itemField = this.text(raw.field);
      const level = this.text(raw.level);
      return orgName && itemField && level ? { orgName, field: itemField, level, reason: valueReason } : null;
    }
    if (field === 'titles') {
      const society = this.text(raw.society);
      const itemField = this.text(raw.field);
      const title = this.text(raw.title);
      return society && itemField && title ? { society, field: itemField, title, reason: valueReason } : null;
    }
    return null;
  },

  exactItemKey(field, raw) {
    const item = this.item(field, raw);
    if (!item) return '';
    if (field === 'factions') return `${item.faction}\u0000${item.role}`;
    if (field === 'memberships') return `${item.orgName}\u0000${item.title}\u0000${item.department || ''}`;
    if (field === 'certificates') return `${item.orgName}\u0000${item.field}\u0000${item.level}`;
    if (field === 'titles') return `${item.society}\u0000${item.field}\u0000${item.title}`;
    return '';
  },

  profileList(state, field) {
    state.profile = state.profile && typeof state.profile === 'object' ? state.profile : {};
    if (!Array.isArray(state.profile[field])) state.profile[field] = [];
    return state.profile[field];
  },

  syncSocialFields(state, field) {
    if (!['factions', 'memberships'].includes(field)) return;
    if (window.GameModules.rpgState?.syncSocialFields) {
      window.GameModules.rpgState.syncSocialFields(state, 'profile');
      return;
    }
    state.values = state.values && typeof state.values === 'object' ? state.values : {};
    state.values[field] = this.profileList(state, field).map((item) => this.clone(item));
  },

  applyCollection(state, operation) {
    const { field, op, reason } = operation;
    if (!['add', 'replace', 'delete'].includes(op)) return this.reject(`${field} 不允许 ${op} 操作`, operation);
    const list = this.profileList(state, field);
    if (op === 'add') {
      const value = this.item(field, operation.value, reason);
      if (!value) return this.reject(`${field} 新项目结构不完整`, operation);
      const key = this.exactItemKey(field, value);
      if (list.some((item) => this.exactItemKey(field, item) === key)) return this.reject(`${field} 项目重复`, operation);
      list.push(value);
      this.syncSocialFields(state, field);
      return this.accept(state, operation, value);
    }
    const targetKey = this.exactItemKey(field, operation.target);
    if (!targetKey) return this.reject(`${field} ${op} 缺少精确 target`, operation);
    const index = list.findIndex((item) => this.exactItemKey(field, item) === targetKey);
    if (index < 0) return this.reject(`${field} 找不到指定 target`, operation);
    if (op === 'delete') {
      const removed = list.splice(index, 1)[0];
      this.syncSocialFields(state, field);
      return this.accept(state, operation, removed);
    }
    const value = this.item(field, operation.value, reason);
    if (!value) return this.reject(`${field} 替换值结构不完整`, operation);
    const valueKey = this.exactItemKey(field, value);
    if (list.some((item, itemIndex) => itemIndex !== index && this.exactItemKey(field, item) === valueKey)) {
      return this.reject(`${field} 替换后项目重复`, operation);
    }
    list.splice(index, 1, value);
    this.syncSocialFields(state, field);
    return this.accept(state, operation, value);
  },

  learnedNameKey(value = '') {
    return this.text(value).normalize('NFKC').toLowerCase().replace(/[\s\-_/·.，,。:：()（）]+/gu, '');
  },

  applyLearned(state, operation) {
    const { field, op, value } = operation;
    if (op !== 'add') return this.reject(`${field} 只允许 add 操作`, operation);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return this.reject(`${field} 新项目结构不完整`, operation);
    const name = this.text(value.name);
    const desc = this.text(value.desc);
    const level = Math.max(1, Math.min(7, Math.round(Number(value.level) || 1)));
    const linkedStats = Array.isArray(value.linkedStats) ? value.linkedStats.map((item) => this.text(item)).filter(Boolean) : [];
    if (!name || !desc) return this.reject(`${field} 新项目缺少 name 或 desc`, operation);
    state.values = state.values && typeof state.values === 'object' ? state.values : {};
    const list = Array.isArray(state.values[field]) ? state.values[field] : (state.values[field] = []);
    const nameKey = this.learnedNameKey(name);
    if (list.some((item) => this.learnedNameKey(item?.name || item) === nameKey)) return this.reject(`${field} 项目重复`, operation);
    const type = { skills: '技能', knowledge: '知识', professions: '职业' }[field];
    const learned = window.GameModules.progression?.learned?.(name, type, level, linkedStats, desc);
    if (!learned) return this.reject(`${field} 无法创建习得项目`, operation);
    learned.reason = operation.reason;
    list.push(learned);
    return this.accept(state, operation, learned);
  },

  applyScalar(state, operation) {
    const path = this.scalarPaths[operation.field];
    if (!path || operation.op !== 'set') return this.reject(`${operation.field} 不允许 ${operation.op} 操作`, operation);
    let value = operation.value;
    if (operation.field === 'socialDrive.agenda.needPlayer') value = Boolean(value);
    else if (operation.field === 'socialDrive.agenda.urgency') {
      if (!Number.isFinite(Number(value))) return this.reject('议程紧迫度必须是数字', operation);
      value = Math.max(0, Math.min(100, Number(value)));
    } else {
      value = this.text(value);
      if (!value) return this.reject(`${operation.field} 新值不能为空`, operation);
    }
    this.setPath(state, path, value);
    return this.accept(state, operation, value);
  },

  apply(store, raw = {}) {
    const operation = this.normalize(raw);
    if (!operation) return this.reject('操作缺少 subject、field、op 或 reason', raw);
    const state = this.resolveState(store, operation.subject);
    if (!state) return this.reject('找不到目标角色卡', operation);
    if (this.collectionFields.has(operation.field)) return this.applyCollection(state, operation);
    if (this.learnedFields.has(operation.field)) return this.applyLearned(state, operation);
    if (operation.field === 'socialDrive.familiarity') {
      if (operation.op !== 'delta' || !Number.isFinite(operation.delta) || operation.delta === 0) {
        return this.reject('socialDrive.familiarity 只允许有限非零 delta', operation);
      }
      state.profile = state.profile && typeof state.profile === 'object' ? state.profile : {};
      state.profile.socialDrive = state.profile.socialDrive && typeof state.profile.socialDrive === 'object' ? state.profile.socialDrive : {};
      const current = Number(state.profile.socialDrive.familiarity) || 0;
      state.profile.socialDrive.familiarity = Math.max(0, Math.min(100, current + operation.delta));
      return this.accept(state, operation, state.profile.socialDrive.familiarity);
    }
    return this.applyScalar(state, operation);
  },

  async applyMany(store, operations = []) {
    const results = (Array.isArray(operations) ? operations : []).map((operation) => this.apply(store, operation));
    return {
      results,
      applied: results.filter((result) => result.applied),
      rejected: results.filter((result) => !result.applied),
    };
  },
};
