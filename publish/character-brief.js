/**
 * 首页角色预览：读取本地人物设定卡，解析基础档案与详情。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterBrief = {
  async ensure(store) {
    const character = store.character;
    if (!character?.id || store.characterProfiles[character.id]) return;
    store.characterBriefBusy = true;
    try {
      const profile = await this.loadProfile(character);
      store.characterProfiles = { ...store.characterProfiles, [character.id]: profile };
    } catch (err) {
      console.warn('人物设定读取失败:', err.message, err.stack);
      store.characterProfiles = { ...store.characterProfiles, [character.id]: this.fallbackProfile(character) };
    } finally {
      store.characterBriefBusy = false;
    }
  },

  async loadProfile(character) {
    const source = this.sourceFor(character.work);
    if (!source) return this.fallbackProfile(character);
    const index = await this.fetchText(`${source.base}/01_按需加载_人物/人物索引.md`);
    const path = this.findCardPath(index, character) || await this.searchCardPath(source, character);
    const markdown = path ? await this.fetchText(`${source.base}/${path}`) : '';
    return this.parseProfile(character, source, path, markdown);
  },

  sourceFor(work) {
    const text = window.GameModules.rag.normalize(work || '');
    return (window.GameData?.loreSources || []).find((source) => [source.name, ...(source.aliases || [])]
      .some((name) => text.includes(window.GameModules.rag.normalize(name))));
  },

  findCardPath(index, character) {
    const names = [character.name, ...(character.aliases || [])].filter(Boolean);
    for (const name of names) {
      const line = String(index || '').split('\n').find((row) => row.includes(name) && row.includes('.md'));
      const path = this.extractPath(line);
      if (path) return path;
    }
    return '';
  },

  async searchCardPath(source, character) {
    const hits = await window.GameModules.rag.search(`${character.name} ${(character.aliases || []).join(' ')}`, { sourceHint: character.work, limit: 6 });
    return hits.map((x) => x.path).find((p) => /01_按需加载_人物\/.+\.md$/.test(p)) || '';
  },

  extractPath(text) {
    const raw = (String(text || '').match(/`([^`]+\.md)`/) || String(text || '').match(/([^\s|`]+\.md)/) || [])[1] || '';
    return raw.replace(/^AI设定库\//, '').replace(/^\.\//, '');
  },

  async fetchText(url) {
    return await window.GameModules.rag.fetchText(url);
  },

  parseProfile(character, source, path, markdown) {
    const md = String(markdown || '');
    const intro = md.split('\n').find((line) => line && !line.startsWith('#')) || character.detail || character.personality || '';
    return {
      source: source?.name || character.work || '未知作品', path: path || '', raw: md,
      summary: intro.trim(), basics: this.parseBasics(md, character), sections: this.parseSections(md),
    };
  },

  parseBasics(markdown, character) {
    const rows = [];
    const block = (String(markdown || '').split(/##\s*基础档案/)[1] || '').split(/\n##\s+/)[0] || '';
    for (const line of block.split('\n')) {
      const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
      if (!match || /---|项目/.test(match[1])) continue;
      rows.push({ label: match[1].trim(), value: match[2].trim() });
    }
    if (rows.length) return rows;
    return [
      { label: '姓名', value: character.name }, { label: '身份', value: character.role || '角色' },
      { label: '作品', value: character.work || '未知作品' }, { label: '性格', value: character.personality || character.detail || '暂无' },
    ];
  },

  parseSections(markdown) {
    return String(markdown || '').split(/\n(?=##\s+)/).map((block) => {
      const title = (block.match(/^##\s+(.+)$/m) || [])[1];
      if (!title || title === '基础档案') return null;
      const items = block.split('\n').slice(1).map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
      const body = block.split('\n').slice(1).filter((line) => line.trim() && !line.trim().startsWith('|')).join('\n').trim();
      return { title, items, body };
    }).filter(Boolean).slice(0, 12);
  },

  fallbackProfile(character) {
    return this.parseProfile(character, { name: character.work }, '', '');
  },
};
