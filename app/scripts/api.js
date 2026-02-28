/**
 * Contrato de integração com backend — Auth + Supabase
 * Centraliza login, criação de usuário, carga inicial e chamadas ao backend.
 */

const ACCESS_TOKEN_KEY = typeof ACCESS_TOKEN_STORAGE_KEY !== 'undefined' ? ACCESS_TOKEN_STORAGE_KEY : 'ACCESS_TOKEN_DO_USUARIO';
const USER_ID_KEY = typeof USER_ID_STORAGE_KEY !== 'undefined' ? USER_ID_STORAGE_KEY : 'USER_ID_DO_USUARIO';

function isChromeStorageAvailable() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

function getStoredAccessToken() {
  return new Promise((resolve) => {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.get([ACCESS_TOKEN_KEY], (result) => {
        resolve(result[ACCESS_TOKEN_KEY] || null);
      });
    } else {
      try {
        resolve(localStorage.getItem(ACCESS_TOKEN_KEY) || null);
      } catch {
        resolve(null);
      }
    }
  });
}

function setStoredAccessToken(token) {
  return new Promise((resolve) => {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.set({ [ACCESS_TOKEN_KEY]: token || '' }, resolve);
    } else {
      try {
        if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
        else localStorage.removeItem(ACCESS_TOKEN_KEY);
      } catch (_) {}
      resolve();
    }
  });
}

function getStoredUserId() {
  return new Promise((resolve) => {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.get([USER_ID_KEY], (result) => {
        resolve(result[USER_ID_KEY] || null);
      });
    } else {
      try {
        resolve(localStorage.getItem(USER_ID_KEY) || null);
      } catch {
        resolve(null);
      }
    }
  });
}

function setStoredUserId(userId) {
  return new Promise((resolve) => {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.set({ [USER_ID_KEY]: userId || '' }, resolve);
    } else {
      try {
        if (userId) localStorage.setItem(USER_ID_KEY, userId);
        else localStorage.removeItem(USER_ID_KEY);
      } catch (_) {}
      resolve();
    }
  });
}

/**
 * Login com e-mail e senha.
 * Em sucesso: salva access_token em Chrome.storage.local (ou localStorage) e retorna { access_token, user: { id } }.
 * Em erro: exibe toast e retorna null.
 */
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
    await setStoredAccessToken(access_token);
    if (user_id) await setStoredUserId(user_id);
    return { access_token, user: { id: user_id }, user_id };
  } catch (err) {
    if (typeof showToast === 'function') showToast(TOAST_AUTH && TOAST_AUTH.loginErrorGeneric || 'Erro ao fazer login.');
    return null;
  }
}

/**
 * Criar nova conta (signup).
 * Body: email, password, data: { full_name }.
 * Em sucesso: toast "usuário criado com sucesso", depois redirecionar à tela de login.
 */
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

/**
 * Carrega dados iniciais do usuário (profiles + folders + prompts) via REST.
 * Requer token em storage e user_id (state ou parâmetro).
 */
async function loadUserData(userId) {
  const token = await getStoredAccessToken();
  const uid = userId || await getStoredUserId();
  if (!token || !uid) return null;

  const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(uid)}&select=user_id,plan,stripe_customer_id,subscriptions(stripe_subscription_id,status,current_period_start,current_period_end),folders(id,name,prompts(id,name,content,created_at))`;
  const headers = {
    'apikey': SUA_ANON_PUBLIC_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      console.error('[API] loadUserData error', res.status, await res.text());
      return null;
    }
    const list = await res.json();
    const data = Array.isArray(list) && list.length > 0 ? list[0] : list;
    if (!data || !data.user_id) return null;
    return data;
  } catch (err) {
    console.error('[API] loadUserData', err);
    return null;
  }
}

//==============================================
// Folders Methods
//==============================================

async function ensureTokenAndRedirect() {
  const token = await getStoredAccessToken();
  if (!token || (typeof token === 'string' && token.trim() === '')) {
    if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
    return null;
  }
  return token;
}

async function createFolder(payload) {
  const token = await ensureTokenAndRedirect();
  if (!token) return null;

  const url = `${SUPABASE_URL}/rest/v1/folders`;
  const body = JSON.stringify({
    user_id: payload.userId,
    name: (payload.folderName || '').trim()
  });
  const headers = {
    'apikey': SUA_ANON_PUBLIC_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json().catch(() => ({}));
    if (res.status === 201) {
      const list = Array.isArray(data) ? data : (data ? [data] : []);
      return list.length > 0 ? list[0] : null;
    }
    if (res.status === 401 || res.status === 403) {
      if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderError);
      return null;
    }
    if (res.status === 409) {
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderDuplicateName);
      return null;
    }
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderError);
    return null;
  } catch (err) {
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderError);
    return null;
  }
}

async function updateFolder(payload) {
  const token = await ensureTokenAndRedirect();
  if (!token) return null;

  const url = `${SUPABASE_URL}/rest/v1/folders?id=eq.${encodeURIComponent(payload.folderId)}`;
  const body = JSON.stringify({
    name: (payload.folderName || '').trim()
  });
  const headers = {
    'apikey': SUA_ANON_PUBLIC_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  try {
    const res = await fetch(url, { method: 'PATCH', headers, body });
    const data = await res.json().catch(() => ({}));
    if (res.status === 200) {
      const list = Array.isArray(data) ? data : (data ? [data] : []);
      return list.length > 0 ? list[0] : true;
    }
    if (res.status === 401 || res.status === 403) {
      if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderError);
      return null;
    }
    if (res.status === 409) {
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderDuplicateName);
      return null;
    }
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderError);
    return null;
  } catch (err) {
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderError);
    return null;
  }
}

async function deleteFolder(payload) {
  const token = await ensureTokenAndRedirect();
  if (!token) return false;

  const url = `${SUPABASE_URL}/rest/v1/folders?id=eq.${encodeURIComponent(payload.folderId)}`;
  const headers = {
    'apikey': SUA_ANON_PUBLIC_KEY,
    'Authorization': `Bearer ${token}`,
    'Prefer': 'return=representation'
  };
  try {
    const res = await fetch(url, { method: 'DELETE', headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 200) {
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) {
        if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderDeleteNotAllowed);
        return false;
      }
      return true;
    }
    if (res.status === 401 || res.status === 403) {
      if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderDeleteError);
      return false;
    }
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderDeleteError);
    return false;
  } catch (err) {
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.folderDeleteError);
    return false;
  }
}

//==============================================
// Prompts Methods
//==============================================

function createPrompt(payload) {
  console.log('[API] createPrompt', payload);
}

function updatePrompt(payload) {
  console.log('[API] updatePrompt', payload);
}

function deletePrompt(payload) {
  console.log('[API] deletePrompt', payload);
}

function activateLicenseKey(payload) {
  console.log('[API] activateLicenseKey', payload);
}

const api = {
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredUserId,
  setStoredUserId,
  doLogin,
  createUser,
  loadUserData,
  createFolder,
  updateFolder,
  deleteFolder,
  createPrompt,
  updatePrompt,
  deletePrompt,
  activateLicenseKey
};
