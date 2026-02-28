/**
 * Core — seed e normalização de dados do usuário
 */
(function () {
  const SEED_PATHS = ['./data/seed.json', '/data/seed.json', 'data/seed.json'];

  const FALLBACK_SEED = {
    user_id: 'user-fallback',
    plan: 'free',
    stripe_customer_id: null,
    subscriptions: [],
    folders: [
      {
        id: 'folder-1',
        name: 'Marketing',
        prompts: [
          {
            id: 'prompt-1',
            name: 'Post para Redes Sociais',
            content: 'Crie um post engajador para [plataforma] sobre [tema].',
            created_at: new Date().toISOString()
          }
        ]
      }
    ]
  };

  function normalizeSeedData(data) {
    const user = {
      ...getState().user,
      id: data.user_id ?? getState().user.id,
      user_id: data.user_id ?? null,
      plan: data.plan ?? 'free',
      stripe_customer_id: data.stripe_customer_id ?? null,
      subscriptions: Array.isArray(data.stripe_subscriptions) ? data.stripe_subscriptions : (Array.isArray(data.subscriptions) ? data.subscriptions : [])
    };

    let folders = [];

    if (Array.isArray(data.folders) && data.folders.length > 0) {
      const hasNestedPrompts = data.folders.some(function (f) { return Array.isArray(f.prompts); });
      if (hasNestedPrompts) {
        folders = data.folders.map(function (f) {
          return {
            id: f.id,
            name: f.name || '',
            prompts: Array.isArray(f.prompts)
              ? f.prompts.map(function (p) {
                  return {
                    id: p.id,
                    name: p.name ?? p.nome ?? '',
                    content: p.content ?? p.conteudo ?? '',
                    created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
                  };
                })
              : []
          };
        });
      } else {
        const promptsByFolder = {};
        (data.prompts || []).forEach(function (p) {
          const fid = p.folderId;
          if (!promptsByFolder[fid]) promptsByFolder[fid] = [];
          promptsByFolder[fid].push({
            id: p.id,
            name: p.nome ?? p.name ?? '',
            content: p.conteudo ?? p.content ?? '',
            created_at: p.created_at ?? (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString())
          });
        });
        folders = (data.folders || []).map(function (f) {
          return { id: f.id, name: f.name || '', prompts: promptsByFolder[f.id] || [] };
        });
      }
    }

    return { user: user, folders: folders };
  }

  async function loadAndApplyUserData(userId) {
    if (!userId) return false;
    const data = await api.loadUserData(userId);
    if (!data) return false;
    const normalized = normalizeSeedData(data);
    stateManager.setState({
      user: { ...normalized.user, id: userId, user_id: userId },
      data: { folders: normalized.folders }
    });
    return true;
  }

  async function loadSeed() {
    for (let i = 0; i < SEED_PATHS.length; i++) {
      const path = SEED_PATHS[i];
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        const text = await response.text();
        const cleanText = text.trim().replace(/^[\uFEFF\u200B-\u200D\u2060]/g, '');
        const data = JSON.parse(cleanText);
        return normalizeSeedData(data);
      } catch (err) {
        if (path === SEED_PATHS[SEED_PATHS.length - 1]) {
          console.warn('[Engine] Parse error on last path, using fallback:', err.message);
          return normalizeSeedData(FALLBACK_SEED);
        }
      }
    }
    return normalizeSeedData(FALLBACK_SEED);
  }

  window.engine = window.engine || {};
  window.engine.normalizeSeedData = normalizeSeedData;
  window.engine.loadAndApplyUserData = loadAndApplyUserData;
  window.engine.loadSeed = loadSeed;
})();
