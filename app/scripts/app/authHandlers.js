/**
 * App — authHandlers: login, criar conta, logout
 */
async function handleSubmitLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  if (!email || !password) return;
  const result = await api.doLogin(email, password);
  if (result) await engine.handleLoginSuccess(result);
}

async function handleSubmitCreateAccount(e) {
  e.preventDefault();
  const email = document.getElementById('createEmail')?.value?.trim();
  const password = document.getElementById('createPassword')?.value;
  const full_name = document.getElementById('createName')?.value?.trim();
  if (!email || !password || !full_name) return;
  const result = await api.createUser(email, password, full_name);
  if (result && result.success) {
    if (typeof showToast === 'function') showToast(TOAST_AUTH && TOAST_AUTH.redirecting ? TOAST_AUTH.redirecting : 'Redirecionando...');
    setTimeout(function () {
      stateManager.setState({ auth: { ...getState().auth, screen: 'login' } });
      document.getElementById('createEmail').value = '';
      document.getElementById('createPassword').value = '';
      document.getElementById('createName').value = '';
    }, 1500);
  }
}

async function handleLogout() {
  await api.setStoredAccessToken('');
  await api.setStoredUserId('');
  stateManager.setState({ auth: { screen: 'login' } });
}
