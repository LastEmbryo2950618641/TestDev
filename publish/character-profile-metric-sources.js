window.GameModules = window.GameModules || {};

(function attachCharacterProfileMetricSources() {
  const profileTool = window.GameModules.characterProfile;
  if (!profileTool) return;
  const originalEnsure = profileTool.ensure.bind(profileTool);
  const keysFor = (group) => group === 'emotions' ? window.GameModules.metrics.emotionKeys : window.GameModules.metrics.playerKeys;

  Object.assign(profileTool, {
    metricSourceValue(source = '系统') {
      return source === 'ai' ? 'ai' : '系统';
    },

    metricSourceMap(source = '系统') {
      const value = this.metricSourceValue(source);
      return { 数值: value, 解释: value, 原因: value };
    },

    metricSources(item, fallback = '系统') {
      const raw = item?.metricSources || item?.sourceMap || {};
      const merged = { ...this.metricSourceMap(fallback), ...raw };
      return { 数值: this.metricSourceValue(merged.数值), 解释: this.metricSourceValue(merged.解释), 原因: this.metricSourceValue(merged.原因) };
    },

    metricSourcesAreAi(item) {
      const sources = this.metricSources(item, '系统');
      return sources.数值 === 'ai' && sources.解释 === 'ai' && sources.原因 === 'ai';
    },

    withMetricSources(item, source = 'ai') {
      return { ...item, metricSources: this.metricSourceMap(source) };
    },

    hasValidInitialMetricTexts(value) {
      const valid = (items, keys) => Array.isArray(items) && keys.every((key) => {
        const item = items.find((entry) => entry?.key === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
      return valid(value?.emotions, keysFor('emotions')) && valid(value?.playerFeelings, keysFor('playerFeelings'));
    },

    hasRequiredInitialMetrics(value) {
      const valid = (items, keys) => Array.isArray(items) && keys.every((key) => {
        const item = items.find((entry) => entry?.key === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim() && this.metricSourcesAreAi(item);
      });
      return valid(value?.emotions, keysFor('emotions')) && valid(value?.playerFeelings, keysFor('playerFeelings'));
    },

    initialMetrics(value, profile = {}) {
      const normalize = (items, keys, label) => {
        const list = Array.isArray(items) ? items : [];
        return keys.map((key) => {
          const item = list.find((entry) => entry?.key === key) || {};
          if (item.value === undefined) throw new Error(`${profile.name || '角色'} 缺少AI生成的${key}数值`);
          if (!String(item.status || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的数值解释`);
          if (!String(item.reason || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的变化原因`);
          const sources = this.metricSources(item, label);
          return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180), metricSources: sources };
        });
      };
      return { emotions: normalize(value?.emotions, keysFor('emotions'), 'system'), playerFeelings: normalize(value?.playerFeelings, keysFor('playerFeelings'), 'system') };
    },

    validateMetricGroup(value, keys, profile = {}) {
      if (!Array.isArray(value)) throw new Error(`${profile.name || '角色'} 的数值组不是数组`);
      return keys.map((key) => {
        const item = value.find((entry) => entry?.key === key) || {};
        if (item.value === undefined) throw new Error(`${profile.name || '角色'} 缺少AI生成的${key}数值`);
        if (!String(item.status || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的数值解释`);
        if (!String(item.reason || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的变化原因`);
        return this.withMetricSources({ key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180) }, 'ai');
      });
    },

    initialMetricNonAiKeys(metrics, group) {
      const list = Array.isArray(metrics?.[group]) ? metrics[group] : [];
      return keysFor(group).filter((key) => !this.metricSourcesAreAi(list.find((item) => item?.key === key)));
    },

    mergeMetricAiFields(current, generated) {
      const sources = this.metricSources(current, '系统');
      const output = { ...current, metricSources: { ...sources } };
      if (sources.数值 !== 'ai') {
        output.value = generated.value;
        output.metricSources.数值 = 'ai';
      }
      if (sources.解释 !== 'ai') {
        output.status = generated.status;
        output.metricSources.解释 = 'ai';
      }
      if (sources.原因 !== 'ai') {
        output.reason = generated.reason;
        output.metricSources.原因 = 'ai';
      }
      return output;
    },

    async repairInitialMetricSources(profile, base, lore, attrs, context, store) {
      const current = this.initialMetrics(profile.initialMetrics, { ...base, ...profile });
      const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
      for (const group of ['emotions', 'playerFeelings']) {
        const missing = this.initialMetricNonAiKeys(current, group);
        if (!missing.length) continue;
        const byKey = new Map(current[group].map((item) => [item.key, item]));
        for (const key of missing) {
          try {
            const generated = await this.generateMetricGroupChunks(profile, base, evidence, group, [key]);
            const item = generated.find((entry) => entry?.key === key);
            if (!item) continue;
            const currentItem = byKey.get(key);
            byKey.set(key, currentItem ? this.mergeMetricAiFields(currentItem, item) : item);
          } catch (err) {
            console.warn('[角色数值来源] 单项AI补齐失败，保留系统来源:', profile.name || base.name, group, key, err.message, err.stack);
          }
        }
        current[group] = keysFor(group).map((key) => byKey.get(key));
      }
      return current;
    },

    initialMetricRepairable(profile, signature) {
      const signatureOk = !signature || profile?.roleCardInputSignature === signature;
      return signatureOk && this.isRoleCard(profile) && this.hasRequiredRoleCardFieldReasons(profile.roleCardFieldReasons, profile) && this.hasRequiredInventoryReasons(profile) && this.hasValidInitialMetricTexts(profile.initialMetrics) && this.hasRequiredRpgFieldReasons(profile.rpgFieldReasons, profile?.worldAttributes);
    },

    async ensureInitialMetricSources(profile, base, context = '', store = null) {
      if (!this.initialMetricRepairable(profile, profile?.roleCardInputSignature || null)) return profile;
      if (this.hasRequiredInitialMetrics(profile.initialMetrics)) return profile;
      const worldTag = base.work || profile.work || '现实世界';
      const lore = await window.GameModules.worldLore.ensure(worldTag, context);
      const attrs = await window.GameModules.rpgState.ensureWorldAttributes(worldTag);
      return { ...profile, initialMetrics: await this.repairInitialMetricSources(profile, base, lore, attrs, context, store) };
    },
  });

  profileTool.ensure = async function ensureWithMetricSourceRepair(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = window.GameModules.sqliteSave.getCharacterState(base.id);
    if (existing && this.isReusableRoleCard(existing.profile, signature) && this.hasRequiredInitialMetrics(existing.profile?.initialMetrics)) return existing.profile;
    if (existing && this.initialMetricRepairable(existing.profile, signature)) {
      existing.profile = await this.ensureInitialMetricSources(existing.profile, base, context, store);
      existing.profile = this.withSignature(existing.profile, signature);
      await window.GameModules.sqliteSave.saveCharacterState(existing);
      return existing.profile;
    }
    return originalEnsure(raw, store, context);
  };
})();
