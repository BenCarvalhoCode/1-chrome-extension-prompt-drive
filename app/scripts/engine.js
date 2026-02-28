/**
 * Engine — regras de negócio e orquestração
 */

const SEED_PATHS = ['./data/seed.json', '/data/seed.json', 'data/seed.json'];

const FALLBACK_SEED = {
  user_id: 'user-fallback',
  plan: 'free',
  stripe_customer_id: null,
  subscriptions: [],
  folders: [
    {
      id: 'folder-1',
      name: 'Marketing',
      prompts: [
        {
          id: 'prompt-1',
          name: 'Post para Redes Sociais',
          content: 'Crie um post engajador para [plataforma] sobre [tema].',
          created_at: new Date().toISOString()
        }
      ]
    }
  ]
};

function normalizeSeedData(data) {
  const user = {
    ...getState().user,
    id: data.user_id ?? getState().user.id,
    user_id: data.user_id ?? null,
    plan: data.plan ?? 'free',
    stripe_customer_id: data.stripe_customer_id ?? null,
    subscriptions: Array.isArray(data.stripe_subscriptions) ? data.stripe_subscriptions : (Array.isArray(data.subscriptions) ? data.subscriptions : [])
  };

  let folders = [];

  if (Array.isArray(data.folders) && data.folders.length > 0) {
    const hasNestedPrompts = data.folders.some((f) => Array.isArray(f.prompts));
    if (hasNestedPrompts) {
      folders = data.folders.map((f) => ({
        id: f.id,
        name: f.name || '',
        prompts: Array.isArray(f.prompts)
          ? f.prompts.map((p) => ({
              id: p.id,
              name: p.name ?? p.nome ?? '',
              content: p.content ?? p.conteudo ?? '',
              created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
            }))
          : []
      }));
    } else {
      const promptsByFolder = {};
      (data.prompts || []).forEach((p) => {
        const fid = p.folderId;
        if (!promptsByFolder[fid]) promptsByFolder[fid] = [];
        promptsByFolder[fid].push({
          id: p.id,
          name: p.nome ?? p.name ?? '',
          content: p.conteudo ?? p.content ?? '',
          created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
        });
      });
      folders = (data.folders || []).map((f) => ({
        id: f.id,
        name: f.name || '',
        prompts: promptsByFolder[f.id] || []
      }));
    }
  }

  return { user, folders };
}

/**
 * Carrega e aplica ao state todos os dados do usuário logado (perfil, pastas, prompts).
 * Usado no boot (refresh) e após login — garante que pastas e prompts vêm sempre juntos.
 * @param {string} userId
 * @returns {Promise<boolean>} true se dados foram carregados e aplicados, false se falhou ou 401
 */
async function loadAndApplyUserData(userId) {
  if (!userId) return false;
  const data = await api.loadUserData(userId);
  if (!data) return false;
  const { user, folders } = normalizeSeedData(data);
  stateManager.setState({
    user: { ...user, id: userId, user_id: userId },
    data: { folders }
  });
  return true;
}

async function loadSeed() {
  for (const path of SEED_PATHS) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;
      const text = await response.text();
      const cleanText = text.trim().replace(/^[\uFEFF\u200B-\u200D\u2060]/g, '');
      const data = JSON.parse(cleanText);
      return normalizeSeedData(data);
    } catch (err) {
      if (path === SEED_PATHS[SEED_PATHS.length - 1]) {
        console.warn('[Engine] Parse error on last path, using fallback:', err.message);
        return normalizeSeedData(FALLBACK_SEED);
      }
    }
  }
  return normalizeSeedData(FALLBACK_SEED);
}

async function boot() {
  stateManager.setState({ ui: { ...getState().ui, loading: true, error: null } });

  const token = await api.getStoredAccessToken();
  if (!token || token.trim() === '') {
    stateManager.setState({
      auth: { screen: 'login' },
      ui: { ...getState().ui, loading: false, error: null }
    });
    return;
  }

  const userId = await api.getStoredUserId();
  if (!userId) {
    stateManager.setState({
      auth: { screen: 'login' },
      ui: { ...getState().ui, loading: false, error: null }
    });
    return;
  }

  try {
    const ok = await loadAndApplyUserData(userId);
    if (!ok) {
      stateManager.setState({
        auth: { screen: 'login' },
        ui: { ...getState().ui, loading: false, error: null }
      });
      return;
    }
    stateManager.setState({
      auth: { screen: null },
      ui: { ...getState().ui, loading: false, error: null }
    });
  } catch (err) {
    stateManager.setState({
      auth: { screen: 'login' },
      ui: { ...getState().ui, loading: false, error: { message: 'Falha ao carregar dados.' } }
    });
  }
}

async function handleLoginSuccess(loginResult) {
  if (!loginResult || !loginResult.user_id && !loginResult.user?.id) return false;
  const userId = loginResult.user_id || loginResult.user.id;
  stateManager.setState({
    user: {
      ...getState().user,
      id: userId,
      user_id: userId
    },
    auth: { screen: null },
    ui: { ...getState().ui, loading: true }
  });
  try {
    await loadAndApplyUserData(userId);
  } catch (_) { /* loadAndApplyUserData já trata erro; mantemos loading false abaixo */ }
  stateManager.setState({ ui: { ...getState().ui, loading: false } });
  return true;
}

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
  const idx = folders.findIndex((f) => f.id === folderId);
  if (idx === -1) return { success: false };
  const result = await api.updateFolder({
    userId: getState().user.id || getState().user.user_id,
    folderId,
    folderName: trimmed
  });
  if (!result) return { success: false };
  const next = folders.map((f, i) => (i === idx ? { ...f, name: trimmed } : f));
  stateManager.setState({
    data: { ...getState().data, folders: next },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, editFolderDialogOpen: false } }
  });
  showToast(TOAST_MESSAGES.folderUpdated);
  return { success: true };
}

async function handleDeleteFolder(folderId, confirmName) {
  const folders = getState().data.folders;
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return { success: false };
  if (confirmName !== folder.name) {
    showToast(TOAST_MESSAGES.folderNameMismatch);
    return { success: false };
  }
  const ok = await api.deleteFolder({
    userId: getState().user.id || getState().user.user_id,
    folderId
  });
  if (!ok) return { success: false };
  const nextFolders = folders.filter((f) => f.id !== folderId);
  stateManager.setState({
    data: { ...getState().data, folders: nextFolders },
    ui: {
      ...getState().ui,
      dialogs: { ...getState().ui.dialogs, deleteFolderDialogOpen: false },
      expandedFolders: (() => {
        const ef = { ...getState().ui.expandedFolders };
        delete ef[folderId];
        return ef;
      })()
    }
  });
  showToast(TOAST_MESSAGES.folderDeleted);
  return { success: true };
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
  const folderIdx = folders.findIndex((f) => f.id === fId);
  if (folderIdx === -1) return { success: false };

  const existingPrompts = folders[folderIdx].prompts || [];
  const nameLower = n.trim().toLowerCase();
  const duplicate = existingPrompts.some((p) => (p.name || '').trim().toLowerCase() === nameLower);
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
  const nextFolders = folders.map((f, i) =>
    i === folderIdx ? { ...f, prompts: [...(f.prompts || []), prompt] } : f
  );
  stateManager.setState({
    data: { ...getState().data, folders: nextFolders },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptDialogOpen: false } }
  });
  showToast(TOAST_MESSAGES.promptCreated);
  return { success: true };
}

function findPromptAndFolder(promptId) {
  const folders = getState().data.folders;
  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const promptIdx = (folder.prompts || []).findIndex((p) => p.id === promptId);
    if (promptIdx !== -1) return { folder, folderIdx: i, prompt: folder.prompts[promptIdx], promptIdx };
  }
  return null;
}

async function handleUpdatePrompt(promptId, patch) {
  const found = findPromptAndFolder(promptId);
  if (!found) return { success: false };
  const { folder, folderIdx, prompt, promptIdx } = found;
  const newName = patch.nome !== undefined ? patch.nome : prompt.name;
  const newContent = patch.conteudo !== undefined ? patch.conteudo : prompt.content;
  const newFolderId = patch.folderId !== undefined ? patch.folderId : folder.id;

  const targetFolder = getState().data.folders.find((f) => f.id === newFolderId);
  if (targetFolder) {
    const nameLower = (newName || '').trim().toLowerCase();
    const hasDuplicate = (targetFolder.prompts || []).some(
      (p) => p.id !== promptId && (p.name || '').trim().toLowerCase() === nameLower
    );
    if (hasDuplicate) {
      showToast(TOAST_MESSAGES.promptDuplicateName);
      return { success: false };
    }
  }

  const result = await api.updatePrompt({
    userId: getState().user.id || getState().user.user_id,
    promptId,
    name: newName,
    content: newContent,
    folder_id: newFolderId !== folder.id ? newFolderId : undefined
  });
  if (!result) return { success: false };

  if (newFolderId === folder.id) {
    const nextPrompts = [...(folder.prompts || [])];
    nextPrompts[promptIdx] = { ...prompt, name: newName, content: newContent };
    const nextFolders = getState().data.folders.map((f, i) =>
      i === folderIdx ? { ...f, prompts: nextPrompts } : f
    );
    stateManager.setState({
      data: { ...getState().data, folders: nextFolders },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptEditDialogOpen: false } }
    });
  } else {
    const folders = getState().data.folders;
    const targetIdx = folders.findIndex((f) => f.id === newFolderId);
    if (targetIdx === -1) return { success: false };
    const updatedPrompt = { ...prompt, name: newName, content: newContent };
    const nextFolders = folders.map((f, i) => {
      if (i === folderIdx) {
        const list = (f.prompts || []).filter((_, idx) => idx !== promptIdx);
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
  const { folderIdx, promptIdx } = found;

  const ok = await api.deletePrompt({
    userId: getState().user.id || getState().user.user_id,
    promptId
  });
  if (!ok) return { success: false };

  const nextFolders = getState().data.folders.map((f, i) => {
    if (i !== folderIdx) return f;
    const list = (f.prompts || []).filter((_, idx) => idx !== promptIdx);
    return { ...f, prompts: list };
  });
  stateManager.setState({
    data: { ...getState().data, folders: nextFolders },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, confirmDeletePromptDialogOpen: false } }
  });
  showToast(TOAST_MESSAGES.promptDeleted);
  return { success: true };
}

function handleActivatePremium(key) {
  if (!validateLicenseKey(key)) {
    showToast(TOAST_MESSAGES.invalidKey);
    return { success: false };
  }
  const now = Date.now();
  const expiry = now + PREMIUM_LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000;
  stateManager.setState({
    user: {
      ...getState().user,
      plan: 'premium',
      licenseKey: key,
      licenseExpiry: expiry
    },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, licenseDialogOpen: false } }
  });
  api.activateLicenseKey({ userId: getState().user.id || getState().user.user_id, licenseKey: key });
  const dateStr = new Date(expiry).toLocaleDateString('pt-BR');
  showToast(`${TOAST_MESSAGES.premiumActivated} ${dateStr}`);
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
  const folder = getState().data.folders.find((f) => f.id === folderId);
  if (!folder) return { success: false };
  const payload = { folder: { id: folder.id, name: folder.name, prompts: folder.prompts || [] } };
  const json = JSON.stringify(payload, null, 2);
  copyToClipboard(json)
    .then(() => showToast(TOAST_MESSAGES.exportSuccess))
    .catch(() => showToast(TOAST_MESSAGES.exportError));
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
  const isNewFormat = Array.isArray(data.folders) && data.folders.some((f) => Array.isArray(f.prompts));
  const isFolderFormat = data.folder && Array.isArray(data.prompts);
  const isLegacyFormat = Array.isArray(data.folders) && Array.isArray(data.prompts) && !data.folders.some((f) => Array.isArray(f.prompts));

  if (isNewFormat) {
    return data.folders.map((f) => ({
      id: f.id,
      name: f.name || '',
      prompts: (f.prompts || []).map((p) => ({
        id: p.id,
        name: p.name ?? p.nome ?? '',
        content: p.content ?? p.conteudo ?? '',
        created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
      }))
    }));
  }
  if (isFolderFormat) {
    const f = data.folder;
    const prompts = (data.prompts || []).map((p) => ({
      id: p.id,
      name: p.name ?? p.nome ?? '',
      content: p.content ?? p.conteudo ?? '',
      created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
    }));
    return [{ id: f.id, name: f.name || '', prompts }];
  }
  if (isLegacyFormat) {
    const promptsByFolder = {};
    (data.prompts || []).forEach((p) => {
      const fid = p.folderId;
      if (!promptsByFolder[fid]) promptsByFolder[fid] = [];
      promptsByFolder[fid].push({
        id: p.id,
        name: p.nome ?? p.name ?? '',
        content: p.conteudo ?? p.content ?? '',
        created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
      });
    });
    return (data.folders || []).map((f) => ({
      id: f.id,
      name: f.name || '',
      prompts: promptsByFolder[f.id] || []
    }));
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
  } catch {
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
  existingFolders.forEach((f) => {
    existingIds.add(f.id);
    (f.prompts || []).forEach((p) => existingIds.add(p.id));
  });
  const idMap = {};
  const nameCounts = {};
  const now = new Date().toISOString();
  const merged = [...existingFolders];
  for (const f of foldersToAdd) {
    let fid = f.id;
    if (existingIds.has(fid)) {
      fid = generateId();
      idMap[f.id] = fid;
    }
    existingIds.add(fid);
    const prompts = (f.prompts || []).map((p) => {
      let pid = p.id;
      if (existingIds.has(pid)) pid = generateId();
      existingIds.add(pid);
      let name = p.name || 'Sem nome';
      const base = name.replace(/\s*\(\d+\)$/, '');
      nameCounts[base] = (nameCounts[base] || 0) + 1;
      if (nameCounts[base] > 1) name = `${base} (${nameCounts[base] - 1})`;
      return { id: pid, name, content: p.content || '', created_at: p.created_at || now };
    });
    merged.push({ id: fid, name: f.name || '', prompts });
  }
  stateManager.setState({
    data: { ...getState().data, folders: merged },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, importDialogOpen: false } }
  });
  showToast(TOAST_MESSAGES.importSuccess);
  return { success: true };
}

const engine = {
  boot,
  handleLoginSuccess,
  handleCreateFolder,
  handleUpdateFolder,
  handleDeleteFolder,
  handleCreatePromptIntent,
  handleCreatePrompt,
  handleUpdatePrompt,
  handleDeletePrompt,
  handleActivatePremium,
  handleExportFolder,
  handleImportFolderIntent,
  handleImportFolder
};
