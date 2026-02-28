/**
 * API — Storage: token e user_id (Chrome.storage.local / localStorage)
 */
(function () {
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

  window.api = window.api || {};
  window.api.getStoredAccessToken = getStoredAccessToken;
  window.api.setStoredAccessToken = setStoredAccessToken;
  window.api.getStoredUserId = getStoredUserId;
  window.api.setStoredUserId = setStoredUserId;
})();
