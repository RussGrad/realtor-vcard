/**
 * Публичные данные: файл realtor-vcard-published.json в той же папке, что index.html.
 * Если файл есть — его видят все; иначе берутся шаблон из realtor-vcard-data.js.
 * После загрузки вызывается realtorVcardStorage.apply() (слой localStorage для этого же сайта).
 */
(function (global) {
  "use strict";

  function stripMeta(o) {
    if (!o || typeof o !== "object") return o;
    var c = Object.assign({}, o);
    delete c._vcSavedAt;
    return c;
  }

  function applyNow() {
    if (global.realtorVcardStorage && typeof global.realtorVcardStorage.apply === "function") {
      global.realtorVcardStorage.apply();
    }
  }

  var url = new URL("realtor-vcard-published.json", global.location.href).href;

  global.REALTOR_VCARD_READY = fetch(url, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) return null;
      return r.json();
    })
    .then(function (data) {
      if (!data || typeof data !== "object" || Array.isArray(data)) return null;
      if (data.name == null || String(data.name).trim() === "") return null;
      var clean = stripMeta(data);
      global.REALTOR_VCARD = clean;
      global.REALTOR_VCARD_DEFAULT = JSON.parse(JSON.stringify(clean));
      return clean;
    })
    .catch(function () {
      return null;
    })
    .then(function () {
      applyNow();
      return null;
    });
})(typeof window !== "undefined" ? window : this);
