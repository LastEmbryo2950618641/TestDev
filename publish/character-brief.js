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
      const terms = this.terms(character);
      const knownRefs = this.fallbackRefs(character);
      const refs = knownRefs.length ? await window.GameModules.rag.expandKnownRefs(knownRefs, {
        sourceHint: character.work,
        contextRadius: 1,
      }) : await window.GameModules.rag.search(`${terms.join(' ')} 身世 背景 家族 经历`, {
        limit: 4,
        sourceHint: character.work,
        strictSource: true,
        contextRadius: 1,
        requiredTerms: terms,
      });
      const cleanRefs = refs.length ? refs : knownRefs;
      store.characterLoreRefs = { ...store.characterLoreRefs, [character.id]: cleanRefs };
      const context = cleanRefs.map((x) => x.text).join('\n').slice(0, 1800);
      const brief = await this.generate(character, context);
      store.characterBriefs = { ...store.characterBriefs, [character.id]: brief };
    } catch (err) {
      console.warn('角色简介生成失败:', err.message, err.stack);
      store.characterLoreRefs = { ...store.characterLoreRefs, [character.id]: this.fallbackRefs(character) };
      store.characterBriefs = { ...store.characterBriefs, [character.id]: this.fallback(character) };
    } finally {
      store.characterBriefBusy = false;
    }
  },

  async generate(character, context) {
    if (!context || !window.dzmm?.completions) return this.fallback(character);
    let buffer = '';
    await window.dzmm.completions({
      model: 'nalang-turbo-0826',
      maxTokens: 180,
      messages: [{ role: 'user', content: `把资料整理成角色出生/身世/背景摘要，只输出一句中文，60字内。不要引用原文，不要对白，不要动作剧情，不要分析资料。资料不足就写“${this.fallback(character)}”。角色：${character.name}｜${character.work}｜${character.role}。资料：${context}` }],
    }, (chunk) => { buffer += chunk; });
    return this.clean(buffer, character);
  },

  clean(text, character) {
    const value = String(text || '').replace(/[`*_#>「」"“”\n\r]/g, '').replace(/\s+/g, ' ').trim();
    if (!value || /资料|对白|chunk|来源|────|我认为|他说|她说/.test(value)) return this.fallback(character);
    return value.slice(0, 80);
  },

  terms(character) {
    return [character.name, ...(character.aliases || [])].filter((x) => String(x || '').length >= 2);
  },

  fallbackRefs(character) {
    return (character.refs || []).filter((ref) => this.terms(character).some((term) => ref.text?.includes(term))).slice(0, 4);
  },

  fallback(character) {
    const ref = this.fallbackRefs(character)[0]?.text;
    const text = ref || `${character.name}来自${character.work || '未知世界'}，身份为${character.role || '角色'}。`;
    return String(text).replace(/\s+/g, ' ').slice(0, 90);
  },
};
