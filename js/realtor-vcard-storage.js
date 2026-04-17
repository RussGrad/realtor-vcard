/**
 * Подтягивает сохранённые в localStorage настройки поверх умолчаний из realtor-vcard-data.js.
 * Ключ: realtor_vcard_settings_v1
 * Служебное поле _vcSavedAt — время сохранения; используется, чтобы брать актуальную копию
 * (local и session могут различаться при переполнении quota у localStorage).
 */
(function (global) {
  "use strict";

  var KEY = "realtor_vcard_settings_v1";

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergeVcard(defaults, saved) {
    if (!saved || typeof saved !== "object") return clone(defaults);
    var copy = Object.assign({}, saved);
    delete copy._vcSavedAt;
    saved = copy;
    var o = clone(defaults);
    ["name", "role", "tagline", "photoUrl", "reviewIntro", "footerNote"].forEach(function (k) {
      if (saved[k] !== undefined && saved[k] !== null) o[k] = saved[k];
    });
    if (Array.isArray(saved.services)) o.services = saved.services;
    if (Array.isArray(saved.prices)) o.prices = saved.prices;
    if (Array.isArray(saved.reviewLinks)) o.reviewLinks = saved.reviewLinks;
    if (Array.isArray(saved.contacts)) o.contacts = saved.contacts;
    return o;
  }

  function tryParse(raw) {
    if (!raw || typeof raw !== "string") return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function ts(obj) {
    if (!obj || typeof obj._vcSavedAt !== "number") return 0;
    return obj._vcSavedAt;
  }

  function photoLen(obj) {
    if (!obj || !obj.photoUrl) return 0;
    return String(obj.photoUrl).length;
  }

  /** Берём более свежую запись из localStorage и sessionStorage */
  function loadSaved() {
    var a = tryParse(global.localStorage.getItem(KEY));
    var b = tryParse(global.sessionStorage.getItem(KEY));
    if (!a && !b) return null;
    if (!a) return stripMeta(b);
    if (!b) return stripMeta(a);

    var ta = ts(a);
    var tb = ts(b);
    if (tb > ta) return stripMeta(b);
    if (ta > tb) return stripMeta(a);
    /* одинаковая метка или старые данные без метки — отдаём запись с более длинным photoUrl (часто актуальное фото) */
    return stripMeta(photoLen(b) > photoLen(a) ? b : a);
  }

  function stripMeta(obj) {
    if (!obj || typeof obj !== "object") return obj;
    var o = Object.assign({}, obj);
    delete o._vcSavedAt;
    return o;
  }

  function applyStored() {
    var saved = loadSaved();
    if (global.REALTOR_VCARD_DEFAULT) {
      global.REALTOR_VCARD = mergeVcard(global.REALTOR_VCARD_DEFAULT, saved);
      return;
    }
    if (!global.REALTOR_VCARD) return;
    global.REALTOR_VCARD = mergeVcard(global.REALTOR_VCARD, saved);
  }

  function writeBothStores(s) {
    var errLocal = null;
    try {
      global.localStorage.setItem(KEY, s);
    } catch (e) {
      errLocal = e;
      try {
        global.localStorage.removeItem(KEY);
        global.localStorage.setItem(KEY, s);
      } catch (e2) {
        errLocal = e2;
      }
    }
    try {
      global.sessionStorage.setItem(KEY, s);
    } catch (e3) {
      if (!global.localStorage.getItem(KEY)) {
        throw e3;
      }
    }
    if (!global.localStorage.getItem(KEY) && !global.sessionStorage.getItem(KEY)) {
      throw new Error("Не удалось записать данные в хранилище браузера");
    }
  }

  global.REALTOR_VCARD_STORAGE_KEY = KEY;
  global.realtorVcardStorage = {
    KEY: KEY,
    merge: mergeVcard,
    loadSaved: loadSaved,
    save: function (data) {
      var payload = Object.assign({}, data, { _vcSavedAt: Date.now() });
      var s = JSON.stringify(payload);
      writeBothStores(s);
    },
    clear: function () {
      try {
        global.localStorage.removeItem(KEY);
      } catch (e) {}
      try {
        global.sessionStorage.removeItem(KEY);
      } catch (e2) {}
    },
    apply: applyStored,
  };
  /* apply() вызывается из realtor-vcard-published-loader.js (после fetch) или локально без fetch */
})(typeof window !== "undefined" ? window : this);
