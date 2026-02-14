/**
 * Contrato de integração com backend — stub por enquanto
 * Centraliza todas as chamadas ao backend do app.
 * Por enquanto: console.log com ação e parâmetros.
 */

function createFolder(payload) {
  console.log('[API] createFolder', payload);
}

function updateFolder(payload) {
  console.log('[API] updateFolder', payload);
}

function deleteFolder(payload) {
  console.log('[API] deleteFolder', payload);
}

function createPrompt(payload) {
  console.log('[API] createPrompt', payload);
}

function updatePrompt(payload) {
  console.log('[API] updatePrompt', payload);
}

function deletePrompt(payload) {
  console.log('[API] deletePrompt', payload);
}

function activateLicenseKey(payload) {
  console.log('[API] activateLicenseKey', payload);
}

const api = {
  createFolder,
  updateFolder,
  deleteFolder,
  createPrompt,
  updatePrompt,
  deletePrompt,
  activateLicenseKey
};
