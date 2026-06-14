window.GameModules = window.GameModules || {};
window.GameModules.rag = window.GameModules.rag || {};

Object.assign(window.GameModules.rag, {
  async fetchCachedText(url) {
    const source = this.sourceForUrl(url);
    if (!source?.cache) return null;
    const rel = this.relativePath(source, url);
    if (!rel) return null;
    const cache = await this.loadSourceCache(source);
    if (!cache) return null;
    const text = cache.files?.[rel];
    if (typeof text !== 'string') return null;
    this.log('读取资料快照', source.name, rel);
    return text;
  },

  sourceForUrl(url) {
    return (window.GameData?.loreSources || []).find((source) => url.startsWith(`${source.base}/`));
  },

  relativePath(source, url) {
    return url.slice(source.base.length + 1).replace(/^AI设定库\//, '').replace(/^\.\//, '');
  },

  async loadSourceCache(source) {
    const useCache = window.GameModules.cache.enabled('files');
    if (useCache && this.sourceCache[source.name]) return this.sourceCache[source.name];
    const embedded = this.embeddedSourceCache(source);
    if (embedded) {
      if (useCache) this.sourceCache[source.name] = embedded;
      return embedded;
    }
    for (const url of this.cacheUrlCandidates(source.cache)) {
      try {
        this.log('读取资料快照文件', url);
        const res = await fetch(encodeURI(url));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (useCache) this.sourceCache[source.name] = data;
        return data;
      } catch (err) {
        console.warn('资料快照读取失败:', source.name, url, err.message);
      }
    }
    if (useCache) this.sourceCache[source.name] = null;
    return null;
  },

  embeddedSourceCache(source) {
    const key = String(source.cache || '').split('/').pop();
    const data = window.GameData?.loreCache?.[key];
    if (data) this.log('读取内联资料快照', source.name, key);
    return data || null;
  },

  cacheUrlCandidates(cachePath) {
    return this.roots('cacheRoots').map((root) => this.joinRoot(root, cachePath));
  },
});
