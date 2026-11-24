// Prototype 3: workout detail. Students see the exercises and mark "Geldim";
// coaches see the exercises and who attended.
(function () {
  "use strict";
  const { t, $ } = window.App;
  const L = window.Lobby;
  const { esc, fmt, today } = L;

  function whenLong(w) {
    return `${fmt(w.date, { weekday: "long", day: "numeric", month: "long" })} · ${w.time}`;
  }

  function studentAction(w) {
    if (L.canMark(w)) {
      if (w.attended) {
        return `
          <div class="mark-box done">
            <span class="mark-icon" aria-hidden="true">✓</span>
            <div class="grow">
              <strong>${esc(t("workout.marked"))}</strong>
              <span class="meta">${esc(t("workout.markedHint"))}</span>
            </div>
            <button class="btn-link" data-unmark>${esc(t("workout.undo"))}</button>
          </div>`;
      }
      return `
        <div class="stack">
          <button class="btn btn-primary btn-lg" data-mark-detail>✓ ${esc(t("workout.markCta"))}</button>
          <p class="center hint">${esc(t("workout.markHint"))}</p>
        </div>`;
    }
    if (w.attended) {
      return `
        <div class="mark-box done">
          <span class="mark-icon" aria-hidden="true">✓</span>
          <div class="grow"><strong>${esc(t("workout.marked"))}</strong></div>
        </div>`;
    }
    const msg = w.date > today ? t("workout.future") : t("workout.expired", { days: L.MARK_WINDOW_DAYS });
    return `<div class="mark-box muted">${esc(msg)}</div>`;
  }

  function coachAction(w) {
    const started = w.date <= today;
    const pct = w.total ? Math.round((100 * w.attendedCount) / w.total) : 0;
    const summary = started
      ? `<strong class="big-num">${esc(t("workout.attendedOf", { n: w.attendedCount, total: w.total }))}</strong>
         <div class="progress"><span style="width:${pct}%"></span></div>`
      : `<span class="meta">${esc(t("workout.notStarted"))}</span>`;
    return `
      <div class="card stack">
        ${summary}
        <button class="btn btn-secondary" data-edit>${esc(t("workout.edit"))}</button>
      </div>`;
  }

  function coachAttendance(w) {
    if (w.date > today) return "";
    const came = w.order.slice(0, w.attendedCount);
    const missed = w.order.slice(w.attendedCount);
    const names = (list) => list.map((n) => `<span class="person">${esc(n)}</span>`).join("");
    return `
      <h3 class="section-title">${esc(t("workout.came", { n: came.length }))}</h3>
      ${came.length ? `<div class="people">${names(came)}</div>` : `<p class="sub">${esc(t("workout.nobody"))}</p>`}
      ${missed.length ? `<h3 class="section-title">${esc(t("workout.notCame", { n: missed.length }))}</h3>
      <div class="people muted">${names(missed)}</div>` : ""}
      <p class="hint">${esc(t("workout.manualNote"))}</p>`;
  }

  function render() {
    const lobby = L.view.lobby;
    let w = L.view.workout;
    if (!w || !lobby.workouts.includes(w)) {
      w = L.view.workout = L.nextWorkout(lobby) || lobby.workouts[lobby.workouts.length - 1] || null;
    }

    $("#wLobby").textContent = lobby.name;
    $("#wBody").hidden = !w;
    if (!w) {
      $("#wTitle").textContent = "";
      $("#wWhen").textContent = "";
      $("#wChips").innerHTML = "";
      $("#wAction").innerHTML = `<div class="placeholder">${esc(t("workout.none"))}</div>`;
      $("#wAttendance").innerHTML = "";
      return;
    }

    $("#wTitle").textContent = w.title;
    $("#wWhen").textContent = whenLong(w);
    $("#wChips").innerHTML = `
      <span class="chip ${w.type === "individual" ? "chip-ind" : ""}">${esc(L.typeLabel(w, lobby))}</span>
      <span class="chip">${esc(t("lobby.exercises", { n: w.exercises.length }))}</span>`;

    const coach = lobby.role === "coach";
    $("#wAction").innerHTML = coach ? coachAction(w) : studentAction(w);
    $("#wExercises").innerHTML = w.exercises
      .map((ex, i) => `
        <li>
          <span class="ex-num">${i + 1}</span>
          <span class="grow">${esc(ex.name)}</span>
          <span class="ex-reps">${esc(ex.reps)}</span>
        </li>`)
      .join("");
    $("#wAttendance").innerHTML = coach ? coachAttendance(w) : "";
  }

  $('[data-screen="workout"]').addEventListener("click", (e) => {
    const w = L.view.workout;
    if (!w) return;
    if (e.target.closest("[data-mark-detail]")) { L.setAttended(w, true); render(); }
    if (e.target.closest("[data-unmark]")) { L.setAttended(w, false); render(); }
    if (e.target.closest("[data-edit]")) window.Editor.open("edit", w);
  });

  document.addEventListener("app:render", render);
  render();
})();
