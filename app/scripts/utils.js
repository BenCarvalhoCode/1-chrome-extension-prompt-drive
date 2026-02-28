/**
 * Utils — operações auxiliares e helpers
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
  // Novo formato: folders array com prompts aninhados (id, name, content)
  if (Array.isArray(data.folders)) {
    const hasNestedPrompts = data.folders.some((f) => Array.isArray(f.prompts));
    if (hasNestedPrompts) {
      for (const f of data.folders) {
        if (!f.id || typeof f.name !== 'string') return false;
        for (const p of f.prompts || []) {
          if (!p.id || (p.name === undefined && p.nome === undefined)) return false;
        }
      }
      return true;
    }
    // Formato legado: folders + prompts no raiz (id, nome, conteudo)
    if (Array.isArray(data.prompts)) {
      for (const p of data.prompts) {
        if (!p.id || (p.nome === undefined && p.name === undefined) || (p.conteudo === undefined && p.content === undefined)) return false;
      }
      return true;
    }
  }
  // Formato folder + prompts (export de uma pasta)
  if (data.folder && Array.isArray(data.prompts)) {
    for (const p of data.prompts) {
      if (!p.id || (p.nome === undefined && p.name === undefined) || (p.conteudo === undefined && p.content === undefined)) return false;
    }
    return true;
  }
  return false;
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
