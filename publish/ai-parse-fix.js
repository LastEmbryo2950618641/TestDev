/**
 * 主 AI JSON 宽松解析补丁：模型输出局部破损时尽量恢复正文和选项。
 */
window.GameModules = window.GameModules || {};

(() => {
  const ai = window.GameModules.ai;
  if (!ai) return;

  ai.parse = function parse(content, store, action) {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(content);
      console.log('[AI推演] JSON解析成功:', Object.keys(data));
      return { ...this.normalize(data, store, action), source: 'ai' };
    } catch (err) {
      const recovered = this.recoverPartialResult(content);
      if (recovered) {
        console.warn('[AI推演] JSON不完整，已恢复可用字段:', { fields: Object.keys(recovered), error: err.message });
        return { ...this.normalize(recovered, store, action), source: 'ai' };
      }
      console.warn('AI 返回解析失败，使用兜底:', err.message);
      return { ...window.GameModules.createFallbackResult(store, action), source: 'fallback' };
    }
  };

  ai.recoverPartialResult = function recoverPartialResult(content) {
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
  };

  ai.pickStringField = function pickStringField(text, key) {
    const next = 'thinking|narration|speech|mind|mood|quest|characterIntent|controlFeeling|controlExperienceSummary|choices|metricUpdates|appearedCharacters|statChanges|combatEvent|elapsedSeconds|trust|resistance|controlAdaptation';
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*,\\s*"(?:${next})"\\s*:|"\\s*[,}])`));
    return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
  };

  ai.pickStringArray = function pickStringArray(text, key) {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`));
    if (!match) return [];
    return Array.from(match[1].matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)).map((x) => x[1].replace(/\\"/g, '"').trim()).filter(Boolean).slice(0, 4);
  };
})();
