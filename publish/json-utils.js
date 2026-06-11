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
    const json = this.extractJson(String(text || '').replace(/```(?:json)?|```/g, '').trim());
    try {
      return JSON.parse(json);
    } catch (_) {
      return JSON.parse(this.repairJson(json));
    }
  },

  repairJson(json) {
    return String(json || '')
      .replace(/：/g, ':')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/([{,]\s*)([\u4e00-\u9fa5][\u4e00-\u9fa5\w-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value) => `:"${value.replace(/"/g, '\\"')}"`)
      .replace(/,\s*([}\]])/g, '$1');
  },
};
