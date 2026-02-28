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
 * Em 401/403: limpa token e user_id do storage e exibe toast de sessão expirada.
 * Como não há FK entre profiles e folders, faz duas requisições: perfil e pastas (com prompts).
 * Se não houver perfil, usa perfil mínimo e mesmo assim carrega pastas. Tenta user_id e profile_id nas pastas.
 */
async function loadUserData(userId) {
  const token = await getStoredAccessToken();
  const uid = userId || await getStoredUserId();
  if (!token || !uid) return null;

  const headers = {
    'apikey': SUA_ANON_PUBLIC_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1) Perfil do usuário (sem pastas). Se não existir linha em profiles, usa perfil mínimo e continua para carregar pastas.
    const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=id,plan,stripe_customer_id,stripe_subscriptions(stripe_subscription_id,status,current_period_start,current_period_end)`;
    const profileRes = await fetch(profileUrl, { method: 'GET', headers });
    if (profileRes.status === 401 || profileRes.status === 403) {
      await setStoredAccessToken('');
      await setStoredUserId('');
      if (typeof showToast === 'function') showToast(TOAST_AUTH && TOAST_AUTH.sessionExpired ? TOAST_AUTH.sessionExpired : 'Sessão expirada. Faça login novamente.');
      return null;
    }
    let profile = null;
    if (profileRes.ok) {
      const profileList = await profileRes.json();
      profile = Array.isArray(profileList) && profileList.length > 0 ? profileList[0] : profileList;
    }
    if (!profile || !profile.id) {
      profile = { id: uid, user_id: uid, plan: 'free', stripe_customer_id: null, stripe_subscriptions: [] };
    } else {
      profile.user_id = profile.id;
    }

    // 2) Pastas: tenta user_id; se 400 por coluna inexistente, tenta profile_id (alguns schemas usam profile_id na tabela folders).
    let folders = await fetchFoldersForUser(uid, headers);
    if (folders === null && uid) {
      folders = await fetchFoldersForUser(uid, headers, true);
    }
    if (folders === null) folders = [];

    const data = { ...profile, folders: Array.isArray(folders) ? folders : [] };
    return data;
  } catch (err) {
    console.error('[API] loadUserData', err);
    return null;
  }
}

/**
 * Busca pastas do usuário (e prompts). userColumnProfileId = true usa profile_id em vez de user_id no filtro.
 */
async function fetchFoldersForUser(uid, headers, userColumnProfileId = false) {
  const column = userColumnProfileId ? 'profile_id' : 'user_id';
  const foldersUrlEmbed = `${SUPABASE_URL}/rest/v1/folders?${column}=eq.${encodeURIComponent(uid)}&select=id,name,prompts(id,name,content,created_at)`;
  const foldersRes = await fetch(foldersUrlEmbed, { method: 'GET', headers });
  if (foldersRes.status === 401 || foldersRes.status === 403) return null;
  const bodyText = await foldersRes.text();
  if (foldersRes.status === 400 && !userColumnProfileId && (bodyText.includes('user_id') && bodyText.includes('does not exist'))) {
    return null;
  }
  if (foldersRes.ok) {
    const foldersList = JSON.parse(bodyText || '[]');
    let folders = Array.isArray(foldersList) ? foldersList : [];
    const needPrompts = folders.length > 0 && folders.some((f) => !Array.isArray(f.prompts));
    if (needPrompts) {
      const folderIds = folders.map((f) => f.id).filter(Boolean);
      if (folderIds.length > 0) {
        const promptsUrl = `${SUPABASE_URL}/rest/v1/prompts?folder_id=in.(${folderIds.map((id) => `"${id}"`).join(',')})&select=id,folder_id,name,content,created_at`;
        const promptsRes = await fetch(promptsUrl, { method: 'GET', headers });
        if (promptsRes.ok) {
          const promptsList = await promptsRes.json().catch(() => []);
          const prompts = Array.isArray(promptsList) ? promptsList : [];
          const byFolder = {};
          prompts.forEach((p) => {
            const fid = p.folder_id;
            if (!byFolder[fid]) byFolder[fid] = [];
            byFolder[fid].push({ id: p.id, name: p.name ?? '', content: p.content ?? '', created_at: p.created_at ?? new Date().toISOString() });
          });
          folders = folders.map((f) => ({ id: f.id, name: f.name || '', prompts: byFolder[f.id] || [] }));
        } else {
          folders = folders.map((f) => ({ id: f.id, name: f.name || '', prompts: [] }));
        }
      } else {
        folders = folders.map((f) => ({ id: f.id, name: f.name || '', prompts: [] }));
      }
    }
    return folders;
  }
  if (foldersRes.status === 400) {
    const foldersUrlOnly = `${SUPABASE_URL}/rest/v1/folders?${column}=eq.${encodeURIComponent(uid)}&select=id,name`;
    const foldersOnlyRes = await fetch(foldersUrlOnly, { method: 'GET', headers });
    if (foldersOnlyRes.status === 401 || foldersOnlyRes.status === 403) return null;
    if (foldersOnlyRes.ok) {
      const list = await foldersOnlyRes.json().catch(() => []);
      const folderList = Array.isArray(list) ? list : [];
      const folderIds = folderList.map((f) => f.id).filter(Boolean);
      if (folderIds.length > 0) {
        const promptsUrl = `${SUPABASE_URL}/rest/v1/prompts?folder_id=in.(${folderIds.map((id) => `"${id}"`).join(',')})&select=id,folder_id,name,content,created_at`;
        const promptsRes = await fetch(promptsUrl, { method: 'GET', headers });
        let prompts = [];
        if (promptsRes.ok) {
          const pl = await promptsRes.json().catch(() => []);
          prompts = Array.isArray(pl) ? pl : [];
        }
        const byFolder = {};
        prompts.forEach((p) => {
          const fid = p.folder_id;
          if (!byFolder[fid]) byFolder[fid] = [];
          byFolder[fid].push({ id: p.id, name: p.name ?? '', content: p.content ?? '', created_at: p.created_at ?? new Date().toISOString() });
        });
        return folderList.map((f) => ({ id: f.id, name: f.name || '', prompts: byFolder[f.id] || [] }));
      }
      return folderList.map((f) => ({ id: f.id, name: f.name || '', prompts: [] }));
    }
    console.warn('[API] fetchFoldersForUser fallback error', foldersOnlyRes.status, await foldersOnlyRes.text());
  }
  return null;
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

async function createPrompt(payload) {
  const token = await ensureTokenAndRedirect();
  if (!token) return null;

  const url = `${SUPABASE_URL}/rest/v1/prompts`;
  const body = JSON.stringify({
    user_id: payload.userId,
    folder_id: payload.folder_id,
    name: (payload.name || '').trim(),
    content: (payload.content || '').trim()
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
    if (res.status === 201 || res.status === 200) {
      const list = Array.isArray(data) ? data : (data ? [data] : []);
      return list.length > 0 ? list[0] : null;
    }
    if (res.status === 401 || res.status === 403) {
      if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
      return null;
    }
    if (res.status === 409 || res.status === 400) {
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptDuplicateName || TOAST_MESSAGES.promptError);
      return null;
    }
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
    return null;
  } catch (err) {
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
    return null;
  }
}

async function updatePrompt(payload) {
  const token = await ensureTokenAndRedirect();
  if (!token) return null;

  const url = `${SUPABASE_URL}/rest/v1/prompts?id=eq.${encodeURIComponent(payload.promptId)}`;
  const bodyObj = {
    name: (payload.name || '').trim(),
    content: (payload.content || '').trim()
  };
  if (payload.folder_id != null) bodyObj.folder_id = payload.folder_id;
  const body = JSON.stringify(bodyObj);
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
      if (list.length === 0) {
        if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
        return null;
      }
      return list.length > 0 ? list[0] : true;
    }
    if (res.status === 401 || res.status === 403) {
      if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
      return null;
    }
    if (res.status === 400 || res.status === 409) {
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptDuplicateName || TOAST_MESSAGES.promptError);
      return null;
    }
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
    return null;
  } catch (err) {
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
    return null;
  }
}

async function deletePrompt(payload) {
  const token = await ensureTokenAndRedirect();
  if (!token) return false;

  const url = `${SUPABASE_URL}/rest/v1/prompts?id=eq.${encodeURIComponent(payload.promptId)}`;
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
        if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptDeleteNotAllowed);
        return false;
      }
      return true;
    }
    if (res.status === 401 || res.status === 403) {
      if (typeof window.redirectToLogin === 'function') window.redirectToLogin();
      if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
      return false;
    }
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
    return false;
  } catch (err) {
    if (typeof showToast === 'function') showToast(TOAST_MESSAGES.promptError);
    return false;
  }
}

function activateLicenseKey(payload) {
  console.log('[API] activateLicenseKey', payload);
}

//==============================================
// License Methods
//==============================================

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
