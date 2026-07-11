// Mobile host bridge stub
export const mobileHostBridge = {
  kind() {
    return 'mobile';
  },
  isDesktop() {
    return false;
  },
  isMobile() {
    return true;
  },
  isDev() {
    return true;
  },
  capabilities() {
    return {
      files: false,
      storage: true,
      webview: true,
      permissions: false,
    };
  },
  async ready() {
    return true;
  },
};
