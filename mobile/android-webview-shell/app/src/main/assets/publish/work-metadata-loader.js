window.GameData = window.GameData || {};
window.GameModules = window.GameModules || {};

window.GameModules.workMetadata = {
  promise: null,

  load() {
    if (this.promise) return this.promise;
    this.promise = (async () => {
      window.GameData.loreSources = [];
      window.GameData.storyStarts = {
        '原创世界': { year: 2026, month: 6, day: 12, hour: 8, minute: 0, second: 0 },
      };
      window.GameData.characterCatalog = {
        version: 'work-metadata-v1',
        source: 'assets/*/metadata',
        works: [],
      };
      const manifest = Array.isArray(window.GameData.workMetadataManifest)
        ? window.GameData.workMetadataManifest
        : [];
      if (!manifest.length) throw new Error('作品元数据清单为空');
      const scripts = manifest.flatMap((work) => work.scripts || []);
      await window.GameBoot.loadScripts(scripts);
      return {
        works: window.GameData.characterCatalog.works,
        loreSources: window.GameData.loreSources,
        storyStarts: window.GameData.storyStarts,
      };
    })().catch((error) => {
      this.promise = null;
      throw error;
    });
    return this.promise;
  },
};
