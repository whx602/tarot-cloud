/**
 * 登录 / 注册弹窗（auth-modal.js）。
 * 公开 App.authUI.open('login'|'register') / close() / bind()。
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  var mode = 'login'; // 'login' | 'register'

  function el(id) { return document.getElementById(id); }

  function render() {
    var isLogin = mode === 'login';
    el('authTitle').textContent = isLogin ? '✦ 登录' : '✦ 注册';
    el('authSubmit').textContent = isLogin ? '登录' : '注册并登录';
    el('authSwitchText').textContent = isLogin ? '还没有账号？' : '已有账号？';
    el('authSwitchBtn').textContent = isLogin ? '去注册' : '去登录';
    hideError();
    el('authPassword').value = '';
  }

  function showError(msg) {
    el('authError').textContent = msg;
    el('authError').classList.remove('hidden');
  }
  function hideError() {
    el('authError').textContent = '';
    el('authError').classList.add('hidden');
  }

  function open(m) {
    mode = m || 'login';
    render();
    el('authModal').classList.add('show');
    setTimeout(function () { el('authUsername').focus(); }, 50);
  }

  function close() {
    el('authModal').classList.remove('show');
  }

  async function submit() {
    var username = el('authUsername').value.trim();
    var password = el('authPassword').value;
    if (!username) { showError('请输入用户名'); return; }
    if (!password) { showError('请输入密码'); return; }

    var btn = el('authSubmit');
    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = '请稍候…';
    hideError();
    try {
      var user = mode === 'login'
        ? await App.auth.login(username, password)
        : await App.auth.register(username, password);
      App.toast.success('欢迎，' + user.username + ' ✦');
      close();
    } catch (e) {
      showError(e && e.message ? e.message : '操作失败，请重试');
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  function bind() {
    el('authSubmit').addEventListener('click', submit);
    el('authSwitchBtn').addEventListener('click', function () {
      mode = mode === 'login' ? 'register' : 'login';
      render();
    });
    el('authUsername').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') el('authPassword').focus();
    });
    el('authPassword').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
    var closeBtn = el('authModal').querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  App.authUI = { open: open, close: close, bind: bind };
})();
