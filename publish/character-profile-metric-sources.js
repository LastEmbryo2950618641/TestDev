window.GameModules = window.GameModules || {};

(function attachCharacterProfileMetricSources() {
  const profileTool = window.GameModules.characterProfile;
  if (!profileTool) return;
  const originalEnsure = profileTool.ensure.bind(profileTool);
  const keysFor = (group) => group === 'emotions' ? window.GameModules.metrics.emotionKeys : window.GameModules.metrics.playerKeys;

  Object.assign(profileTool, {
    metricSourceMap(source = 'system') {
      return { 数值: source, 解释: source, 原因: source };
    },

    metricSources(item, fallback = 'system') {
      const raw = item?.metricSources || item?.sourceMap || {};
      return { ...this.metricSourceMap(fallback), ...raw };
    },

    metricSourcesAreAi(item) {
      const sources = this.metricSources(item, 'system');
      return sources.数值 === 'ai' && sources.解释 === 'ai' && sources.原因 === 'ai';
    },

    withMetricSources(item, source = 'ai') {
      return { ...item, metricSources: this.metricSourceMap(source) };
    },

    hasValidInitialMetricTexts(value) {
      const valid = (items, keys) => Array.isArray(items) && keys.every((key) => {
        const item = items.find((entry) => entry?.key === key);
        return item && item.value !== undefined && this.validMetricText(item.status, key) && this.validMetricText(item.reason, key);
      });
      return valid(value?.emotions, keysFor('emotions')) && valid(value?.playerFeelings, keysFor('playerFeelings'));
    },

    hasRequiredInitialMetrics(value) {
      const valid = (items, keys) => Array.isArray(items) && keys.every((key) => {
        const item = items.find((entry) => entry?.key === key);
        return item && item.value !== undefined && this.validMetricText(item.status, key) && this.validMetricText(item.reason, key) && this.metricSourcesAreAi(item);
      });
      return valid(value?.emotions, keysFor('emotions')) && valid(value?.playerFeelings, keysFor('playerFeelings'));
    },

    initialMetrics(value, profile = {}) {
      const normalize = (items, keys, label) => {
        const list = Array.isArray(items) ? items : [];
        return keys.map((key) => {
          const item = list.find((entry) => entry?.key === key) || {};
          if (item.value === undefined) throw new Error(`${profile.name || '角色'} 缺少AI生成的${key}数值`);
          if (!this.validMetricText(item.status, key)) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的具体数值解释`);
          if (!this.validMetricText(item.reason, key)) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的具体变化原因`);
          const source = this.metricSourcesAreAi(item) ? 'ai' : (item.metricSources ? 'system' : label);
          return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180), metricSources: this.metricSourceMap(source) };
        });
      };
      return { emotions: normalize(value?.emotions, keysFor('emotions'), 'system'), playerFeelings: normalize(value?.playerFeelings, keysFor('playerFeelings'), 'system') };
    },

    validateMetricGroup(value, keys, profile = {}) {
      if (!Array.isArray(value)) throw new Error(`${profile.name || '角色'} 的数值组不是数组`);
      return keys.map((key) => {
        const item = value.find((entry) => entry?.key === key) || {};
        if (item.value === undefined) throw new Error(`${profile.name || '角色'} 缺少AI生成的${key}数值`);
        if (!this.validMetricText(item.status, key)) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的具体数值解释`);
        if (!this.validMetricText(item.reason, key)) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的具体变化原因`);
        return this.withMetricSources({ key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180) }, 'ai');
      });
    },

    initialMetricNonAiKeys(metrics, group) {
      const list = Array.isArray(metrics?.[group]) ? metrics[group] : [];
      return keysFor(group).filter((key) => !this.metricSourcesAreAi(list.find((item) => item?.key === key)));
    },

    async repairInitialMetricSources(profile, base, lore, attrs, context, store) {
      const current = this.initialMetrics(profile.initialMetrics, { ...base, ...profile });
      const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
      for (const group of ['emotions', 'playerFeelings']) {
        const missing = this.initialMetricNonAiKeys(current, group);
        if (!missing.length) continue;
        const generated = await this.generateMetricGroupChunks(profile, base, evidence, group, missing);
        const byKey = new Map(current[group].map((item) => [item.key, item]));
        generated.forEach((item) => byKey.set(item.key, item));
        current[group] = keysFor(group).map((key) => byKey.get(key));
      }
      return this.initialMetrics(current, { ...base, ...profile });
    },

    initialMetricRepairable(profile, signature) {
      const signatureOk = !signature || profile?.roleCardInputSignature === signature;
      return signatureOk && this.isRoleCard(profile) && this.hasRequiredRoleCardFieldReasons(profile.roleCardFieldReasons, profile) && this.hasRequiredInventoryReasons(profile) && this.hasValidInitialMetricTexts(profile.initialMetrics) && this.hasRequiredRpgFieldReasons(profile.rpgFieldReasons, profile?.worldAttributes);
    },
  });

  profileTool.ensure = async function ensureWithMetricSourceRepair(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = window.GameModules.sqliteSave.getCharacterState(base.id);
    if (existing && this.isReusableRoleCard(existing.profile, signature)) return existing.profile;
    if (existing && this.initialMetricRepairable(existing.profile, signature)) {
      const lore = await window.GameModules.worldLore.ensure(base.work, context);
      const attrs = await window.GameModules.rpgState.ensureWorldAttributes(base.work);
      existing.profile.initialMetrics = await this.repairInitialMetricSources(existing.profile, base, lore, attrs, context, store);
      existing.profile = this.withSignature(existing.profile, signature);
      await window.GameModules.sqliteSave.saveCharacterState(existing);
      return existing.profile;
    }
    return originalEnsure(raw, store, context);
  };
})();
