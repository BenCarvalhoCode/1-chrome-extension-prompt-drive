/**
 * Engine — regras de negócio e orquestração
 */

const SEED_PATHS = ['./data/seed.json', '/data/seed.json', 'data/seed.json'];

const FALLBACK_SEED = {
  folders: [
    { id: 'folder-1', name: 'Marketing', createdAt: 1704067200000, updatedAt: 1704067200000 },
    { id: 'folder-2', name: 'Desenvolvimento', createdAt: 1704153600000, updatedAt: 1704153600000 }
  ],
  prompts: [
    {
      id: 'prompt-1',
      folderId: 'folder-1',
      nome: 'Post para Redes Sociais',
      conteudo: 'Crie um post engajador para [plataforma] sobre [tema].',
      createdAt: 1704067200000,
      updatedAt: 1704067200000
    }
  ]
};

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

function normalizeSeedData(data) {
  const folders = {};
  const prompts = {};
  const folderPrompts = {};
  (data.folders || []).forEach((f) => {
    folders[f.id] = { ...f, updatedAt: f.updatedAt ?? f.createdAt };
    folderPrompts[f.id] = [];
  });
  (data.prompts || []).forEach((p) => {
    prompts[p.id] = { ...p, updatedAt: p.updatedAt ?? p.createdAt };
    if (!folderPrompts[p.folderId]) folderPrompts[p.folderId] = [];
    folderPrompts[p.folderId].push(p.id);
  });
  return { folders, prompts, folderPrompts };
}

async function boot() {
  stateManager.setState({ ui: { ...getState().ui, loading: true, error: null } });
  try {
    const { folders, prompts, folderPrompts } = await loadSeed();
    stateManager.setState({
      data: { folders, prompts, folderPrompts },
      ui: { ...getState().ui, loading: false, error: null }
    });
  } catch (err) {
    stateManager.setState({
      ui: { ...getState().ui, loading: false, error: { message: 'Falha ao carregar dados.' } }
    });
  }
}

function handleCreateFolder(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    showToast(TOAST_MESSAGES.folderError);
    return { success: false };
  }
  const folderId = generateId();
  const now = Date.now();
  const folder = { id: folderId, name: trimmed, createdAt: now, updatedAt: now };
  stateManager.setState({
    data: {
      ...getState().data,
      folders: { ...getState().data.folders, [folderId]: folder },
      folderPrompts: { ...getState().data.folderPrompts, [folderId]: [] }
    },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, folderDialogOpen: false } }
  });
  api.createFolder({
    userId: getState().user.id,
    folderId,
    folderName: trimmed
  });
  showToast(TOAST_MESSAGES.folderCreated);
  return { success: true };
}

function handleUpdateFolder(folderId, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    showToast(TOAST_MESSAGES.folderError);
    return { success: false };
  }
  const folders = getState().data.folders;
  if (!folders[folderId]) return { success: false };
  const now = Date.now();
  stateManager.setState({
    data: {
      ...getState().data,
      folders: {
        ...folders,
        [folderId]: { ...folders[folderId], name: trimmed, updatedAt: now }
      }
    },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, editFolderDialogOpen: false } }
  });
  api.updateFolder({
    userId: getState().user.id,
    folderId,
    folderName: trimmed
  });
  showToast(TOAST_MESSAGES.folderUpdated);
  return { success: true };
}

function handleDeleteFolder(folderId, confirmName) {
  const folders = getState().data.folders;
  const folder = folders[folderId];
  if (!folder) return { success: false };
  if (confirmName !== folder.name) {
    showToast(TOAST_MESSAGES.folderNameMismatch);
    return { success: false };
  }
  const nextFolders = { ...folders };
  delete nextFolders[folderId];
  const nextPrompts = { ...getState().data.prompts };
  const promptIds = getState().data.folderPrompts[folderId] || [];
  promptIds.forEach((id) => delete nextPrompts[id]);
  const nextFolderPrompts = { ...getState().data.folderPrompts };
  delete nextFolderPrompts[folderId];
  stateManager.setState({
    data: {
      folders: nextFolders,
      prompts: nextPrompts,
      folderPrompts: nextFolderPrompts
    },
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
  api.deleteFolder({ userId: getState().user.id, folderId });
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

function handleCreatePrompt(folderId, nome, conteudo) {
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
  const promptId = generateId();
  const now = Date.now();
  const prompt = {
    id: promptId,
    folderId: fId,
    nome: n,
    conteudo: c,
    createdAt: now,
    updatedAt: now
  };
  const prompts = getState().data.prompts;
  const folderPrompts = getState().data.folderPrompts;
  const list = folderPrompts[fId] || [];
  stateManager.setState({
    data: {
      ...getState().data,
      prompts: { ...prompts, [promptId]: prompt },
      folderPrompts: { ...folderPrompts, [fId]: [...list, promptId] }
    },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptDialogOpen: false } }
  });
  api.createPrompt({ userId: getState().user.id, prompt });
  showToast(TOAST_MESSAGES.promptCreated);
  return { success: true };
}

function handleUpdatePrompt(promptId, patch) {
  const prompts = getState().data.prompts;
  const p = prompts[promptId];
  if (!p) return { success: false };
  const now = Date.now();
  const updated = { ...p, ...patch, updatedAt: now };
  if (patch.folderId !== undefined) {
    const oldList = getState().data.folderPrompts[p.folderId] || [];
    const newList = (getState().data.folderPrompts[patch.folderId] || []).filter((id) => id !== promptId);
    stateManager.setState({
      data: {
        ...getState().data,
        prompts: { ...prompts, [promptId]: updated },
        folderPrompts: {
          ...getState().data.folderPrompts,
          [p.folderId]: oldList.filter((id) => id !== promptId),
          [patch.folderId]: [...newList, promptId]
        }
      },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptEditDialogOpen: false } }
    });
  } else {
    stateManager.setState({
      data: {
        ...getState().data,
        prompts: { ...prompts, [promptId]: updated }
      },
      ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, promptEditDialogOpen: false } }
    });
  }
  api.updatePrompt({
    userId: getState().user.id,
    promptId,
    patch: { folderId: patch.folderId, nome: patch.nome, conteudo: patch.conteudo }
  });
  showToast(TOAST_MESSAGES.promptUpdated);
  return { success: true };
}

function handleDeletePrompt(promptId) {
  const prompts = getState().data.prompts;
  const p = prompts[promptId];
  if (!p) return { success: false };
  const nextPrompts = { ...prompts };
  delete nextPrompts[promptId];
  const fid = p.folderId;
  const list = (getState().data.folderPrompts[fid] || []).filter((id) => id !== promptId);
  stateManager.setState({
    data: {
      ...getState().data,
      prompts: nextPrompts,
      folderPrompts: { ...getState().data.folderPrompts, [fid]: list }
    },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, confirmDeletePromptDialogOpen: false } }
  });
  api.deletePrompt({ userId: getState().user.id, promptId });
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
  api.activateLicenseKey({ userId: getState().user.id, licenseKey: key });
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
  const folder = getState().data.folders[folderId];
  const promptIds = getState().data.folderPrompts[folderId] || [];
  const prompts = promptIds
    .map((id) => getState().data.prompts[id])
    .filter(Boolean);
  const payload = { folder, prompts };
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
  const isFolderFormat = data.folder && Array.isArray(data.prompts);
  const isStandardFormat = Array.isArray(data.folders) && Array.isArray(data.prompts);
  let foldersToAdd = [];
  let promptsToAdd = [];
  if (isFolderFormat) {
    foldersToAdd = [data.folder];
    promptsToAdd = data.prompts || [];
  } else if (isStandardFormat) {
    foldersToAdd = data.folders || [];
    promptsToAdd = data.prompts || [];
  } else {
    showToast(TOAST_MESSAGES.importError);
    return { success: false };
  }
  const existingIds = new Set([
    ...Object.keys(getState().data.folders),
    ...Object.keys(getState().data.prompts)
  ]);
  const idMap = {};
  const nameCounts = {};
  const folders = { ...getState().data.folders };
  const prompts = { ...getState().data.prompts };
  const folderPrompts = { ...getState().data.folderPrompts };
  const now = Date.now();
  for (const f of foldersToAdd) {
    let fid = f.id;
    if (existingIds.has(fid)) {
      fid = generateId();
      idMap[f.id] = fid;
    }
    existingIds.add(fid);
    folders[fid] = { ...f, id: fid, createdAt: f.createdAt || now, updatedAt: now };
    if (!folderPrompts[fid]) folderPrompts[fid] = [];
  }
  for (const p of promptsToAdd) {
    let pid = p.id;
    if (existingIds.has(pid)) pid = generateId();
    existingIds.add(pid);
    let fid = idMap[p.folderId] || p.folderId;
    if (!folders[fid]) fid = Object.keys(folders)[0] || fid;
    let nome = p.nome || 'Sem nome';
    const base = nome.replace(/\s*\(\d+\)$/, '');
    nameCounts[base] = (nameCounts[base] || 0) + 1;
    if (nameCounts[base] > 1) nome = `${base} (${nameCounts[base] - 1})`;
    prompts[pid] = {
      id: pid,
      folderId: fid,
      nome,
      conteudo: p.conteudo || '',
      createdAt: p.createdAt || now,
      updatedAt: now
    };
    if (!folderPrompts[fid]) folderPrompts[fid] = [];
    folderPrompts[fid].push(pid);
  }
  stateManager.setState({
    data: { folders, prompts, folderPrompts },
    ui: { ...getState().ui, dialogs: { ...getState().ui.dialogs, importDialogOpen: false } }
  });
  showToast(TOAST_MESSAGES.importSuccess);
  return { success: true };
}

const engine = {
  boot,
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
