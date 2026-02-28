/**
 * Core — expõe engine globalmente
 */
(function () {
  var g = typeof globalThis !== 'undefined' ? globalThis : window;
  g.engine = window.engine || {};
})();
