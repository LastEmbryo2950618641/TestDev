window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.progression, {
  derived(values) {
    const skillBonus = (values.skills || []).reduce((sum, skill) => sum + (skill.level || 0) * 2, 0);
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
    for (const item of [...(values.knowledge || []), ...(values.skills || []), ...(values.professions || [])]) {
      item.exp = item.exp || { current: 0, next: this.learnedNext[item.level || 1] };
      item.exp.curve = 'lv1-7:100/250/600/1400/3200/7200/max';
    }
  },

  applySceneChanges(state, changes = {}, result = {}) {
    this.ensureStateMechanics(state);
    const v = state.values;
    this.addExp(v, 12 + (result.combatEvent ? 12 : 0));
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
    if (!item || item.level >= 7) return;
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

  addExp(values, amount) {
    values.exp.current += Math.max(0, Math.round(amount));
    while (values.level < 100 && values.exp.current >= values.exp.next) {
      values.exp.current -= values.exp.next;
      values.level += 1;
      values.exp.next = this.nextCharacterExp(values.level);
      this.recalculatePools(values, true);
    }
  },
});
