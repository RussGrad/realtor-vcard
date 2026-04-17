(function () {
  "use strict";

  function esc(text) {
    if (text == null) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getInitials(fullName) {
    var parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function splitFullName(fullName) {
    var parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return { lastName: "", restName: "" };
    if (parts.length === 1) return { lastName: parts[0], restName: "" };
    return { lastName: parts[0], restName: parts.slice(1).join(" ") };
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function getShareUrl() {
    var u = new URL("index.html", window.location.href);
    u.hash = "";
    // убираем служебные параметры (кэш-бастеры и т.п.)
    u.searchParams.delete("r");
    u.searchParams.delete("from");
    return u.toString();
  }

  function openShareModal() {
    var url = getShareUrl();
    var overlay = document.createElement("div");
    overlay.className = "vcard__modal-overlay";
    overlay.tabIndex = -1;

    var dialog = document.createElement("div");
    dialog.className = "vcard__modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Поделиться визиткой");

    var head = document.createElement("div");
    head.className = "vcard__modal-head";

    var title = document.createElement("div");
    title.className = "vcard__modal-title";
    title.textContent = "Поделиться визиткой";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "vcard__modal-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", "Закрыть");

    head.appendChild(title);
    head.appendChild(close);

    var body = document.createElement("div");
    body.className = "vcard__modal-body";

    var qrBox = document.createElement("div");
    qrBox.className = "vcard__qr";
    // Надёжный QR через картинку (чтобы камера клиента читала без сюрпризов)
    // В QR передаём только URL визитки.
    var qrLink = document.createElement("a");
    qrLink.className = "vcard__qr-link";
    qrLink.href = url;
    qrLink.target = "_blank";
    qrLink.rel = "noopener noreferrer";
    qrLink.setAttribute("aria-label", "Открыть визитку по ссылке");

    var img = document.createElement("img");
    img.className = "vcard__qr-img";
    img.alt = "QR-код на визитку";
    img.decoding = "async";
    img.loading = "eager";
    // api.qrserver.com возвращает PNG QR-код. size можно менять.
    img.src =
      "https://api.qrserver.com/v1/create-qr-code/?" +
      "size=320x320&" +
      "ecc=M&" +
      "data=" +
      encodeURIComponent(url);

    qrLink.appendChild(img);
    qrBox.appendChild(qrLink);

    var linkRow = document.createElement("div");
    linkRow.className = "vcard__share-row";

    var link = document.createElement("input");
    link.className = "vcard__share-input";
    link.type = "text";
    link.value = url;
    link.readOnly = true;

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "vcard__share-btn";
    copy.textContent = "Скопировать";

    var msg = document.createElement("div");
    msg.className = "vcard__share-msg";

    copy.addEventListener("click", function () {
      msg.textContent = "";
      var ok = false;
      try {
        link.select();
        link.setSelectionRange(0, link.value.length);
      } catch (e) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(function () {
            msg.textContent = "Ссылка скопирована.";
          })
          .catch(function () {
            msg.textContent = "Не удалось скопировать автоматически. Выделите и скопируйте вручную.";
          });
        return;
      }
      try {
        ok = document.execCommand("copy");
      } catch (e2) {
        ok = false;
      }
      msg.textContent = ok
        ? "Ссылка скопирована."
        : "Не удалось скопировать автоматически. Выделите и скопируйте вручную.";
    });

    linkRow.appendChild(link);
    linkRow.appendChild(copy);

    var hint = document.createElement("div");
    hint.className = "vcard__share-hint";
    hint.textContent = "Клиент может отсканировать QR-код или открыть ссылку.";

    body.appendChild(qrBox);
    body.appendChild(linkRow);
    body.appendChild(msg);
    body.appendChild(hint);

    dialog.appendChild(head);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function cleanup() {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    }
    function onKeydown(ev) {
      if (ev.key === "Escape") cleanup();
    }
    document.addEventListener("keydown", onKeydown);

    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) cleanup();
    });
    close.addEventListener("click", cleanup);

    // фокус на поле ссылки
    setTimeout(function () {
      try {
        link.focus();
        link.select();
      } catch (e3) {}
    }, 50);
  }

  function renderRealtorVcard() {
    if (window.realtorVcardStorage && typeof window.realtorVcardStorage.apply === "function") {
      window.realtorVcardStorage.apply();
    }

    /* file:// — отдельное «происхождение»: данные из кабинета по http://localhost не подтянутся */
    var fileWarning = null;
    if (window.location.protocol === "file:") {
      fileWarning = el("div", "vcard__file-warning");
      fileWarning.innerHTML =
        "<strong>Визитка открыта как файл с диска.</strong> " +
        "Правки из кабинета сохраняются в браузере только если и визитку, и кабинет открыть " +
        "<strong>с одного адреса</strong> (например <code>http://localhost:4523/index.html</code> через <code>npx serve</code>). " +
        "<code>localhost</code> и <code>127.0.0.1</code> — это разные хранилища.";
    }

    var data = window.REALTOR_VCARD;
    if (!data) {
      console.error(
        "realtor-vcard: нет window.REALTOR_VCARD — подключите realtor-vcard-data.js раньше."
      );
      return;
    }

    var root = document.getElementById("vcard-root");
    if (!root) return;

    root.innerHTML = "";
    if (fileWarning) {
      root.appendChild(fileWarning);
    }

    var stack = el("div", "vcard__stack");

    /* Шапка */
    var hero = el("header", "vcard__hero");
    var avatarWrap = el("div", "vcard__avatar-wrap");

    var photo = data.photoUrl && String(data.photoUrl).trim();
    if (photo) {
      var img = document.createElement("img");
      img.className = "vcard__avatar-img";
      img.src = photo;
      img.alt = esc(data.name || "Фото");
      img.decoding = "async";
      img.loading = "eager";
      avatarWrap.appendChild(img);
    } else {
      var initialsBox = el("div", "vcard__avatar-initials", esc(getInitials(data.name)));
      avatarWrap.appendChild(initialsBox);
    }

    hero.appendChild(avatarWrap);
    var nm = splitFullName(data.name);
    var nameBox = el("div", "vcard__namebox");
    nameBox.appendChild(el("h1", "vcard__lastname", esc(nm.lastName)));
    if (nm.restName) {
      nameBox.appendChild(el("p", "vcard__firstname", esc(nm.restName)));
    }
    hero.appendChild(nameBox);
    hero.appendChild(el("p", "vcard__role", esc(data.role || "")));
    if (data.tagline) {
      hero.appendChild(el("p", "vcard__tagline", esc(data.tagline)));
    }
    stack.appendChild(hero);

    /* Услуги */
    if (data.services && data.services.length) {
      var secSvc = el("section", "vcard__card");
      secSvc.appendChild(el("h2", "vcard__h2", "Услуги"));
      var ulSvc = el("ul", "vcard__list");
      data.services.forEach(function (s) {
        var li = el("li", "vcard__service");
        li.appendChild(el("p", "vcard__service-title", esc(s.title)));
        li.appendChild(el("p", "vcard__service-text", esc(s.text)));
        ulSvc.appendChild(li);
      });
      secSvc.appendChild(ulSvc);
      stack.appendChild(secSvc);
    }

    /* Прайс */
    if (data.prices && data.prices.length) {
      var secPrice = el("section", "vcard__card");
      secPrice.appendChild(el("h2", "vcard__h2", "Прайс"));
      var ulP = el("ul", "vcard__price-list");
      data.prices.forEach(function (row) {
        var li = el("li", "vcard__price-item");
        var left = el("div");
        left.appendChild(el("span", "vcard__price-name", esc(row.name)));
        if (row.note) {
          left.appendChild(el("p", "vcard__price-note", esc(row.note)));
        }
        li.appendChild(left);
        li.appendChild(el("span", "vcard__price-value", esc(row.price)));
        ulP.appendChild(li);
      });
      secPrice.appendChild(ulP);
      stack.appendChild(secPrice);
    }

    /* Отзывы */
    if (data.reviewLinks && data.reviewLinks.length) {
      var secRev = el("section", "vcard__card");
      secRev.appendChild(el("h2", "vcard__h2", "Оставить отзыв"));
      if (data.reviewIntro) {
        secRev.appendChild(el("p", "vcard__hint", esc(data.reviewIntro)));
      }
      var revBox = el("div", "vcard__reviews");
      data.reviewLinks.forEach(function (link) {
        var a = document.createElement("a");
        a.className = "vcard__link-btn";
        a.href = link.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        var inner = el("span", "vcard__link-btn-inner");
        inner.appendChild(document.createTextNode(String(link.label || "")));
        if (link.description) {
          inner.appendChild(el("span", "vcard__link-desc", esc(link.description)));
        }
        a.appendChild(inner);
        revBox.appendChild(a);
      });
      secRev.appendChild(revBox);
      stack.appendChild(secRev);
    }

    /* Контакты */
    if (data.contacts && data.contacts.length) {
      var secCt = el("section", "vcard__card");
      secCt.appendChild(el("h2", "vcard__h2", "Контакты"));
      var ctBox = el("div", "vcard__contacts");
      data.contacts.forEach(function (c) {
        var a = document.createElement("a");
        a.className = "vcard__contact";
        a.href = c.href;
        if (/^https?:/i.test(c.href)) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        var span = el("span");
        span.appendChild(el("span", "vcard__contact-label", esc(c.label)));
        span.appendChild(el("span", "vcard__contact-action", esc(c.action)));
        a.appendChild(span);
        a.appendChild(el("span", "vcard__contact-arrow", "→"));
        ctBox.appendChild(a);
      });
      secCt.appendChild(ctBox);
      stack.appendChild(secCt);
    }

    if (data.footerNote) {
      stack.appendChild(el("p", "vcard__footer", esc(data.footerNote)));
    }

    // Кнопка «Поделиться» (QR + ссылка)
    var shareWrap = el("div", "vcard__share-wrap");
    var shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "vcard__primary-btn";
    shareBtn.textContent = "Поделиться";
    shareBtn.addEventListener("click", openShareModal);
    shareWrap.appendChild(shareBtn);
    stack.appendChild(shareWrap);

    var cab = el("p", "vcard__cabinet-hint");
    var cabA = document.createElement("a");
    cabA.href = "cabinet.html";
    cabA.className = "vcard__cabinet-link";
    cabA.textContent = "Редактировать визитку";
    cab.appendChild(cabA);
    stack.appendChild(cab);

    root.appendChild(stack);

    document.title =
      data.name && String(data.name).trim()
        ? String(data.name).trim().slice(0, 120) + " — визитка"
        : "Визитка риэлтора";
  }

  window.renderRealtorVcard = renderRealtorVcard;

  function boot() {
    if (!window.REALTOR_VCARD_READY && window.realtorVcardStorage && window.realtorVcardStorage.apply) {
      window.realtorVcardStorage.apply();
    }
    renderRealtorVcard();
  }

  if (window.REALTOR_VCARD_READY && typeof window.REALTOR_VCARD_READY.then === "function") {
    window.REALTOR_VCARD_READY.then(boot).catch(boot);
  } else {
    boot();
  }

  /* Вкладка вернулась из bfcache — перечитываем localStorage и рисуем снова */
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) {
      renderRealtorVcard();
    }
  });

  /* Другая вкладка изменила или очистила данные — обновляем визитку */
  window.addEventListener("storage", function (ev) {
    if (ev.key === window.REALTOR_VCARD_STORAGE_KEY) {
      renderRealtorVcard();
    }
  });
})();
