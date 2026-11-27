/**
 * 全局请求封装（api.js）—— 所有后端请求统一入口。
 * 自动带上 Authorization: Bearer <JWT>；统一处理 401（token 过期 → 清 token 并触发回调）。
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  var TOKEN_KEY = 'tarot_token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  }
  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* 忽略 */ }
  }
  function clearToken() { setToken(''); }

  /**
   * 发起请求。body 存在则 JSON 序列化。
   * 出错时抛出 { code, message }，调用方 catch 后取 e.message 展示即可。
   */
  async function request(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var resp;
    try {
      resp = await fetch('/api' + path, {
        method: method,
        headers: headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw { code: 'network', message: '网络错误，请检查网络连接' };
    }

    var data;
    try { data = await resp.json(); } catch { data = {}; }

    // 统一 401：token 过期/无效 → 清 token + 触发全局回调（跳登录）
    if (resp.status === 401) {
      clearToken();
      if (App.auth && typeof App.auth.onUnauthorized === 'function') {
        App.auth.onUnauthorized();
      }
    }

    if (!resp.ok) {
      throw { code: resp.status, message: data.error || '请求失败，请重试' };
    }
    return data;
  }

  App.api = {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body || {}); },
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
  };
})();
