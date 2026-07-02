window.GameModules = window.GameModules || {};

window.GameModules.realWorldVitals = {
  keys: ['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'],
  labels: { vitality: '生命力', stamina_pool: '精力', satiety: '饱食度', hydration: '水分', fatigue: '疲劳', mental_stability: '精神稳定' },

  normalize(value, elapsedSeconds = 300, action = '', target = 'player-self', fillMissing = true) {
    const list = Array.isArray(value) ? value : [];
    const targetText = String(target || 'player-self');
    const scoped = list.filter((item) => {
      const itemTarget = String(item?.target || item?.subject?.id || '').trim();
      return itemTarget ? itemTarget === targetText : fillMissing;
    });
    const byKey = new Map(scoped.map((item) => [String(item?.key || ''), item]));
    const pickedKeys = fillMissing ? this.keys : this.keys.filter((key) => byKey.has(key));
    return pickedKeys.map((key) => this.normalizeOne(key, byKey.get(key), elapsedSeconds, action, targetText));
  },

  normalizeOne(key, item, elapsedSeconds, action, target) {
    const source = item || this.fallback(key, elapsedSeconds, action);
    const delta = Math.max(-60, Math.min(60, Math.round(Number(source.delta) || 0)));
    const reason = String(source.reason || `${this.labels[key]}本次基本不变。`).slice(0, 120);
    return { key, delta, reason, target };
  },

  fallback(key, elapsedSeconds = 300, action = '') {
    const hours = Math.max(0, Number(elapsedSeconds) || 0) / 3600;
    const text = String(action || '现实行动');
    if (/睡|休息|躺|补觉/.test(text)) return this.restFallback(key, hours);
    if (/吃|饭|餐|外卖|食物/.test(text) && key === 'satiety') return { key, delta: 20, reason: '进食直接提高了饱食度。' };
    if (/喝|水|饮料|咖啡|奶茶/.test(text) && key === 'hydration') return { key, delta: 18, reason: '补充饮品提高了水分。' };
    if (key === 'vitality') return { key, delta: /受伤|摔|撞|流血|疼痛|疾病|损害|恢复|治疗|包扎/.test(text) ? (/恢复|治疗|包扎/.test(text) ? 3 : -3) : 0, reason: '本次行动对生命力没有明确额外影响。' };
    if (key === 'stamina_pool') return { key, delta: hours >= 0.5 ? -Math.min(12, Math.ceil(hours * 6)) : -1, reason: '现实行动和时间流逝消耗了精力。' };
    if (key === 'satiety') return { key, delta: hours >= 0.5 ? -Math.min(10, Math.ceil(hours * 3)) : 0, reason: '时间较短，饱食度变化有限。' };
    if (key === 'hydration') return { key, delta: hours >= 0.5 ? -Math.min(12, Math.ceil(hours * 4)) : 0, reason: '时间流逝带来少量水分消耗。' };
    if (key === 'fatigue') return { key, delta: hours >= 0.5 ? Math.min(14, Math.ceil(hours * 5)) : 1, reason: '持续行动带来疲劳累积。' };
    return { key, delta: /异常|害怕|恐惧|冲突|压力|慌/.test(text) ? -3 : 0, reason: '本次行动对精神稳定没有明显额外冲击。' };
  },

  restFallback(key, hours) {
    const rest = Math.max(1, Math.round(hours * 18));
    if (key === 'stamina_pool') return { key, delta: Math.min(45, rest), reason: '休息让体能逐步恢复。' };
    if (key === 'fatigue') return { key, delta: -Math.min(45, rest), reason: '休息降低了累积疲劳。' };
    if (key === 'mental_stability') return { key, delta: Math.min(12, Math.ceil(rest / 4)), reason: '休息让精神状态稍微稳定。' };
    return { key, delta: 0, reason: `${this.labels[key]}本次基本不变。` };
  },
};
