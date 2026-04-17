/**
 * 127.0.0.1 и localhost для браузера — разные сайта (разное localStorage).
 * Переходим на localhost, чтобы кабинет и визитка делили одно хранилище.
 */
(function () {
  var h = location.hostname;
  if (h === "127.0.0.1" || h === "[::1]" || h === "::1") {
    var port = location.port ? ":" + location.port : "";
    location.replace(
      location.protocol + "//localhost" + port + location.pathname + location.search + location.hash
    );
  }
})();
