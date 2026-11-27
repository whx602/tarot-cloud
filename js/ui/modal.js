/**
 * 弹窗模块（modal.js）—— 牌义详情、预设皮肤切换、设置（含 AI 开关）。
 * 注意：预设皮肤版已移除「上传/图集/导入导出」等自定义皮肤功能。
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  var ROMAN = ['0', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ',
    'Ⅺ', 'Ⅻ', 'ⅩⅢ', 'ⅩⅣ', 'ⅩⅤ', 'ⅩⅥ', 'ⅩⅦ', 'ⅩⅧ', 'ⅩⅨ', 'ⅩⅩ', 'ⅩⅪ'];

  function el(id) { return document.getElementById(id); }

  function h(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function numLabel(card) {
    if (card.arcana === 'major') return ROMAN[card.num] || String(card.num);
    if (card.num === 1) return 'A';
    if (card.num === 11) return '侍';
    if (card.num === 12) return '骑';
    if (card.num === 13) return '后';
    if (card.num === 14) return '王';
    return String(card.num);
  }

  function show(id) {
    var m = el(id);
    if (m) m.classList.add('show');
  }

  function close(id) {
    if (id) {
      var m = el(id);
      if (m) m.classList.remove('show');
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll('.modal.show'), function (m) {
      m.classList.remove('show');
    });
  }

  function bindOverlayClose() {
    document.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
      }
    });
  }

  // ---------------- 牌义详情弹窗 ----------------

  function openCard(drawn, positionLabel) {
    var card = drawn.card;
    var posText = positionLabel || (drawn.positionLabel ? drawn.positionLabel : '');
    // detail-img 也挂 card-img + data-cid，图片 404 时同样被全局监听兜底为占位图
    var imgHTML = drawn.img
      ? '<img class="detail-img card-img" data-cid="' + card.id + '" src="' + drawn.img + '" alt="' + h(card.nameZh) + '">'
      : '<div class="detail-img-wrap">' + App.render.placeholderHTML(card) + '</div>';

    var suitLine = '';
    if (card.arcana === 'minor') {
      suitLine = '<span class="tag">元素 · ' + h(App.SUITS[card.suit].element) + '</span>';
      if (card.zodiac) suitLine += '<span class="tag">' + h(card.zodiac) + '</span>';
    } else {
      suitLine = '<span class="tag">大阿卡纳</span>';
    }

    var keywords = card.keywords.map(function (k) {
      return '<span class="kw">' + h(k) + '</span>';
    }).join('');

    el('cardModalBody').innerHTML =
      '<div class="detail-top">' +
        '<div class="detail-left">' + imgHTML + '</div>' +
        '<div class="detail-right">' +
          '<div class="detail-name">' + h(card.nameZh) + '</div>' +
          '<div class="detail-en">' + h(card.nameEn) + '</div>' +
          '<div class="detail-num">' + numLabel(card) + ' · ' + (drawn.reversed ? '逆位' : '正位') + '</div>' +
          (posText ? '<div class="detail-pos">位置 · ' + h(posText) + '</div>' : '') +
          '<div class="detail-tags">' + suitLine + '</div>' +
          '<div class="detail-kw">' + keywords + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-mean">' +
        '<div class="mean-block"><h4>正位含义</h4><p>' + h(card.meaningUpright) + '</p></div>' +
        '<div class="mean-block"><h4>逆位含义</h4><p>' + h(card.meaningReversed) + '</p></div>' +
      '</div>' +
      '<div class="detail-advice"><h4>✦ 建议</h4><p>' + h(card.advice) + '</p></div>';

    show('cardModal');
  }

  // ---------------- 预设皮肤弹窗 ----------------

  function openSkin() {
    renderSkinList();
    show('skinModal');
  }

  function renderSkinList() {
    var listEl = el('skinList');
    var cur = App.skins.getCurrent();
    var html = '';
    App.skins.all().forEach(function (s) {
      var active = s.id === cur.id;
      var preview = s.previewUrl
        ? '<img class="skin-preview" src="' + h(s.previewUrl) + '" alt="">'
        : '<div class="skin-preview skin-preview-ph">✦</div>';
      html += '<div class="skin-item' + (active ? ' active' : '') + '" data-skin-id="' + h(s.id) + '">' +
        preview +
        '<div class="skin-item-name">' + h(s.name) + (active ? ' <span class="skin-cur-tag">当前</span>' : '') + '</div>' +
        '<div class="skin-item-actions">' +
          (active ? '' : '<button class="btn-mini" data-act="switch">使用</button>') +
        '</div>' +
      '</div>';
    });
    listEl.innerHTML = html || '<div class="empty-hint">暂无可用套系</div>';

    Array.prototype.forEach.call(listEl.querySelectorAll('.skin-item'), function (item) {
      item.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        switchSkin(item.getAttribute('data-skin-id'));
      });
    });
  }

  function switchSkin(skinId) {
    if (skinId === App.skins.currentId) return;
    App.skins.switchTo(skinId).then(function (skin) {
      App.render.refreshSkin();
      renderSkinList();
      if (typeof App.updateSkinLabel === 'function') App.updateSkinLabel();
      App.toast.success('已切换套系：' + skin.name);
    }).catch(function (e) {
      App.toast.error(e && e.message ? e.message : '切换失败');
    });
  }

  // ---------------- 设置弹窗 ----------------

  function openSettings() {
    el('setAllowReversed').checked = !!App.settings.allowReversed;
    el('setAnimations').checked = App.settings.animations !== false;

    // AI 解读开关（需登录）
    var user = App.auth.getUser();
    el('setAiEnabled').checked = !!(user && user.aiEnabled);
    el('setAiEnabled').disabled = !user;
    el('aiHint').classList.toggle('hidden', !!user);

    show('settingsModal');
  }

  function applySettings() {
    App.settings.allowReversed = el('setAllowReversed').checked;
    App.settings.animations = el('setAnimations').checked;
    if (typeof App.saveSettings === 'function') App.saveSettings();
    if (typeof App.applyBodyAnimClass === 'function') App.applyBodyAnimClass();

    // AI 开关：登录且状态有变化才同步后端
    var user = App.auth.getUser();
    var aiOn = el('setAiEnabled').checked;
    var done = Promise.resolve();
    if (user && aiOn !== !!user.aiEnabled) {
      done = App.auth.setAiEnabled(aiOn).then(function () {
        App.toast.success(aiOn ? 'AI 解读已开启 ✦' : 'AI 解读已关闭');
      }).catch(function (e) {
        App.toast.error(e && e.message ? e.message : '保存失败');
      });
    }
    done.then(function () { close('settingsModal'); });
  }

  // ---------------- 事件绑定 ----------------

  function bindEvents() {
    el('setSaveBtn').addEventListener('click', applySettings);

    // 关闭按钮（.modal-close）
    document.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('.modal-close') : null;
      if (c) {
        var m = c.closest('.modal');
        if (m) m.classList.remove('show');
      }
    });

    bindOverlayClose();
  }

  var modal = {
    openCard: openCard,
    openSkin: openSkin,
    openSettings: openSettings,
    close: close,
  };

  App.modal = modal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
