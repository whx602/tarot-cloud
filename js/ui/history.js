/**
 * 历史记录页（history.js）—— 从后端拉取当前用户的抽牌记录并展示。
 * 公开 App.historyUI.open() / close() / bind()。
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  function el(id) { return document.getElementById(id); }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cardChips(cards) {
    if (!cards || !cards.length) return '';
    return cards.map(function (c) {
      return '<span class="chip' + (c.reversed ? ' chip-rev' : '') + '">' +
        esc(c.nameZh) + (c.reversed ? ' ·逆' : '') + '</span>';
    }).join('');
  }

  async function open() {
    el('historyModal').classList.add('show');
    el('historyList').innerHTML = '<div class="loading">加载中…</div>';
    try {
      var data = await App.api.get('/history');
      render(data.history || []);
    } catch (e) {
      el('historyList').innerHTML = '<div class="loading">' + esc(e && e.message ? e.message : '加载失败') + '</div>';
    }
  }

  function close() {
    el('historyModal').classList.remove('show');
  }

  function render(list) {
    if (!list.length) {
      el('historyList').innerHTML = '<div class="loading">还没有抽牌记录，去抽第一张吧 ✦</div>';
      return;
    }
    el('historyList').innerHTML = list.map(function (h) {
      var ai = h.aiText
        ? '<div class="hist-ai"><div class="hist-ai-title">✦ AI 解读</div>' +
          '<div class="hist-ai-body">' + esc(h.aiText).replace(/\n/g, '<br>') + '</div></div>'
        : '';
      return '<div class="hist-item">' +
        '<div class="hist-head">' +
          '<span class="hist-spread">' + esc(h.spreadName) + '</span>' +
          '<span class="hist-date">' + esc(h.drawDate) + '</span>' +
        '</div>' +
        (h.question ? '<div class="hist-q">问：' + esc(h.question) + '</div>' : '') +
        '<div class="hist-cards">' + cardChips(h.cards) + '</div>' +
        ai +
      '</div>';
    }).join('');
  }

  function bind() {
    var closeBtn = el('historyModal').querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  App.historyUI = { open: open, close: close, bind: bind };
})();
