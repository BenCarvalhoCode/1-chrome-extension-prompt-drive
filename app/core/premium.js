/**
 * Core — licença, export e import
 */
(function () {
  async function handleActivatePremium(key) {
    const result = await api.activateLicenseKey({
      userId: getState().user.id || getState().user.user_id,
      licenseKey: key
    });
    if (!result || !result.success) {
      showToast(TOAST_MESSAGES.invalidKey);
      return { success: false };
    }
    const expiry = result.expiry != null
      ? result.expiry
      : Date.now() + PREMIUM_LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000;
    stateManager.setState({
      user: {
        ...getState().user,
        plan: 'premium',
        licenseKey: key,
        licenseExpiry: expiry
      },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, licenseDialogOpen: false } }
    });
    const dateStr = new Date(expiry).toLocaleDateString('pt-BR');
    showToast(TOAST_MESSAGES.premiumActivated + ' ' + dateStr);
    return { success: true };
  }

  function handleExportFolder(folderId) {
    if (getState().user.plan !== 'premium') {
      showToast(TOAST_MESSAGES.premiumFeature);
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: SALES_LANDING_PAGE_URL });
      }
      return { success: false };
    }
    const folder = getState().data.folders.find(function (f) { return f.id === folderId; });
    if (!folder) return { success: false };
    const payload = { folder: { id: folder.id, name: folder.name, prompts: folder.prompts || [] } };
    const json = JSON.stringify(payload, null, 2);
    copyToClipboard(json)
      .then(function () { showToast(TOAST_MESSAGES.exportSuccess); })
      .catch(function () { showToast(TOAST_MESSAGES.exportError); });
    return { success: true };
  }

  function handleImportFolderIntent() {
    if (getState().user.plan !== 'premium') {
      showToast(TOAST_MESSAGES.premiumFeature);
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: SALES_LANDING_PAGE_URL });
      }
      return false;
    }
    return true;
  }

  function normalizeImportToFolders(data) {
    const isNewFormat = Array.isArray(data.folders) && data.folders.some(function (f) { return Array.isArray(f.prompts); });
    const isFolderFormat = data.folder && Array.isArray(data.prompts);
    const isLegacyFormat = Array.isArray(data.folders) && Array.isArray(data.prompts) && !data.folders.some(function (f) { return Array.isArray(f.prompts); });

    if (isNewFormat) {
      return data.folders.map(function (f) {
        return {
          id: f.id,
          name: f.name || '',
          prompts: (f.prompts || []).map(function (p) {
            return {
              id: p.id,
              name: p.name ?? p.nome ?? '',
              content: p.content ?? p.conteudo ?? '',
              created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
            };
          })
        };
      });
    }
    if (isFolderFormat) {
      const f = data.folder;
      const prompts = (data.prompts || []).map(function (p) {
        return {
          id: p.id,
          name: p.name ?? p.nome ?? '',
          content: p.content ?? p.conteudo ?? '',
          created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
        };
      });
      return [{ id: f.id, name: f.name || '', prompts: prompts }];
    }
    if (isLegacyFormat) {
      const promptsByFolder = {};
      (data.prompts || []).forEach(function (p) {
        const fid = p.folderId;
        if (!promptsByFolder[fid]) promptsByFolder[fid] = [];
        promptsByFolder[fid].push({
          id: p.id,
          name: p.nome ?? p.name ?? '',
          content: p.conteudo ?? p.content ?? '',
          created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
        });
      });
      return (data.folders || []).map(function (f) {
        return { id: f.id, name: f.name || '', prompts: promptsByFolder[f.id] || [] };
      });
    }
    return [];
  }

  function handleImportFolder(jsonText) {
    if (getState().user.plan !== 'premium') {
      showToast(TOAST_MESSAGES.premiumFeature);
      return { success: false };
    }
    let data;
    try {
      data = parseImportJson(jsonText);
    } catch (e) {
      showToast(TOAST_MESSAGES.importError);
      return { success: false };
    }
    const foldersToAdd = normalizeImportToFolders(data);
    if (foldersToAdd.length === 0) {
      showToast(TOAST_MESSAGES.importError);
      return { success: false };
    }
    const existingFolders = getState().data.folders;
    const existingIds = new Set();
    existingFolders.forEach(function (f) {
      existingIds.add(f.id);
      (f.prompts || []).forEach(function (p) { existingIds.add(p.id); });
    });
    const nameCounts = {};
    const now = new Date().toISOString();
    const merged = [...existingFolders];
    for (let i = 0; i < foldersToAdd.length; i++) {
      const f = foldersToAdd[i];
      let fid = f.id;
      if (existingIds.has(fid)) fid = generateId();
      existingIds.add(fid);
      const prompts = (f.prompts || []).map(function (p) {
        let pid = p.id;
        if (existingIds.has(pid)) pid = generateId();
        existingIds.add(pid);
        let name = p.name || 'Sem nome';
        const base = name.replace(/\s*\(\d+\)$/, '');
        nameCounts[base] = (nameCounts[base] || 0) + 1;
        if (nameCounts[base] > 1) name = base + ' (' + (nameCounts[base] - 1) + ')';
        return { id: pid, name: name, content: p.content || '', created_at: p.created_at || now };
      });
      merged.push({ id: fid, name: f.name || '', prompts: prompts });
    }
    stateManager.setState({
      data: { ...getState().data, folders: merged },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, importDialogOpen: false } }
    });
    showToast(TOAST_MESSAGES.importSuccess);
    return { success: true };
  }

  window.engine = window.engine || {};
  window.engine.handleActivatePremium = handleActivatePremium;
  window.engine.handleExportFolder = handleExportFolder;
  window.engine.handleImportFolderIntent = handleImportFolderIntent;
  window.engine.handleImportFolder = handleImportFolder;
})();
