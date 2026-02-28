/**
 * App — forms: submit de formulários e confirmações (pasta, prompt, licença, import)
 */
async function handleSubmitFolder(e) {
  e.preventDefault();
  const name = document.getElementById('folderName')?.value?.trim();
  await engine.handleCreateFolder(name);
}

async function handleSubmitEditFolder(e) {
  e.preventDefault();
  const folderId = document.getElementById('editFolderId')?.value;
  const name = document.getElementById('editFolderName')?.value?.trim();
  await engine.handleUpdateFolder(folderId, name);
}

async function handleSubmitPrompt(e) {
  e.preventDefault();
  const folderId = document.getElementById('promptFolder')?.value;
  const nome = document.getElementById('promptName')?.value?.trim();
  const conteudo = document.getElementById('promptConteudo')?.value?.trim();
  await engine.handleCreatePrompt(folderId, nome, conteudo);
}

async function handleSubmitEditPrompt(e) {
  e.preventDefault();
  const promptId = document.getElementById('promptEditId')?.value;
  const folderId = document.getElementById('promptEditFolder')?.value;
  const nome = document.getElementById('promptEditName')?.value?.trim();
  const conteudo = document.getElementById('promptEditConteudo')?.value?.trim();
  await engine.handleUpdatePrompt(promptId, { folderId: folderId, nome: nome, conteudo: conteudo });
}

function handleSubmitLicense(e) {
  e.preventDefault();
  const key = document.getElementById('licenseKey')?.value?.trim();
  engine.handleActivatePremium(key);
}

function handleSubmitImport(e) {
  e.preventDefault();
  const jsonText = document.getElementById('importJson')?.value?.trim();
  engine.handleImportFolder(jsonText);
}

async function handleConfirmDeleteFolder() {
  const btn = document.querySelector('[data-action="confirm-delete-folder"]');
  const folderId = btn?.dataset?.folderId;
  const confirmName = document.getElementById('deleteFolderConfirm')?.value;
  const folder = getState().data.folders.find(function (f) { return f.id === folderId; });
  if (!folder) return;
  await engine.handleDeleteFolder(folderId, confirmName);
}

async function handleConfirmDeletePrompt() {
  const btn = document.querySelector('[data-action="confirm-delete-prompt"]');
  const promptId = btn && btn.dataset.promptId;
  if (promptId) await engine.handleDeletePrompt(promptId);
}
