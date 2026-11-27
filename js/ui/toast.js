/**
 * 轻提示（toast.js）—— 页面顶部弹出短暂提示，自动消失。
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  var wrap = null;

  function ensureWrap() {
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
    return wrap;
  }

  function show(message, type) {
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = message;
    ensureWrap().appendChild(el);

    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, 2400);
  }

  App.toast = {
    info: function (m) { show(m, 'info'); },
    success: function (m) { show(m, 'success'); },
    error: function (m) { show(m, 'error'); },
  };
})();
