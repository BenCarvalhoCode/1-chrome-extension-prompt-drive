/**
 * API — Prompts: createPrompt, updatePrompt, deletePrompt
 */
(function () {
  async function createPrompt(payload) {
    const token = await window.api.ensureTokenAndRedirect();
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
      const data = await res.json().catch(function () { return {}; });
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
    const token = await window.api.ensureTokenAndRedirect();
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
      const data = await res.json().catch(function () { return {}; });
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
    const token = await window.api.ensureTokenAndRedirect();
    if (!token) return false;

    const url = `${SUPABASE_URL}/rest/v1/prompts?id=eq.${encodeURIComponent(payload.promptId)}`;
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

  window.api = window.api || {};
  window.api.createPrompt = createPrompt;
  window.api.updatePrompt = updatePrompt;
  window.api.deletePrompt = deletePrompt;
})();
