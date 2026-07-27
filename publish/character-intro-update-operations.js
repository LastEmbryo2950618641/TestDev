window.GameModules = window.GameModules || {};

window.GameModules.characterIntroUpdateOperations = {
  collectionFields: new Set(['persona.preferences', 'persona.attraction', 'routine.tags', 'memory.facts']),
  scalarPaths: {
    name: 'name',
    worldTag: 'worldTag',
    presenceKind: 'presenceKind',
    'identity.role': 'identity.role',
    'identity.age': 'identity.age',
    'identity.gender': 'identity.gender',
    'identity.job': 'identity.job',
    'identity.baseLocation': 'identity.baseLocation',
    'persona.appearance': 'persona.appearance',
    'persona.personality': 'persona.personality',
    'persona.background': 'persona.background',
    'persona.voice': 'persona.voice',
    'social.relationToPlayer': 'social.relationToPlayer',
    'social.relationDetail': 'social.relationDetail',
    'agenda.short': 'agenda.short',
    'agenda.deadline': 'agenda.deadline',
    'agenda.needPlayer': 'agenda.needPlayer',
    'agenda.needPlayerWhy': 'agenda.needPlayerWhy',
    'agenda.urgency': 'agenda.urgency',
  },

  text(value = '') {
    return String(value ?? '').trim();
  },

  clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  },

  clamp100(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  },

  reject(reason = '操作无效', operation = null) {
    return { applied: false, rejected: true, reason, operation };
  },

  normalize(raw = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const subjectRaw = raw.subject;
    const subject = subjectRaw && typeof subjectRaw === 'object'
      ? { id: this.text(subjectRaw.id), name: this.text(subjectRaw.name) }
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

  resolveCard(operation = {}) {
    const introStore = window.GameModules.characterIntroStore;
    return (operation.subject?.id && introStore?.getById?.(operation.subject.id))
      || (operation.subject?.name && introStore?.get?.(operation.subject.name))
      || null;
  },

  setPath(root, path, value) {
    const parts = String(path || '').split('.').filter(Boolean);
    let cursor = root;
    for (const part of parts.slice(0, -1)) {
      if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {};
      cursor = cursor[part];
    }
    cursor[parts.at(-1)] = value;
  },

  valueAt(root, path) {
    return String(path || '').split('.').filter(Boolean).reduce((value, part) => value?.[part], root);
  },

  async save(card, store = null) {
    const normalized = window.GameModules.characterIntroStore?.normalize?.(card, store, 'update')
      || window.GameModules.characterIntroCard?.normalize?.(card, store, 'update');
    if (!normalized) return null;
    return await window.GameModules.characterIntroStore?.save?.(normalized) || normalized;
  },

  async accept(card, operation, store = null, value = null) {
    const saved = await this.save(card, store);
    if (!saved) return this.reject('介绍卡保存失败', operation);
    return { applied: true, rejected: false, reason: operation.reason, operation, card: saved, value };
  },

  async applyScalar(store, card, operation) {
    if (operation.op !== 'set') return this.reject(`${operation.field} 只允许 set 操作`, operation);
    let value = operation.value;
    if (operation.field === 'agenda.needPlayer') value = Boolean(value);
    else if (operation.field === 'agenda.urgency') {
      if (!Number.isFinite(Number(value))) return this.reject('agenda.urgency 必须是数字', operation);
      value = Math.max(0, Math.min(1, Number(value)));
    } else {
      value = this.text(value);
      if (!value) return this.reject(`${operation.field} 新值不能为空`, operation);
      if (operation.field === 'presenceKind' && !['individual', 'group'].includes(value)) {
        return this.reject('presenceKind 只能是 individual 或 group', operation);
      }
    }
    this.setPath(card, this.scalarPaths[operation.field], value);
    if (operation.field === 'identity.role') card.role = value;
    if (operation.field === 'persona.background') card.intro = value;
    if (operation.field === 'worldTag') card.work = value;
    return this.accept(card, operation, store, value);
  },

  async applyCollection(store, card, operation) {
    if (!['add', 'replace', 'delete'].includes(operation.op)) {
      return this.reject(`${operation.field} 只允许 add、replace 或 delete`, operation);
    }
    const list = this.valueAt(card, operation.field);
    if (!Array.isArray(list)) return this.reject(`${operation.field} 不是有效集合`, operation);
    if (operation.op === 'add') {
      const value = this.text(operation.value);
      if (!value) return this.reject(`${operation.field} 新项目不能为空`, operation);
      if (list.some((item) => this.text(item) === value)) return this.reject(`${operation.field} 项目重复`, operation);
      list.push(value);
      return this.accept(card, operation, store, value);
    }
    const target = this.text(operation.target);
    if (!target) return this.reject(`${operation.field} ${operation.op} 缺少精确 target`, operation);
    const index = list.findIndex((item) => this.text(item) === target);
    if (index < 0) return this.reject(`${operation.field} 找不到指定 target`, operation);
    if (operation.op === 'delete') {
      const removed = list.splice(index, 1)[0];
      return this.accept(card, operation, store, removed);
    }
    const value = this.text(operation.value);
    if (!value) return this.reject(`${operation.field} 替换值不能为空`, operation);
    if (list.some((item, itemIndex) => itemIndex !== index && this.text(item) === value)) {
      return this.reject(`${operation.field} 替换后项目重复`, operation);
    }
    list.splice(index, 1, value);
    return this.accept(card, operation, store, value);
  },

  async applyDelta(store, card, operation) {
    if (operation.op !== 'delta' || !Number.isFinite(operation.delta) || operation.delta === 0) {
      return this.reject(`${operation.field} 只允许有限非零 delta`, operation);
    }
    const current = Number(this.valueAt(card, operation.field)) || 0;
    const value = this.clamp100(current + operation.delta);
    this.setPath(card, operation.field, value);
    return this.accept(card, operation, store, value);
  },

  async apply(store, raw = {}) {
    const operation = this.normalize(raw);
    if (!operation) return this.reject('操作缺少 subject、field、op 或 reason', raw);
    const current = this.resolveCard(operation);
    if (!current) return this.reject('找不到目标介绍卡', operation);
    const card = this.clone(current);
    if (this.scalarPaths[operation.field]) return this.applyScalar(store, card, operation);
    if (this.collectionFields.has(operation.field)) return this.applyCollection(store, card, operation);
    if (['social.affection', 'social.familiarity'].includes(operation.field)) return this.applyDelta(store, card, operation);
    return this.reject(`${operation.field} 不允许由介绍卡 AI 更新`, operation);
  },

  async applyMany(store, operations = []) {
    const results = [];
    for (const operation of Array.isArray(operations) ? operations : []) {
      results.push(await this.apply(store, operation));
    }
    return {
      results,
      applied: results.filter((result) => result.applied),
      rejected: results.filter((result) => !result.applied),
    };
  },

  async syncRoleToIntro(roleState = null, introCard = null, store = null) {
    if (!roleState) return null;
    const profile = roleState.profile || {};
    const id = this.text(roleState.id || profile.id);
    const introStore = window.GameModules.characterIntroStore;
    const current = introCard
      || (id && introStore?.getById?.(id))
      || (profile.name && introStore?.get?.(profile.name, profile.worldTag || roleState.worldTag || ''))
      || {};
    const drive = profile.socialDrive || {};
    const currentSocial = current.social || {};
    const currentAgenda = current.agenda || {};
    const agenda = drive.agenda || {};
    const next = {
      ...this.clone(current),
      id: id || current.id,
      name: profile.name || roleState.name || current.name,
      worldTag: profile.worldTag || roleState.worldTag || current.worldTag,
      presenceKind: current.presenceKind || 'individual',
      identity: {
        ...(current.identity || {}),
        role: profile.role || current.identity?.role || '',
        age: profile.age === undefined || profile.age === null ? (current.identity?.age || '') : String(profile.age),
        gender: profile.gender || current.identity?.gender || '',
        job: profile.job || current.identity?.job || '',
        baseLocation: window.GameModules.currentLocationField?.mapNodeName?.(profile.currentLocation || '') || current.identity?.baseLocation || '',
      },
      persona: {
        ...(current.persona || {}),
        appearance: profile.appearance || current.persona?.appearance || '',
        personality: profile.personality || current.persona?.personality || '',
        background: profile.detail || current.persona?.background || '',
        preferences: profile.preferences ? [profile.preferences] : (current.persona?.preferences || []),
      },
      social: {
        ...currentSocial,
        relationToPlayer: drive.relationToPlayer || '',
        relationDetail: drive.relationDetail || '',
        affection: this.clamp100(roleState.metrics?.playerFeelings?.['好感']),
        familiarity: this.clamp100(drive.familiarity),
      },
      agenda: {
        ...currentAgenda,
        short: agenda.short || '',
        deadline: agenda.deadline || '',
        needPlayer: Boolean(agenda.needPlayer),
        needPlayerWhy: agenda.needPlayerWhy || '',
        urgency: Number.isFinite(Number(agenda.urgency)) ? Number(agenda.urgency) : 0,
      },
      links: {
        ...(current.links || {}),
        scheduleId: current.links?.scheduleId || id,
        roleCardId: id || current.links?.roleCardId || '',
      },
      meta: {
        ...(current.meta || {}),
        source: current.meta?.source || 'role-sync',
        solidifyStatus: 'solidified',
      },
      role: profile.role || current.role || '',
      intro: profile.detail || current.intro || '',
      work: profile.worldTag || roleState.worldTag || current.work || '',
    };
    return this.save(next, store);
  },

  async syncIntroToRole(introCard = null, roleState = null) {
    if (!introCard || !roleState) return roleState;
    roleState.profile = roleState.profile && typeof roleState.profile === 'object' ? roleState.profile : {};
    roleState.metrics = roleState.metrics && typeof roleState.metrics === 'object' ? roleState.metrics : {};
    roleState.metrics.playerFeelings = roleState.metrics.playerFeelings && typeof roleState.metrics.playerFeelings === 'object'
      ? roleState.metrics.playerFeelings
      : {};
    roleState.metrics.playerFeelings['好感'] = this.clamp100(introCard.social?.affection);
    const previousDrive = roleState.profile.socialDrive || {};
    const social = introCard.social || {};
    const agenda = introCard.agenda || {};
    roleState.profile.socialDrive = {
      ...previousDrive,
      relationToPlayer: this.text(social.relationToPlayer),
      relationDetail: this.text(social.relationDetail),
      familiarity: this.clamp100(social.familiarity),
      lastContactAt: this.text(social.lastContactAt),
      lastContactChannel: this.text(social.lastContactChannel) || 'none',
      reach: Array.isArray(social.reach) ? this.clone(social.reach) : [],
      agenda: {
        ...(previousDrive.agenda || {}),
        short: this.text(agenda.short),
        deadline: this.text(agenda.deadline),
        needPlayer: Boolean(agenda.needPlayer),
        needPlayerWhy: this.text(agenda.needPlayerWhy),
        urgency: Number.isFinite(Number(agenda.urgency)) ? Number(agenda.urgency) : 0,
        cooldownUntil: this.text(agenda.cooldownUntil),
      },
    };
    await window.GameModules.characterStateStore?.save?.(roleState);
    return roleState;
  },
};
