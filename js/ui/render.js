/**
 * 牌阵渲染与翻牌交互（UI 层，负责 DOM 生成与事件绑定）
 *
 * 公开 API（供 main.js 调用）：
 *  - showSpread(spread)      切换到某个牌阵，渲染空牌阵（未抽牌状态）
 *  - startDraw()             开始抽牌并渲染牌背
 *  - revealAll()             全部翻开
 *  - reset()                 重置牌阵（回到空状态）
 *  - reshuffle()             重新洗牌（等于再次 startDraw）
 *  - refreshSkin()           套系切换/图片变更后，重取图片并重绘
 *  - setInterpretation(text) 设置占卜结果文本
 *  - getResultText()         获取当前占卜结果纯文本（供复制）
 *  - placeholderHTML(card)   生成占位牌面 HTML（供弹窗复用）
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  var ROMAN = ['0', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ',
    'Ⅺ', 'Ⅻ', 'ⅩⅢ', 'ⅩⅣ', 'ⅩⅤ', 'ⅩⅥ', 'ⅩⅦ', 'ⅩⅧ', 'ⅩⅨ', 'ⅩⅩ', 'ⅩⅪ'];
  var GLYPH = { cups: '♥', wands: '♣', swords: '♠', pentacles: '♦', major: '✦' };
  var SUIT_CLASS = { cups: 'suit-cups', wands: 'suit-wands', swords: 'suit-swords', pentacles: 'suit-pentacles', major: 'suit-major' };

  // 凯尔特十字的坐标（设计尺寸 480×820，由 renderCross 统一缩放）
  // 每张牌下方预留「位置含义（label）+ 牌名·正逆位（info）」两行文字空间，
  // 左右两列均以 154px 中心间距排布，避免文字与相邻牌面相互遮挡。
  var CROSS_COORDS = [
    { x: 240, y: 408, rot: 0,  lx: 0,    ly: 64 },   // p0 现状（中心）
    { x: 240, y: 384, rot: 90, lx: -100, ly: 0  },   // p1 挑战（横置覆盖现状，标签置于左侧）
    { x: 240, y: 562, rot: 0,  lx: 0,    ly: 64 },   // p2 过去
    { x: 240, y: 254, rot: 0,  lx: 0,    ly: 64 },   // p3 未来
    { x: 240, y: 100, rot: 0,  lx: 0,    ly: 64 },   // p4 意识
    { x: 240, y: 716, rot: 0,  lx: 0,    ly: 64 },   // p5 潜意识
    { x: 360, y: 170, rot: 0,  lx: 0,    ly: 64 },   // p6 建议
    { x: 360, y: 324, rot: 0,  lx: 0,    ly: 64 },   // p7 外部环境
    { x: 360, y: 478, rot: 0,  lx: 0,    ly: 64 },   // p8 希望与恐惧
    { x: 360, y: 632, rot: 0,  lx: 0,    ly: 64 }    // p9 结果
  ];

  var state = {
    spread: null,
    positions: [],
    drawn: null,
    flipped: null,
    skinId: null,
    question: '',
    resultText: ''
  };

  // ---------------- 工具函数 ----------------

  function el(id) { return document.getElementById(id); }

  function numLabel(card) {
    if (card.arcana === 'major') return ROMAN[card.num] || String(card.num);
    if (card.num === 1) return 'A';
    if (card.num === 11) return '侍';
    if (card.num === 12) return '骑';
    if (card.num === 13) return '后';
    if (card.num === 14) return '王';
    return String(card.num);
  }

  function glyph(card) {
    return card.arcana === 'major' ? GLYPH.major : GLYPH[card.suit];
  }

  function suitClass(card) {
    return SUIT_CLASS[card.arcana === 'major' ? 'major' : card.suit];
  }

  function placeholderHTML(card) {
    return '<div class="placeholder ' + suitClass(card) + '">' +
      '<span class="ph-num">' + numLabel(card) + '</span>' +
      '<span class="ph-glyph">' + glyph(card) + '</span>' +
      '<span class="ph-name">' + card.nameZh + '</span>' +
      '<span class="ph-en">' + card.nameEn + '</span>' +
      '</div>';
  }

  function faceHTML(d) {
    var card = d.card;
    if (d.img) {
      return '<img class="card-img" data-cid="' + card.id + '" src="' + d.img + '" alt="' + card.nameZh + '">';
    }
    return placeholderHTML(card);
  }

  function cardHTML(d, i, extraClass) {
    var cls = 'card' + (extraClass ? ' ' + extraClass : '') + (d.reversed ? ' reversed' : '');
    return '<div class="' + cls + '" data-index="' + i + '" data-card-id="' + d.card.id + '">' +
      '<div class="card-inner">' +
        '<div class="card-face card-back"><span class="back-emblem">✦</span></div>' +
        '<div class="card-face card-front">' + faceHTML(d) + '</div>' +
      '</div>' +
    '</div>';
  }

  function emptyCardHTML() {
    return '<div class="card empty"><span class="empty-q">?</span></div>';
  }

  function slotHTML(position, i, hasDraw) {
    var card = hasDraw ? cardHTML(state.drawn[i], i) : emptyCardHTML();
    return '<div class="slot" data-index="' + i + '">' +
      card +
      '<div class="slot-label">' + position.label + '</div>' +
      '<div class="slot-card-info hidden"></div>' +
      '</div>';
  }

  // ---------------- 布局渲染 ----------------

  function renderLine(board) {
    board.className = 'board board-line';
    var hasDraw = !!state.drawn;
    for (var i = 0; i < state.positions.length; i++) {
      board.insertAdjacentHTML('beforeend', slotHTML(state.positions[i], i, hasDraw));
    }
  }

  function renderChoice(board) {
    board.className = 'board board-choice';
    var hasDraw = !!state.drawn;
    var left = document.createElement('div');
    left.className = 'choice-side';
    left.innerHTML = slotHTML(state.positions[0], 0, hasDraw);
    var vs = document.createElement('div');
    vs.className = 'choice-vs';
    vs.textContent = 'VS';
    var right = document.createElement('div');
    right.className = 'choice-side';
    right.innerHTML = slotHTML(state.positions[1], 1, hasDraw);
    board.appendChild(left);
    board.appendChild(vs);
    board.appendChild(right);
  }

  function renderCross(board) {
    board.className = 'board board-cross';
    var hasDraw = !!state.drawn;

    var wrap = document.createElement('div');
    wrap.className = 'cross-wrap';
    var inner = document.createElement('div');
    inner.className = 'cross-board';

    for (var i = 0; i < state.positions.length; i++) {
      var pos = state.positions[i];
      var c = CROSS_COORDS[i] || { x: 240, y: 408, rot: 0, lx: 0, ly: 64 };
      var slot = document.createElement('div');
      slot.className = 'cross-slot';
      slot.style.left = c.x + 'px';
      slot.style.top = c.y + 'px';

      var card = hasDraw
        ? cardHTML(state.drawn[i], i, c.rot ? 'rot' : '')
        : '<div class="card empty' + (c.rot ? ' rot' : '') + '"><span class="empty-q">?</span></div>';

      var label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = pos.label;
      label.style.left = 'calc(50% + ' + (c.lx || 0) + 'px)';
      label.style.top = 'calc(50% + ' + (c.ly || 0) + 'px)';

      var info = document.createElement('div');
      info.className = 'slot-card-info hidden';
      info.style.left = 'calc(50% + ' + (c.lx || 0) + 'px)';
      info.style.top = 'calc(50% + ' + ((c.ly || 0) + 20) + 'px)';

      slot.innerHTML = card;
      slot.appendChild(label);
      slot.appendChild(info);
      inner.appendChild(slot);
    }

    wrap.appendChild(inner);
    board.appendChild(wrap);

    // 按容器宽度等比缩放（设计宽 480）
    var scale = Math.min(1, board.clientWidth / 480);
    inner.style.transform = 'scale(' + scale + ')';
    wrap.style.height = Math.ceil(820 * scale) + 'px';
  }

  function renderBoard() {
    var board = el('spreadBoard');
    board.innerHTML = '';
    if (!state.spread) return;
    if (state.spread.layout === 'cross') renderCross(board);
    else if (state.spread.layout === 'choice') renderChoice(board);
    else renderLine(board);
    bindCardEvents(board);
  }

  // ---------------- 翻牌与事件绑定 ----------------

  /** 将某张牌标记为翻开状态，并显示牌名 + 正逆位 */
  function applyFlipped(cardEl, i) {
    cardEl.classList.add('flipped');
    var info = cardEl.parentElement.querySelector('.slot-card-info');
    if (info && state.drawn && state.drawn[i]) {
      var d = state.drawn[i];
      info.textContent = d.card.nameZh + ' · ' + (d.reversed ? '逆位' : '正位');
      info.classList.remove('hidden');
    }
  }

  function bindCardEvents(board) {
    var cards = board.querySelectorAll('.card:not(.empty)');
    Array.prototype.forEach.call(cards, function (cardEl) {
      cardEl.addEventListener('click', function () {
        var i = parseInt(cardEl.getAttribute('data-index'), 10);
        if (!state.flipped[i]) {
          state.flipped[i] = true;
          applyFlipped(cardEl, i);
          checkAllFlipped();
        } else {
          App.modal.openCard(state.drawn[i], state.positions[i].label);
        }
      });
    });
  }

  function checkAllFlipped() {
    if (!state.drawn) return;
    var all = state.flipped.every(function (f) { return f; });
    if (all) {
      var sec = el('interpretation');
      if (sec) sec.classList.remove('hidden');
    }
  }

  // ---------------- 公开 API ----------------

  var render = {
    showSpread: function (spread) {
      state.spread = spread;
      if (spread.free) {
        state.positions = buildFreePositions(getFreeCount());
      } else {
        state.positions = spread.positions;
      }
      state.drawn = null;
      state.flipped = null;
      state.question = '';
      state.resultText = '';

      el('spreadTitle').textContent = spread.name;
      el('spreadSubtitle').textContent = spread.subtitle || '';

      // 前置问题输入框
      el('questionControls').classList.toggle('hidden', !spread.question);

      // 自由抽牌控件
      el('freeControls').classList.toggle('hidden', !spread.free);

      // 结果区隐藏
      el('interpretation').classList.add('hidden');
      el('interpretationText').textContent = '';

      renderBoard();
      updateActions();
    },

    startDraw: function () {
      if (!state.spread) return;

      // 未登录：提示并打开登录弹窗（抽牌需保存到账号历史）
      if (!App.auth.isLoggedIn()) {
        App.toast.info('请先登录后再抽牌 ✦');
        App.authUI.open('login');
        return;
      }

      var spread = state.spread;
      var that = this;

      // 「每日指引」牌阵：先向后端查询今日是否已抽（东八区，后端校验）
      if (spread.id === 'daily') {
        App.api.get('/draw/today').then(function (data) {
          if (data.alreadyDrawn) {
            App.toast.info('今日已抽取过「每日指引」，请明天再来 ✦');
            return;
          }
          that._doDraw();
        }).catch(function (e) {
          App.toast.error(e && e.message ? e.message : '查询失败，请重试');
        });
        return;
      }

      that._doDraw();
    },

    _doDraw: function () {
      if (!state.spread) return;
      var spread = state.spread;
      var count = spread.free ? getFreeCount() : spread.count;
      if (spread.free) state.positions = buildFreePositions(count);

      var allowRev = App.settings.allowReversed &&
        (spread.free ? getFreeReversed() : spread.reversed);

      var question = (spread.question && el('questionInput'))
        ? el('questionInput').value.trim()
        : '';
      state.question = question;

      var drawn = App.core.draw(count, allowRev);
      state.skinId = App.skins.currentId;

      // 预加载图片（异步），随后渲染
      var jobs = drawn.map(function (d) {
        return App.skins.getCardImage(state.skinId, d.card.id).then(function (img) {
          d.img = img;
        });
      });

      var that = this;
      Promise.all(jobs).then(function () {
        state.drawn = drawn;
        state.flipped = drawn.map(function () { return false; });
        renderBoard();
        updateActions();

        // 先展示本地牌义解读，再异步保存记录 + 取 AI 解读
        that.setInterpretation(
          App.core.buildResult(spread, drawn, state.question, state.positions)
        );
        that._saveDraw(spread, drawn);
      });
    },

    _saveDraw: function (spread, drawn) {
      var that = this;
      var payload = {
        spreadId: spread.id,
        spreadName: spread.name,
        skinId: state.skinId,
        question: state.question,
        cards: drawn.map(function (d) {
          return { id: d.card.id, nameZh: d.card.nameZh, reversed: d.reversed };
        })
      };

      App.api.post('/draw', payload).then(function (data) {
        if (data.aiText) {
          // 追加 AI 解读到结果末尾
          that.setInterpretation(state.resultText + '\n\n✦ AI 解读\n' + data.aiText);
        }
      }).catch(function (e) {
        if (e && e.code === 429) {
          // 每日限抽被后端拦截（例如多标签页并发）：回退本次牌阵
          App.toast.info(e.message);
          that.reset();
        } else {
          App.toast.error(e && e.message ? e.message : '记录保存失败');
        }
      });
    },

    revealAll: function () {
      if (!state.drawn) return;
      var board = el('spreadBoard');
      var cards = board.querySelectorAll('.card:not(.empty)');
      Array.prototype.forEach.call(cards, function (cardEl) {
        var i = parseInt(cardEl.getAttribute('data-index'), 10);
        state.flipped[i] = true;
        applyFlipped(cardEl, i);
      });
      checkAllFlipped();
    },

    reset: function () {
      if (!state.spread) return;
      state.drawn = null;
      state.flipped = null;
      state.resultText = '';
      if (state.spread.free) state.positions = buildFreePositions(getFreeCount());
      el('interpretation').classList.add('hidden');
      el('interpretationText').textContent = '';
      renderBoard();
      updateActions();
    },

    reshuffle: function () {
      this.startDraw();
    },

    refreshSkin: function () {
      state.skinId = App.skins.currentId;
      if (!state.drawn) { renderBoard(); return; }
      var jobs = state.drawn.map(function (d) {
        return App.skins.getCardImage(state.skinId, d.card.id).then(function (img) {
          d.img = img;
        });
      });
      var that = this;
      Promise.all(jobs).then(function () {
        that.preserveAndRender();
      });
    },

    preserveAndRender: function () {
      var flipped = state.flipped.slice();
      renderBoard();
      var board = el('spreadBoard');
      var cards = board.querySelectorAll('.card:not(.empty)');
      Array.prototype.forEach.call(cards, function (cardEl) {
        var i = parseInt(cardEl.getAttribute('data-index'), 10);
        if (flipped[i]) applyFlipped(cardEl, i);
      });
    },

    setInterpretation: function (text) {
      state.resultText = text;
      el('interpretationText').textContent = text;
    },

    getResultText: function () {
      return state.resultText || '';
    }
  };

  // ---------------- 自由抽牌辅助 ----------------

  function getFreeCount() {
    var n = parseInt(el('freeCount').value, 10);
    if (isNaN(n)) n = 3;
    n = Math.max(1, Math.min(10, n));
    return n;
  }

  function getFreeReversed() {
    return el('freeReversed').checked;
  }

  function buildFreePositions(n) {
    var pos = [];
    for (var i = 0; i < n; i++) {
      pos.push({ id: 'f' + i, label: '第 ' + (i + 1) + ' 张', meaning: '' });
    }
    return pos;
  }

  function updateActions() {
    var hasDraw = !!state.drawn;
    el('drawBtn').classList.toggle('hidden', hasDraw);
    el('revealAllBtn').classList.toggle('hidden', !hasDraw);
    el('reshuffleBtn').classList.toggle('hidden', !hasDraw);
    el('resetBtn').classList.toggle('hidden', !hasDraw);
  }

  App.render = render;
  App.render.placeholderHTML = placeholderHTML; // 供弹窗等复用占位图

  // 全局图片兜底：皮肤图片 404 时自动替换为占位牌面（该皮肤未上传此牌图时仍可用）
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.classList && t.classList.contains('card-img')) {
      var card = App.getCard(t.getAttribute('data-cid'));
      if (card) t.outerHTML = placeholderHTML(card);
    }
  }, true);
})();
