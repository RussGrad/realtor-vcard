/**
 * Вход в кабинет: пароль из конфига, сессия в sessionStorage (до закрытия вкладки).
 */
(function (global) {
  "use strict";

  var SESSION_KEY = "realtor_vcard_cabinet_auth_v1";

  function sha256Hex(text) {
    if (!global.crypto || !global.crypto.subtle) {
      return Promise.reject(new Error("Web Crypto недоступен"));
    }
    var enc = new TextEncoder();
    return crypto.subtle.digest("SHA-256", enc.encode(text)).then(function (buf) {
      var arr = new Uint8Array(buf);
      var hex = "";
      for (var i = 0; i < arr.length; i++) {
        var b = arr[i].toString(16);
        hex += b.length === 1 ? "0" + b : b;
      }
      return hex;
    });
  }

  function getCfg() {
    return global.REALTOR_CABINET_AUTH || {};
  }

  function hexMode(cfg) {
    var h = cfg.passwordSha256Hex;
    if (h == null || h === "") return false;
    return String(h).trim().length > 0;
  }

  function isPasswordConfigured() {
    var c = getCfg();
    if (hexMode(c)) return true;
    var p = c.password;
    return p != null && String(p).trim().length > 0;
  }

  function verifyPassword(plain) {
    var c = getCfg();
    var input = String(plain == null ? "" : plain).trim();

    if (hexMode(c)) {
      var hex = String(c.passwordSha256Hex).trim();
      return sha256Hex(input).then(function (h) {
        return h.toLowerCase() === hex.toLowerCase();
      });
    }

    if (c.password != null && String(c.password).trim().length > 0) {
      return Promise.resolve(input === String(c.password).trim());
    }
    return Promise.resolve(false);
  }

  function showLoginForm(done) {
    var root = document.getElementById("cabinet-root");
    if (!root) {
      done();
      return;
    }

    root.innerHTML = "";
    global.document.title = "Вход — кабинет визитки";

    var wrap = document.createElement("div");
    wrap.className = "cabinet-login-wrap";

    var card = document.createElement("div");
    card.className = "cabinet-login-card";

    var h1 = document.createElement("h1");
    h1.className = "cabinet-login-title";
    h1.textContent = "Вход в кабинет";

    var p = document.createElement("p");
    p.className = "cabinet-login-text";
    p.textContent = "Введите пароль, чтобы редактировать визитку.";

    var err = document.createElement("p");
    err.className = "cabinet-login-err";
    err.setAttribute("role", "alert");

    var form = document.createElement("form");
    form.className = "cabinet-login-form";
    form.autocomplete = "current-password";

    var label = document.createElement("label");
    label.className = "cabinet-login-label";
    label.htmlFor = "cabinet-login-password";
    label.textContent = "Пароль";

    var input = document.createElement("input");
    input.id = "cabinet-login-password";
    input.type = "password";
    input.className = "cabinet-login-input";
    input.required = true;
    input.autocomplete = "current-password";

    var btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "cabinet-login-submit";
    btn.textContent = "Войти";

    var back = document.createElement("a");
    back.href = "./index.html";
    back.className = "cabinet-login-back";
    back.textContent = "← На визитку";

    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(btn);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.textContent = "";
      err.style.display = "none";

      if (!isPasswordConfigured()) {
        err.textContent =
          "Пароль не задан. Откройте js/realtor-cabinet-auth-config.js и укажите password или passwordSha256Hex.";
        err.style.display = "block";
        return;
      }

      verifyPassword(input.value)
        .then(function (ok) {
          if (ok) {
            try {
              global.sessionStorage.setItem(SESSION_KEY, "1");
            } catch (e) {}
            done();
          } else {
            err.textContent = "Неверный пароль.";
            err.style.display = "block";
            input.focus();
          }
        })
        .catch(function () {
          err.textContent = "Не удалось проверить пароль (нужен HTTPS или localhost).";
          err.style.display = "block";
        });
    });

    card.appendChild(h1);
    card.appendChild(p);
    card.appendChild(err);
    card.appendChild(form);
    card.appendChild(back);
    wrap.appendChild(card);
    root.appendChild(wrap);

    setTimeout(function () {
      input.focus();
    }, 100);
  }

  global.realtorCabinetGate = function (done) {
    try {
      if (global.sessionStorage.getItem(SESSION_KEY) === "1") {
        done();
        return;
      }
    } catch (e) {}
    showLoginForm(done);
  };

  global.realtorCabinetLogout = function () {
    try {
      global.sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    global.location.reload();
  };
})(typeof window !== "undefined" ? window : this);
