/**
 * App — inicialização e registro de listeners
 */
(function initApp() {
  window.redirectToLogin = function () {
    stateManager.setState({ auth: { screen: 'login' } });
  };

  stateManager.subscribe(render);

  engine.boot().then(function () {
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeydown);
    document.querySelector('#loginForm')?.addEventListener('submit', handleSubmitLogin);
    document.querySelector('#createAccountForm')?.addEventListener('submit', handleSubmitCreateAccount);
    document.querySelector('#folderForm')?.addEventListener('submit', handleSubmitFolder);
    document.querySelector('#editFolderForm')?.addEventListener('submit', handleSubmitEditFolder);
    document.querySelector('#promptForm')?.addEventListener('submit', handleSubmitPrompt);
    document.querySelector('#promptEditForm')?.addEventListener('submit', handleSubmitEditPrompt);
    document.querySelector('#licenseForm')?.addEventListener('submit', handleSubmitLicense);
    document.querySelector('#importForm')?.addEventListener('submit', handleSubmitImport);
    document.querySelector('#btnCreateFolder')?.addEventListener('click', handleOpenFolderDialog);
    document.querySelector('#btnCreatePrompt')?.addEventListener('click', handleOpenPromptDialog);
    document.querySelector('#btnLicenseKey')?.addEventListener('click', handleOpenLicenseDialog);
    document.querySelector('#btnImportFolder')?.addEventListener('click', handleOpenImportDialog);
    document.querySelector('#importFile')?.addEventListener('change', handleImportFile);
  });
})();
