/**
 * JSON 与流式文本工具。
 */
window.GameModules = window.GameModules || {};
window.GameModules.jsonUtils = {
  mergeStreamText(buffer, chunk) {
    const text = String(chunk || '');
    if (!text) return buffer;
    if (!buffer || text.startsWith(buffer)) return text;
    if (buffer.endsWith(text)) return buffer;
    const overlap = Math.min(buffer.length, text.length);
    for (let size = overlap; size > 0; size -= 1) {
      if (buffer.endsWith(text.slice(0, size))) return buffer + text.slice(size);
    }
    return buffer + text;
  },

  extractJson(text) {
    const start = text.indexOf('{');
    if (start === -1) throw new Error('JSON missing');
    let depth = 0; let inString = false; let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
    throw new Error('JSON incomplete');
  },

  parseLoose(text) {
    const raw = String(text || '').replace(/```(?:json)?|```/g, '').trim();
    let json = '';
    try { json = this.extractJson(raw); } catch (err) {
      if (err.message !== 'JSON incomplete') throw err;
      json = this.completePartialJson(raw);
    }
    try {
      return JSON.parse(json);
    } catch (firstErr) {
      const repaired = this.repairJson(json);
      try { return JSON.parse(repaired); } catch (secondErr) {
        console.warn('[JSON解析] 修复失败:', { first: firstErr.message, second: secondErr.message, preview: repaired.slice(0, 180) });
        throw secondErr;
      }
    }
  },

  completePartialJson(text) {
    const start = text.indexOf('{');
    if (start === -1) throw new Error('JSON missing');
    let inString = false; let escaped = false; const stack = [];
    let out = this.trimDanglingProperty(text.slice(start).replace(/```(?:json)?|```/g, '').trim());
    for (let i = 0; i < out.length; i += 1) {
      const ch = out[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') stack.push('}');
      if (ch === '[') stack.push(']');
      if ((ch === '}' || ch === ']') && stack[stack.length - 1] === ch) stack.pop();
    }
    if (inString) out += '"';
    return out.replace(/,\s*$/, '') + stack.reverse().join('');
  },

  trimDanglingProperty(text) {
    let out = String(text || '').trim();
    for (let i = 0; i < 3; i += 1) {
      const next = out
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*$/s, '')
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*$/s, '')
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*\{\s*$/s, '')
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*\[\s*$/s, '');
      if (next === out) break;
      out = next.trim();
    }
    return out;
  },

  aiOutputRisk(text, options = {}) {
    const tool = window.GameModules.aiRequest;
    if (tool?.outputLengthRisk) return tool.outputLengthRisk(text, options);
    const length = String(text || '').length;
    const threshold = Number(options.outputLengthThreshold || 2400);
    return { length, threshold, overThreshold: length >= threshold, tailLooksTruncated: false };
  },

  rawFieldHits(text, fields = []) {
    const raw = String(text || '');
    return Object.fromEntries((fields || []).map((field) => [field, raw.includes(`"${field}"`) || raw.includes(field)]));
  },

  completionOptions(promptId = '', options = {}) {
    const overrides = {};
    if (Object.prototype.hasOwnProperty.call(options, 'jsonMode')) overrides.jsonMode = options.jsonMode;
    if (Object.prototype.hasOwnProperty.call(options, 'outputLimitKind')) overrides.outputLimitKind = options.outputLimitKind;
    if (Object.prototype.hasOwnProperty.call(options, 'responseFormat')) overrides.responseFormat = options.responseFormat;
    if (Object.prototype.hasOwnProperty.call(options, 'deepThinking')) overrides.deepThinking = options.deepThinking;
    if (promptId && window.GameModules.promptSkills?.completionOptions) {
      return window.GameModules.promptSkills.completionOptions(promptId, overrides);
    }
    const jsonMode = options.jsonMode !== false;
    return {
      outputLimitKind: options.outputLimitKind || 'other',
      jsonMode,
      responseFormat: options.responseFormat || (jsonMode ? { type: 'json_object' } : undefined),
      deepThinking: false,
    };
  },

  async generateJsonWithRetry(options) {
    const max = options.max ?? 2;
    let prompt = options.prompt;
    let promptId = options.promptId || '';
    const initialPromptId = promptId;
    let lastText = '';
    let lastError = null;
    for (let i = 0; i < max; i += 1) {
      const completionOptions = this.completionOptions(promptId, options);
      const baseTitle = String(options.sourceTitle || options.source || promptId || 'json-utils');
      // Only annotate retries. First attempt keeps the clean title (no「尝试1/2」).
      const attemptTitle = (max > 1 && i > 0)
        ? `${baseTitle}｜重试${i + 1}/${max}`
        : baseTitle;
      lastText = await this.requestCompletion({
        model: options.model,
        prompt,
        promptId,
        maxTokens: options.maxTokens,
        source: options.source || 'json-utils',
        sourceTitle: options.sourceTitle,
        timeoutMs: options.timeoutMs || 90000,
        maxAttempts: options.maxAttempts,
        store: options.store,
        useRealWorldKvCache: options.useRealWorldKvCache,
        kvCacheSession: options.kvCacheSession,
        reasoningPhase: options.reasoningPhase,
        logId: options.logId,
        tokenMeta: { ...(options.tokenMeta || {}), title: attemptTitle },
        ...completionOptions,
      });
      try {
        const parsed = options.parse ? options.parse(lastText) : this.parseLoose(lastText);
        return options.validate ? options.validate(parsed) : parsed;
      } catch (err) {
        lastError = err;
        const risk = this.aiOutputRisk(lastText, options);
        const rawFieldHits = this.rawFieldHits(lastText, options.requiredRawFields || []);
        console.debug('[JSON重试] AI返回格式校验失败，准备生成修复提示:', {
          source: options.source || 'json-utils',
          attempt: i + 1,
          max,
          error: err?.message || 'unknown',
          stack: err?.stack || '',
          outputLength: risk.length,
          outputThreshold: risk.threshold,
          possibleTruncated: risk.overThreshold || risk.tailLooksTruncated,
          overThreshold: risk.overThreshold,
          tailLooksTruncated: risk.tailLooksTruncated,
          rawFieldHits,
          rawPreview: String(lastText || '').slice(0, 1200),
        });
        if (i === max - 1) break;
        const initialBehavior = window.GameModules.promptSkills?.behavior?.(initialPromptId) || {};
        if (initialBehavior.jsonMode === false) {
          prompt = [
            options.format || options.prompt,
            '',
            '## 修复要求',
            `上次输出无效：${err?.message || 'unknown'}`,
            String(options.repairHint || '').trim(),
            '请严格按原 Output Format 重新输出，不要解释。',
          ].filter(Boolean).join('\n');
          promptId = initialPromptId;
        } else {
          prompt = await this.repairPrompt(options.format || options.prompt, lastText, err, options.repairHint || '');
          promptId = options.repairPromptId || initialPromptId || 'json-repair';
        }
      }
    }
    const error = new Error(`AI返回格式错误: ${lastError?.message || 'unknown'}`);
    error.cause = lastError;
    error.rawOutput = lastText;
    throw error;
  },

  async requestCompletion({ model, prompt, promptId = '', maxTokens, source = 'json-utils', sourceTitle = '', timeoutMs = 90000, maxAttempts, jsonMode = true, outputLimitKind = 'other', responseFormat, deepThinking = false, store = null, useRealWorldKvCache = false, kvCacheSession = null, reasoningPhase = '', logId = null, tokenMeta = null }) {
    if (useRealWorldKvCache && store && window.GameModules.realWorldAgentLoop?.completeCachedJsonPrompt) {
      return await window.GameModules.realWorldAgentLoop.completeCachedJsonPrompt(store, {
        prompt,
        promptId: promptId || source,
        source,
        sourceTitle,
        model,
        maxTokens,
        timeoutMs,
        maxAttempts,
        jsonMode,
        deepThinking,
        outputLimitKind,
        responseFormat: responseFormat || (jsonMode ? { type: 'json_object' } : undefined),
        kvCacheSession,
        reasoningPhase,
        logId,
        tokenMeta,
      });
    }
    return window.GameModules.aiRequest.complete({ source, model, maxTokens, prompt, timeoutMs, maxAttempts, jsonMode, deepThinking, responseFormat: responseFormat || (jsonMode ? { type: 'json_object' } : undefined), outputLimitKind, tokenMeta });
  },

  async repairPrompt(format, badOutput, err, hint = '') {
    return window.GameModules.renderPrompt('json-repair', { 错误: err?.message || 'unknown', 原要求: String(format || '').slice(0, 3200), 修复补充要求: String(hint || '').slice(0, 1400), 错误输出: String(badOutput || '').slice(0, 1200) });
  },

  normalizeJsonSyntax(text) {
    const raw = String(text || '');
    let out = '', quoteMode = '', escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (escaped) { out += ch; escaped = false; continue; }
      if (quoteMode) {
        if (ch === '\\') { out += ch; escaped = true; continue; }
        if (quoteMode === 'ascii' && ch === '"') { quoteMode = ''; out += ch; continue; }
        if (quoteMode === 'curly' && ch === '”') {
          const next = raw.slice(i + 1).match(/\S/)?.[0] || '';
          if (!next || /[,，}\]:：]/.test(next)) { quoteMode = ''; out += '"'; continue; }
        }
        out += ch;
        continue;
      }
      if (ch === '"') { quoteMode = 'ascii'; out += ch; continue; }
      if (ch === '“') { quoteMode = 'curly'; out += '"'; continue; }
      if (ch === '：') { out += ':'; continue; }
      if (ch === '，') { out += ','; continue; }
      if (ch === '‘' || ch === '’') { out += "'"; continue; }
      out += ch;
    }
    return out;
  },

  repairJson(json) {
    let out = this.repairMissingCommas(this.normalizeJsonSyntax(this.trimDanglingProperty(String(json || ''))))
      .replace(/([}\]"0-9]|true|false|null)\s*,\s*(")/g, '$1,$2')
      .replace(/([}\]])\s*，\s*([\[{])/g, '$1,$2')
      .replace(/([}\]])\s*，\s*(")/g, '$1,$2')
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/([{,]\s*)([\u4e00-\u9fa5][\u4e00-\u9fa5\w-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value) => `:"${value.replace(/"/g, '\\"')}"`)
      .replace(/"\s+("(?:[^"\\]|\\.)*"\s*[,\]])/g, '",$1')
      .replace(/}\s*({)/g, '},$1')
      .replace(/\]\s*(\[)/g, '],$1')
      .replace(/("metricUpdates"\s*:\s*\{[\s\S]*?)\]\s*,\s*("lexiconUpdates"\s*:)/, '$1},$2')
      .replace(/("metricUpdates"\s*:\s*\{[\s\S]*?)\]\s*}/, '$1}}')
      .replace(/"\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '",$1')
      .replace(/(\d|true|false|null)\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/([}\]])\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/:\s*([}\]])/g, ':null$1')
      .replace(/:\s*null\s*\]/g, ':null}]')
      .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*([}\]])/g, '$1')
      .replace(/,\s*([}\]])/g, '$1');
    out = this.repairMisnestedMetricArrays(out);
    out = this.repairBareReasonArrays(out);
    return out;
  },

  repairMissingCommas(text) {
    const source = String(text || '');
    let out = '';
    let inString = false;
    let escaped = false;
    let previousSignificant = '';
    let previousValueEnded = false;
    const valueEndChars = new Set(['}', ']', '"']);
    const isValueEndChar = (char) => valueEndChars.has(char) || /[0-9eE]|[a-z]/.test(char);
    const quotedTokenIsObjectKey = (index) => {
      let cursor = index + 1;
      let tokenEscaped = false;
      for (; cursor < source.length; cursor += 1) {
        const char = source[cursor];
        if (tokenEscaped) { tokenEscaped = false; continue; }
        if (char === '\\') { tokenEscaped = true; continue; }
        if (char === '"') break;
      }
      if (cursor >= source.length) return false;
      cursor += 1;
      while (/\s/.test(source[cursor] || '')) cursor += 1;
      return source[cursor] === ':';
    };
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (escaped) {
        out += char;
        escaped = false;
        continue;
      }
      if (inString) {
        out += char;
        if (char === '\\') escaped = true;
        else if (char === '"') {
          inString = false;
          previousSignificant = '"';
          previousValueEnded = true;
        }
        continue;
      }
      if (char === '"') {
        if (previousValueEnded && previousSignificant !== ':' && previousSignificant !== ',' && previousSignificant !== '[' && previousSignificant !== '{' && quotedTokenIsObjectKey(index)) {
          out = out.replace(/\s*$/, (space) => `,${space}`);
        }
        inString = true;
        out += char;
        previousSignificant = '"';
        previousValueEnded = false;
        continue;
      }
      if (!/\s/.test(char)) {
        if ((char === '{' || char === '[') && previousValueEnded && previousSignificant !== ':' && previousSignificant !== ',' && previousSignificant !== '[' && previousSignificant !== '{') {
          out = out.replace(/\s*$/, (space) => `,${space}`);
        }
        previousSignificant = char;
        previousValueEnded = isValueEndChar(char);
        if (char === ':' || char === ',' || char === '[' || char === '{') previousValueEnded = false;
      }
      out += char;
    }
    return out;
  },

  repairBareReasonArrays(text) {
    return String(text || '').replace(/"reasons"\s*:\s*\[\s*"trigger"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"evidence"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"confidence"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\]/g, (_, trigger, evidence, confidence) => `"reasons":[{"trigger":"${trigger}","evidence":"${evidence}","confidence":"${confidence}"}]`);
  },

  repairMisnestedMetricArrays(text) {
    return String(text || '')
      .replace(/("emotions"\s*:\s*\[[\s\S]*?\})(\s*,\s*)"playerFeelings"\s*:/g, '$1],"playerFeelings":')
      .replace(/("playerFeelings"\s*:\s*\[[\s\S]*?\})(\s*,\s*)"emotions"\s*:/g, '$1],"emotions":');
  },

  recoverAiResult(content) {
    const text = String(content || '').replace(/```(?:json)?|```/g, '');
    const data = {};
    ['sceneTitle', 'thinking', 'narration', 'speech', 'mind', 'mood', 'quest', 'characterIntent', 'controlFeeling', 'controlExperienceSummary'].forEach((key) => {
      const value = this.pickStringField(text, key);
      if (value) data[key] = value;
    });
    ['elapsedSeconds', 'trust', 'resistance', 'controlAdaptation'].forEach((key) => {
      const match = text.match(new RegExp(`"${key}"\\s*:\\s*(-?\\d+)`));
      if (match) data[key] = Number(match[1]);
    });
    const choices = this.pickStringArray(text, 'choices');
    if (choices.length) data.choices = choices;
    return data.narration || data.mind || data.choices ? data : null;
  },

  pickStringField(text, key) {
    const playerNext = 'refinedCity|currentLocation|refinedRole|workplace|position|refinedLivingStatus|relationships|parentStatus|parentDeathCause|worldbuildingNote|knownProfessions|items|wearing|profileEnrichedAt';
    const next = `thinking|narration|speech|mind|mood|quest|characterIntent|controlFeeling|controlExperienceSummary|choices|metricUpdates|appearedCharacters|statChanges|combatEvent|elapsedSeconds|trust|resistance|controlAdaptation|${playerNext}`;
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*,\\s*"(?:${next})"\\s*:|"\\s+"(?:${next})"\\s*:|"\\s*[,}])`));
    return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
  },

  pickStringArray(text, key) {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`));
    if (!match) return [];
    return Array.from(match[1].matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)).map((x) => x[1].replace(/\\"/g, '"').trim()).filter(Boolean).slice(0, 4);
  },

  pickObjectArrayNames(text, key) {
    const match = String(text || '').match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]\\s*,\\s*"|\\]\\s*}|$)`));
    if (!match) return [];
    return Array.from(match[1].matchAll(/"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)).map((x) => x[1].replace(/\\"/g, '"').trim()).filter(Boolean).slice(0, 12);
  },
};
