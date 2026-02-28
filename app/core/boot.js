/**
 * Core — boot e login
 */
(function () {
  async function boot() {
    stateManager.setState({ ui: { ...getState().ui, loading: true, error: null } });

    const token = await api.getStoredAccessToken();
    if (!token || token.trim() === '') {
      stateManager.setState({
        auth: { screen: 'login' },
        ui: { ...getState().ui, loading: false, error: null }
      });
      return;
    }

    const userId = await api.getStoredUserId();
    if (!userId) {
      stateManager.setState({
        auth: { screen: 'login' },
        ui: { ...getState().ui, loading: false, error: null }
      });
      return;
    }

    try {
      const ok = await window.engine.loadAndApplyUserData(userId);
      if (!ok) {
        stateManager.setState({
          auth: { screen: 'login' },
          ui: { ...getState().ui, loading: false, error: null }
        });
        return;
      }
      stateManager.setState({
        auth: { screen: null },
        ui: { ...getState().ui, loading: false, error: null }
      });
    } catch (err) {
      stateManager.setState({
        auth: { screen: 'login' },
        ui: { ...getState().ui, loading: false, error: { message: 'Falha ao carregar dados.' } }
      });
    }
  }

  async function handleLoginSuccess(loginResult) {
    if (!loginResult || (!loginResult.user_id && !loginResult.user)) return false;
    const userId = loginResult.user_id || (loginResult.user && loginResult.user.id);
    stateManager.setState({
      user: {
        ...getState().user,
        id: userId,
        user_id: userId
      },
      auth: { screen: null },
      ui: { ...getState().ui, loading: true }
    });
    try {
      await window.engine.loadAndApplyUserData(userId);
    } catch (_) {}
    stateManager.setState({ ui: { ...getState().ui, loading: false } });
    return true;
  }

  window.engine = window.engine || {};
  window.engine.boot = boot;
  window.engine.handleLoginSuccess = handleLoginSuccess;
})();
