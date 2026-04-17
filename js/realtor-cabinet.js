(function () {
  "use strict";

  function initCabinet() {
  if (!window.REALTOR_VCARD || !window.realtorVcardStorage) {
    document.body.innerHTML =
      "<p style=\"padding:2rem;font-family:system-ui\">Не подключены данные визитки.</p>";
    return;
  }

  var root = document.getElementById("cabinet-root");
  if (!root) return;

  /** Выбранное фото (data URL) до сохранения; null — не меняли файл */
  var pendingPhoto = null;

  var MAX_STORAGE_TRY = 2400000;

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function showMsg(text, ok) {
    var el = document.getElementById("cabinet-msg");
    if (!el) return;
    el.textContent = text;
    el.className = "cabinet-msg cabinet-msg--" + (ok ? "ok" : "err");
    el.style.display = "block";
    if (ok) {
      setTimeout(function () {
        el.style.display = "none";
      }, 3500);
    }
  }

  function getInitials(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function updatePreview(container, name, photoUrl) {
    var prev = container.querySelector(".cabinet-photo-preview");
    if (!prev) return;
    prev.innerHTML = "";
    if (photoUrl) {
      var img = document.createElement("img");
      img.src = photoUrl;
      img.alt = "";
      prev.appendChild(img);
    } else {
      prev.textContent = getInitials(name);
    }
  }

  function serviceRow(d, index) {
    var wrap = document.createElement("div");
    wrap.className = "cabinet-row-block";
    wrap.setAttribute("data-service-row", "1");
    wrap.dataset.index = String(index);

    var head = document.createElement("div");
    head.className = "cabinet-row-head";
    var t = document.createElement("span");
    t.className = "cabinet-row-title";
    t.textContent = "Услуга " + (index + 1);
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "cabinet-btn-remove";
    rm.textContent = "Удалить";
    rm.addEventListener("click", function () {
      wrap.remove();
      renumber(document.querySelectorAll('[data-service-row="1"]'), "Услуга");
    });
    head.appendChild(t);
    head.appendChild(rm);
    wrap.appendChild(head);

    wrap.appendChild(field("Название", "text", "svc-title", d.title || ""));
    wrap.appendChild(field("Описание", "textarea", "svc-text", d.text || ""));
    return wrap;
  }

  function priceRow(d, index) {
    var wrap = document.createElement("div");
    wrap.className = "cabinet-row-block";
    wrap.setAttribute("data-price-row", "1");

    var head = document.createElement("div");
    head.className = "cabinet-row-head";
    var t = document.createElement("span");
    t.className = "cabinet-row-title";
    t.textContent = "Позиция " + (index + 1);
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "cabinet-btn-remove";
    rm.textContent = "Удалить";
    rm.addEventListener("click", function () {
      wrap.remove();
      renumber(document.querySelectorAll('[data-price-row="1"]'), "Позиция");
    });
    head.appendChild(t);
    head.appendChild(rm);
    wrap.appendChild(head);

    wrap.appendChild(field("Название", "text", "price-name", d.name || ""));
    wrap.appendChild(field("Цена", "text", "price-price", d.price || ""));
    wrap.appendChild(field("Примечание", "text", "price-note", d.note || ""));
    return wrap;
  }

  function reviewRow(d, index) {
    var wrap = document.createElement("div");
    wrap.className = "cabinet-row-block";
    wrap.setAttribute("data-review-row", "1");

    var head = document.createElement("div");
    head.className = "cabinet-row-head";
    var t = document.createElement("span");
    t.className = "cabinet-row-title";
    t.textContent = "Ссылка " + (index + 1);
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "cabinet-btn-remove";
    rm.textContent = "Удалить";
    rm.addEventListener("click", function () {
      wrap.remove();
      renumber(document.querySelectorAll('[data-review-row="1"]'), "Ссылка");
    });
    head.appendChild(t);
    head.appendChild(rm);
    wrap.appendChild(head);

    wrap.appendChild(field("Заголовок кнопки", "text", "rev-label", d.label || ""));
    wrap.appendChild(field("Подпись", "text", "rev-desc", d.description || ""));
    wrap.appendChild(field("URL", "text", "rev-href", d.href || ""));
    return wrap;
  }

  function contactRow(d, index) {
    var wrap = document.createElement("div");
    wrap.className = "cabinet-row-block";
    wrap.setAttribute("data-contact-row", "1");

    var head = document.createElement("div");
    head.className = "cabinet-row-head";
    var t = document.createElement("span");
    t.className = "cabinet-row-title";
    t.textContent = "Контакт " + (index + 1);
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "cabinet-btn-remove";
    rm.textContent = "Удалить";
    rm.addEventListener("click", function () {
      wrap.remove();
      renumber(document.querySelectorAll('[data-contact-row="1"]'), "Контакт");
    });
    head.appendChild(t);
    head.appendChild(rm);
    wrap.appendChild(head);

    wrap.appendChild(field("Подпись типа", "text", "ct-label", d.label || ""));
    wrap.appendChild(field("Текст действия", "text", "ct-action", d.action || ""));
    wrap.appendChild(field("Ссылка (tel:, https:, mailto:)", "text", "ct-href", d.href || ""));
    return wrap;
  }

  function field(label, type, cls, value) {
    var wrap = document.createElement("div");
    wrap.className = "cabinet-field " + cls;
    var lab = document.createElement("label");
    lab.textContent = label;
    var input;
    if (type === "textarea") {
      input = document.createElement("textarea");
      input.value = value;
    } else {
      input = document.createElement("input");
      input.type = type;
      input.value = value;
    }
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }

  function renumber(nodes, word) {
    for (var i = 0; i < nodes.length; i++) {
      var title = nodes[i].querySelector(".cabinet-row-title");
      if (title) title.textContent = word + " " + (i + 1);
    }
  }

  function collect() {
    var name =
      (root.querySelector(".f-name input") && root.querySelector(".f-name input").value.trim()) ||
      "";
    var role =
      (root.querySelector(".f-role input") && root.querySelector(".f-role input").value.trim()) ||
      "";
    var tagline =
      (root.querySelector(".f-tagline textarea") &&
        root.querySelector(".f-tagline textarea").value.trim()) ||
      "";
    var photoUrlText =
      (root.querySelector(".f-photo-url input") &&
        root.querySelector(".f-photo-url input").value.trim()) ||
      "";

    var photoUrl = pendingPhoto != null ? pendingPhoto : photoUrlText;

    var reviewIntro =
      (root.querySelector(".f-review-intro textarea") &&
        root.querySelector(".f-review-intro textarea").value.trim()) ||
      "";
    var footerNote =
      (root.querySelector(".f-footer textarea") &&
        root.querySelector(".f-footer textarea").value.trim()) ||
      "";

    var services = [];
    root.querySelectorAll('[data-service-row="1"]').forEach(function (row) {
      var titleInp = row.querySelector(".svc-title input, .svc-title textarea");
      var textInp = row.querySelector(".svc-text textarea");
      services.push({
        title: (titleInp && titleInp.value.trim()) || "",
        text: (textInp && textInp.value.trim()) || "",
      });
    });

    var prices = [];
    root.querySelectorAll('[data-price-row="1"]').forEach(function (row) {
      var n = row.querySelector(".price-name input");
      var p = row.querySelector(".price-price input");
      var note = row.querySelector(".price-note input");
      prices.push({
        name: (n && n.value.trim()) || "",
        price: (p && p.value.trim()) || "",
        note: (note && note.value.trim()) || "",
      });
    });

    var reviewLinks = [];
    root.querySelectorAll('[data-review-row="1"]').forEach(function (row) {
      var lb = row.querySelector(".rev-label input");
      var ds = row.querySelector(".rev-desc input");
      var hr = row.querySelector(".rev-href input");
      reviewLinks.push({
        label: (lb && lb.value.trim()) || "",
        description: (ds && ds.value.trim()) || "",
        href: (hr && hr.value.trim()) || "",
      });
    });

    var contacts = [];
    root.querySelectorAll('[data-contact-row="1"]').forEach(function (row) {
      var lb = row.querySelector(".ct-label input");
      var ac = row.querySelector(".ct-action input");
      var hr = row.querySelector(".ct-href input");
      contacts.push({
        label: (lb && lb.value.trim()) || "",
        action: (ac && ac.value.trim()) || "",
        href: (hr && hr.value.trim()) || "",
      });
    });

    services = services.filter(function (s) {
      return (
        ((s.title && s.title.trim()) || "") !== "" ||
        ((s.text && s.text.trim()) || "") !== ""
      );
    });
    prices = prices.filter(function (p) {
      return (
        ((p.name && p.name.trim()) || "") !== "" ||
        ((p.price && p.price.trim()) || "") !== "" ||
        ((p.note && p.note.trim()) || "") !== ""
      );
    });
    reviewLinks = reviewLinks.filter(function (r) {
      return ((r.href && r.href.trim()) || "") !== "";
    });
    contacts = contacts.filter(function (c) {
      return ((c.href && c.href.trim()) || "") !== "";
    });

    return {
      name: name,
      role: role,
      tagline: tagline,
      photoUrl: photoUrl,
      services: services,
      prices: prices,
      reviewLinks: reviewLinks,
      contacts: contacts,
      reviewIntro: reviewIntro,
      footerNote: footerNote,
    };
  }

  function validate(data) {
    if (!data.name || !String(data.name).trim()) return "Укажите имя.";
    return null;
  }

  function render() {
    var d = clone(window.REALTOR_VCARD);
    pendingPhoto = null;
    root.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "cabinet-wrap";

    var header = document.createElement("header");
    header.className = "cabinet-header";
    var h1t = document.createElement("h1");
    h1t.textContent = "Личный кабинет";
    header.appendChild(h1t);
    var headMeta = document.createElement("div");
    headMeta.className = "cabinet-header__meta";
    var backL = document.createElement("a");
    backL.className = "cabinet-back";
    backL.href = "./index.html";
    backL.textContent = "← К визитке";
    var outBtn = document.createElement("button");
    outBtn.type = "button";
    outBtn.className = "cabinet-logout";
    outBtn.textContent = "Выйти";
    outBtn.addEventListener("click", function () {
      if (typeof window.realtorCabinetLogout === "function") {
        window.realtorCabinetLogout();
      }
    });
    headMeta.appendChild(backL);
    headMeta.appendChild(outBtn);
    header.appendChild(headMeta);
    wrap.appendChild(header);

    var secProfile = document.createElement("section");
    secProfile.className = "cabinet-section";
    secProfile.innerHTML = "<h2>Профиль и фото</h2>";

    var nameF = field("Имя и фамилия", "text", "f-name", d.name || "");
    nameF.className += " f-name";
    secProfile.appendChild(nameF);

    var roleF = field("Должность / роль", "text", "f-role", d.role || "");
    roleF.className += " f-role";
    secProfile.appendChild(roleF);

    var tagF = field("Краткое описание", "textarea", "f-tagline", d.tagline || "");
    tagF.className += " f-tagline";
    secProfile.appendChild(tagF);

    var photoRow = document.createElement("div");
    photoRow.className = "cabinet-field";

    var labPhoto = document.createElement("label");
    labPhoto.textContent = "Фото";
    photoRow.appendChild(labPhoto);

    var pr = document.createElement("div");
    pr.className = "cabinet-photo-row";

    var preview = document.createElement("div");
    preview.className = "cabinet-photo-preview";
    if (d.photoUrl) {
      var img = document.createElement("img");
      img.src = d.photoUrl;
      img.alt = "";
      preview.appendChild(img);
    } else {
      preview.textContent = getInitials(d.name);
    }

    var pc = document.createElement("div");
    pc.className = "cabinet-photo-controls";

    var urlF = field(
      "Ссылка на фото (URL или путь ./photo.jpg)",
      "text",
      "f-photo-url",
      d.photoUrl && String(d.photoUrl).indexOf("data:") === 0 ? "" : d.photoUrl || ""
    );
    urlF.className += " f-photo-url";

    var fileInp = document.createElement("input");
    fileInp.type = "file";
    fileInp.accept = "image/*";
    fileInp.className = "cabinet-file";
    fileInp.addEventListener("change", function () {
      var file = fileInp.files && fileInp.files[0];
      if (!file) return;
      if (file.size > 2.5 * 1024 * 1024) {
        showMsg("Файл больше 2,5 МБ — выберите меньшее изображение.", false);
        fileInp.value = "";
        return;
      }
      var r = new FileReader();
      r.onload = function () {
        pendingPhoto = String(r.result || "");
        var nm =
          (root.querySelector(".f-name input") && root.querySelector(".f-name input").value) ||
          d.name;
        updatePreview(pr, nm, pendingPhoto);
      };
      r.readAsDataURL(file);
    });

    var clearer = document.createElement("button");
    clearer.type = "button";
    clearer.className = "cabinet-btn-secondary";
    clearer.style.marginTop = "0.5rem";
    clearer.textContent = "Сбросить загруженное фото";
    clearer.addEventListener("click", function () {
      pendingPhoto = null;
      fileInp.value = "";
      var urlVal =
        (root.querySelector(".f-photo-url input") &&
          root.querySelector(".f-photo-url input").value.trim()) ||
        "";
      var nm =
        (root.querySelector(".f-name input") && root.querySelector(".f-name input").value) || "";
      updatePreview(pr, nm, urlVal);
    });

    var hint = document.createElement("p");
    hint.className = "cabinet-hint";
    hint.textContent =
      "Можно указать ссылку или загрузить файл. Загруженное фото сохраняется в браузере (localStorage).";

    pc.appendChild(urlF);
    pc.appendChild(fileInp);
    pc.appendChild(clearer);
    pc.appendChild(hint);

    pr.appendChild(preview);
    pr.appendChild(pc);
    photoRow.appendChild(pr);

    var nameInput = nameF.querySelector("input");
    if (nameInput) {
      nameInput.addEventListener("input", function () {
        var urlVal =
          (root.querySelector(".f-photo-url input") &&
            root.querySelector(".f-photo-url input").value.trim()) ||
          "";
        var ph = pendingPhoto != null ? pendingPhoto : urlVal;
        updatePreview(pr, nameInput.value, ph);
      });
    }

    secProfile.appendChild(photoRow);
    wrap.appendChild(secProfile);

    var secSvc = document.createElement("section");
    secSvc.className = "cabinet-section";
    secSvc.innerHTML = "<h2>Услуги</h2>";
    var svcMount = document.createElement("div");
    svcMount.id = "svc-mount";
    (d.services || []).forEach(function (s, i) {
      svcMount.appendChild(serviceRow(s, i));
    });
    secSvc.appendChild(svcMount);
    var addSvc = document.createElement("button");
    addSvc.type = "button";
    addSvc.className = "cabinet-btn-add";
    addSvc.textContent = "+ Добавить услугу";
    addSvc.addEventListener("click", function () {
      svcMount.appendChild(
        serviceRow({ title: "", text: "" }, svcMount.querySelectorAll('[data-service-row="1"]').length)
      );
    });
    secSvc.appendChild(addSvc);
    wrap.appendChild(secSvc);

    var secPrice = document.createElement("section");
    secPrice.className = "cabinet-section";
    secPrice.innerHTML = "<h2>Прайс</h2>";
    var priceMount = document.createElement("div");
    (d.prices || []).forEach(function (p, i) {
      priceMount.appendChild(priceRow(p, i));
    });
    secPrice.appendChild(priceMount);
    var addP = document.createElement("button");
    addP.type = "button";
    addP.className = "cabinet-btn-add";
    addP.textContent = "+ Добавить позицию";
    addP.addEventListener("click", function () {
      priceMount.appendChild(
        priceRow(
          { name: "", price: "", note: "" },
          priceMount.querySelectorAll('[data-price-row="1"]').length
        )
      );
    });
    secPrice.appendChild(addP);
    wrap.appendChild(secPrice);

    var secRev = document.createElement("section");
    secRev.className = "cabinet-section";
    secRev.innerHTML = "<h2>Ссылки на отзывы</h2>";
    var revMount = document.createElement("div");
    (d.reviewLinks || []).forEach(function (r, i) {
      revMount.appendChild(reviewRow(r, i));
    });
    secRev.appendChild(revMount);
    var addR = document.createElement("button");
    addR.type = "button";
    addR.className = "cabinet-btn-add";
    addR.textContent = "+ Добавить ссылку";
    addR.addEventListener("click", function () {
      revMount.appendChild(
        reviewRow(
          { label: "", description: "", href: "" },
          revMount.querySelectorAll('[data-review-row="1"]').length
        )
      );
    });
    secRev.appendChild(addR);
    wrap.appendChild(secRev);

    var secCt = document.createElement("section");
    secCt.className = "cabinet-section";
    secCt.innerHTML = "<h2>Контакты</h2>";
    var ctMount = document.createElement("div");
    (d.contacts || []).forEach(function (c, i) {
      ctMount.appendChild(contactRow(c, i));
    });
    secCt.appendChild(ctMount);
    var addC = document.createElement("button");
    addC.type = "button";
    addC.className = "cabinet-btn-add";
    addC.textContent = "+ Добавить контакт";
    addC.addEventListener("click", function () {
      ctMount.appendChild(
        contactRow(
          { label: "", action: "", href: "" },
          ctMount.querySelectorAll('[data-contact-row="1"]').length
        )
      );
    });
    secCt.appendChild(addC);
    wrap.appendChild(secCt);

    var secText = document.createElement("section");
    secText.className = "cabinet-section";
    secText.innerHTML = "<h2>Тексты блоков</h2>";
    var ri = field("Вступление к отзывам", "textarea", "f-review-intro", d.reviewIntro || "");
    ri.className += " f-review-intro";
    secText.appendChild(ri);
    var fn = field("Подпись внизу страницы", "textarea", "f-footer", d.footerNote || "");
    fn.className += " f-footer";
    secText.appendChild(fn);
    wrap.appendChild(secText);

    var actions = document.createElement("div");
    actions.className = "cabinet-actions";

    var btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "cabinet-btn-primary";
    btnSave.textContent = "Сохранить";
    btnSave.addEventListener("click", function () {
      var data = collect();
      var err = validate(data);
      if (err) {
        showMsg(err, false);
        return;
      }
      var json = JSON.stringify(data);
      if (json.length > MAX_STORAGE_TRY) {
        showMsg(
          "Слишком много данных (часто из-за большого фото). Уменьшите изображение или укажите ссылку на фото.",
          false
        );
        return;
      }
      try {
        realtorVcardStorage.save(data);
        window.REALTOR_VCARD = clone(data);
        pendingPhoto = null;
        /* Сразу на визитку с параметром, чтобы не показалась закешированная страница без данных */
        var to =
          "./index.html?r=" +
          Date.now() +
          "&from=cabinet";
        window.location.replace(to);
      } catch (e) {
        showMsg(
          "Не удалось сохранить: " +
            (e && e.message ? e.message : "ошибка") +
            ". Попробуйте уменьшить фото.",
          false
        );
      }
    });

    var btnReset = document.createElement("button");
    btnReset.type = "button";
    btnReset.className = "cabinet-btn-secondary";
    btnReset.textContent = "Сбросить к умолчанию";
    btnReset.addEventListener("click", function () {
      if (!confirm("Удалить сохранённые данные и вернуть шаблон из файла?")) return;
      realtorVcardStorage.clear();
      location.reload();
    });

    var btnExport = document.createElement("button");
    btnExport.type = "button";
    btnExport.className = "cabinet-btn-secondary";
    btnExport.textContent = "Экспорт JSON";
    btnExport.addEventListener("click", function () {
      var data = collect();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "realtor-vcard-backup.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    var btnPublish = document.createElement("button");
    btnPublish.type = "button";
    btnPublish.className = "cabinet-btn-secondary";
    btnPublish.textContent = "Скачать для сайта (published.json)";
    btnPublish.title =
      "Загрузите файл на хостинг рядом с index.html под именем realtor-vcard-published.json";
    btnPublish.addEventListener("click", function () {
      var data = collect();
      var err = validate(data);
      if (err) {
        showMsg(err, false);
        return;
      }
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json; charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "realtor-vcard-published.json";
      a.click();
      URL.revokeObjectURL(a.href);
      showMsg(
        "Файл скачан. Положите его на сервер рядом с index.html с именем realtor-vcard-published.json",
        true
      );
    });

    var importLabel = document.createElement("label");
    importLabel.className = "cabinet-btn-secondary";
    importLabel.style.cursor = "pointer";
    importLabel.style.display = "inline-block";
    importLabel.textContent = "Импорт JSON";
    var importInp = document.createElement("input");
    importInp.type = "file";
    importInp.accept = ".json,application/json";
    importInp.className = "cabinet-import-wrap";
    importInp.addEventListener("change", function () {
      var f = importInp.files && importInp.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var parsed = JSON.parse(r.result);
          if (!parsed || typeof parsed !== "object") throw new Error("empty");
          var base =
            window.REALTOR_VCARD_DEFAULT ||
            window.REALTOR_VCARD ||
            {};
          var merged = realtorVcardStorage.merge(base, parsed);
          realtorVcardStorage.save(merged);
          location.reload();
        } catch (e) {
          showMsg("Неверный JSON или файл пустой.", false);
        }
      };
      r.readAsText(f, "utf-8");
      importInp.value = "";
    });
    importLabel.appendChild(importInp);

    actions.appendChild(btnSave);
    actions.appendChild(btnReset);
    actions.appendChild(btnExport);
    actions.appendChild(btnPublish);
    actions.appendChild(importLabel);
    wrap.appendChild(actions);

    var msg = document.createElement("p");
    msg.id = "cabinet-msg";
    msg.className = "cabinet-msg";
    msg.setAttribute("aria-live", "polite");
    wrap.appendChild(msg);

    root.appendChild(wrap);
  }

  render();
  }

  function run() {
    function go() {
      if (typeof window.realtorCabinetGate === "function") {
        window.realtorCabinetGate(initCabinet);
      } else {
        initCabinet();
      }
    }
    if (window.REALTOR_VCARD_READY && typeof window.REALTOR_VCARD_READY.then === "function") {
      window.REALTOR_VCARD_READY.then(go).catch(go);
    } else {
      if (window.realtorVcardStorage && window.realtorVcardStorage.apply) {
        window.realtorVcardStorage.apply();
      }
      go();
    }
  }

  run();
})();
