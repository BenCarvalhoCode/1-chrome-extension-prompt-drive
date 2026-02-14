/**
 * State Container — Fonte da Verdade em runtime
 * Sem persistência. Ao recarregar, o estado volta ao seed.
 */

const INITIAL_STATE = {
  user: {
    id: 'user-default',
    plan: 'free',
    licenseKey: null,
    licenseExpiry: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
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
    folders: {},
    prompts: {},
    folderPrompts: {}
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
  return Object.keys(state.data.prompts).length;
}

function getFolderPromptCount(folderId) {
  const ids = state.data.folderPrompts[folderId] || [];
  return ids.length;
}

const stateManager = {
  getState,
  setState,
  subscribe,
  getPromptCountTotal,
  getFolderPromptCount
};
