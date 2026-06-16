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

  async generateJsonWithRetry(options) {
    const max = options.max ?? 2;
    let prompt = options.prompt;
    let lastText = '';
    let lastError = null;
    for (let i = 0; i < max; i += 1) {
      lastText = await this.requestCompletion({ model: options.model, prompt, maxTokens: options.maxTokens, source: options.source || 'json-utils', timeoutMs: options.timeoutMs || 90000 });
      try {
        const parsed = options.parse ? options.parse(lastText) : this.parseLoose(lastText);
        return options.validate ? options.validate(parsed) : parsed;
      } catch (err) {
        lastError = err;
        console.warn('[JSON重试] AI返回格式校验失败，准备生成修复提示:', {
          source: options.source || 'json-utils',
          attempt: i + 1,
          max,
          error: err?.message || 'unknown',
          stack: err?.stack || '',
          rawPreview: String(lastText || '').slice(0, 1200),
        });
        if (i === max - 1) break;
        prompt = await this.repairPrompt(options.format || options.prompt, lastText, err, options.repairHint || '');
      }
    }
    const error = new Error(`AI返回格式错误: ${lastError?.message || 'unknown'}`);
    error.cause = lastError;
    error.rawOutput = lastText;
    throw error;
  },

  async requestCompletion({ model, prompt, maxTokens, source = 'json-utils', timeoutMs = 90000, maxAttempts }) {
    return window.GameModules.aiRequest.complete({ source, model, maxTokens, prompt, timeoutMs, maxAttempts });
  },

  async repairPrompt(format, badOutput, err, hint = '') {
    return window.GameModules.promptTemplates.render('json-repair', { 错误: err?.message || 'unknown', 原要求: String(format || '').slice(0, 3200), 修复补充要求: String(hint || '').slice(0, 1400), 错误输出: String(badOutput || '').slice(0, 1200) });
  },

  repairJson(json) {
    return this.trimDanglingProperty(String(json || ''))
      .replace(/：/g, ':')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/([}\]"0-9]|true|false|null)\s*，\s*(")/g, '$1,$2')
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/([{,]\s*)([\u4e00-\u9fa5][\u4e00-\u9fa5\w-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value) => `:"${value.replace(/"/g, '\\"')}"`)
      .replace(/"\s+("(?:[^"\\]|\\.)*"\s*[,\]])/g, '",$1')
      .replace(/}\s*({)/g, '},$1')
      .replace(/\]\s*(\[)/g, '],$1')
      .replace(/"\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '",$1')
      .replace(/(\d|true|false|null)\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/([}\]])\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/:\s*([}\]])/g, ':null$1')
      .replace(/:\s*null\s*\]/g, ':null}]')
      .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*([}\]])/g, '$1')
      .replace(/,\s*([}\]])/g, '$1');
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
    const playerNext = 'refinedCity|refinedRole|workplace|position|refinedLivingStatus|relationships|parentStatus|parentDeathCause|worldbuildingNote|knownProfessions|equipment|items|wearing|profileEnrichedAt';
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
