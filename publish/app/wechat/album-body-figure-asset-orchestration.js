window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumBodyFigureAssetOrchestration = {
  async saveGeneratedBodyFigureAsset(
    imageUrl = '',
    kind = 'natural',
    contact = this.wechatAlbumContact(),
    drawResult = {},
    drawOptions = {},
  ) {
    const meta = this.buildGeneratedBodyFigureMeta(kind, contact, drawResult, drawOptions);
    const timestamp = Date.now();
    try {
      const res = await window.GameModules.platform.core.assets.bodyFigure.saveImage({
        imageUrl,
        ownerId: meta.ownerId,
        kind,
        timestamp,
        meta,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      window.GameModules.bodyFigure?.registerEntry?.(
        data.entry,
        data.meta || {
          ...meta,
          id: data.path,
          image: String(data.imagePath || '').split('/').pop() || 'figure.png',
        },
      );
      const bound = await window.GameModules.bodyFigure?.bindCurrentFigure?.(
        data.path,
        meta.ownerId,
        contact?.name || meta.ownerName || '',
        { stateKind: meta.stateKind, force: true },
      );
      if (bound && !bound.ok) throw new Error(bound.error || '绑定当前形象图失败');
      return data;
    } catch (err) {
      console.warn('[body-figure] 生成形象图本地保存失败:', err?.message || err);
      this.wechatError = `图片已生成，但保存到 body-figures 失败：${err?.message || err}`;
      return null;
    }
  },
};
