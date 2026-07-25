window.GameModules = window.GameModules || {};

/**
 * 角色卡长期目标系统：短期/中期/长期目标（内容、期限、进度%）+ 阶段成果。
 * 存于 profile.goalSystem；驱动推演行为与完成度展示。
 */
window.GameModules.characterGoalSystem = {
  TIER_KEYS: ['short', 'medium', 'long'],
  TIER_LABELS: { short: '短期目标', medium: '中期目标', long: '长期目标' },

  emptyTier() {
    return { content: '', deadline: '', progress: 0, detail: '' };
  },

  empty() {
    return {
      short: this.emptyTier(),
      medium: this.emptyTier(),
      long: this.emptyTier(),
      achievements: [],
    };
  },

  clampProgress(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  },

  normalizeDeadline(raw = '') {
    const text = String(raw || '').trim();
    if (!text) return '';
    const m = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) {
      const y = m[1];
      const mo = String(Number(m[2])).padStart(2, '0');
      const d = String(Number(m[3])).padStart(2, '0');
      return `${y}-${mo}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    return text.slice(0, 32);
  },

  normalizeTier(raw = {}) {
    if (typeof raw === 'string') {
      const content = String(raw || '').trim().slice(0, 400);
      return { ...this.emptyTier(), content };
    }
    const src = raw && typeof raw === 'object' ? raw : {};
    const content = String(src.content || src.description || src.text || src.goal || '').trim().slice(0, 400);
    const detail = String(src.detail || src.progressText || src.progressDesc || src.descriptionNote || '').trim().slice(0, 400);
    let progress = src.progress;
    if (typeof progress === 'string' && /%/.test(progress)) progress = progress.replace(/%/g, '');
    return {
      content,
      deadline: this.normalizeDeadline(src.deadline || src.due || src.completeBy || src.期限 || ''),
      progress: this.clampProgress(progress),
      detail,
    };
  },

  normalizeAchievement(raw = {}, index = 0) {
    if (typeof raw === 'string') {
      const text = String(raw || '').trim().slice(0, 300);
      if (!text) return null;
      return { id: `ach-${index + 1}`, text, at: '' };
    }
    const text = String(raw?.text || raw?.title || raw?.content || raw?.achievement || '').trim().slice(0, 300);
    if (!text) return null;
    return {
      id: String(raw?.id || `ach-${index + 1}`).trim().slice(0, 64),
      text,
      at: String(raw?.at || raw?.completedAt || '').trim().slice(0, 40),
    };
  },

  normalize(raw = null) {
    const base = this.empty();
    if (!raw) return base;
    if (typeof raw === 'string') {
      base.short = this.normalizeTier(raw);
      return base;
    }
    const src = typeof raw === 'object' ? raw : {};
    this.TIER_KEYS.forEach((key) => {
      const alias = {
        short: src.short || src.shortTerm || src.短期 || src.短期目标,
        medium: src.medium || src.mediumTerm || src.中期 || src.中期目标,
        long: src.long || src.longTerm || src.长期 || src.长期目标,
      }[key];
      base[key] = this.normalizeTier(alias || {});
    });
    const achievements = Array.isArray(src.achievements)
      ? src.achievements
      : (Array.isArray(src.阶段成果) ? src.阶段成果 : []);
    base.achievements = achievements
      .map((item, index) => this.normalizeAchievement(item, index))
      .filter(Boolean)
      .slice(0, 40);
    return base;
  },

  hasContent(raw = null) {
    const data = this.normalize(raw);
    return this.TIER_KEYS.some((key) => Boolean(data[key]?.content))
      || (data.achievements || []).length > 0;
  },

  fromAspirationGoals(goals = {}) {
    const src = goals && typeof goals === 'object' ? goals : {};
    if (src.short?.content || src.medium?.content || src.long?.content || Array.isArray(src.achievements)) {
      return this.normalize(src);
    }
    const next = this.empty();
    this.TIER_KEYS.forEach((key) => {
      next[key] = this.normalizeTier(src[key] || '');
    });
    if (Array.isArray(src.achievements)) {
      next.achievements = src.achievements
        .map((item, index) => this.normalizeAchievement(item, index))
        .filter(Boolean);
    }
    return next;
  },

  parseLegacyGoalBundle(text = '') {
    const source = String(text || '');
    if (!source.trim()) return this.empty();
    const pick = (...labels) => {
      const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const match = source.match(new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:目标方向|目标摘要|近期方向|中期方向|长期方向|近期目标|中期目标|长期目标|短期目标)\\s*[：:]|$)`, 'u'));
      return String(match?.[1] || '').trim();
    };
    return this.normalize({
      short: pick('短期目标', '近期目标'),
      medium: pick('中期目标'),
      long: pick('长期目标'),
      summary: pick('目标摘要'),
    });
  },

  seedFromSources(profile = null, sources = []) {
    if (!profile || typeof profile !== 'object') return this.empty();
    const assignIfChanged = (next) => {
      const normalized = this.normalize(next);
      try {
        if (JSON.stringify(profile.goalSystem || null) === JSON.stringify(normalized)) return normalized;
      } catch (_) { /* ignore */ }
      profile.goalSystem = normalized;
      return normalized;
    };
    let current = this.normalize(profile.goalSystem || null);
    if (this.hasContent(current)) return assignIfChanged(current);
    for (const source of (Array.isArray(sources) ? sources : [])) {
      if (!source) continue;
      if (typeof source === 'string') {
        const parsed = this.parseLegacyGoalBundle(source);
        if (this.hasContent(parsed)) return assignIfChanged(parsed);
        continue;
      }
      const fromGoals = this.fromAspirationGoals(source.goals || source.goalSystem || source);
      if (this.hasContent(fromGoals)) return assignIfChanged(fromGoals);
      const bundle = String(source.goalSummary || source.summary || '').trim();
      if (bundle) {
        const parsed = this.parseLegacyGoalBundle(bundle);
        if (this.hasContent(parsed)) return assignIfChanged(parsed);
      }
    }
    const legacy = profile.lifeOrientation?.goals || {};
    const seeded = this.fromAspirationGoals(legacy);
    if (this.hasContent(seeded)) return assignIfChanged(seeded);
    const legacyBundle = String(profile.lifeOrientation?.goalSummary || '').trim();
    if (legacyBundle) {
      const parsed = this.parseLegacyGoalBundle(legacyBundle);
      if (this.hasContent(parsed)) return assignIfChanged(parsed);
    }
    // Do not write empty goalSystem onto profile during render — avoids Alpine update loops.
    return current;
  },

  ensureOnProfile(profile = null, fallbackSources = []) {
    if (!profile || typeof profile !== 'object') return this.empty();
    return this.seedFromSources(profile, fallbackSources);
  },

  formatTierLine(tier = {}, label = '') {
    const data = this.normalizeTier(tier);
    if (!data.content && !data.detail && !data.deadline && !data.progress) return '';
    const parts = [
      label ? `${label}：${data.content || '（未填写）'}` : (data.content || '（未填写）'),
      data.deadline ? `完成期限：${data.deadline}` : '',
      `当前进度：${data.progress}%${data.detail ? `（${data.detail}）` : ''}`,
    ].filter(Boolean);
    return parts.join('\n');
  },

  formatText(raw = null) {
    const data = this.normalize(raw);
    const lines = [
      '【目标内容】',
      this.formatTierLine(data.short, '短期目标') || '短期目标：（未填写）',
      '',
      this.formatTierLine(data.medium, '中期目标') || '中期目标：（未填写）',
      '',
      this.formatTierLine(data.long, '长期目标') || '长期目标：（未填写）',
      '',
      '【阶段成果】',
    ];
    if (data.achievements.length) {
      data.achievements.forEach((item, index) => {
        lines.push(`成果${index + 1}：${item.text}`);
      });
    } else {
      lines.push('（暂无）');
    }
    return lines.join('\n');
  },

  formatContextBlock(raw = null, characterName = '') {
    const text = this.formatText(raw);
    const name = String(characterName || '').trim();
    return name ? `角色长期目标系统（${name}）：\n${text}` : `角色长期目标系统：\n${text}`;
  },

  lexiconFields(goalSystem = null, options = {}) {
    const data = this.normalize(goalSystem);
    const worldTag = options.worldTag || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const targetId = options.targetId || 'player-self';
    const rowBase = (key, label, value, desc, extra = {}) => ({
      key: `id-${targetId}-goal-${key}`,
      stateId: targetId,
      label,
      kind: '角色卡',
      value: value || '未记录',
      raw: value || '',
      desc,
      worldTag,
      targetType: '角色',
      commonField: true,
      profileGroup: '长期目标',
      ...extra,
    });
    const fields = this.TIER_KEYS.map((key) => {
      const tier = data[key];
      const text = this.formatTierLine(tier) || '未记录';
      return rowBase(key, this.TIER_LABELS[key], text, `${this.TIER_LABELS[key]}：内容、完成期限与当前进度。`, {
        goalsRole: key,
        goalTier: tier,
      });
    });
    const achText = data.achievements.length
      ? data.achievements.map((item, index) => `成果${index + 1}：${item.text}`).join('\n')
      : '未记录';
    fields.push(rowBase('achievements', '阶段成果', achText, '已完成的阶段性成果列表。', {
      goalsRole: 'achievements',
      goalAchievements: data.achievements,
    }));
    return fields;
  },

  mergeTier(current = {}, patch = {}) {
    const base = this.normalizeTier(current);
    const src = patch && typeof patch === 'object' ? patch : {};
    const next = { ...base };
    if (src.content !== undefined || src.description !== undefined || src.text !== undefined || src.goal !== undefined) {
      next.content = String(src.content || src.description || src.text || src.goal || '').trim().slice(0, 400);
    }
    if (src.deadline !== undefined || src.due !== undefined || src.completeBy !== undefined || src.期限 !== undefined) {
      next.deadline = this.normalizeDeadline(src.deadline || src.due || src.completeBy || src.期限 || '');
    }
    if (src.progress !== undefined) next.progress = this.clampProgress(src.progress);
    if (src.detail !== undefined || src.progressText !== undefined || src.progressDesc !== undefined) {
      next.detail = String(src.detail || src.progressText || src.progressDesc || '').trim().slice(0, 400);
    }
    return next;
  },

  applyToProfile(profile = null, patch = {}) {
    if (!profile || typeof profile !== 'object') return false;
    const current = this.ensureOnProfile(profile);
    const next = this.normalize(current);
    let changed = false;
    const src = patch && typeof patch === 'object' ? patch : {};

    this.TIER_KEYS.forEach((key) => {
      const tierPatch = src[key] || src[this.TIER_LABELS[key]] || null;
      if (!tierPatch || typeof tierPatch !== 'object') return;
      const merged = this.mergeTier(next[key], tierPatch);
      if (JSON.stringify(merged) !== JSON.stringify(next[key])) {
        next[key] = merged;
        changed = true;
      }
    });

    const appendAchievements = [];
    if (Array.isArray(src.achievements)) appendAchievements.push(...src.achievements);
    if (src.achievement) appendAchievements.push(src.achievement);
    if (src.阶段成果) {
      if (Array.isArray(src.阶段成果)) appendAchievements.push(...src.阶段成果);
      else appendAchievements.push(src.阶段成果);
    }
    if (appendAchievements.length) {
      const existing = new Set(next.achievements.map((item) => item.text));
      appendAchievements.forEach((item) => {
        const row = this.normalizeAchievement(item, next.achievements.length);
        if (!row || existing.has(row.text)) return;
        if (!row.at) row.at = new Date().toISOString();
        next.achievements.push(row);
        existing.add(row.text);
        changed = true;
      });
      next.achievements = next.achievements.slice(0, 40);
    }

    if (src.replaceAchievements && Array.isArray(src.replaceAchievements)) {
      next.achievements = src.replaceAchievements
        .map((item, index) => this.normalizeAchievement(item, index))
        .filter(Boolean)
        .slice(0, 40);
      changed = true;
    }

    if (!changed) return false;
    profile.goalSystem = next;
    profile.roleCardUpdatedAt = new Date().toISOString();
    return true;
  },

  resolveTierFromEntry(entry = {}) {
    const out = {};
    const tierAlias = {
      short: ['short', 'shortTerm', '短期', '短期目标', '近期', '近期目标'],
      medium: ['medium', 'mediumTerm', '中期', '中期目标'],
      long: ['long', 'longTerm', '长期', '长期目标'],
    };
    const tierKey = String(entry.tier || entry.goalTier || entry.horizon || '').trim().toLowerCase();
    const mapped = ({ short: 'short', medium: 'medium', long: 'long', '短期': 'short', '中期': 'medium', '长期': 'long', '近期': 'short' })[tierKey]
      || ({ short: 'short', medium: 'medium', long: 'long' })[tierKey];
    if (mapped && (entry.content || entry.deadline || entry.progress !== undefined || entry.detail)) {
      out[mapped] = {
        content: entry.content,
        deadline: entry.deadline,
        progress: entry.progress,
        detail: entry.detail || entry.progressText || entry.progressDesc,
      };
    }
    this.TIER_KEYS.forEach((key) => {
      for (const alias of tierAlias[key]) {
        if (entry[alias] && typeof entry[alias] === 'object') {
          out[key] = entry[alias];
          break;
        }
      }
    });
    return out;
  },
};
