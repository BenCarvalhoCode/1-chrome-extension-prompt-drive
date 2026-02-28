/**
 * API — License: activateLicenseKey
 * Retorna Promise<{ success: boolean, expiry?: number }>. Sem backend, retorna { success: false }.
 */
(function () {
  function activateLicenseKey(payload) {
    return Promise.resolve({ success: false });
  }

  window.api = window.api || {};
  window.api.activateLicenseKey = activateLicenseKey;
  (function () {
    var g = typeof globalThis !== 'undefined' ? globalThis : window;
    g.api = window.api;
  })();
})();
