// Prototype 5: members tab (pending approvals, coaches, students), member detail with
// per-student stats, and lobby settings (name, code, approval mode, leave, dissolve).
(function () {
  "use strict";
  const { t, $, toast } = window.App;
  const L = window.Lobby;
  const { esc, fmt, today, addDays, mondayOf, inRange, pct } = L;

  // ---------- helpers ----------
  const lobby = () => L.view.lobby;
  const isCoach = (lb, name) => lb.coachNames.includes(name);
  const studentsOf = (lb) => lb.memberNames.filter((n) => !isCoach(lb, n));
  const initials = (name) => name.split(/\s+/).map((p) => p[0] || "").join("").slice(0, 2).toUpperCase();
  const byName = (a, b) => a.localeCompare(b, "tr");
  const refresh = () => document.dispatchEvent(new Event("app:render"));

  // Destructive actions need a second tap within 4 s instead of a blocking dialog.
  function twoTap(btn, confirmKey, normalKey, action) {
    btn.addEventListener("click", () => {
      if (btn.dataset.armed) {
        clearTimeout(btn.timer);
        delete btn.dataset.armed;
        action();
        return;
      }
      btn.dataset.armed = "1";
      btn.textContent = t(confirmKey);
      btn.timer = setTimeout(() => {
        delete btn.dataset.armed;
        btn.textContent = t(normalKey);
      }, 4000);
    });
  }

  // ---------- attendance per member ----------
  const attendedBy = (w, name) => w.order.slice(0, w.attendedCount).includes(name);
  // Past workouts that apply to this member: all group workouts + their own individual ones.
  const historyOf = (lb, name) => lb.workouts.filter((w) => w.date < today && (w.type === "group" || w.forName === name));
  const rateOf = (list, name) => (list.length ? Math.round((100 * list.filter((w) => attendedBy(w, name)).length) / list.length) : null);
  const ratio = (list, name) => `${list.filter((w) => attendedBy(w, name)).length}/${list.length}`;
  const monthStart = () => new Date(today.getFullYear(), today.getMonth(), 1);

  // ---------- members tab ----------
  function personRow(name, role, opts = {}) {
    const meta = opts.rate === undefined ? "" : opts.rate === null ? "–" : t("members.monthRate", { pct: pct(opts.rate) });
    const low = opts.rate !== undefined && opts.rate !== null && opts.rate < 50;
    const tag = opts.clickable ? "button" : "div";
    return `
      <${tag} class="list-item" ${opts.clickable ? `data-member="${esc(name)}"` : ""}>
        <span class="avatar">${esc(initials(name))}</span>
        <span class="grow">
          <strong>${esc(name)}</strong>
          ${meta ? `<span class="meta ${low ? "low" : ""}">${esc(meta)}</span>` : ""}
        </span>
        <span class="chip ${role === "coach" ? "chip-coach" : ""}">${esc(t(`roles.${role}`))}</span>
      </${tag}>`;
  }

  function renderMembers() {
    const lb = lobby();
    const coach = lb.role === "coach";
    const you = t("members.you");
    let html = "";

    if (coach && lb.pending.length) {
      html += `<h3 class="section-title">${esc(t("members.pending", { n: lb.pending.length }))}</h3>`;
      html += lb.pending.map((name) => `
        <div class="list-item pending">
          <span class="avatar">${esc(initials(name))}</span>
          <strong class="grow">${esc(name)}</strong>
          <button class="btn btn-secondary btn-sm" data-reject="${esc(name)}">${esc(t("members.reject"))}</button>
          <button class="btn btn-primary btn-sm" data-approve="${esc(name)}">${esc(t("members.approve"))}</button>
        </div>`).join("");
    }

    const coaches = lb.coachNames.slice().sort(byName);
    html += `<h3 class="section-title">${esc(t("members.coaches", { n: coaches.length + (coach ? 1 : 0) }))}</h3>`;
    if (coach) html += personRow(you, "coach");
    html += coaches.map((n) => personRow(n, "coach", { clickable: coach })).join("");

    const students = studentsOf(lb).sort(byName);
    const monthAgo = (n) => historyOf(lb, n).filter((w) => w.date >= monthStart());
    html += `<h3 class="section-title">${esc(t("members.students", { n: students.length + (coach ? 0 : 1) }))}</h3>`;
    if (!coach) html += personRow(you, "student");
    html += students
      .map((n) => personRow(n, "student", coach ? { clickable: true, rate: rateOf(monthAgo(n), n) } : {}))
      .join("");
    if (coach && !students.length) html += `<p class="sub">${esc(t("members.noStudents"))}</p>`;
    if (!coach) html += `<p class="hint">${esc(t("members.readOnly"))}</p>`;

    $("#membersPanel").innerHTML = html;
  }

  $("#membersPanel").addEventListener("click", (e) => {
    const lb = lobby();
    const approve = e.target.closest("[data-approve]");
    const reject = e.target.closest("[data-reject]");
    const member = e.target.closest("[data-member]");
    if (approve) {
      const name = approve.dataset.approve;
      lb.pending = lb.pending.filter((n) => n !== name);
      lb.memberNames.push(name);
      lb.members = lb.memberNames.length;
      toast(t("members.approved", { name }));
      refresh();
    } else if (reject) {
      const name = reject.dataset.reject;
      lb.pending = lb.pending.filter((n) => n !== name);
      toast(t("members.rejected", { name }));
      refresh();
    } else if (member) {
      L.view.member = member.dataset.member;
      window.App.show("member");
    }
  });

  // ---------- member detail ----------
  function weeksChart(lb, name) {
    const hist = historyOf(lb, name);
    let bars = "";
    for (let i = 7; i >= 0; i--) {
      const start = addDays(mondayOf(today), -7 * i);
      const list = hist.filter((w) => inRange(w, start, addDays(start, 7)));
      const came = list.filter((w) => attendedBy(w, name)).length;
      const h = list.length ? Math.round((100 * came) / list.length) : 0;
      bars += `
        <div class="bar-col" title="${esc(`${came}/${list.length}`)}">
          <span class="bar-val">${list.length ? `${came}/${list.length}` : "–"}</span>
          <div class="bar"><span style="height:${h}%"></span></div>
          <span class="bar-label">${esc(fmt(start, { day: "numeric", month: "short" }))}</span>
        </div>`;
    }
    return `<div class="bars">${bars}</div>`;
  }

  function renderMember() {
    const lb = lobby();
    let name = L.view.member;
    const all = lb.coachNames.concat(lb.memberNames);
    if (!name || !all.includes(name)) name = L.view.member = studentsOf(lb)[0] || lb.coachNames[0] || null;
    if (!name) {
      $("#mName").textContent = "";
      $("#mBody").innerHTML = `<p class="sub">${esc(t("members.noStudents"))}</p>`;
      $("#mActions").hidden = true;
      return;
    }
    const coachMember = isCoach(lb, name);
    $("#mInitials").textContent = initials(name);
    $("#mName").textContent = name;
    $("#mLobby").textContent = lb.name;
    $("#mRole").textContent = t(`roles.${coachMember ? "coach" : "student"}`);
    $("#mRole").className = `chip ${coachMember ? "chip-coach" : ""}`;

    if (coachMember) {
      $("#mBody").innerHTML = `<p class="sub">${esc(t("member.coachNote"))}</p>`;
    } else {
      const hist = historyOf(lb, name);
      const week = hist.filter((w) => w.date >= mondayOf(today));
      const month = hist.filter((w) => w.date >= monthStart());
      const last30 = hist.filter((w) => w.date >= addDays(today, -30));
      const r30 = rateOf(last30, name);
      const recent = hist.slice(-8).reverse();
      $("#mBody").innerHTML = `
        <div class="stats">
          <div class="stat"><strong>${esc(ratio(week, name))}</strong><span>${esc(t("lobby.thisWeek"))}</span></div>
          <div class="stat"><strong>${esc(ratio(month, name))}</strong><span>${esc(t("lobby.thisMonth"))}</span></div>
          <div class="stat"><strong>${esc(r30 === null ? "–" : pct(r30))}</strong><span>${esc(t("lobby.last30"))}</span></div>
        </div>
        <h3 class="section-title">${esc(t("member.weeks"))}</h3>
        ${weeksChart(lb, name)}
        <h3 class="section-title">${esc(t("member.recent"))}</h3>
        ${recent.length ? `<div class="stack">${recent.map((w) => {
          const came = attendedBy(w, name);
          return `
            <div class="recent-row">
              <span class="grow">
                <strong>${esc(w.title)}</strong>
                <span class="meta">${esc(fmt(w.date, { weekday: "short", day: "numeric", month: "short" }))} · ${esc(w.time)}</span>
              </span>
              <span class="status ${came ? "status-attended" : "status-missed"}">${esc(t(came ? "member.came" : "member.missed"))}</span>
            </div>`;
        }).join("")}</div>` : `<p class="sub">${esc(t("member.none"))}</p>`}`;
    }

    $("#mActions").hidden = lb.role !== "coach";
    $("#mToggleRole").textContent = t(coachMember ? "member.makeStudent" : "member.makeCoach");
    if (!$("#mKick").dataset.armed) $("#mKick").textContent = t("member.kick");
  }

  $("#mToggleRole").addEventListener("click", () => {
    const lb = lobby();
    const name = L.view.member;
    if (isCoach(lb, name)) {
      lb.coachNames = lb.coachNames.filter((n) => n !== name);
      if (!lb.memberNames.includes(name)) lb.memberNames.push(name);
      toast(t("member.madeStudent", { name }));
    } else {
      lb.coachNames.push(name);
      toast(t("member.madeCoach", { name }));
    }
    refresh();
  });

  twoTap($("#mKick"), "member.kickConfirm", "member.kick", () => {
    const lb = lobby();
    const name = L.view.member;
    lb.memberNames = lb.memberNames.filter((n) => n !== name);
    lb.coachNames = lb.coachNames.filter((n) => n !== name);
    lb.members = lb.memberNames.length;
    L.view.member = null;
    toast(t("member.kicked", { name }));
    L.view.tab = "members";
    window.App.go("lobby", ["welcome", "lobbies", "lobby"]);
  });

  // ---------- settings tab ----------
  function renderSettings() {
    const lb = lobby();
    const coach = lb.role === "coach";
    $("#settingsCoach").hidden = !coach;
    if (document.activeElement !== $("#setName")) $("#setName").value = lb.name;
    $("#setCode").textContent = lb.code;
    $("#setRegen").hidden = !coach;
    $("#setApprovalRow").hidden = !coach;
    $("#setApproval").checked = !!lb.approval;
    $("#setDanger").hidden = !coach;
    if (!$("#setLeave").dataset.armed) $("#setLeave").textContent = t("settings.leave");
    if (!$("#setDissolve").dataset.armed) $("#setDissolve").textContent = t("settings.dissolve");
  }

  $("#setNameSave").addEventListener("click", () => {
    const name = $("#setName").value.trim();
    if (!name) return;
    lobby().name = name;
    $("#setName").blur();
    toast(t("settings.nameSaved"));
    refresh();
  });

  $("#setCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lobby().code); } catch (e) { /* clipboard blocked */ }
    toast(t("settings.copied"));
  });

  $("#setRegen").addEventListener("click", () => {
    lobby().code = String(Math.floor(100000 + Math.random() * 900000));
    toast(t("settings.regenDone"));
    refresh();
  });

  $("#setApproval").addEventListener("change", (e) => {
    lobby().approval = e.target.checked;
    toast(t(e.target.checked ? "settings.approvalOn" : "settings.approvalOff"));
  });

  twoTap($("#setLeave"), "settings.leaveConfirm", "settings.leave", () => {
    lobby().joined = false;
    toast(t("settings.left"));
    window.App.go("lobbies", ["welcome", "lobbies"]);
  });

  twoTap($("#setDissolve"), "settings.dissolveConfirm", "settings.dissolve", () => {
    lobby().archivedAt = Date.now();
    toast(t("settings.dissolved"));
    window.App.go("lobbies", ["welcome", "lobbies"]);
  });

  function render() {
    renderMembers();
    renderMember();
    renderSettings();
  }

  document.addEventListener("app:render", render);
  render();
})();
