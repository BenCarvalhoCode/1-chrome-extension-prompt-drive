/**
 * App — dialogs: abrir/fechar modais, preencher selects, helpers de UI dos dialogs
 */
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
  setTimeout(function () { document.getElementById('folderName').focus(); }, 50);
}

function handleOpenPromptDialog() {
  if (!engine.handleCreatePromptIntent()) return;
  populateFolderSelect(document.getElementById('promptFolder'));
  document.getElementById('promptName').value = '';
  document.getElementById('promptConteudo').value = '';
  openDialog('promptDialogOpen');
  setTimeout(function () { document.getElementById('promptName').focus(); }, 50);
}

function handleOpenLicenseDialog() {
  if (getState().user.plan === 'premium') {
    showToast(TOAST_MESSAGES.alreadyPremium);
    return;
  }
  openDialog('licenseDialogOpen');
}

function handleOpenImportDialog() {
  if (!engine.handleImportFolderIntent()) return;
  document.getElementById('importJson').value = '';
  document.getElementById('importFile').value = '';
  openDialog('importDialogOpen');
  setTimeout(function () { document.getElementById('importJson').focus(); }, 50);
}

function openEditFolderDialog(folderId) {
  const folder = getState().data.folders.find(function (f) { return f.id === folderId; });
  if (!folder) return;
  document.getElementById('editFolderId').value = folderId;
  document.getElementById('editFolderName').value = folder.name;
  openDialog('editFolderDialogOpen');
  setTimeout(function () { document.getElementById('editFolderName').focus(); }, 50);
}

function openDeleteFolderDialog(folderId) {
  const folder = getState().data.folders.find(function (f) { return f.id === folderId; });
  if (!folder) return;
  const nameEl = document.getElementById('deleteFolderName');
  if (nameEl) nameEl.textContent = folder.name;
  const btn = document.querySelector('[data-action="confirm-delete-folder"]');
  if (btn) btn.dataset.folderId = folderId;
  document.getElementById('deleteFolderConfirm').value = '';
  openDialog('deleteFolderDialogOpen');
  setTimeout(function () { document.getElementById('deleteFolderConfirm').focus(); }, 50);
}

function findPromptById(promptId) {
  const folders = getState().data.folders || [];
  for (var i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const prompt = (folder.prompts || []).find(function (p) { return p.id === promptId; });
    if (prompt) return { folder: folder, prompt: prompt };
  }
  return null;
}

function openEditPromptDialog(promptId) {
  const found = findPromptById(promptId);
  if (!found) return;
  const folder = found.folder;
  const prompt = found.prompt;
  document.getElementById('promptEditId').value = promptId;
  document.getElementById('promptEditName').value = prompt.name;
  document.getElementById('promptEditConteudo').value = prompt.content;
  populateFolderSelect(document.getElementById('promptEditFolder'), folder.id);
  openDialog('promptEditDialogOpen');
  setTimeout(function () { document.getElementById('promptEditName').focus(); }, 50);
}

function openConfirmDeletePromptDialog(promptId) {
  document.querySelector('[data-action="confirm-delete-prompt"]').dataset.promptId = promptId;
  openDialog('confirmDeletePromptDialogOpen');
}

function populateFolderSelect(selectEl, selectedId) {
  if (!selectEl) return;
  const folders = Array.isArray(getState().data.folders) ? getState().data.folders : [];
  selectEl.innerHTML = folders.map(function (f) {
    return '<option value="' + f.id + '"' + (f.id === selectedId ? ' selected' : '') + '>' + escapeHtml(f.name) + '</option>';
  }).join('');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
