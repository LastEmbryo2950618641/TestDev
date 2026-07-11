window.GameModules = window.GameModules || {};

(function attachCharacterProfileMetricSources() {
  const profileTool = window.GameModules.characterProfile;
  if (!profileTool) return;
  const originalEnsure = profileTool.ensure.bind(profileTool);
  const keysFor = (group) => group === 'emotions' ? window.GameModules.metrics.emotionKeys : window.GameModules.metrics.playerKeys;

  Object.assign(profileTool, {
    metricSourceValue(source = '绯荤粺') {
      return String(source).toLowerCase() === 'ai' ? 'AI' : '绯荤粺';
    },

    metricSourceMap(source = '绯荤粺') {
      const value = this.metricSourceValue(source);
      return { 鏁板€? value, 瑙ｉ噴: value, 鍘熷洜: value };
    },

    metricSources(item, fallback = '绯荤粺') {
      const raw = item?.metricSources || item?.sourceMap || {};
      const merged = { ...this.metricSourceMap(fallback), ...raw };
      return { 鏁板€? this.metricSourceValue(merged.鏁板€?, 瑙ｉ噴: this.metricSourceValue(merged.瑙ｉ噴), 鍘熷洜: this.metricSourceValue(merged.鍘熷洜) };
    },

    metricSourcesAreAi(item) {
      const sources = this.metricSources(item, '绯荤粺');
      return sources.鏁板€?=== 'AI' && sources.瑙ｉ噴 === 'AI' && sources.鍘熷洜 === 'AI';
    },

    withMetricSources(item, source = 'ai') {
      return { ...item, metricSources: this.metricSourceMap(source) };
    },

    initialMetricDefaultSource(profile = {}) {
      const source = String(profile?.roleCardSource || '').toLowerCase();
      if (source === 'ai' || source === 'predefined') return 'ai';
      if (profile?.roleCard && source !== 'predefined-edited') return 'ai';
      return '绯荤粺';
    },

    initialMetricItemSources(item, fallback = '绯荤粺') {
      const complete = item?.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      if (!complete) return this.metricSourceMap('绯荤粺');
      if (this.metricSourceValue(fallback) === 'AI') return this.metricSourceMap('ai');
      return item?.metricSources || item?.sourceMap ? this.metricSources(item, fallback) : this.metricSourceMap(fallback);
    },

    hasValidInitialMetricTexts(value) {
      return profileTool.initialMetricsComplete?.(value, { reuse: true }) || false;
    },

    hasRequiredInitialMetrics(value, opts = {}) {
      if (opts.reuse) return profileTool.initialMetricsComplete?.(value, { reuse: true }) || false;
      const keysEmotion = keysFor('emotions');
      const keysFeeling = keysFor('playerFeelings');
      const valid = (items, keys) => Array.isArray(items) && keys.every((key) => {
        const item = items.find((entry) => window.GameModules.metrics.normalizeKey(entry?.key || entry?.name, keys) === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim() && this.metricSourcesAreAi(item);
      });
      return (profileTool.initialMetricsComplete?.(value, { reuse: false }) || false) && valid(value?.emotions, keysEmotion) && valid(value?.playerFeelings, keysFeeling);
    },

    initialMetrics(value, profile = {}) {
      const defaultSource = this.initialMetricDefaultSource(profile);
      const normalize = (items, keys) => {
        const list = Array.isArray(items) ? items : [];
        return keys.map((key) => {
          const item = list.find((entry) => entry?.key === key) || {};
          if (item.value === undefined) throw new Error(`${profile.name || '瑙掕壊'} 缂哄皯AI鐢熸垚鐨?{key}鏁板€糮);
          if (!String(item.status || '').trim()) throw new Error(`${profile.name || '瑙掕壊'} 鐨?{key}缂哄皯AI鐢熸垚鐨勬暟鍊艰В閲奰);
          if (!String(item.reason || '').trim()) throw new Error(`${profile.name || '瑙掕壊'} 鐨?{key}缂哄皯AI鐢熸垚鐨勫彉鍖栧師鍥燻);
          const sources = this.initialMetricItemSources(item, defaultSource);
          return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180), metricSources: sources };
        });
      };
      return { emotions: normalize(value?.emotions, keysFor('emotions')), playerFeelings: normalize(value?.playerFeelings, keysFor('playerFeelings')) };
    },

    validateMetricGroup(value, keys, profile = {}) {
      if (!Array.isArray(value)) {
        console.warn('[瑙掕壊鏁板€兼牎楠宂 鏁板€肩粍涓嶆槸鏁扮粍:', { profile: profile.name || '瑙掕壊', group: profile.group || 'unknown', value });
        throw new Error(`${profile.name || '瑙掕壊'} 鐨勬暟鍊肩粍涓嶆槸鏁扮粍`);
      }
      const issues = this.warnMetricGroupIssues ? this.warnMetricGroupIssues('瑙掕壊鏁板€兼牎楠岀己瀛楁', value, keys, profile) : null;
      if (issues?.missing?.length) throw new Error(`${profile.name || '瑙掕壊'} 缂哄皯AI鐢熸垚鐨?{issues.missing.join('銆?)}鏁板€奸」`);
      if (issues?.missingValue?.length) throw new Error(`${profile.name || '瑙掕壊'} 缂哄皯AI鐢熸垚鐨?{issues.missingValue.join('銆?)}鏁板€糮);
      if (issues?.missingStatus?.length) throw new Error(`${profile.name || '瑙掕壊'} 鐨?{issues.missingStatus.join('銆?)}缂哄皯AI鐢熸垚鐨勬暟鍊艰В閲奰);
      if (issues?.missingReason?.length) throw new Error(`${profile.name || '瑙掕壊'} 鐨?{issues.missingReason.join('銆?)}缂哄皯AI鐢熸垚鐨勫彉鍖栧師鍥燻);
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
      const sources = this.metricSources(current, '绯荤粺');
      const output = { ...current, metricSources: { ...sources } };
      if (sources.鏁板€?!== 'AI') {
        output.value = generated.value;
        output.metricSources.鏁板€?= 'AI';
      }
      if (sources.瑙ｉ噴 !== 'AI') {
        output.status = generated.status;
        output.metricSources.瑙ｉ噴 = 'AI';
      }
      if (sources.鍘熷洜 !== 'AI') {
        output.reason = generated.reason;
        output.metricSources.鍘熷洜 = 'AI';
      }
      return output;
    },

    async repairInitialMetricSources(profile, base, lore, attrs, context, store) {
      const current = this.initialMetrics(profile.initialMetrics, { ...base, ...profile });
      const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
      for (const group of ['emotions', 'playerFeelings']) {
        const missing = this.initialMetricNonAiKeys(current, group);
        if (!missing.length) continue;
        console.warn('[瑙掕壊鏁板€兼潵婧怾 鍙戠幇闈濧I鎴栫己瀛楁锛屾寜10涓猭ey涓€缁勮ˉ榻愪竴娆?', { profile: profile.name || base.name, group, missing });
        const byKey = new Map(current[group].map((item) => [item.key, item]));
        const chunks = this.metricGroupKeyChunks(group, missing);
        for (let i = 0; i < chunks.length; i += 1) {
          const chunk = chunks[i];
          try {
            const generated = await this.generateMetricGroup(profile, base, evidence, group, chunk, `source-repair-${i + 1}`, chunks.length);
            let repaired = generated;
            const issues = this.warnMetricGroupIssues ? this.warnMetricGroupIssues('瑙掕壊鏁板€兼潵婧愯ˉ榻愯繑鍥炴鏌?, repaired, chunk, { ...base, ...profile, group, chunkIndex: i + 1 }) : { missing: [] };
            if (issues.missing?.length || issues.missingValue?.length || issues.missingStatus?.length || issues.missingReason?.length) {
              repaired = chunk.map((key) => repaired.find((item) => item?.key === key) || { ...byKey.get(key), key, metricSources: this.metricSourceMap('绯荤粺') });
            }
            repaired.forEach((item) => {
              if (!chunk.includes(item?.key)) return;
              const currentItem = byKey.get(item.key);
              byKey.set(item.key, currentItem ? this.mergeMetricAiFields(currentItem, item) : item);
            });
            if (issues.missing?.length) console.warn('[瑙掕壊鏁板€兼潵婧怾 琛ラ綈鍚庝粛缂哄皯key:', { profile: profile.name || base.name, group, missing: issues.missing });
          } catch (err) {
            console.warn('[瑙掕壊鏁板€兼潵婧怾 鎵归噺AI琛ラ綈澶辫触锛屼繚鐣欑郴缁熸潵婧?', { profile: profile.name || base.name, group, keys: chunk, error: err.message, stack: err.stack });
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
      const normalized = this.initialMetrics(profile.initialMetrics, { ...base, ...profile });
      if (this.hasRequiredInitialMetrics(normalized)) {
        return { ...profile, initialMetrics: normalized, initialMetricSourceRepairSignature: profile.roleCardInputSignature || '', initialMetricSourceRepairRemaining: { emotions: [], playerFeelings: [] } };
      }
      const worldTag = base.work || profile.work || window.GameModules.realWorld2026?.label || '2026 鐜颁唬閮藉競鐜板疄涓栫晫';
      const lore = await window.GameModules.worldLore.ensure(worldTag, context);
      const attrs = await window.GameModules.rpgState.ensureWorldAttributes(worldTag);
      const initialMetrics = await this.repairInitialMetricSources({ ...profile, initialMetrics: normalized }, base, lore, attrs, context, store);
      const remaining = Object.fromEntries(['emotions', 'playerFeelings'].map((group) => [group, this.initialMetricNonAiKeys(initialMetrics, group)]));
      if (remaining.emotions.length || remaining.playerFeelings.length) console.warn('[瑙掕壊鏁板€兼潵婧怾 琛ラ綈鍚庝粛瀛樺湪闈濧I鎴栫己瀛楁锛屽仠姝㈤噸澶嶈ˉ榻愬苟淇濈暀闂淇℃伅:', { profile: profile.name || base.name, remaining });
      return { ...profile, initialMetrics, initialMetricSourceRepairSignature: profile.roleCardInputSignature || '', initialMetricSourceRepairRemaining: remaining };
    },
  });

  profileTool.ensure = async function ensureWithMetricSourceRepair(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const saved = base.forceRoleCardRegenerate ? null : this.findSavedRoleCard(base, signature);
    if (saved?.profile) {
      const profile = { ...saved.profile, id: base.id, work: saved.profile.work || base.work };
      if (this.isReusableRoleCard(profile, signature) || this.isRoleCard(profile)) return profile;
    }
    const existing = window.GameModules.characterStateStore?.get?.(base.id);
    if (existing && this.isReusableRoleCard(existing.profile, signature)) return existing.profile;
    if (existing && this.initialMetricRepairable(existing.profile, signature) && existing.profile?.initialMetricSourceRepairSignature !== signature) {
      existing.profile = await this.ensureInitialMetricSources(existing.profile, base, context, store);
      existing.profile = this.withSignature(existing.profile, signature);
      await window.GameModules.characterStateStore?.save?.(existing);
      return existing.profile;
    }
    return originalEnsure(raw, store, context);
  };
})();


