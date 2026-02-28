/**
 * State Container — Fonte da Verdade em runtime
 * Sem persistência. Ao recarregar, o estado volta ao seed.
 */

const INITIAL_STATE = {
  user: {
    id: 'user-default',
    user_id: null,
    plan: 'free',
    stripe_customer_id: null,
    subscriptions: [],
    licenseKey: null,
    licenseExpiry: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  auth: {
    /** 'login' | 'createAccount' | null (null = mostrando app) */
    screen: 'login'
  },
  ui: {
    loading: false,
    error: null,
    dialogs: {
      folderDialogOpen: false,
      promptDialogOpen: false,
      promptEditDialogOpen: false,
      confirmDeletePromptDialogOpen: false,
      deleteFolderDialogOpen: false,
      editFolderDialogOpen: false,
      licenseDialogOpen: false,
      importDialogOpen: false
    },
    expandedFolders: {}
  },
  data: {
    folders: []
  }
};

let state = JSON.parse(JSON.stringify(INITIAL_STATE));
const listeners = new Set();

function getState() {
  return state;
}

function setState(partialOrRecipe) {
  const next = typeof partialOrRecipe === 'function'
    ? partialOrRecipe(state)
    : { ...state, ...partialOrRecipe };
  state = next;
  notifyListeners();
}

function subscribe(listener) {
  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(fn => fn(state));
}

function getPromptCountTotal() {
  if (!Array.isArray(state.data.folders)) return 0;
  return state.data.folders.reduce((sum, folder) => sum + (folder.prompts?.length || 0), 0);
}

function getFolderPromptCount(folderId) {
  if (!Array.isArray(state.data.folders)) return 0;
  const folder = state.data.folders.find((f) => f.id === folderId);
  return folder ? (folder.prompts?.length || 0) : 0;
}

const stateManager = {
  getState,
  setState,
  subscribe,
  getPromptCountTotal,
  getFolderPromptCount
};
