/**
 * Service — operações auxiliares e helpers
 * Sem persistência. Gerar IDs, parse/validate JSON, clipboard, etc.
 */

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function validateLicenseKey(key) {
  return key === GOD_KEY_TO_PREMIUM_ACTIVATE;
}

function parseImportJson(text) {
  const cleanText = text.trim().replace(/^[\uFEFF\u200B-\u200D\u2060]/g, '');
  return JSON.parse(cleanText);
}

function validateImportSchema(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.folders)) return false;
  if (!Array.isArray(data.prompts)) return false;
  for (const p of data.prompts) {
    if (!p.id || !p.nome || !p.conteudo) return false;
  }
  return true;
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
