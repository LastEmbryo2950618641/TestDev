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

  async generate(character) {
    return this.fallback(character);
  },

  terms(character) {
    return [character.name, ...(character.aliases || [])].filter((x) => String(x || '').length >= 2);
  },

  fallbackRefs(character) {
    return (character.refs || []).filter((ref) => this.terms(character).some((term) => ref.text?.includes(term))).slice(0, 4);
  },

  fallback(character) {
    const work = character.work || '未知世界';
    const role = character.role || '角色';
    const family = this.familyHint(character);
    return `${character.name}来自《${work}》，${family}${role}。`;
  },

  familyHint(character) {
    const text = `${character.name} ${character.role || ''} ${(character.aliases || []).join(' ')}`;
    if (/爱因兹|伊莉雅/.test(text)) return '与爱因兹贝伦家族相关，身份为';
    if (/间桐|远坂樱|Sakura/.test(text)) return '与间桐家和远坂家因缘相关，身份为';
    if (/远坂|凛/.test(text)) return '与远坂家魔术师血脉相关，身份为';
    if (/卫宫/.test(text)) return '与卫宫家和圣杯战争因缘相关，身份为';
    return '身份为';
  },
};
