/**
 * API — User data: loadUserData, fetchFoldersForUser
 */
(function () {
  async function loadUserData(userId) {
    const token = await window.api.getStoredAccessToken();
    const uid = userId || await window.api.getStoredUserId();
    if (!token || !uid) return null;

    const headers = {
      'apikey': SUA_ANON_PUBLIC_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=id,plan,stripe_customer_id,stripe_subscriptions(stripe_subscription_id,status,current_period_start,current_period_end)`;
      const profileRes = await fetch(profileUrl, { method: 'GET', headers });
      if (profileRes.status === 401 || profileRes.status === 403) {
        await window.api.setStoredAccessToken('');
        await window.api.setStoredUserId('');
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

      let folders = await window.api.fetchFoldersForUser(uid, headers);
      if (folders === null && uid) {
        folders = await window.api.fetchFoldersForUser(uid, headers, true);
      }
      if (folders === null) folders = [];

      return { ...profile, folders: Array.isArray(folders) ? folders : [] };
    } catch (err) {
      console.error('[API] loadUserData', err);
      return null;
    }
  }

  async function fetchFoldersForUser(uid, headers, userColumnProfileId) {
    userColumnProfileId = userColumnProfileId === true;
    const column = userColumnProfileId ? 'profile_id' : 'user_id';
    const foldersUrlEmbed = `${SUPABASE_URL}/rest/v1/folders?${column}=eq.${encodeURIComponent(uid)}&select=id,name,prompts(id,name,content,created_at)`;
    const foldersRes = await fetch(foldersUrlEmbed, { method: 'GET', headers });
    if (foldersRes.status === 401 || foldersRes.status === 403) return null;
    const bodyText = await foldersRes.text();
    if (foldersRes.status === 400 && !userColumnProfileId && bodyText.includes('user_id') && bodyText.includes('does not exist')) {
      return null;
    }
    if (foldersRes.ok) {
      const foldersList = JSON.parse(bodyText || '[]');
      let folders = Array.isArray(foldersList) ? foldersList : [];
      const needPrompts = folders.length > 0 && folders.some(function (f) { return !Array.isArray(f.prompts); });
      if (needPrompts) {
        const folderIds = folders.map(function (f) { return f.id; }).filter(Boolean);
        if (folderIds.length > 0) {
          const promptsUrl = `${SUPABASE_URL}/rest/v1/prompts?folder_id=in.(${folderIds.map(function (id) { return '"' + id + '"'; }).join(',')})&select=id,folder_id,name,content,created_at`;
          const promptsRes = await fetch(promptsUrl, { method: 'GET', headers });
          if (promptsRes.ok) {
            const promptsList = await promptsRes.json().catch(function () { return []; });
            const prompts = Array.isArray(promptsList) ? promptsList : [];
            const byFolder = {};
            prompts.forEach(function (p) {
              const fid = p.folder_id;
              if (!byFolder[fid]) byFolder[fid] = [];
              byFolder[fid].push({ id: p.id, name: p.name ?? '', content: p.content ?? '', created_at: p.created_at ?? new Date().toISOString() });
            });
            folders = folders.map(function (f) { return { id: f.id, name: f.name || '', prompts: byFolder[f.id] || [] }; });
          } else {
            folders = folders.map(function (f) { return { id: f.id, name: f.name || '', prompts: [] }; });
          }
        } else {
          folders = folders.map(function (f) { return { id: f.id, name: f.name || '', prompts: [] }; });
        }
      }
      return folders;
    }
    if (foldersRes.status === 400) {
      const foldersUrlOnly = `${SUPABASE_URL}/rest/v1/folders?${column}=eq.${encodeURIComponent(uid)}&select=id,name`;
      const foldersOnlyRes = await fetch(foldersUrlOnly, { method: 'GET', headers });
      if (foldersOnlyRes.status === 401 || foldersOnlyRes.status === 403) return null;
      if (foldersOnlyRes.ok) {
        const list = await foldersOnlyRes.json().catch(function () { return []; });
        const folderList = Array.isArray(list) ? list : [];
        const folderIds = folderList.map(function (f) { return f.id; }).filter(Boolean);
        if (folderIds.length > 0) {
          const promptsUrl = `${SUPABASE_URL}/rest/v1/prompts?folder_id=in.(${folderIds.map(function (id) { return '"' + id + '"'; }).join(',')})&select=id,folder_id,name,content,created_at`;
          const promptsRes = await fetch(promptsUrl, { method: 'GET', headers });
          let prompts = [];
          if (promptsRes.ok) {
            const pl = await promptsRes.json().catch(function () { return []; });
            prompts = Array.isArray(pl) ? pl : [];
          }
          const byFolder = {};
          prompts.forEach(function (p) {
            const fid = p.folder_id;
            if (!byFolder[fid]) byFolder[fid] = [];
            byFolder[fid].push({ id: p.id, name: p.name ?? '', content: p.content ?? '', created_at: p.created_at ?? new Date().toISOString() });
          });
          return folderList.map(function (f) { return { id: f.id, name: f.name || '', prompts: byFolder[f.id] || [] }; });
        }
        return folderList.map(function (f) { return { id: f.id, name: f.name || '', prompts: [] }; });
      }
      console.warn('[API] fetchFoldersForUser fallback error', foldersOnlyRes.status, await foldersOnlyRes.text());
    }
    return null;
  }

  window.api = window.api || {};
  window.api.loadUserData = loadUserData;
  window.api.fetchFoldersForUser = fetchFoldersForUser;
})();
