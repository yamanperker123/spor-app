// Prototype logic: fake data, screen navigation and i18n. No backend.
(function () {
  "use strict";

  // Demo lobbies keyed by join code.
  const LOBBIES = {
    "123456": { name: "Sabah Koşu Grubu", members: 12, coach: "Ayşe K.", approval: false },
    "222222": { name: "Fitness 101", members: 28, coach: "Can D.", approval: true },
  };

  const state = {
    lang: "tr",
    history: ["welcome"],
    lobby: null,
    createdLobby: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- i18n ----------
  function t(key, vars) {
    const value = key.split(".").reduce((o, k) => (o ? o[k] : undefined), window.I18N[state.lang]);
    if (typeof value !== "string") return key;
    return value.replace(/\{(\w+)\}/g, (_, name) => (vars && name in vars ? vars[name] : ""));
  }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    $$(".lang-toggle button").forEach((b) => b.classList.toggle("active", b.dataset.lang === state.lang));
    renderDynamic();
    renderProtoNav();
  }

  function setLang(lang) {
    state.lang = lang;
    try { localStorage.setItem("spor-app-lang", lang); } catch (e) { /* storage unavailable */ }
    applyI18n();
  }

  // ---------- navigation ----------
  function show(screen, { push = true } = {}) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === screen));
    if (push && state.history[state.history.length - 1] !== screen) state.history.push(screen);
    $("#backBtn").classList.toggle("visible", state.history.length > 1 && screen !== "welcome");
    if (screen === "welcome") state.history = ["welcome"];
    renderDynamic();
    const firstInput = $(`[data-screen="${screen}"] input`);
    if (firstInput && window.matchMedia("(min-width: 640px)").matches) firstInput.focus();
  }

  function back() {
    if (state.history.length > 1) state.history.pop();
    show(state.history[state.history.length - 1], { push: false });
  }

  // Fill in text that depends on runtime state.
  function renderDynamic() {
    const lobby = state.lobby || LOBBIES["123456"];
    $("#previewName").textContent = lobby.name;
    $("#previewMeta").textContent = t("name.meta", { members: lobby.members, coach: lobby.coach });
    $("#pendingLobby").textContent = lobby.name;
    $("#joinedTitle").textContent = t("joined.title", { lobby: lobby.name });

    const created = state.createdLobby || { name: "Sabah Koşu Grubu", code: "481203", approval: false };
    $("#createdTitle").textContent = t("created.title", { lobby: created.name });
    $("#newCode").textContent = created.code;
    $("#createdMode").textContent = t(created.approval ? "created.modeApproval" : "created.modeOpen");
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2000);
  }

  // ---------- 1. code entry ----------
  const boxes = $$("#codeBoxes input");

  function codeValue() { return boxes.map((b) => b.value).join(""); }

  function onCodeChange() {
    $("#codeBoxes").classList.remove("invalid");
    $("#codeError").textContent = "";
    $("#joinBtn").disabled = codeValue().length !== 6;
  }

  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(-1);
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      onCodeChange();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) boxes[i - 1].focus();
      if (e.key === "Enter" && codeValue().length === 6) joinWithCode();
    });
    box.addEventListener("paste", (e) => {
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      if (!digits) return;
      e.preventDefault();
      boxes.forEach((b, j) => { b.value = digits[j] || ""; });
      boxes[Math.min(digits.length, 5)].focus();
      onCodeChange();
    });
  });

  function joinWithCode() {
    const lobby = LOBBIES[codeValue()];
    if (!lobby) {
      $("#codeBoxes").classList.add("invalid");
      $("#codeError").textContent = t("welcome.notFound");
      return;
    }
    state.lobby = lobby;
    show("name");
  }

  $("#joinBtn").addEventListener("click", joinWithCode);

  // ---------- 2. name ----------
  $("#nameInput").addEventListener("input", (e) => {
    $("#nameBtn").disabled = e.target.value.trim().length < 2;
  });
  $("#nameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("#nameBtn").disabled) $("#nameBtn").click();
  });
  $("#nameBtn").addEventListener("click", () => {
    show(state.lobby && state.lobby.approval ? "pending" : "joined");
  });

  // ---------- 3a. pending ----------
  $("#simulateApprove").addEventListener("click", () => show("joined"));

  // ---------- 4. account ----------
  $("#accountForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("#accountError");
    if ($("#accUser").value.trim().length < 3) { err.textContent = t("account.errUser"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("#accEmail").value.trim())) { err.textContent = t("account.errEmail"); return; }
    if ($("#accPass").value.length < 8) { err.textContent = t("account.errPass"); return; }
    err.textContent = "";
    $("#accountBanner").hidden = true;
    toast(t("account.saved"));
    back();
  });

  // ---------- 5. login ----------
  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!$("#loginUser").value.trim() || !$("#loginPass").value) {
      $("#loginError").textContent = t("login.err");
      return;
    }
    $("#loginError").textContent = "";
    toast(t("login.ok"));
    show("welcome");
  });

  // ---------- 6. forgot ----------
  $("#forgotForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("#forgotEmail").value.trim())) {
      $("#forgotError").textContent = t("account.errEmail");
      return;
    }
    $("#forgotError").textContent = "";
    toast(t("forgot.sent"));
    back();
  });

  // ---------- 7–8. create lobby ----------
  $("#createForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#lobbyName").value.trim();
    if (!name || !$("#ownerName").value.trim()) {
      $("#createError").textContent = t("create.err");
      return;
    }
    $("#createError").textContent = "";
    const code = String(Math.floor(100000 + Math.random() * 900000));
    state.createdLobby = { name, code, approval: $("#approvalToggle").checked };
    show("created");
  });

  $("#copyCode").addEventListener("click", async () => {
    const code = $("#newCode").textContent;
    try { await navigator.clipboard.writeText(code); } catch (e) { /* clipboard blocked */ }
    toast(t("created.copied"));
  });

  $("#shareCode").addEventListener("click", async () => {
    const lobby = state.createdLobby || { name: "Sabah Koşu Grubu", code: $("#newCode").textContent };
    const text = t("created.shareText", { lobby: lobby.name, code: lobby.code });
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (e) { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); } catch (e) { /* clipboard blocked */ }
      toast(t("created.copied"));
    }
  });

  $("#toLobby").addEventListener("click", () => {
    const c = state.createdLobby;
    state.lobby = c ? { name: c.name, members: 1, coach: $("#ownerName").value.trim(), approval: c.approval } : null;
    show("joined");
  });

  // ---------- global ----------
  $$("[data-go]").forEach((el) => el.addEventListener("click", () => show(el.dataset.go)));
  $("#backBtn").addEventListener("click", back);
  $$(".lang-toggle button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  // Prototype-only screen jumper.
  function renderProtoNav() {
    const list = $("#protoList");
    list.innerHTML = "";
    $$(".screen").forEach((s) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = t(`screens.${s.dataset.screen}`);
      btn.addEventListener("click", () => {
        $("#protoNav").classList.remove("open");
        show(s.dataset.screen);
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }
  $("#protoToggle").addEventListener("click", () => $("#protoNav").classList.toggle("open"));

  try {
    const saved = localStorage.getItem("spor-app-lang");
    if (saved === "en" || saved === "tr") state.lang = saved;
  } catch (e) { /* storage unavailable */ }
  applyI18n();
})();
