/**
 * App — ui: clique global, teclado, copiar prompt, import file
 */
function handleGlobalClick(e) {
  const actionEl = e.target.closest('[data-action]');
  const action = actionEl && actionEl.dataset.action;
  const folderId = actionEl && actionEl.dataset.folderId || e.target.closest('[data-folder-id]') && e.target.closest('[data-folder-id]').dataset.folderId;
  const promptId = actionEl && actionEl.dataset.promptId || e.target.closest('[data-prompt-id]') && e.target.closest('[data-prompt-id]').dataset.promptId;

  if (!action) return;

  switch (action) {
    case 'toggle-folder':
      if (!e.target.closest('.folder__actions')) {
        const fid = e.target.closest('[data-folder-id]') && e.target.closest('[data-folder-id]').dataset.folderId;
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
    case 'open-stripe-checkout': {
      const state = getState();
      const userId = state.user?.id || state.user?.user_id;
      if (!userId) {
        if (typeof showToast === 'function') showToast(TOAST_MESSAGES.premiumFeature || 'Faça login para continuar.');
        return;
      }
      const url = typeof STRIPE_CHECKOUT_URL !== 'undefined'
        ? STRIPE_CHECKOUT_URL + '?client_reference_id=' + encodeURIComponent(userId)
        : '';
      if (url && typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: url });
      } else if (url) {
        window.open(url, '_blank');
      }
      closeDialog('licenseDialogOpen');
      break;
    }
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
    case 'show-create-account':
      stateManager.setState({ auth: { ...getState().auth, screen: 'createAccount' } });
      break;
    case 'show-login':
      stateManager.setState({ auth: { ...getState().auth, screen: 'login' } });
      break;
    case 'logout':
      handleLogout();
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

function handleCopyPrompt(promptId) {
  const found = findPromptById(promptId);
  if (!found) return;
  copyToClipboard(found.prompt.content)
    .then(function () { showToast(TOAST_MESSAGES.shareSuccess); })
    .catch(function () { showToast(TOAST_MESSAGES.shareError); });
}

function handleImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    document.getElementById('importJson').value = ev.target && ev.target.result || '';
  };
  reader.readAsText(file);
}
