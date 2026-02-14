/**
 * App — inicialização e event handlers
 */

(function initApp() {
  stateManager.subscribe(render);

  engine.boot().then(() => {
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeydown);
    document.querySelector('#folderForm')?.addEventListener('submit', handleSubmitFolder);
    document.querySelector('#editFolderForm')?.addEventListener('submit', handleSubmitEditFolder);
    document.querySelector('#promptForm')?.addEventListener('submit', handleSubmitPrompt);
    document.querySelector('#promptEditForm')?.addEventListener('submit', handleSubmitEditPrompt);
    document.querySelector('#licenseForm')?.addEventListener('submit', handleSubmitLicense);
    document.querySelector('#importForm')?.addEventListener('submit', handleSubmitImport);
    document.querySelector('#btnCreateFolder')?.addEventListener('click', handleOpenFolderDialog);
    document.querySelector('#btnCreatePrompt')?.addEventListener('click', handleOpenPromptDialog);
    document.querySelector('#btnLicenseKey')?.addEventListener('click', handleOpenLicenseDialog);
    document.querySelector('#btnImportFolder')?.addEventListener('click', handleOpenImportDialog);
    document.querySelector('#importFile')?.addEventListener('change', handleImportFile);
  });
})();

function handleGlobalClick(e) {
  const actionEl = e.target.closest('[data-action]');
  const action = actionEl?.dataset?.action;
  const folderId = actionEl?.dataset?.folderId || e.target.closest('[data-folder-id]')?.dataset?.folderId;
  const promptId = actionEl?.dataset?.promptId || e.target.closest('[data-prompt-id]')?.dataset?.promptId;

  if (!action) return;

  switch (action) {
    case 'toggle-folder':
      if (!e.target.closest('.folder__actions')) {
        const fid = e.target.closest('[data-folder-id]')?.dataset?.folderId;
        if (fid) toggleFolder(fid);
      }
      break;
    case 'edit-folder':
      e.stopPropagation();
      if (folderId) openEditFolderDialog(folderId);
      break;
    case 'delete-folder':
      e.stopPropagation();
      if (folderId) openDeleteFolderDialog(folderId);
      break;
    case 'export-folder':
      e.stopPropagation();
      if (folderId) engine.handleExportFolder(folderId);
      break;
    case 'copy-prompt':
      e.stopPropagation();
      if (promptId) handleCopyPrompt(promptId);
      break;
    case 'edit-prompt':
      e.stopPropagation();
      if (promptId) openEditPromptDialog(promptId);
      break;
    case 'delete-prompt':
      e.stopPropagation();
      if (promptId) openConfirmDeletePromptDialog(promptId);
      break;
    case 'close-folder':
      closeDialog('folderDialogOpen');
      break;
    case 'close-edit-folder':
      closeDialog('editFolderDialogOpen');
      break;
    case 'close-delete-folder':
      closeDialog('deleteFolderDialogOpen');
      break;
    case 'close-prompt':
      closeDialog('promptDialogOpen');
      break;
    case 'close-edit-prompt':
      closeDialog('promptEditDialogOpen');
      break;
    case 'close-confirm-delete-prompt':
      closeDialog('confirmDeletePromptDialogOpen');
      break;
    case 'close-license':
      closeDialog('licenseDialogOpen');
      break;
    case 'close-import':
      closeDialog('importDialogOpen');
      break;
    case 'confirm-delete-folder':
      handleConfirmDeleteFolder();
      break;
    case 'confirm-delete-prompt':
      handleConfirmDeletePrompt();
      break;
    case 'retry':
      engine.boot();
      break;
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    const state = getState();
    const dialogs = state.ui.dialogs;
    if (dialogs.folderDialogOpen) closeDialog('folderDialogOpen');
    else if (dialogs.editFolderDialogOpen) closeDialog('editFolderDialogOpen');
    else if (dialogs.deleteFolderDialogOpen) closeDialog('deleteFolderDialogOpen');
    else if (dialogs.promptDialogOpen) closeDialog('promptDialogOpen');
    else if (dialogs.promptEditDialogOpen) closeDialog('promptEditDialogOpen');
    else if (dialogs.confirmDeletePromptDialogOpen) closeDialog('confirmDeletePromptDialogOpen');
    else if (dialogs.licenseDialogOpen) closeDialog('licenseDialogOpen');
    else if (dialogs.importDialogOpen) closeDialog('importDialogOpen');
  }
}

function closeDialog(dialogKey) {
  stateManager.setState({
    ui: {
      ...getState().ui,
      dialogs: { ...getState().ui.dialogs, [dialogKey]: false }
    }
  });
}

function openDialog(dialogKey) {
  stateManager.setState({
    ui: {
      ...getState().ui,
      dialogs: { ...getState().ui.dialogs, [dialogKey]: true }
    }
  });
}

function toggleFolder(folderId) {
  const expanded = { ...getState().ui.expandedFolders };
  expanded[folderId] = !expanded[folderId];
  stateManager.setState({ ui: { ...getState().ui, expandedFolders: expanded } });
}

function handleOpenFolderDialog() {
  document.getElementById('folderName').value = '';
  openDialog('folderDialogOpen');
  setTimeout(() => document.getElementById('folderName')?.focus(), 50);
}

function handleOpenPromptDialog() {
  if (!engine.handleCreatePromptIntent()) return;
  populateFolderSelect(document.getElementById('promptFolder'));
  document.getElementById('promptName').value = '';
  document.getElementById('promptConteudo').value = '';
  openDialog('promptDialogOpen');
  setTimeout(() => document.getElementById('promptName')?.focus(), 50);
}

function handleOpenLicenseDialog() {
  document.getElementById('licenseKey').value = '';
  openDialog('licenseDialogOpen');
  setTimeout(() => document.getElementById('licenseKey')?.focus(), 50);
}

function handleOpenImportDialog() {
  if (!engine.handleImportFolderIntent()) return;
  document.getElementById('importJson').value = '';
  document.getElementById('importFile').value = '';
  openDialog('importDialogOpen');
  setTimeout(() => document.getElementById('importJson')?.focus(), 50);
}

function openEditFolderDialog(folderId) {
  const folder = getState().data.folders[folderId];
  if (!folder) return;
  document.getElementById('editFolderId').value = folderId;
  document.getElementById('editFolderName').value = folder.name;
  openDialog('editFolderDialogOpen');
  setTimeout(() => document.getElementById('editFolderName')?.focus(), 50);
}

function openDeleteFolderDialog(folderId) {
  const folder = getState().data.folders[folderId];
  if (!folder) return;
  const nameEl = document.getElementById('deleteFolderName');
  if (nameEl) nameEl.textContent = folder.name;
  const btn = document.querySelector('[data-action="confirm-delete-folder"]');
  if (btn) btn.dataset.folderId = folderId;
  document.getElementById('deleteFolderConfirm').value = '';
  openDialog('deleteFolderDialogOpen');
  setTimeout(() => document.getElementById('deleteFolderConfirm')?.focus(), 50);
}

function openEditPromptDialog(promptId) {
  const prompt = getState().data.prompts[promptId];
  if (!prompt) return;
  document.getElementById('promptEditId').value = promptId;
  document.getElementById('promptEditName').value = prompt.nome;
  document.getElementById('promptEditConteudo').value = prompt.conteudo;
  populateFolderSelect(document.getElementById('promptEditFolder'), prompt.folderId);
  openDialog('promptEditDialogOpen');
  setTimeout(() => document.getElementById('promptEditName')?.focus(), 50);
}

function openConfirmDeletePromptDialog(promptId) {
  document.querySelector('[data-action="confirm-delete-prompt"]').dataset.promptId = promptId;
  openDialog('confirmDeletePromptDialogOpen');
}

function populateFolderSelect(selectEl, selectedId) {
  if (!selectEl) return;
  const folders = Object.values(getState().data.folders);
  selectEl.innerHTML = folders.map((f) =>
    `<option value="${f.id}" ${f.id === selectedId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`
  ).join('');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function handleSubmitFolder(e) {
  e.preventDefault();
  const name = document.getElementById('folderName').value?.trim();
  engine.handleCreateFolder(name);
}

function handleSubmitEditFolder(e) {
  e.preventDefault();
  const folderId = document.getElementById('editFolderId').value;
  const name = document.getElementById('editFolderName').value?.trim();
  engine.handleUpdateFolder(folderId, name);
}

function handleSubmitPrompt(e) {
  e.preventDefault();
  const folderId = document.getElementById('promptFolder').value;
  const nome = document.getElementById('promptName').value?.trim();
  const conteudo = document.getElementById('promptConteudo').value?.trim();
  engine.handleCreatePrompt(folderId, nome, conteudo);
}

function handleSubmitEditPrompt(e) {
  e.preventDefault();
  const promptId = document.getElementById('promptEditId').value;
  const folderId = document.getElementById('promptEditFolder').value;
  const nome = document.getElementById('promptEditName').value?.trim();
  const conteudo = document.getElementById('promptEditConteudo').value?.trim();
  engine.handleUpdatePrompt(promptId, { folderId, nome, conteudo });
}

function handleSubmitLicense(e) {
  e.preventDefault();
  const key = document.getElementById('licenseKey').value?.trim();
  engine.handleActivatePremium(key);
}

function handleSubmitImport(e) {
  e.preventDefault();
  const jsonText = document.getElementById('importJson').value?.trim();
  engine.handleImportFolder(jsonText);
}

function handleConfirmDeleteFolder() {
  const btn = document.querySelector('[data-action="confirm-delete-folder"]');
  const folderId = btn?.dataset?.folderId;
  const confirmName = document.getElementById('deleteFolderConfirm').value;
  const folder = getState().data.folders[folderId];
  if (!folder) return;
  engine.handleDeleteFolder(folderId, confirmName);
}

function handleConfirmDeletePrompt() {
  const btn = document.querySelector('[data-action="confirm-delete-prompt"]');
  const promptId = btn?.dataset?.promptId;
  if (promptId) engine.handleDeletePrompt(promptId);
}

function handleCopyPrompt(promptId) {
  const prompt = getState().data.prompts[promptId];
  if (!prompt) return;
  copyToClipboard(prompt.conteudo)
    .then(() => showToast(TOAST_MESSAGES.shareSuccess))
    .catch(() => showToast(TOAST_MESSAGES.shareError));
}

function handleImportFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('importJson').value = ev.target?.result || '';
  };
  reader.readAsText(file);
}
