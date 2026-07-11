// Mobile assets bridge stub
export const mobileAssetsBridge = {
  assetBasePath(relative = '') {
    return relative;
  },
  async loadIndex() {
    throw new Error('mobile assets bridge not implemented');
  },
  async saveMeta() {
    throw new Error('mobile assets bridge not implemented');
  },
  async saveImage() {
    throw new Error('mobile assets bridge not implemented');
  },
};
