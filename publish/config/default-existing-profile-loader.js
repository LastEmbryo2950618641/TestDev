window.GameModules = window.GameModules || {};
window.GameModules.defaultExistingProfileSource = (() => {
  const scriptUrl = (() => {
    try { return document.currentScript?.src || ''; }
    catch (_) { return ''; }
  })();
  const mdUrl = (() => {
    try { return new URL('default-existing-profile.md', scriptUrl || document.baseURI).toString(); }
    catch (_) { return 'config/default-existing-profile.md'; }
  })();
  return { scriptUrl, mdUrl };
})();
