/**
 * API — License: activateLicenseKey
 */
(function () {
  function activateLicenseKey(payload) {
    console.log('[API] activateLicenseKey', payload);
  }

  window.api = window.api || {};
  window.api.activateLicenseKey = activateLicenseKey;
  (function () {
    var g = typeof globalThis !== 'undefined' ? globalThis : window;
    g.api = window.api;
  })();
})();
