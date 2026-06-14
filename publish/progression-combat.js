window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.progression, {
  derived(values) {
    const skillBonus = (values.skills || []).reduce((sum, skill) => sum + Math.max(0, Number(skill.level) || 0) * 2, 0);
    const attackPower = Math.round(values.level * 4 + values.strength * 8 + skillBonus);
    const defensePower = Math.round(values.level * 3 + values.constitution * 8 + Math.floor((values.willpower || 0) / 2));
    return { attackPower, defensePower, damageRuleNote: '攻击力=等级+力量+技能；防御力=等级+体质+意志修正。' };
  },

  defaultCombat(values) {
    const d = this.derived(values);
    return { summary: '尚未发生战斗，显示当前攻防预估。', attackPower: d.attackPower, defensePower: d.defensePower, effectiveDamage: 0 };
  },

  ensureProgressionNotes(values) {
    values.exp.curve = 'nextExp=round(100*level^1.65)';
    for (const item of [...(values.factions || []), ...(values.force_positions || []), ...(values.equipment || []), ...(values.items || []), ...(values.wearing || []), ...(values.status_tags || [])]) {
      if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'level')) item.level = -1;
    }
    for (const item of [...(values.knowledge || []), ...(values.skills || []), ...(values.professions || [])]) {
      item.description = this.learnedDefinition(item.name, item.type, item.description || item.source);
      item.source = item.description;
      if (!this.hasLearnedLevel(item)) {
        item.level = -1;
        delete item.exp;
        delete item.levelDescription;
        delete item.effect;
        continue;
      }
      const lv = this.clamp(item.level || 1, 1, 7);
      item.level = lv;
      item.exp = item.exp || { current: 0, next: this.learnedNext[lv] };
      item.levelDescription = item.levelDescription || this.levelDescription(item.type, lv);
      item.effect = item.effect || this.levelEffect(item.name, item.type, lv);
      item.exp.curve = 'lv1-7:100/250/600/1400/3200/7200/max';
    }
  },

  applySceneChanges(state, changes = {}, result = {}) {
    this.ensureStateMechanics(state);
    const v = state.values;
    this.addExp(v, 12 + (result.combatEvent ? 12 : 0), state.profile || {});
    if (Number.isFinite(changes.stamina)) this.deltaPool(v.stamina_pool, changes.stamina);
    if (Number.isFinite(changes.mental_stability)) this.deltaPool(v.mental_stability, changes.mental_stability);
    if (Number.isFinite(changes.health)) this.applyVitalityChange(v, changes.health, result.combatEvent);
    v.fatigue.current = this.clamp(v.fatigue.current + Math.max(0, -(changes.stamina || 0)), 0, v.fatigue.max);
    this.advanceLearned(v, result);
    v.derived = this.derived(v);
    this.ensureProgressionNotes(v);
    v.health = this.percent(v.vitality);
    v.stamina = this.percent(v.stamina_pool);
  },

  deltaPool(pool, percentDelta) {
    pool.current = this.clamp(pool.current + pool.max * percentDelta / 100, 0, pool.max);
  },

  advanceLearned(values, result) {
    const quality = result.combatEvent ? 1.4 : 1;
    const gain = Math.round(8 * (0.5 + (values.learning_ability || 50) / 100) * quality);
    for (const item of [...(values.knowledge || []).slice(0, 1), ...(values.skills || []).slice(0, 2)]) this.addLearnedExp(item, gain);
    for (const job of (values.professions || []).slice(0, 1)) this.addLearnedExp(job, Math.round(gain / 2));
  },

  addLearnedExp(item, amount) {
    if (!item || !this.hasLearnedLevel(item) || item.level >= 7) return;
    item.exp = item.exp || { current: 0, next: this.learnedNext[item.level || 1] };
    item.exp.current += amount;
    while (item.level < 7 && item.exp.current >= item.exp.next) {
      item.exp.current -= item.exp.next;
      item.level += 1;
      item.exp.next = this.learnedNext[item.level];
    }
  },

  applyVitalityChange(values, percentDelta, event) {
    if (percentDelta >= 0) { this.deltaPool(values.vitality, percentDelta); return; }
    const before = values.vitality.current;
    const baseDamage = Math.max(1, Math.round(values.vitality.max * Math.abs(percentDelta) / 100));
    const derived = this.derived(values);
    const attackPower = Math.max(1, Number(event?.attackPower) || derived.defensePower + baseDamage);
    const defensePower = Math.max(0, Number(event?.defensePower) || derived.defensePower);
    const effectiveDamage = Math.max(1, Number(event?.effectiveDamage) || Math.min(baseDamage, Math.max(1, attackPower - defensePower)));
    values.vitality.current = this.clamp(before - effectiveDamage, 0, values.vitality.max);
    values.combat_simulation = { summary: event?.summary || '外部威胁命中，生命力按攻防差扣减。', attackPower, defensePower, effectiveDamage, vitalityBefore: before, vitalityAfter: values.vitality.current };
  },

  addExp(values, amount, character = {}) {
    values.exp.current += Math.max(0, Math.round(amount));
    while (values.level < 100 && values.exp.current >= values.exp.next) {
      values.exp.current -= values.exp.next;
      this.applyLevelUp(values, character);
    }
  },

  applyLevelUp(values, character = {}) {
    const before = values.level;
    values.level += 1;
    values.exp.next = this.nextCharacterExp(values.level);
    this.ensureIntrinsicSources(values);
    const applied = this.applyAutoIntrinsicGrowth(values, character, 2, 'level');
    values.free_attribute_points = Math.max(0, Number(values.free_attribute_points) || 0) + 1;
    values.level_growth = values.level_growth || { totalLevelUps: 0, autoPointsPerLevel: 2, freePointsPerLevel: 1, history: [] };
    values.level_growth.totalLevelUps += 1;
    values.level_growth.history = [{ from: before, to: values.level, auto: applied, free: 1, at: new Date().toISOString() }, ...(values.level_growth.history || [])].slice(0, 10);
    this.recalculatePools(values, true, character);
  },

  applyAutoIntrinsicGrowth(values, character, points, bucket = 'level') {
    const keys = this.intrinsicKeys();
    const weights = this.growthWeights(character, values);
    const applied = {};
    for (let i = 0; i < points; i += 1) {
      const key = keys.filter((x) => values[x] < 100).sort((a, b) => (weights[b] - values[b] / 50) - (weights[a] - values[a] / 50))[0];
      if (!key) break;
      values[key] = this.clamp(values[key] + 1, 1, 100);
      values.intrinsic_sources[key][bucket] = (values.intrinsic_sources[key][bucket] || 0) + 1;
      applied[key] = (applied[key] || 0) + 1;
      weights[key] *= 0.72;
    }
    return applied;
  },

  growthWeights(character = {}, values = {}) {
    const text = `${character.role || ''}${character.job || ''}${character.detail || ''}${character.personality || ''}`;
    const w = { strength: 1, agility: 1, constitution: 1, intelligence: 1, perception: 1, willpower: 1, charisma: 1 };
    const add = (list, n) => list.forEach((k) => { w[k] += n; });
    if (/战|武|剑|骑士|士兵|军人|运动|拳|枪/.test(text)) add(['strength', 'agility', 'constitution'], 3);
    if (/学生|学者|医生|教师|魔术|研究|技术|工程/.test(text)) add(['intelligence', 'perception', 'willpower'], 3);
    if (/领袖|偶像|贵族|王|交涉|销售|主播|演员/.test(text)) add(['charisma', 'willpower', 'perception'], 3);
    for (const item of [...(values.skills || []), ...(values.knowledge || []), ...(values.professions || [])]) add((item.linkedStats || []).filter((k) => w[k] !== undefined), 1.2);
    return w;
  },
});
