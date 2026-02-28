/**
 * API — Auth: login, criar conta, ensureTokenAndRedirect
 */
(function () {
  async function ensureTokenAndRedirect() {
    const token = await window.api.getStoredAccessToken();
    if (!token || (typeof token === 'string' && token.trim() === '')) {
      if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
      return null;
    }
    return token;
  }

  async function doLogin(email, password) {
    const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const body = JSON.stringify({ email: email.trim(), password });
    const headers = {
      'apikey': SUA_ANON_PUBLIC_KEY,
      'Content-Type': 'application/json'
    };
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 401 ? (TOAST_AUTH && TOAST_AUTH.loginError) : (TOAST_AUTH && TOAST_AUTH.loginErrorGeneric);
        if (typeof showToast === 'function') showToast(msg || 'E-mail ou senha incorretos');
        return null;
      }
      const access_token = data.access_token;
      const user_id = (data.user && data.user.id) ? data.user.id : null;
      if (!access_token) {
        if (typeof showToast === 'function') showToast(TOAST_AUTH && TOAST_AUTH.loginErrorGeneric || 'Erro ao fazer login.');
        return null;
      }
      await window.api.setStoredAccessToken(access_token);
      if (user_id) await window.api.setStoredUserId(user_id);
      return { access_token, user: { id: user_id }, user_id };
    } catch (err) {
      if (typeof showToast === 'function') showToast(TOAST_AUTH && TOAST_AUTH.loginErrorGeneric || 'Erro ao fazer login.');
      return null;
    }
  }

  async function createUser(email, password, full_name) {
    const url = `${SUPABASE_URL}/auth/v1/signup`;
    const body = JSON.stringify({
      email: email.trim(),
      password,
      data: { full_name: (full_name || '').trim() }
    });
    const headers = {
      'apikey': SUA_ANON_PUBLIC_KEY,
      'Authorization': `Bearer ${SUA_ANON_PUBLIC_KEY}`,
      'Content-Type': 'application/json'
    };
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      const data = await res.json().catch(() => ({}));
      if (res.status !== 200 && res.status !== 201) {
        const msg = (data.msg || data.message || data.error_description) || (TOAST_AUTH && TOAST_AUTH.createUserError);
        if (typeof showToast === 'function') showToast(msg);
        return { success: false };
      }
      if (typeof showToast === 'function') showToast(TOAST_AUTH && TOAST_AUTH.createUserSuccess || 'Usuário criado com sucesso');
      return { success: true };
    } catch (err) {
      if (typeof showToast === 'function') showToast(TOAST_AUTH && TOAST_AUTH.createUserError || 'Erro ao criar conta.');
      return { success: false };
    }
  }

  window.api = window.api || {};
  window.api.ensureTokenAndRedirect = ensureTokenAndRedirect;
  window.api.doLogin = doLogin;
  window.api.createUser = createUser;
})();
