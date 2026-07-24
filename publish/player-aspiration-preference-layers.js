window.GameModules = window.GameModules || {};

window.GameModules.playerAspirationPreferenceLayers = {
  layerMeta: [
    { key: 'layer1', label: '价值立场偏好', prefix: '价值立场偏好' },
    { key: 'layer2', label: '决策风格偏好', prefix: '决策风格偏好' },
    { key: 'layer3', label: '人生六维偏好', prefix: '人生六维偏好' },
    { key: 'layer4', label: '底线锚点偏好', prefix: '底线锚点偏好' },
    { key: 'layer5', label: '心理偏好', prefix: '心理偏好' },
  ],

  layerLabel(key) {
    return this.layerMeta.find((item) => item.key === key)?.label || key;
  },

  ensurePrefix(prefix, value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.startsWith(prefix) ? text : `${prefix}: ${text.replace(/^[^:]+:\s*/, '')}`;
  },

  formatLayer1(alignmentLabel = '') {
    const label = String(alignmentLabel || '').trim() || '未设定';
    return `价值立场偏好: ${label}`;
  },

  formatLayer2(rationality = 50, rationalityLabel = '') {
    const num = Number(rationality);
    const value = Number.isFinite(num) ? num : 50;
    const lean = String(rationalityLabel || '').trim() || (value <= 35 ? '偏理性' : value >= 65 ? '偏感性' : '理性感性居中');
    return `决策风格偏好: ${lean},${value}`;
  },

  formatLayer3(axes = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const parts = (cfg?.axes || []).map((axis) => {
      const raw = Number(axes?.[axis.key]);
      const value = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;
      const lean = cfg.axisLeanText(value, axis);
      return `${axis.leftTag}/${axis.rightTag}${lean}${value}`;
    });
    return `人生六维偏好: ${parts.join(',')}`;
  },

  formatLayer4(guiltAxes = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const parts = (cfg?.guiltLines || []).map((item) => {
      const raw = Number(guiltAxes?.[item.id]);
      const value = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;
      const lean = cfg.guiltLeanText(value, item);
      return `${item.category}·${item.theme}${lean}${value}`;
    });
    return `底线锚点偏好: ${parts.join(',')}`;
  },

  formatLayer5(psychPreferences = null) {
    const cfg = window.GameModules.playerAspirationConfig;
    const psych = psychPreferences || cfg?.defaultPsychPreferences?.() || { selected: {} };
    const groups = [];
    const categories = cfg?.psychPreferenceCategories || [];
    if (categories.length && cfg?.psychCategoryGroups) {
      categories.forEach((category) => {
        cfg.psychCategoryGroups(category).forEach((group) => {
          let tags = psych.selected?.[group.id];
          if (!Array.isArray(tags) || !tags.length) {
            const legacy = [];
            ['normal', 'acg'].forEach((laneId) => {
              const old = psych.selected?.[`${laneId}:${group.id}`];
              if (Array.isArray(old)) legacy.push(...old);
            });
            tags = [...new Set(legacy)];
          }
          if (tags.length) groups.push(`${group.label}:${tags.join(',')}`);
        });
      });
    } else if (psych?.selected && typeof psych.selected === 'object') {
      Object.entries(psych.selected).forEach(([key, tags]) => {
        if (!Array.isArray(tags) || !tags.length) return;
        if (String(key).includes(':')) return;
        groups.push(`${key}:${tags.join(',')}`);
      });
    }
    return groups.length ? `心理偏好: ${groups.join('; ')}` : '心理偏好: 未勾选';
  },

  buildFromAspirationDraft(draft = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const alignment = cfg?.alignmentById?.(draft.alignment);
    const rationality = draft.rationality ?? 50;
    const rationalityLabel = draft.rationalityLabel
      || (rationality <= 35 ? '偏理性' : rationality >= 65 ? '偏感性' : '理性感性居中');
    return this.normalizeLayers({
      layer1: this.formatLayer1(alignment?.label || draft.alignmentLabel || draft.alignment),
      layer2: this.formatLayer2(rationality, rationalityLabel),
      layer3: this.formatLayer3(draft.axes || cfg?.defaultAxes?.()),
      layer4: this.formatLayer4(draft.guiltAxes || cfg?.defaultGuiltAxes?.()),
      layer5: this.formatLayer5(draft.psychPreferences),
    });
  },

  buildFromPlayerAspiration(data = {}) {
    if (!data || !data.alignment) return null;
    const cfg = window.GameModules.playerAspirationConfig;
    const rationality = data.rationality ?? 50;
    return this.normalizeLayers({
      layer1: this.formatLayer1(data.alignmentLabel || cfg?.alignmentById?.(data.alignment)?.label || data.alignment),
      layer2: this.formatLayer2(rationality, data.rationalityLabel),
      layer3: this.formatLayer3(data.axes || cfg?.defaultAxes?.()),
      layer4: this.formatLayer4(data.guiltAxes || cfg?.defaultGuiltAxes?.()),
      layer5: this.formatLayer5(data.psychPreferences),
    });
  },

  normalizeLayers(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    this.layerMeta.forEach(({ key, prefix }) => {
      out[key] = this.ensurePrefix(prefix, source[key] || source[prefix] || '');
    });
    return out;
  },

  toLines(layers = {}) {
    return this.layerMeta.map(({ key }) => String(layers[key] || '').trim()).filter(Boolean);
  },

  summaryText(layers = {}) {
    return this.toLines(layers).join('\n');
  },

  lexiconRows(layers = {}, worldTag = '', targetType = '角色') {
    const row = window.GameModules.playerProfileLexicon?.row;
    if (!row) return [];
    return this.toLines(layers).map((line) => {
      const label = line.split(':')[0]?.trim() || '本质偏好';
      return {
        ...row(label, line, '角色本质偏好层，固化后不可被推演修改；行为与情绪变化须与此一致并有迹可循。', worldTag),
        kind: targetType === '非角色' ? '玩家设定' : '角色卡',
        targetType,
        profileGroup: '本质偏好',
        immutable: true,
      };
    });
  },

  isImmutableFieldName(name = '') {
    const text = String(name || '').trim();
    if (!text) return false;
    if (/^layer[1-5]$/.test(text) || text === 'essentialPreferenceLayers') return true;
    if (text.includes('本质偏好')) return true;
    // layer1–4 titles end with「…偏好」；layer5 标题恰为「心理偏好」，
    // 与人生取向词条同名，不能当成不可变字段名去过滤人生取向展示。
    return this.layerMeta.some(({ label, prefix }) => {
      if (prefix === '心理偏好' || label === '心理偏好') return false;
      return text === label || text === prefix;
    });
  },

  psychGroupMeta() {
    const cfg = window.GameModules.playerAspirationConfig;
    const out = [];
    (cfg?.psychPreferenceCategories || []).forEach((category) => {
      cfg.psychCategoryGroups(category).forEach((group) => {
        out.push({ categoryId: category.id, categoryLabel: category.label, groupId: group.id, groupLabel: group.label });
      });
    });
    return out;
  },

  psychGroupCount() {
    return this.psychGroupMeta().length;
  },

  layer5PsychGroups(layer5 = '') {
    const normalized = this.normalizeLayers({ layer5 });
    return this.viewFromLayers(normalized)?.psychGroups || [];
  },

  validateLayer5PsychComplete(layer5 = '', { minTagsPerGroup = 3 } = {}) {
    const expected = this.psychGroupCount();
    if (!expected) return false;
    const groups = this.layer5PsychGroups(layer5);
    return groups.length >= expected && groups.every((group) => (group.tags || []).length >= minTagsPerGroup);
  },

  validatePsychPreferencesComplete(psychPreferences = null, { minTagsPerGroup = 3 } = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    if (!psychPreferences?.selected || !cfg?.psychCategoryGroups) return false;
    return (cfg.psychPreferenceCategories || []).every((category) =>
      cfg.psychCategoryGroups(category).every((group) => {
        const tags = psychPreferences.selected[group.id];
        return Array.isArray(tags) && tags.length >= minTagsPerGroup;
      }),
    );
  },

  applyToProfile(profile = {}, layers = null, { locked = true } = {}) {
    if (!profile || !layers) return profile;
    profile.essentialPreferenceLayers = this.normalizeLayers(layers);
    if (locked) profile.essentialPreferenceLayersLocked = true;
    return profile;
  },

  ensureOnProfile(profile = {}, orientation = null) {
    if (!profile || typeof profile !== 'object') return null;
    const assignIfChanged = (next) => {
      const layers = this.normalizeLayers(next);
      try {
        if (JSON.stringify(profile.essentialPreferenceLayers || null) === JSON.stringify(layers)) return layers;
      } catch (_) { /* ignore */ }
      profile.essentialPreferenceLayers = layers;
      if (profile.essentialPreferenceLayersLocked == null) profile.essentialPreferenceLayersLocked = true;
      return layers;
    };
    const source = orientation || profile.lifeOrientation || null;
    // Prefer life-orientation numbers when present — fixes continue-game / 0→50 corrupted layers.
    if (source?.alignment && (source.axes || source.guiltAxes || source.rationality != null)) {
      const fromOrientation = this.buildFromPlayerAspiration(source);
      if (fromOrientation?.layer1) return assignIfChanged(fromOrientation);
    }
    const normalized = this.normalizeLayers(profile.essentialPreferenceLayers || {});
    if (normalized.layer1) {
      const layer5Body = this.stripLayerPrefix(normalized.layer5, '心理偏好');
      const needsPsych = !layer5Body || layer5Body === '未勾选';
      if (needsPsych) {
        const psych = profile.psychPreferences
          || profile.lifeOrientation?.psychPreferences
          || orientation?.psychPreferences
          || null;
        let repaired = psych ? this.formatLayer5(psych) : '';
        if (!repaired || /未勾选/.test(repaired)) {
          const summary = String(
            profile.psychSummary
            || profile.lifeOrientation?.psychSummary
            || orientation?.psychSummary
            || '',
          ).trim();
          if (summary) {
            const body = summary
              .replace(/\n+/g, '; ')
              .replace(/：/g, ':')
              .replace(/；/g, ';')
              .replace(/、/g, ',')
              .replace(/^[^\n:]*倾向[：:]\s*/u, '');
            repaired = this.ensurePrefix('心理偏好', body);
          }
        }
        if (repaired && !/未勾选/.test(repaired)) {
          return assignIfChanged({ ...normalized, layer5: repaired });
        }
      }
      return normalized;
    }
    const fallback = window.GameModules.characterProfile?.fallbackEssentialPreferenceLayers?.(profile);
    if (!fallback) return null;
    return assignIfChanged(fallback);
  },

  stripLayerPrefix(line = '', prefix = '') {
    const text = String(line || '').trim();
    if (!text) return '';
    if (prefix && text.startsWith(`${prefix}:`)) return text.slice(prefix.length + 1).trim();
    const idx = text.indexOf(':');
    return idx >= 0 ? text.slice(idx + 1).trim() : text;
  },

  parseTrailingNumber(text = '', fallback = 50) {
    const match = String(text || '').trim().match(/(\d+)\s*$/);
    const num = Number(match?.[1]);
    return Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : fallback;
  },

  parseListParts(body = '') {
    return String(body || '').split(',').map((part) => part.trim()).filter(Boolean);
  },

  viewFromLayers(layers = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const normalized = this.normalizeLayers(layers);
    if (!normalized.layer1) return null;

    const alignmentLabel = this.stripLayerPrefix(normalized.layer1, '价值立场偏好') || '未设定';
    const layer2Body = this.stripLayerPrefix(normalized.layer2, '决策风格偏好');
    const rationalityParts = layer2Body.split(',');
    const rationality = this.parseTrailingNumber(rationalityParts[rationalityParts.length - 1] || layer2Body, 50);
    const rationalityLabel = rationalityParts[0]?.replace(/\d+\s*$/, '').trim()
      || (rationality <= 35 ? '偏理性' : rationality >= 65 ? '偏感性' : '理性感性居中');

    const axisBody = this.stripLayerPrefix(normalized.layer3, '人生六维偏好');
    const axes = this.parseListParts(axisBody).map((part, index) => {
      const value = this.parseTrailingNumber(part, 50);
      const cfgAxis = cfg?.axes?.[index];
      if (cfgAxis) {
        return {
          key: cfgAxis.key,
          title: cfgAxis.title,
          left: cfgAxis.left,
          right: cfgAxis.right,
          leftTag: cfgAxis.leftTag,
          rightTag: cfgAxis.rightTag,
          value,
          summary: `${cfgAxis.title}：${cfg.axisLeanText(value, cfgAxis)}（${value}/100）`,
        };
      }
      return { key: `axis-${index}`, title: part.replace(/\d+\s*$/, '').trim() || part, value, summary: `${part}（${value}/100）` };
    });

    const guiltBody = this.stripLayerPrefix(normalized.layer4, '底线锚点偏好');
    const guiltLines = this.parseListParts(guiltBody).map((part, index) => {
      const value = this.parseTrailingNumber(part, 50);
      const cfgItem = cfg?.guiltLines?.[index];
      if (cfgItem) {
        return {
          id: cfgItem.id,
          title: cfgItem.title,
          left: cfgItem.left,
          right: cfgItem.right,
          leftTag: cfgItem.leftTag,
          rightTag: cfgItem.rightTag,
          value,
          summary: `${cfgItem.title}：${cfg.guiltLeanText(value, cfgItem)}（${value}/100）`,
        };
      }
      return { id: `guilt-${index}`, title: part.replace(/\d+\s*$/, '').trim() || part, value, summary: `${part}（${value}/100）` };
    });

    const psychBody = this.stripLayerPrefix(normalized.layer5, '心理偏好');
    const psychGroups = String(psychBody || '').split(';').map((chunk) => chunk.trim()).filter(Boolean).map((chunk, index) => {
      const splitAt = chunk.indexOf(':');
      if (splitAt < 0) return { groupLabel: `偏好${index + 1}`, tags: [chunk] };
      const groupLabel = chunk.slice(0, splitAt).trim();
      const tags = chunk.slice(splitAt + 1).split(',').map((tag) => tag.trim()).filter(Boolean);
      return { groupLabel, tags };
    }).filter((group) => group.tags.length);

    return {
      alignmentLabel,
      rationality,
      rationalityLabel,
      axes,
      guiltLines,
      psychGroups,
      layerLines: this.toLines(normalized),
    };
  },
};
