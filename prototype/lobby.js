// Prototype 2: "My lobbies" list and the lobby home (stats, next workout, week/month calendar).
// All data is generated around today's date so the prototype always looks current.
(function () {
  "use strict";
  const { t, $, $$, toast, state: appState } = window.App;

  // ---------- date helpers (weeks start on Monday) ----------
  const DAY_MS = 864e5;
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekday = (d) => (d.getDay() + 6) % 7; // 0 = Monday
  const mondayOf = (d) => addDays(startOfDay(d), -weekday(d));
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  const locale = () => (appState.lang === "en" ? "en-GB" : "tr-TR");
  const fmt = (d, opts) => new Intl.DateTimeFormat(locale(), opts).format(d);
  const pct = (n) => (appState.lang === "en" ? `${n}%` : `%${n}`);
  const today = startOfDay(new Date());

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Small seeded RNG so demo data is stable between reloads.
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- demo lobbies ----------
  const DEFS = [
    {
      id: "run", code: "123456", name: "Sabah Koşu Grubu", icon: "🏃", members: 12, role: "student",
      days: [1, 3, 5], time: "07:00", titles: ["Tempolu koşu", "Interval 8×400 m", "Uzun koşu"],
      rate: 0.75, seed: 7, joined: true,
      individual: { day: 0, time: "18:30", title: "Kuvvet: bacak" },
    },
    {
      id: "evening", code: "734190", name: "Akşam Fitness", icon: "💪", members: 18, role: "coach",
      days: [0, 2, 4], time: "19:00", titles: ["Tüm vücut", "Üst vücut", "Alt vücut + core"],
      rate: 0.8, seed: 11, joined: true,
      individual: { day: 5, time: "10:00", title: "Mobilite", forName: "Mehmet Y." },
    },
    {
      id: "fit", code: "222222", name: "Fitness 101", icon: "🏋️", members: 28, role: "student",
      days: [1, 4], time: "20:00", titles: ["Kardiyo", "Kuvvet"],
      rate: 0.6, seed: 3, joined: false,
    },
  ];

  function buildWorkouts(def) {
    const r = rng(def.seed);
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const end = addDays(today, 42);
    const list = [];
    let n = 0;
    const make = (date, time, title, type, total, forName) => {
      const past = date < today;
      return {
        date: new Date(date), time, title, type, forName, total,
        exercises: 3 + Math.floor(r() * 4),
        attended: past && r() < def.rate,
        attendedCount: past ? Math.round(total * (type === "individual" ? (r() < 0.8 ? 1 : 0) : 0.55 + r() * 0.35)) : 0,
      };
    };
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (def.days.includes(weekday(d))) {
        list.push(make(d, def.time, def.titles[n++ % def.titles.length], "group", def.members));
      }
      const ind = def.individual;
      const evenWeek = Math.round((mondayOf(d) - mondayOf(start)) / (7 * DAY_MS)) % 2 === 0;
      if (ind && weekday(d) === ind.day && evenWeek) {
        list.push(make(d, ind.time, ind.title, "individual", 1, ind.forName));
      }
    }
    return list.sort((a, b) => a.date - b.date || a.time.localeCompare(b.time));
  }

  const lobbies = DEFS.map((def) => ({ ...def, workouts: buildWorkouts(def) }));

  const view = { lobby: lobbies[0], mode: "month", cursor: today, selected: today };

  // ---------- derived data ----------
  const inRange = (w, from, to) => w.date >= from && w.date < to;

  function studentStatus(w) {
    if (w.date > today) return "upcoming";
    if (sameDay(w.date, today)) return "today";
    return w.attended ? "attended" : "missed";
  }

  function stats(lobby) {
    const ws = lobby.workouts;
    const weekStart = mondayOf(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const last30 = ws.filter((w) => inRange(w, addDays(today, -30), today));

    if (lobby.role === "student") {
      const week = ws.filter((w) => inRange(w, weekStart, addDays(weekStart, 7)));
      const month = ws.filter((w) => inRange(w, monthStart, monthEnd));
      const rate = last30.length ? Math.round((100 * last30.filter((w) => w.attended).length) / last30.length) : 0;
      return [
        { label: t("lobby.thisWeek"), value: `${week.filter((w) => w.attended).length}/${week.length}` },
        { label: t("lobby.thisMonth"), value: `${month.filter((w) => w.attended).length}/${month.length}` },
        { label: t("lobby.last30"), value: last30.length ? pct(rate) : "–" },
      ];
    }
    const groupLast30 = last30.filter((w) => w.type === "group");
    const avg = groupLast30.length
      ? Math.round((100 * groupLast30.reduce((s, w) => s + w.attendedCount / w.total, 0)) / groupLast30.length)
      : 0;
    return [
      { label: t("lobby.workoutsThisMonth"), value: String(ws.filter((w) => inRange(w, monthStart, monthEnd)).length) },
      { label: t("lobby.avgAttendance"), value: groupLast30.length ? pct(avg) : "–" },
      { label: t("lobby.members"), value: String(lobby.members) },
    ];
  }

  function whenLabel(w) {
    let day;
    if (sameDay(w.date, today)) day = t("lobby.today");
    else if (sameDay(w.date, addDays(today, 1))) day = t("lobby.tomorrow");
    else day = fmt(w.date, { weekday: "short", day: "numeric", month: "short" });
    return `${day} · ${w.time}`;
  }

  const nextWorkout = (lobby) => lobby.workouts.find((w) => w.date >= today);

  // ---------- rendering ----------
  function workoutCard(w, lobby) {
    const typeLabel = w.type === "group"
      ? t("lobby.group")
      : lobby.role === "coach" && w.forName ? t("lobby.individualFor", { name: w.forName }) : t("lobby.individual");
    let status;
    if (lobby.role === "student") {
      const s = studentStatus(w);
      const label = { attended: t("lobby.attended"), missed: t("lobby.missed"), upcoming: t("lobby.upcoming"), today: t("lobby.today") }[s];
      status = `<span class="status status-${s}">${esc(label)}</span>`;
    } else if (w.date < today) {
      status = `<span class="status status-count">${esc(t("lobby.attendance", { n: w.attendedCount, total: w.total }))}</span>`;
    } else {
      status = `<span class="status status-upcoming">${esc(sameDay(w.date, today) ? t("lobby.today") : t("lobby.upcoming"))}</span>`;
    }
    return `
      <button class="workout-card" data-workout>
        <span class="wc-time">${esc(w.time)}</span>
        <span class="grow">
          <strong>${esc(w.title)}</strong>
          <span class="chips">
            <span class="chip ${w.type === "individual" ? "chip-ind" : ""}">${esc(typeLabel)}</span>
            <span class="chip">${esc(t("lobby.exercises", { n: w.exercises }))}</span>
          </span>
        </span>
        ${status}
      </button>`;
  }

  function dayClass(lobby, date) {
    const ws = lobby.workouts.filter((w) => sameDay(w.date, date));
    if (!ws.length) return "";
    const cls = [];
    if (ws.some((w) => w.type === "individual")) cls.push("has-ind");
    if (lobby.role === "coach") {
      cls.push(date < today ? "is-done" : "is-planned");
    } else {
      const states = ws.map(studentStatus);
      if (states.includes("attended")) cls.push("is-attended");
      else if (states.includes("missed")) cls.push("is-missed");
      else cls.push("is-planned");
    }
    return cls.join(" ");
  }

  function renderMonth(lobby) {
    const c = view.cursor;
    const first = new Date(c.getFullYear(), c.getMonth(), 1);
    const last = new Date(c.getFullYear(), c.getMonth() + 1, 0);
    const gridStart = mondayOf(first);
    const gridEnd = addDays(mondayOf(last), 6);
    const head = [0, 1, 2, 3, 4, 5, 6]
      .map((i) => `<span class="dow">${esc(fmt(addDays(mondayOf(today), i), { weekday: "short" }))}</span>`)
      .join("");
    let cells = "";
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      const cls = ["day", dayClass(lobby, d)];
      if (!sameMonth(d, c)) cls.push("out");
      if (sameDay(d, today)) cls.push("today");
      if (sameDay(d, view.selected)) cls.push("selected");
      cells += `<button class="${cls.join(" ")}" data-date="${d.getTime()}"><span>${d.getDate()}</span></button>`;
    }
    $("#calendar").innerHTML = `<div class="month">${head}${cells}</div>`;
    $("#calLabel").textContent = fmt(c, { month: "long", year: "numeric" });

    const dayWs = lobby.workouts.filter((w) => sameDay(w.date, view.selected));
    $("#dayList").innerHTML =
      `<h3 class="day-heading">${esc(fmt(view.selected, { weekday: "long", day: "numeric", month: "long" }))}</h3>` +
      (dayWs.length ? dayWs.map((w) => workoutCard(w, lobby)).join("") : `<p class="sub">${esc(t("lobby.noWorkouts"))}</p>`);
  }

  function renderWeek(lobby) {
    const mon = mondayOf(view.cursor);
    const sun = addDays(mon, 6);
    $("#calLabel").textContent = sameMonth(mon, sun)
      ? `${fmt(mon, { day: "numeric" })}–${fmt(sun, { day: "numeric", month: "short" })}`
      : `${fmt(mon, { day: "numeric", month: "short" })} – ${fmt(sun, { day: "numeric", month: "short" })}`;
    let rows = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      const ws = lobby.workouts.filter((w) => sameDay(w.date, d));
      rows += `
        <div class="week-row ${sameDay(d, today) ? "today" : ""}">
          <div class="week-date">
            <span>${esc(fmt(d, { weekday: "short" }))}</span>
            <strong>${d.getDate()}</strong>
          </div>
          <div class="stack grow">${ws.length ? ws.map((w) => workoutCard(w, lobby)).join("") : '<span class="week-empty">–</span>'}</div>
        </div>`;
    }
    $("#calendar").innerHTML = `<div class="week">${rows}</div>`;
    $("#dayList").innerHTML = "";
  }

  function renderLegend(lobby) {
    const items = lobby.role === "student"
      ? [["is-attended", "lobby.attended"], ["is-missed", "lobby.missed"], ["is-planned", "lobby.upcoming"], ["has-ind", "lobby.individual"]]
      : [["is-done", "lobby.legendWorkout"], ["is-planned", "lobby.upcoming"], ["has-ind", "lobby.individual"]];
    $("#calLegend").innerHTML = items
      .map(([cls, key]) => `<span><i class="swatch ${cls}"></i>${esc(t(key))}</span>`)
      .join("");
    $("#calLegend").hidden = view.mode !== "month";
  }

  function renderLobby() {
    const lobby = view.lobby;
    $("#lobbyIcon").textContent = lobby.icon;
    $("#lobbyTitle").textContent = lobby.name;
    $("#lobbyMeta").textContent = t("lobby.meta", { members: lobby.members, code: lobby.code });
    $("#lobbyRole").textContent = t(`roles.${lobby.role}`);
    $("#lobbyRole").className = `chip ${lobby.role === "coach" ? "chip-coach" : ""}`;

    $("#lobbyStats").innerHTML = stats(lobby)
      .map((s) => `<div class="stat"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`)
      .join("");

    const next = nextWorkout(lobby);
    $("#nextWorkout").innerHTML = next
      ? `<div class="next-card">
           <div class="grow">
             <span class="eyebrow">${esc(t("lobby.next"))}</span>
             <strong>${esc(next.title)}</strong>
             <span class="meta">${esc(whenLabel(next))}</span>
           </div>
           <button class="btn btn-primary btn-sm" data-workout>${esc(t("lobby.open"))}</button>
         </div>`
      : `<div class="placeholder">${esc(t("lobby.empty"))}</div>`;

    $$(".segmented button").forEach((b) => b.classList.toggle("active", b.dataset.view === view.mode));
    if (view.mode === "month") renderMonth(lobby);
    else renderWeek(lobby);
    renderLegend(lobby);
  }

  function renderLobbyList() {
    $("#lobbyList").innerHTML = lobbies
      .filter((l) => l.joined)
      .map((l) => {
        const next = nextWorkout(l);
        return `
          <button class="list-item" data-lobby="${esc(l.id)}">
            <span class="lobby-avatar">${esc(l.icon)}</span>
            <span class="grow">
              <strong>${esc(l.name)}</strong>
              <span class="meta">${esc(next ? t("lobbies.next", { when: whenLabel(next) }) : t("lobbies.none"))}</span>
            </span>
            <span class="chip ${l.role === "coach" ? "chip-coach" : ""}">${esc(t(`roles.${l.role}`))}</span>
          </button>`;
      })
      .join("");
  }

  function renderRoleButton() {
    const onLobby = $('[data-screen="lobby"]').classList.contains("active");
    const btn = $("#protoRole");
    btn.hidden = !onLobby;
    btn.textContent = t("proto.role", { role: t(`roles.${view.lobby.role}`) });
  }

  function render() {
    renderLobbyList();
    renderLobby();
    renderRoleButton();
  }

  // ---------- navigation into a lobby ----------
  function openLobby(lobby) {
    lobby.joined = true;
    view.lobby = lobby;
    view.cursor = today;
    view.selected = today;
    window.App.go("lobby", ["welcome", "lobbies", "lobby"]);
  }

  // From "joined" (after entering a code): open that demo lobby as a student.
  $("#joinedToLobby").addEventListener("click", () => {
    const joined = appState.lobby || {};
    const lobby = lobbies.find((l) => l.id === joined.id) || lobbies[0];
    openLobby(lobby);
  });

  // From "created": open the new, empty lobby as its coach.
  $("#toLobby").addEventListener("click", () => {
    const c = appState.createdLobby || { name: "Sabah Koşu Grubu", code: $("#newCode").textContent };
    let lobby = lobbies.find((l) => l.code === c.code);
    if (!lobby) {
      lobby = { id: `new-${c.code}`, code: c.code, name: c.name, icon: "⭐", members: 1, role: "coach", joined: true, workouts: [] };
      lobbies.unshift(lobby);
    }
    openLobby(lobby);
  });

  // ---------- events ----------
  $("#lobbyList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-lobby]");
    if (item) openLobby(lobbies.find((l) => l.id === item.dataset.lobby));
  });

  $$(".segmented button").forEach((b) => b.addEventListener("click", () => {
    view.mode = b.dataset.view;
    view.cursor = view.selected;
    renderLobby();
  }));

  function step(dir) {
    if (view.mode === "month") {
      view.cursor = new Date(view.cursor.getFullYear(), view.cursor.getMonth() + dir, 1);
    } else {
      view.cursor = addDays(view.cursor, 7 * dir);
    }
    renderLobby();
  }
  $("#calPrev").addEventListener("click", () => step(-1));
  $("#calNext").addEventListener("click", () => step(1));

  $("#calendar").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-date]");
    if (!cell) return;
    view.selected = new Date(Number(cell.dataset.date));
    if (!sameMonth(view.selected, view.cursor)) view.cursor = new Date(view.selected.getFullYear(), view.selected.getMonth(), 1);
    renderLobby();
  });

  // Workout detail and the other tabs come in later prototype parts.
  $('[data-screen="lobby"]').addEventListener("click", (e) => {
    if (e.target.closest("[data-workout]")) toast(t("lobby.detailSoon"));
    if (e.target.closest("[data-soon]")) toast(t("lobby.soon"));
  });

  $("#protoRole").addEventListener("click", () => {
    view.lobby.role = view.lobby.role === "coach" ? "student" : "coach";
    render();
  });

  document.addEventListener("app:render", render);
  render();
})();
