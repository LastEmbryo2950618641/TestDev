window.GameModules = window.GameModules || {};

(function attachCharacterProfileMetricSources() {
  const profileTool = window.GameModules.characterProfile;
  if (!profileTool) return;
  const originalEnsure = profileTool.ensure.bind(profileTool);
  const keysFor = (group) => group === 'emotions' ? window.GameModules.metrics.emotionKeys : window.GameModules.metrics.playerKeys;

  Object.assign(profileTool, {
    metricSourceValue(source = '系统') {
      return String(source).toLowerCase() === 'ai' ? 'AI' : '系统';
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
      return sources.数值 === 'AI' && sources.解释 === 'AI' && sources.原因 === 'AI';
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
      if (!Array.isArray(value)) {
        console.warn('[角色数值校验] 数值组不是数组:', { profile: profile.name || '角色', group: profile.group || 'unknown', value });
        throw new Error(`${profile.name || '角色'} 的数值组不是数组`);
      }
      const issues = this.warnMetricGroupIssues ? this.warnMetricGroupIssues('角色数值校验缺字段', value, keys, profile) : null;
      if (issues?.missing?.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missing.join('、')}数值项`);
      if (issues?.missingValue?.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missingValue.join('、')}数值`);
      if (issues?.missingStatus?.length) throw new Error(`${profile.name || '角色'} 的${issues.missingStatus.join('、')}缺少AI生成的数值解释`);
      if (issues?.missingReason?.length) throw new Error(`${profile.name || '角色'} 的${issues.missingReason.join('、')}缺少AI生成的变化原因`);
      return keys.map((key) => {
        const item = value.find((entry) => entry?.key === key);
        const sources = item.metricSources ? this.metricSources(item, 'ai') : this.metricSourceMap('ai');
        return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180), metricSources: sources };
      });
    },

    initialMetricNonAiKeys(metrics, group) {
      const list = Array.isArray(metrics?.[group]) ? metrics[group] : [];
      return keysFor(group).filter((key) => {
        const item = list.find((entry) => entry?.key === key);
        return !item || item.value === undefined || !String(item.status || '').trim() || !String(item.reason || '').trim() || !this.metricSourcesAreAi(item);
      });
    },

    mergeMetricAiFields(current, generated) {
      const sources = this.metricSources(current, '系统');
      const output = { ...current, metricSources: { ...sources } };
      if (sources.数值 !== 'AI') {
        output.value = generated.value;
        output.metricSources.数值 = 'AI';
      }
      if (sources.解释 !== 'AI') {
        output.status = generated.status;
        output.metricSources.解释 = 'AI';
      }
      if (sources.原因 !== 'AI') {
        output.reason = generated.reason;
        output.metricSources.原因 = 'AI';
      }
      return output;
    },

    async repairInitialMetricSources(profile, base, lore, attrs, context, store) {
      const current = this.initialMetrics(profile.initialMetrics, { ...base, ...profile });
      const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
      for (const group of ['emotions', 'playerFeelings']) {
        const missing = this.initialMetricNonAiKeys(current, group);
        if (!missing.length) continue;
        console.warn('[角色数值来源] 发现非AI或缺字段，按10个key一组补齐一次:', { profile: profile.name || base.name, group, missing });
        const byKey = new Map(current[group].map((item) => [item.key, item]));
        const chunks = this.metricGroupKeyChunks(group, missing);
        for (let i = 0; i < chunks.length; i += 1) {
          const chunk = chunks[i];
          try {
            const generated = await this.generateMetricGroup(profile, base, evidence, group, chunk, `source-repair-${i + 1}`, chunks.length);
            let repaired = generated;
            const issues = this.warnMetricGroupIssues ? this.warnMetricGroupIssues('角色数值来源补齐返回检查', repaired, chunk, { ...base, ...profile, group, chunkIndex: i + 1 }) : { missing: [] };
            if (issues.missing?.length || issues.missingValue?.length || issues.missingStatus?.length || issues.missingReason?.length) {
              repaired = chunk.map((key) => repaired.find((item) => item?.key === key) || { ...byKey.get(key), key, metricSources: this.metricSourceMap('系统') });
            }
            repaired.forEach((item) => {
              if (!chunk.includes(item?.key)) return;
              const currentItem = byKey.get(item.key);
              byKey.set(item.key, currentItem ? this.mergeMetricAiFields(currentItem, item) : item);
            });
            if (issues.missing?.length) console.warn('[角色数值来源] 补齐后仍缺少key:', { profile: profile.name || base.name, group, missing: issues.missing });
          } catch (err) {
            console.warn('[角色数值来源] 批量AI补齐失败，保留系统来源:', { profile: profile.name || base.name, group, keys: chunk, error: err.message, stack: err.stack });
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
      const initialMetrics = await this.repairInitialMetricSources(profile, base, lore, attrs, context, store);
      const remaining = Object.fromEntries(['emotions', 'playerFeelings'].map((group) => [group, this.initialMetricNonAiKeys(initialMetrics, group)]));
      if (remaining.emotions.length || remaining.playerFeelings.length) console.warn('[角色数值来源] 补齐后仍存在非AI或缺字段，停止重复补齐并保留问题信息:', { profile: profile.name || base.name, remaining });
      return { ...profile, initialMetrics, initialMetricSourceRepairSignature: profile.roleCardInputSignature || '', initialMetricSourceRepairRemaining: remaining };
    },
  });

  profileTool.ensure = async function ensureWithMetricSourceRepair(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = window.GameModules.sqliteSave.getCharacterState(base.id);
    if (existing && this.isReusableRoleCard(existing.profile, signature) && this.hasRequiredInitialMetrics(existing.profile?.initialMetrics)) return existing.profile;
    if (existing && this.initialMetricRepairable(existing.profile, signature) && existing.profile?.initialMetricSourceRepairSignature !== signature) {
      existing.profile = await this.ensureInitialMetricSources(existing.profile, base, context, store);
      existing.profile = this.withSignature(existing.profile, signature);
      await window.GameModules.sqliteSave.saveCharacterState(existing);
      return existing.profile;
    }
    return originalEnsure(raw, store, context);
  };
})();
