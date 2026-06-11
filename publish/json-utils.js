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
    let out = text.slice(start).replace(/```(?:json)?|```/g, '').trim();
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

  repairJson(json) {
    return String(json || '')
      .replace(/：/g, ':')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/([{,]\s*)([\u4e00-\u9fa5][\u4e00-\u9fa5\w-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value) => `:"${value.replace(/"/g, '\\"')}"`)
      .replace(/"\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '",$1')
      .replace(/(\d|true|false|null)\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/([}\]])\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/,\s*([}\]])/g, '$1');
  },
};
