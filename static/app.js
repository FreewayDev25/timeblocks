const STORAGE_KEY = "timeblocks_v3_data";

const defaultState = {
  tasks: [
    { id: crypto.randomUUID(), name: "Travail profond", color: "#2563eb" },
    { id: crypto.randomUUID(), name: "Sport", color: "#16a34a" },
    { id: crypto.randomUUID(), name: "Lecture", color: "#ca8a04" }
  ],
  cells: {},
  selectedTaskId: null,
  eraserMode: false
};

let state = loadState();
if (!state.selectedTaskId && state.tasks.length > 0) {
  state.selectedTaskId = state.tasks[0].id;
}
let isMouseDown = false;

const taskForm = document.getElementById("task-form");
const taskNameInput = document.getElementById("task-name");
const taskColorInput = document.getElementById("task-color");
const tasksList = document.getElementById("tasks-list");
const currentSelection = document.getElementById("current-selection");
const eraserBtn = document.getElementById("eraser-btn");
const saveBtn = document.getElementById("save-btn");
const clearPlanningBtn = document.getElementById("clear-planning-btn");
const planner = document.getElementById("planner");
const cells = Array.from(document.querySelectorAll(".cell"));

init();

function init() {
  renderTasks();
  renderSelection();
  renderCellsFromState();
  bindEvents();
  updateEraserButton();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return structuredClone(defaultState);
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : structuredClone(defaultState.tasks),
      cells: parsed.cells && typeof parsed.cells === "object" ? parsed.cells : {},
      selectedTaskId: parsed.selectedTaskId ?? null,
      eraserMode: parsed.eraserMode ?? false
    };
  } catch (error) {
    console.error("Erreur de lecture localStorage :", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  taskForm.addEventListener("submit", handleAddTask);
  eraserBtn.addEventListener("click", toggleEraserMode);
  saveBtn.addEventListener("click", handleManualSave);
  clearPlanningBtn.addEventListener("click", clearPlanning);

  document.addEventListener("mousedown", () => {
    isMouseDown = true;
  });

  document.addEventListener("mouseup", () => {
    isMouseDown = false;
  });

  document.addEventListener("mouseleave", () => {
    isMouseDown = false;
  });

  planner.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  cells.forEach((cell) => {
    cell.addEventListener("mousedown", () => {
      applyActionToCell(cell);
    });

    cell.addEventListener("mouseenter", () => {
      if (isMouseDown) {
        applyActionToCell(cell);
      }
    });
  });
}

function handleAddTask(event) {
  event.preventDefault();

  const name = taskNameInput.value.trim();
  const color = taskColorInput.value;

  if (!name) return;

  const newTask = {
    id: crypto.randomUUID(),
    name,
    color
  };

  state.tasks.push(newTask);
  state.selectedTaskId = newTask.id;
  state.eraserMode = false;

  saveState();
  renderTasks();
  renderSelection();
  updateEraserButton();

  taskForm.reset();
  taskColorInput.value = "#4f46e5";
  taskNameInput.focus();
}

function renderTasks() {
  tasksList.innerHTML = "";

  if (state.tasks.length === 0) {
    tasksList.innerHTML = `<p class="hint">Aucune tâche.</p>`;
    return;
  }

  state.tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";

    if (task.id === state.selectedTaskId && !state.eraserMode) {
      item.classList.add("selected");
    }

    item.innerHTML = `
      <span class="task-swatch" style="background:${task.color}"></span>
      <span class="task-name">${escapeHtml(task.name)}</span>
      <button class="task-delete-btn" type="button" title="Supprimer">✕</button>
    `;

    item.addEventListener("click", () => {
      state.selectedTaskId = task.id;
      state.eraserMode = false;
      saveState();
      renderTasks();
      renderSelection();
      updateEraserButton();
    });

    const deleteBtn = item.querySelector(".task-delete-btn");
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteTask(task.id);
    });

    tasksList.appendChild(item);
  });
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);

  for (const key in state.cells) {
    if (state.cells[key].taskId === taskId) {
      delete state.cells[key];
    }
  }

  if (state.selectedTaskId === taskId) {
    state.selectedTaskId = null;
  }

  saveState();
  renderTasks();
  renderSelection();
  renderCellsFromState();
}

function renderSelection() {
  if (state.eraserMode) {
    currentSelection.innerHTML = `
      <div class="selection-badge">
        <span>🧽</span>
        <span>Mode effacer actif</span>
      </div>
    `;
    return;
  }

  const task = state.tasks.find((t) => t.id === state.selectedTaskId);

  if (!task) {
    currentSelection.textContent = "Aucune tâche sélectionnée";
    return;
  }

  currentSelection.innerHTML = `
    <div class="selection-badge">
      <span class="selection-color" style="background:${task.color}"></span>
      <span>${escapeHtml(task.name)}</span>
    </div>
  `;
}

function toggleEraserMode() {
  state.eraserMode = !state.eraserMode;
  saveState();
  renderTasks();
  renderSelection();
  updateEraserButton();
}

function updateEraserButton() {
  eraserBtn.textContent = state.eraserMode
    ? "Mode effacer : ON"
    : "Mode effacer : OFF";
}

function applyActionToCell(cell) {
  const key = getCellKey(cell);

  if (state.eraserMode) {
    delete state.cells[key];
    paintCell(cell, null);
    saveState();
    return;
  }

  const selectedTask = state.tasks.find((task) => task.id === state.selectedTaskId);

  if (!selectedTask) return;

  state.cells[key] = {
    taskId: selectedTask.id,
    name: selectedTask.name,
    color: selectedTask.color
  };

  paintCell(cell, state.cells[key]);
  saveState();
}

function renderCellsFromState() {
  cells.forEach((cell) => {
    const key = getCellKey(cell);
    const cellData = state.cells[key] || null;
    paintCell(cell, cellData);
  });
}

function updateCellTooltip(cell, cellData = null) {
  const days = window.TIMEBLOCKS_CONFIG.days;
  const dayIndex = Number(cell.dataset.dayIndex);
  const hour = String(cell.dataset.hour).padStart(2, "0");
  const dayName = days[dayIndex] || "Jour inconnu";

  const taskLabel = cellData && cellData.name
    ? cellData.name
    : "Case vide";

  cell.title = `${dayName} - ${hour}:00\n${taskLabel}`;
}

function paintCell(cell, cellData) {
  if (!cellData) {
    cell.style.background = "";
    cell.textContent = "";
    cell.classList.remove("filled");
    updateCellTooltip(cell, null);
    return;
  }

  cell.style.background = cellData.color;
  cell.textContent = "";
  cell.classList.add("filled");
  updateCellTooltip(cell, cellData);
}

function getCellKey(cell) {
  const dayIndex = cell.dataset.dayIndex;
  const hour = cell.dataset.hour;
  return `${dayIndex}-${hour}`;
}

function clearPlanning() {
  const confirmed = window.confirm("Vider toutes les cases du planning ?");
  if (!confirmed) return;

  state.cells = {};
  saveState();
  renderCellsFromState();
}

function handleManualSave() {
  saveState();
  alert("Planning sauvegardé en local.");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}