/**
 * 预设皮肤管理（skins.js）—— Cloudflare 后端版。
 * 皮肤元数据来自后端 GET /api/skins；牌面图片来自静态目录 /skins/<skinId>/<cardId>.jpg。
 * 保留 App.skins.getCardImage(skinId, cardId) 接口（返回 Promise<url>），render.js 无需改动即可复用。
 * 注意：预设皮肤不做上传/自定义（图片由站长放入静态目录，DB 只存元信息）。
 */
(function () {
  'use strict';
  var App = window.TarotApp = window.TarotApp || {};

  var DEFAULT_ID = 'classic';
  var list = [];           // [{ id, name, previewUrl }]
  var currentId = DEFAULT_ID;

  function get(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getCurrent() {
    return get(currentId) || { id: DEFAULT_ID, name: '经典塔罗', previewUrl: '' };
  }

  /** 从后端加载皮肤列表 */
  function load() {
    return App.api.get('/skins').then(function (data) {
      list = data.skins || [];
      if (!get(currentId)) currentId = DEFAULT_ID;
    }).catch(function () {
      // 兜底：后端不可用时至少保留一个默认皮肤
      list = [{ id: DEFAULT_ID, name: '经典塔罗', previewUrl: '' }];
      currentId = DEFAULT_ID;
    });
  }

  /** 切换皮肤：先同步后端用户表，成功后再更新本地状态 */
  function switchTo(id) {
    if (!get(id)) return Promise.reject({ message: '皮肤不存在' });
    return App.auth.setCurrentSkin(id).then(function () {
      currentId = id;
      return get(id);
    });
  }

  /** 卡牌图片 URL（约定 /skins/<skinId>/<cardId>.jpg）。无图时 404 由全局监听兜底为占位图。 */
  function getCardImage(skinId, cardId) {
    return Promise.resolve('/skins/' + skinId + '/' + cardId + '.jpg');
  }

  App.SKINS_DEFAULT_ID = DEFAULT_ID;
  App.skins = {
    init: function () {
      currentId = (App.auth.getUser() && App.auth.getUser().currentSkin) || DEFAULT_ID;
      return load();
    },
    load: load,
    all: function () { return list.slice(); },
    get: get,
    getCurrent: getCurrent,
    switchTo: switchTo,
    getCardImage: getCardImage,
  };

  // currentId 用访问器暴露，保证外部读写的是闭包内同一份
  Object.defineProperty(App.skins, 'currentId', {
    get: function () { return currentId; },
    set: function (v) { currentId = v; },
  });
})();
