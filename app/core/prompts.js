/**
 * Core — handlers de prompt
 */
(function () {
  function findPromptAndFolder(promptId) {
    const folders = getState().data.folders;
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      const promptIdx = (folder.prompts || []).findIndex(function (p) { return p.id === promptId; });
      if (promptIdx !== -1) return { folder: folder, folderIdx: i, prompt: folder.prompts[promptIdx], promptIdx: promptIdx };
    }
    return null;
  }

  function handleCreatePromptIntent() {
    const plan = getState().user.plan;
    const total = getPromptCountTotal();
    if (plan === 'free' && total >= FREE_MAX_PROMPTS) {
      showToast(TOAST_MESSAGES.limitReached);
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: SALES_LANDING_PAGE_URL });
      }
      return false;
    }
    return true;
  }

  async function handleCreatePrompt(folderId, nome, conteudo) {
    const fId = (folderId || '').trim();
    const n = (nome || '').trim();
    const c = (conteudo || '').trim();
    if (!fId || !n || !c) {
      showToast(TOAST_MESSAGES.promptError);
      return { success: false };
    }
    const total = getPromptCountTotal();
    if (getState().user.plan === 'free' && total >= FREE_MAX_PROMPTS) {
      showToast(TOAST_MESSAGES.limitReached);
      return { success: false };
    }
    const folders = getState().data.folders;
    const folderIdx = folders.findIndex(function (f) { return f.id === fId; });
    if (folderIdx === -1) return { success: false };

    const existingPrompts = folders[folderIdx].prompts || [];
    const nameLower = n.trim().toLowerCase();
    const duplicate = existingPrompts.some(function (p) { return (p.name || '').trim().toLowerCase() === nameLower; });
    if (duplicate) {
      showToast(TOAST_MESSAGES.promptDuplicateName);
      return { success: false };
    }

    const created = await api.createPrompt({
      userId: getState().user.id || getState().user.user_id,
      folder_id: fId,
      name: n,
      content: c
    });
    if (!created) return { success: false };

    const prompt = {
      id: created.id,
      name: created.name ?? n,
      content: created.content ?? c,
      created_at: created.created_at || new Date().toISOString()
    };
    const nextFolders = folders.map(function (f, i) {
      return i === folderIdx ? { ...f, prompts: [...(f.prompts || []), prompt] } : f;
    });
    stateManager.setState({
      data: { ...getState().data, folders: nextFolders },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptDialogOpen: false } }
    });
    showToast(TOAST_MESSAGES.promptCreated);
    return { success: true };
  }

  async function handleUpdatePrompt(promptId, patch) {
    const found = findPromptAndFolder(promptId);
    if (!found) return { success: false };
    const folder = found.folder;
    const folderIdx = found.folderIdx;
    const prompt = found.prompt;
    const promptIdx = found.promptIdx;
    const newName = patch.nome !== undefined ? patch.nome : prompt.name;
    const newContent = patch.conteudo !== undefined ? patch.conteudo : prompt.content;
    const newFolderId = patch.folderId !== undefined ? patch.folderId : folder.id;

    const targetFolder = getState().data.folders.find(function (f) { return f.id === newFolderId; });
    if (targetFolder) {
      const nameLower = (newName || '').trim().toLowerCase();
      const hasDuplicate = (targetFolder.prompts || []).some(
        function (p) { return p.id !== promptId && (p.name || '').trim().toLowerCase() === nameLower; }
      );
      if (hasDuplicate) {
        showToast(TOAST_MESSAGES.promptDuplicateName);
        return { success: false };
      }
    }

    const result = await api.updatePrompt({
      userId: getState().user.id || getState().user.user_id,
      promptId: promptId,
      name: newName,
      content: newContent,
      folder_id: newFolderId !== folder.id ? newFolderId : undefined
    });
    if (!result) return { success: false };

    if (newFolderId === folder.id) {
      const nextPrompts = [...(folder.prompts || [])];
      nextPrompts[promptIdx] = { ...prompt, name: newName, content: newContent };
      const nextFolders = getState().data.folders.map(function (f, i) {
        return i === folderIdx ? { ...f, prompts: nextPrompts } : f;
      });
      stateManager.setState({
        data: { ...getState().data, folders: nextFolders },
        ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptEditDialogOpen: false } }
      });
    } else {
      const folders = getState().data.folders;
      const targetIdx = folders.findIndex(function (f) { return f.id === newFolderId; });
      if (targetIdx === -1) return { success: false };
      const updatedPrompt = { ...prompt, name: newName, content: newContent };
      const nextFolders = folders.map(function (f, i) {
        if (i === folderIdx) {
          const list = (f.prompts || []).filter(function (_, idx) { return idx !== promptIdx; });
          return { ...f, prompts: list };
        }
        if (i === targetIdx) {
          return { ...f, prompts: [...(f.prompts || []), updatedPrompt] };
        }
        return f;
      });
      stateManager.setState({
        data: { ...getState().data, folders: nextFolders },
        ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptEditDialogOpen: false } }
      });
    }
    showToast(TOAST_MESSAGES.promptUpdated);
    return { success: true };
  }

  async function handleDeletePrompt(promptId) {
    const found = findPromptAndFolder(promptId);
    if (!found) return { success: false };
    const folderIdx = found.folderIdx;
    const promptIdx = found.promptIdx;

    const ok = await api.deletePrompt({
      userId: getState().user.id || getState().user.user_id,
      promptId: promptId
    });
    if (!ok) return { success: false };

    const nextFolders = getState().data.folders.map(function (f, i) {
      if (i !== folderIdx) return f;
      const list = (f.prompts || []).filter(function (_, idx) { return idx !== promptIdx; });
      return { ...f, prompts: list };
    });
    stateManager.setState({
      data: { ...getState().data, folders: nextFolders },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, confirmDeletePromptDialogOpen: false } }
    });
    showToast(TOAST_MESSAGES.promptDeleted);
    return { success: true };
  }

  window.engine = window.engine || {};
  window.engine.findPromptAndFolder = findPromptAndFolder;
  window.engine.handleCreatePromptIntent = handleCreatePromptIntent;
  window.engine.handleCreatePrompt = handleCreatePrompt;
  window.engine.handleUpdatePrompt = handleUpdatePrompt;
  window.engine.handleDeletePrompt = handleDeletePrompt;
})();
