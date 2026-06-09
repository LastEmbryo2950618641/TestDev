/**
 * 首页角色预览：基于作品资料检索，生成简短出生与背景摘要。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterBrief = {
  async ensure(store) {
    const character = store.character;
    if (!character?.id || store.characterBriefs[character.id]) return;
    store.characterBriefs = { ...store.characterBriefs, [character.id]: this.fallback(character) };
    store.characterBriefBusy = true;
    try {
      const refs = await window.GameModules.rag.search(`${character.name} ${character.work} 出生 背景 身世 经历`, {
        limit: 6,
        sourceHint: character.work,
        strictSource: true,
        contextRadius: 1,
      });
      store.characterLoreRefs = { ...store.characterLoreRefs, [character.id]: refs };
      const context = refs.map((x) => x.text).join('\n').slice(0, 1600);
      const brief = await this.generate(character, context);
      store.characterBriefs = { ...store.characterBriefs, [character.id]: brief };
    } catch (err) {
      console.warn('角色简介生成失败:', err.message, err.stack);
      store.characterLoreRefs = { ...store.characterLoreRefs, [character.id]: character.refs || [] };
      store.characterBriefs = { ...store.characterBriefs, [character.id]: this.fallback(character) };
    } finally {
      store.characterBriefBusy = false;
    }
  },

  async generate(character, context) {
    if (!window.dzmm?.completions) return this.fallback(character);
    let buffer = '';
    await window.dzmm.completions({
      model: 'nalang-turbo-0826',
      maxTokens: 260,
      messages: [{ role: 'user', content: `基于资料为角色生成首页简短预览，只写出生/身世/背景，80字内，不要剧透长剧情。角色：${character.name}｜${character.work}｜${character.role}。资料：${context || character.detail || character.personality}` }],
    }, (chunk) => { buffer += chunk; });
    return (buffer.trim() || this.fallback(character)).slice(0, 90);
  },

  fallback(character) {
    const text = character.detail || character.personality || `${character.name}来自${character.work || '未知世界'}，身份为${character.role || '角色'}。`;
    return String(text).slice(0, 90);
  },
};
