/**
 * API — Folders: createFolder, updateFolder, deleteFolder
 */
(function () {
  async function createFolder(payload) {
    const token = await window.api.ensureTokenAndRedirect();
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
      const data = await res.json().catch(function () { return {}; });
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
    const token = await window.api.ensureTokenAndRedirect();
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
      const data = await res.json().catch(function () { return {}; });
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
    const token = await window.api.ensureTokenAndRedirect();
    if (!token) return false;

    const url = `${SUPABASE_URL}/rest/v1/folders?id=eq.${encodeURIComponent(payload.folderId)}`;
    const headers = {
      'apikey': SUA_ANON_PUBLIC_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=representation'
    };
    try {
      const res = await fetch(url, { method: 'DELETE', headers });
      const data = await res.json().catch(function () { return {}; });
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

  window.api = window.api || {};
  window.api.createFolder = createFolder;
  window.api.updateFolder = updateFolder;
  window.api.deleteFolder = deleteFolder;
})();
