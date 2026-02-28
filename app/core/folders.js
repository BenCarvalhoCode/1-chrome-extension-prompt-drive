/**
 * Core — handlers de pasta
 */
(function () {
  async function handleCreateFolder(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      showToast(TOAST_MESSAGES.folderError);
      return { success: false };
    }
    const folder = await api.createFolder({
      userId: getState().user.id || getState().user.user_id,
      folderName: trimmed
    });
    if (!folder) return { success: false };
    stateManager.setState({
      data: {
        ...getState().data,
        folders: [...getState().data.folders, { ...folder, prompts: folder.prompts || [] }]
      },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, folderDialogOpen: false } }
    });
    showToast(TOAST_MESSAGES.folderCreated);
    return { success: true };
  }

  async function handleUpdateFolder(folderId, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      showToast(TOAST_MESSAGES.folderError);
      return { success: false };
    }
    const folders = getState().data.folders;
    const idx = folders.findIndex(function (f) { return f.id === folderId; });
    if (idx === -1) return { success: false };
    const result = await api.updateFolder({
      userId: getState().user.id || getState().user.user_id,
      folderId: folderId,
      folderName: trimmed
    });
    if (!result) return { success: false };
    const next = folders.map(function (f, i) { return i === idx ? { ...f, name: trimmed } : f; });
    stateManager.setState({
      data: { ...getState().data, folders: next },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, editFolderDialogOpen: false } }
    });
    showToast(TOAST_MESSAGES.folderUpdated);
    return { success: true };
  }

  async function handleDeleteFolder(folderId, confirmName) {
    const folders = getState().data.folders;
    const folder = folders.find(function (f) { return f.id === folderId; });
    if (!folder) return { success: false };
    if (confirmName !== folder.name) {
      showToast(TOAST_MESSAGES.folderNameMismatch);
      return { success: false };
    }
    const ok = await api.deleteFolder({
      userId: getState().user.id || getState().user.user_id,
      folderId: folderId
    });
    if (!ok) return { success: false };
    const nextFolders = folders.filter(function (f) { return f.id !== folderId; });
    const ef = { ...getState().ui.expandedFolders };
    delete ef[folderId];
    stateManager.setState({
      data: { ...getState().data, folders: nextFolders },
      ui: {
        ...getState().ui,
        dialogs: { ...getState().ui.dialogs, deleteFolderDialogOpen: false },
        expandedFolders: ef
      }
    });
    showToast(TOAST_MESSAGES.folderDeleted);
    return { success: true };
  }

  window.engine = window.engine || {};
  window.engine.handleCreateFolder = handleCreateFolder;
  window.engine.handleUpdateFolder = handleUpdateFolder;
  window.engine.handleDeleteFolder = handleDeleteFolder;
})();
