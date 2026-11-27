/**
 * 鉴权状态管理（auth.js）—— 当前用户、登录/注册/退出、token 刷新、设置同步。
 * 数据本地缓存于 localStorage（'tarot_token' / 'tarot_user'），仅用于快速恢复 UI；
 * 真正的校验与安全边界都在后端（JWT + D1）。
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  var TOKEN_KEY = 'tarot_token';
  var USER_KEY = 'tarot_user';

  var user = null;       // { id, username, currentSkin, aiEnabled }
  var listeners = [];    // 登录状态变化回调

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      user = raw ? JSON.parse(raw) : null;
    } catch { user = null; }
    return user;
  }

  function saveUser(u) {
    user = u;
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
    } catch { /* 忽略 */ }
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(user); } catch { /* 忽略 */ } });
  }

  function isLoggedIn() {
    return !!user && !!App.api.getToken();
  }

  /** 启动时校验 token 是否仍有效（过期则被 401 统一处理） */
  async function refresh() {
    if (!App.api.getToken()) return null;
    try {
      var data = await App.api.get('/me');
      saveUser(data.user);
      notify();
      return data.user;
    } catch (e) {
      // 401 已由 api.js 统一处理（会触发 onUnauthorized），这里无需重复
      if (e && e.code === 401) return null;
      return user; // 网络错误：保留本地缓存用户
    }
  }

  async function login(username, password) {
    var data = await App.api.post('/auth/login', { username: username, password: password });
    App.api.setToken(data.token);
    saveUser(data.user);
    notify();
    return data.user;
  }

  async function register(username, password) {
    var data = await App.api.post('/auth/register', { username: username, password: password });
    App.api.setToken(data.token);
    saveUser(data.user);
    notify();
    return data.user;
  }

  function logout() {
    App.api.clearToken();
    saveUser(null);
    notify();
  }

  /** 切换当前皮肤（同步到后端用户表） */
  async function setCurrentSkin(skinId) {
    var data = await App.api.post('/skins/switch', { skinId: skinId });
    if (user) { user.currentSkin = data.skinId; saveUser(user); }
    return data.skinId;
  }

  /** 设置 AI 解读开关（同步到后端用户表） */
  async function setAiEnabled(enabled) {
    var data = await App.api.post('/me', { aiEnabled: enabled });
    saveUser(data.user);
    notify();
    return data.user;
  }

  /** token 过期 / 无效时的统一处理 */
  function onUnauthorized() {
    saveUser(null);
    notify();
    if (App.toast) App.toast.info('登录已过期，请重新登录');
    if (App.authUI) App.authUI.open('login');
  }

  App.auth = {
    init: function () {
      loadFromStorage();
      if (App.api.getToken()) refresh(); // 异步校验，结果通过 onChange 下发
      return user;
    },
    refresh: refresh,
    login: login,
    register: register,
    logout: logout,
    getUser: function () { return user; },
    isLoggedIn: isLoggedIn,
    onChange: function (fn) { listeners.push(fn); },
    setCurrentSkin: setCurrentSkin,
    setAiEnabled: setAiEnabled,
    onUnauthorized: onUnauthorized,
  };
})();
