/**
 * Render — renderização/DOM a partir do state
 */

let toastTimeout = null;

function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.dataset.visible = 'true';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.dataset.visible = 'false';
    setTimeout(() => { el.hidden = true; }, 300);
  }, 3000);
}

function truncatePreview(text, max = PROMPT_PREVIEW_MAX_CHARS) {
  if (!text) return '';
  const t = String(text).trim();
  return t.length <= max ? t : t.slice(0, max) + '...';
}

function renderFoldersAndPrompts(state) {
  const mainContent = document.querySelector(DOM_IDS.mainContent);
  if (!mainContent) return;

  const folders = Array.isArray(state.data.folders) ? state.data.folders : [];
  if (folders.length === 0) {
    mainContent.innerHTML = '<div class="empty-state" data-testid="empty-folders">Nenhuma pasta criada ainda.</div>';
    return;
  }

  const sorted = [...folders].sort((a, b) => {
    const aTime = a.updatedAt || (a.prompts?.[0]?.created_at ? new Date(a.prompts[0].created_at).getTime() : 0);
    const bTime = b.updatedAt || (b.prompts?.[0]?.created_at ? new Date(b.prompts[0].created_at).getTime() : 0);
    return aTime - bTime;
  });
  const html = sorted.map((folder) => {
    const count = (folder.prompts || []).length;
    const isExpanded = !!state.ui.expandedFolders[folder.id];
    const isPremium = state.user.plan === 'premium';
    const exportBtn = isPremium
      ? `<button type="button" class="folder__export" data-action="export-folder" data-folder-id="${folder.id}" aria-label="Exportar pasta" title="Exportar pasta">📤</button>`
      : '';
    return `
      <div class="folder" data-folder-id="${folder.id}" data-action="toggle-folder">
        <div class="folder__header">
          <span class="folder__icon">📁</span>
          <span class="folder__name">${escapeHtml(folder.name)}</span>
          <span class="folder__count">${count}</span>
          <div class="folder__actions">
            <button type="button" class="folder__edit" data-action="edit-folder" data-folder-id="${folder.id}" aria-label="Editar pasta" title="Editar pasta">✏️</button>
            ${exportBtn}
            <button type="button" class="folder__delete" data-action="delete-folder" data-folder-id="${folder.id}" aria-label="Deletar pasta" title="Deletar pasta">🗑️</button>
          </div>
        </div>
        <div class="folder__prompts ${isExpanded ? 'folder__prompts--expanded' : ''}" data-folder-prompts="${folder.id}">
          ${renderPromptsList(state, folder.id, isExpanded)}
        </div>
      </div>
    `;
  }).join('');
  mainContent.innerHTML = `<div class="folders-list" id="foldersList">${html}</div>`;
}

function renderPromptsList(state, folderId, isExpanded) {
  const folder = (state.data.folders || []).find((f) => f.id === folderId);
  const prompts = folder ? (folder.prompts || []) : [];
  const sorted = [...prompts].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  if (sorted.length === 0) {
    return `<div class="prompts-empty">Nenhum prompt nesta pasta.</div>`;
  }
  if (!isExpanded) return '';
  return sorted.map((p) => {
    const preview = truncatePreview(p.content);
    return `
      <div class="prompt-item" data-prompt-id="${p.id}">
        <div class="prompt-item__content">
          <span class="prompt-item__name">${escapeHtml(p.name)}</span>
          <p class="prompt-item__preview">${escapeHtml(preview)}</p>
        </div>
        <div class="prompt-item__actions">
          <button type="button" data-action="copy-prompt" data-prompt-id="${p.id}" aria-label="Copiar prompt" title="Copiar">📋</button>
          <button type="button" data-action="edit-prompt" data-prompt-id="${p.id}" aria-label="Editar prompt" title="Editar">✏️</button>
          <button type="button" data-action="delete-prompt" data-prompt-id="${p.id}" aria-label="Excluir prompt" title="Excluir">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderHeader(state) {
  const counter = document.querySelector(DOM_IDS.promptCounter);
  const badge = document.querySelector(DOM_IDS.userPlanBadge);
  const btnImport = document.querySelector(DOM_IDS.btnImportFolder);
  const btnLicenseKey = document.querySelector(DOM_IDS.btnLicenseKey);
  if (counter) {
    const total = getPromptCountTotal();
    counter.textContent = state.user.plan === 'premium' ? `${total}/∞` : `${total}/${FREE_MAX_PROMPTS}`;
  }
  if (badge) {
    badge.textContent = state.user.plan === 'premium' ? 'Premium' : 'Free';
    badge.dataset.plan = state.user.plan;
  }
  if (btnImport) {
    btnImport.style.display = state.user.plan === 'premium' ? '' : 'none';
  }
  if (btnLicenseKey) {
    if (state.user.plan === 'premium') {
      btnLicenseKey.classList.add('btn--pro');
      btnLicenseKey.innerHTML = 'Pro';
      btnLicenseKey.title = 'Pro';
      btnLicenseKey.setAttribute('aria-label', 'Pro');
    } else {
      btnLicenseKey.classList.remove('btn--pro');
      btnLicenseKey.innerHTML = typeof KEY_ICON_SVG !== 'undefined' ? KEY_ICON_SVG : '';
      btnLicenseKey.title = 'Serial Key';
      btnLicenseKey.setAttribute('aria-label', 'Serial Key');
    }
  }
}

function renderMain(state) {
  if (state.ui.loading) {
    const main = document.querySelector(DOM_IDS.mainContent);
    if (main) main.innerHTML = '<div class="loading-state"><div class="loading-spinner" aria-hidden="true"></div><span>Carregando...</span></div>';
    return;
  }
  if (state.ui.error) {
    const main = document.querySelector(DOM_IDS.mainContent);
    if (main) {
      main.innerHTML = `<div class="error-state">${escapeHtml(state.ui.error.message)} <button type="button" data-action="retry">Tentar novamente</button></div>`;
    }
    return;
  }
  renderFoldersAndPrompts(state);
}

function updateDialogsVisibility(state) {
  const dialogs = state.ui.dialogs;
  const anyOpen = Object.values(dialogs).some(Boolean);
  if (anyOpen) document.body.style.overflow = 'hidden';
  else document.body.style.overflow = '';

  const setDialog = (id, open) => {
    const el = document.querySelector(id);
    if (!el) return;
    const overlay = el.closest('.dialog-overlay') || el;
    if (open) {
      overlay.hidden = false;
      overlay.dataset.open = 'true';
      const firstInput = overlay.querySelector('input:not([type="hidden"]), textarea, select');
      if (firstInput) setTimeout(() => firstInput.focus(), 50);
    } else {
      overlay.dataset.open = 'false';
      setTimeout(() => { overlay.hidden = true; }, 250);
    }
  };
  setDialog(DOM_IDS.folderDialog, dialogs.folderDialogOpen);
  setDialog(DOM_IDS.promptDialog, dialogs.promptDialogOpen);
  setDialog(DOM_IDS.promptEditDialog, dialogs.promptEditDialogOpen);
  setDialog(DOM_IDS.confirmDeletePromptDialog, dialogs.confirmDeletePromptDialogOpen);
  setDialog(DOM_IDS.deleteFolderDialog, dialogs.deleteFolderDialogOpen);
  setDialog(DOM_IDS.editFolderDialog, dialogs.editFolderDialogOpen);
  setDialog(DOM_IDS.licenseDialog, dialogs.licenseDialogOpen);
  setDialog(DOM_IDS.importDialog, dialogs.importDialogOpen);
}

function render(state) {
  renderAuthScreens(state);
  renderHeader(state);
  renderMain(state);
  updateDialogsVisibility(state);
}

function renderAuthScreens(state) {
  const loginEl = document.querySelector(DOM_IDS.loginScreen);
  const createEl = document.querySelector(DOM_IDS.createAccountScreen);
  const appEl = document.querySelector(DOM_IDS.appContent);
  const screen = (state.auth && state.auth.screen) !== undefined ? state.auth.screen : 'login';

  if (loginEl) {
    loginEl.hidden = screen !== 'login';
    loginEl.setAttribute('aria-hidden', screen !== 'login');
  }
  if (createEl) {
    createEl.hidden = screen !== 'createAccount';
    createEl.setAttribute('aria-hidden', screen !== 'createAccount');
  }
  if (appEl) {
    appEl.hidden = screen != null;
    appEl.setAttribute('aria-hidden', screen != null);
  }
}
