// Prototype 4: workout editor for coaches. Create, edit and delete workouts;
// exercises can be added quickly and reordered by dragging (mouse or touch) or with arrow keys.
(function () {
  "use strict";
  const { t, $, $$, toast, state: appState } = window.App;
  const L = window.Lobby;
  const { esc } = L;

  const list = $("#edExercises");
  let draft = null;
  let nextId = 1;
  let deleteArmed = false;
  let deleteTimer = null;

  const pad = (n) => String(n).padStart(2, "0");
  const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromInputDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const exercise = (name = "", reps = "") => ({ id: nextId++, name, reps });

  function newDraft(date) {
    return { mode: "new", workout: null, title: "", date: toInputDate(date || L.today), time: "18:00", type: "group", forName: "", exercises: [exercise()] };
  }

  function editDraft(w) {
    return {
      mode: "edit", workout: w, title: w.title, date: toInputDate(w.date), time: w.time,
      type: w.type, forName: w.forName || "", exercises: w.exercises.map((e) => exercise(e.name, e.reps)),
    };
  }

  // Copy the draft into the plain inputs (these aren't rebuilt on re-render).
  function fillInputs() {
    $("#edName").value = draft.title;
    $("#edDate").value = draft.date;
    $("#edTime").value = draft.time;
    $("#edError").textContent = "";
  }

  function open(mode, workout, date) {
    draft = mode === "edit" && workout ? editDraft(workout) : newDraft(date);
    disarmDelete();
    fillInputs();
    window.App.show("editor");
  }

  // ---------- rendering ----------
  function renderExercises(focus) {
    list.innerHTML = draft.exercises
      .map((e, i) => `
        <li data-id="${e.id}">
          <button type="button" class="drag-handle" aria-label="${esc(t("editor.reorder"))}">⋮⋮</button>
          <span class="ex-num">${i + 1}</span>
          <input class="input" data-field="name" value="${esc(e.name)}" placeholder="${esc(t("editor.exName"))}" aria-label="${esc(t("editor.exName"))}">
          <input class="input ex-reps-input" data-field="reps" value="${esc(e.reps)}" placeholder="${esc(t("editor.exRepsPh"))}" aria-label="${esc(t("editor.exReps"))}">
          <button type="button" class="icon-btn" data-remove aria-label="${esc(t("editor.remove"))}">×</button>
        </li>`)
      .join("");
    if (focus) {
      const el = $(`#edExercises li[data-id="${focus.id}"] ${focus.selector}`);
      if (el) el.focus();
    }
  }

  function render() {
    if (!draft) { draft = newDraft(); fillInputs(); }
    const lobby = L.view.lobby;
    $("#edTitle").textContent = t(draft.mode === "edit" ? "editor.editTitle" : "editor.newTitle");

    $$('[data-screen="editor"] [data-type]').forEach((b) => {
      const on = b.dataset.type === draft.type;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", String(on));
    });
    $("#edTypeHint").textContent = t(draft.type === "group" ? "editor.groupHint" : "editor.individualHint");

    const names = lobby.memberNames || [];
    $("#edStudentField").hidden = draft.type !== "individual";
    $("#edStudent").innerHTML =
      `<option value="">${esc(names.length ? t("editor.choose") : t("editor.noStudents"))}</option>` +
      names.map((n) => `<option ${n === draft.forName ? "selected" : ""}>${esc(n)}</option>`).join("");

    renderExercises();
    $("#edQuick").innerHTML = window.I18N[appState.lang].editor.quickList
      .map((n) => `<button type="button" class="chip chip-btn" data-quick="${esc(n)}">+ ${esc(n)}</button>`)
      .join("");

    $("#edSave").textContent = t(draft.mode === "edit" ? "editor.save" : "editor.create");
    $("#edDelete").hidden = draft.mode !== "edit";
    $("#edDelete").textContent = t(deleteArmed ? "editor.deleteConfirm" : "editor.delete");
  }

  // ---------- form fields ----------
  $("#edName").addEventListener("input", (e) => { draft.title = e.target.value; });
  $("#edDate").addEventListener("input", (e) => { draft.date = e.target.value; });
  $("#edTime").addEventListener("input", (e) => { draft.time = e.target.value; });
  $("#edStudent").addEventListener("change", (e) => { draft.forName = e.target.value; });

  $$('[data-screen="editor"] [data-type]').forEach((b) => b.addEventListener("click", () => {
    draft.type = b.dataset.type;
    render();
  }));

  // ---------- exercises ----------
  const idOf = (el) => Number(el.closest("li").dataset.id);
  const byId = (id) => draft.exercises.find((e) => e.id === id);

  list.addEventListener("input", (e) => {
    const field = e.target.dataset.field;
    if (field) byId(idOf(e.target))[field] = e.target.value;
  });

  // Enter moves name → reps → new row, so a coach can type a whole list without touching the mouse.
  list.addEventListener("keydown", (e) => {
    const field = e.target.dataset.field;
    if (e.key === "Enter" && field) {
      e.preventDefault();
      const id = idOf(e.target);
      if (field === "name") {
        $(`#edExercises li[data-id="${id}"] [data-field="reps"]`).focus();
      } else {
        const idx = draft.exercises.findIndex((x) => x.id === id);
        const row = exercise();
        draft.exercises.splice(idx + 1, 0, row);
        renderExercises({ id: row.id, selector: '[data-field="name"]' });
      }
    }
    // Arrow keys on the handle reorder the row.
    if (e.target.classList.contains("drag-handle") && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const id = idOf(e.target);
      const i = draft.exercises.findIndex((x) => x.id === id);
      const j = e.key === "ArrowUp" ? i - 1 : i + 1;
      if (j < 0 || j >= draft.exercises.length) return;
      [draft.exercises[i], draft.exercises[j]] = [draft.exercises[j], draft.exercises[i]];
      renderExercises({ id, selector: ".drag-handle" });
    }
  });

  list.addEventListener("click", (e) => {
    if (!e.target.closest("[data-remove]")) return;
    const id = idOf(e.target);
    draft.exercises = draft.exercises.filter((x) => x.id !== id);
    renderExercises();
  });

  $("#edAdd").addEventListener("click", () => {
    const row = exercise();
    draft.exercises.push(row);
    renderExercises({ id: row.id, selector: '[data-field="name"]' });
  });

  // Quick add fills the last empty row, otherwise appends; focus jumps to reps.
  $("#edQuick").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-quick]");
    if (!chip) return;
    let row = draft.exercises[draft.exercises.length - 1];
    if (!row || row.name.trim()) {
      row = exercise();
      draft.exercises.push(row);
    }
    row.name = chip.dataset.quick;
    renderExercises({ id: row.id, selector: '[data-field="reps"]' });
  });

  // Drag to reorder with pointer events (mouse, pen and touch).
  let drag = null;
  list.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    drag = handle.closest("li");
    drag.classList.add("dragging");
  });
  list.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const prev = drag.previousElementSibling;
    const next = drag.nextElementSibling;
    if (prev) {
      const r = prev.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { list.insertBefore(drag, prev); return; }
    }
    if (next) {
      const r = next.getBoundingClientRect();
      if (e.clientY > r.top + r.height / 2) list.insertBefore(next, drag);
    }
  });
  function endDrag() {
    if (!drag) return;
    drag.classList.remove("dragging");
    drag = null;
    const order = $$("#edExercises li").map((li) => Number(li.dataset.id));
    draft.exercises.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    renderExercises();
  }
  list.addEventListener("pointerup", endDrag);
  list.addEventListener("pointercancel", endDrag);

  // ---------- save / delete ----------
  function fail(key) {
    $("#edError").textContent = t(key);
    return false;
  }

  $("#editorForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = draft.title.trim();
    const isInd = draft.type === "individual";
    const exercises = draft.exercises
      .filter((x) => x.name.trim())
      .map((x) => ({ name: x.name.trim(), reps: x.reps.trim() }));
    if (!title) return fail("editor.errName");
    if (!draft.date || !draft.time) return fail("editor.errDate");
    if (isInd && !draft.forName) return fail("editor.errStudent");
    if (!exercises.length) return fail("editor.errExercises");

    const lobby = L.view.lobby;
    const date = fromInputDate(draft.date);
    const forName = isInd ? draft.forName : undefined;
    const total = isInd ? 1 : Math.max(1, lobby.members);
    let w = draft.workout;
    if (!w) {
      w = { attended: false, attendedCount: 0 };
      lobby.workouts.push(w);
    }
    // Changing who the workout is for resets the attendee list.
    const audienceChanged = w.type !== draft.type || w.forName !== forName;
    Object.assign(w, { date, time: draft.time, title, type: draft.type, forName, exercises, total });
    if (audienceChanged) {
      w.order = isInd ? [forName] : (lobby.memberNames || []).slice();
      w.attendedCount = Math.min(w.attendedCount, total);
    }
    L.sortWorkouts(lobby);

    L.view.workout = w;
    L.view.selected = date;
    L.view.cursor = date;
    toast(t(draft.mode === "edit" ? "editor.saved" : "editor.created"));
    draft = null;
    window.App.go("workout", ["welcome", "lobbies", "lobby", "workout"]);
  });

  function disarmDelete() {
    deleteArmed = false;
    clearTimeout(deleteTimer);
  }

  // Two-tap delete instead of a blocking confirm dialog.
  $("#edDelete").addEventListener("click", () => {
    if (!deleteArmed) {
      deleteArmed = true;
      $("#edDelete").textContent = t("editor.deleteConfirm");
      deleteTimer = setTimeout(() => {
        disarmDelete();
        $("#edDelete").textContent = t("editor.delete");
      }, 4000);
      return;
    }
    disarmDelete();
    const lobby = L.view.lobby;
    lobby.workouts = lobby.workouts.filter((x) => x !== draft.workout);
    L.view.workout = null;
    draft = null;
    toast(t("editor.deleted"));
    window.App.go("lobby", ["welcome", "lobbies", "lobby"]);
  });

  window.Editor = { open };
  document.addEventListener("app:render", render);
  render();
})();
