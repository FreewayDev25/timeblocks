const STORAGE_KEY = "timeblocks_v4_data";

const defaultState = {
  tasks: [
    { id: crypto.randomUUID(), name: "Travail profond", color: "#2563eb" },
    { id: crypto.randomUUID(), name: "Sport", color: "#16a34a" },
    { id: crypto.randomUUID(), name: "Lecture", color: "#ca8a04" }
  ],
  cells: {},
  selectedTaskId: null,
  eraserMode: false,
  blockMode: false
};

let state = loadState();
if (!state.selectedTaskId && state.tasks.length > 0) {
  state.selectedTaskId = state.tasks[0].id;
}
let isMouseDown = false;
let blockStartCell = null;

const addTaskBtn = document.getElementById("add-task-btn");
const taskNameInput = document.getElementById("task-name");
const taskColorInput = document.getElementById("task-color");
const tasksList = document.getElementById("tasks-list");
const currentSelection = document.getElementById("current-selection");
const eraserBtn = document.getElementById("eraser-btn");
const clearPlanningBtn = document.getElementById("clear-planning-btn");
const planner = document.getElementById("planner");
const cells = Array.from(document.querySelectorAll(".cell"));
const blockModeBtn = document.getElementById("block-mode-btn");
const statsList = document.getElementById("stats-list");
const plannedTimeEl = document.getElementById("planned-time");
const remainingTimeEl = document.getElementById("remaining-time");
const plannedPercentEl = document.getElementById("planned-percent");
const weekProgressFillEl = document.getElementById("week-progress-fill");
const planningSelect = document.getElementById("planning-select");
const deletePlanningBtn = document.getElementById("delete-planning-btn");
const renamePlanningBtn = document.getElementById("rename-planning-btn");
const updatePlanningBtn = document.getElementById("update-planning-btn");
const newPlanningBtn = document.getElementById("new-planning-btn");

init();

function init() {
  renderTasks();
  renderSelection();
  renderCellsFromState();
  renderStats();
  bindEvents();
  updateEraserButton();
  updateBlockModeButton();
  updatePlanningList();
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
      eraserMode: parsed.eraserMode ?? false,
      blockMode: parsed.blockMode ?? false
    };
  } catch (error) {
    console.error("Erreur de lecture localStorage :", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateSelectedPlanning() {
  const key = planningSelect.value;
  if (!key) {
    alert("Aucun planning sélectionné.");
    return;
  }

  localStorage.setItem(key, JSON.stringify(state));
  updatePlanningList(key);
  alert("Modifications enregistrées.");
}

function loadSelectedPlanning() {
  const key = planningSelect.value;
  if (!key) return;

  const data = localStorage.getItem(key);
  if (!data) return;

  state = JSON.parse(data);
  saveState();

  renderTasks();
  renderSelection();
  renderCellsFromState();
  renderStats();
  updateEraserButton();
}

function deleteSelectedPlanning() {
  const key = planningSelect.value;
  if (!key) return;

  const name = key.replace("planning_", "");
  const confirmed = confirm(`Supprimer définitivement le planning "${name}" ?`);

  if (!confirmed) return;

  localStorage.removeItem(key);
  updatePlanningList();

  const firstPlanKey = planningSelect.value;
  if (firstPlanKey) {
    loadSelectedPlanning();
  }
}

function updatePlanningList(selectedKey = null) {
  planningSelect.innerHTML = "";

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (!key.startsWith("planning_")) continue;

    const option = document.createElement("option");
    option.value = key;
    option.textContent = key.replace("planning_", "");

    planningSelect.appendChild(option);
  }

  if (selectedKey) {
    planningSelect.value = selectedKey;
  }
}

function renameSelectedPlanning() {
  const oldKey = planningSelect.value;
  if (!oldKey) return;

  const oldName = oldKey.replace("planning_", "");
  const newName = prompt("Nouveau nom du planning :", oldName);

  if (!newName) return;

  const cleanName = newName.trim();
  if (!cleanName || cleanName === oldName) return;

  const newKey = "planning_" + cleanName;

  if (localStorage.getItem(newKey)) {
    const confirmed = confirm("Un planning avec ce nom existe déjà. Le remplacer ?");
    if (!confirmed) return;
  }

  const data = localStorage.getItem(oldKey);
  if (!data) return;

  localStorage.setItem(newKey, data);
  localStorage.removeItem(oldKey);

  updatePlanningList(newKey);
  loadSelectedPlanning();
}

function createNewPlanning() {
  const confirmed = confirm("Créer un nouveau planning vide ?");

  if (!confirmed) return;

  const name = prompt("Nom du nouveau planning ?");
  if (!name) return;

  const cleanName = name.trim();
  if (!cleanName) return;

  const key = "planning_" + cleanName;

  if (localStorage.getItem(key)) {
    const overwrite = confirm("Un planning avec ce nom existe déjà. Le remplacer ?");
    if (!overwrite) return;
  }

  state = {
    tasks: [],
    cells: {},
    selectedTaskId: null,
    eraserMode: false,
    blockMode: false
  };

  localStorage.setItem(key, JSON.stringify(state));
  saveState();

  updatePlanningList(key);
  renderTasks();
  renderSelection();
  renderCellsFromState();
  renderStats();
  updateEraserButton();
}

function bindEvents() {
  addTaskBtn.addEventListener("click", handleAddTask);
  taskColorInput.addEventListener("change", handleTaskColorChange);
  eraserBtn.addEventListener("click", toggleEraserMode);
  blockModeBtn.addEventListener("click", toggleBlockMode);
  clearPlanningBtn.addEventListener("click", clearPlanning);
  planningSelect.addEventListener("change", loadSelectedPlanning);
  deletePlanningBtn.addEventListener("click", deleteSelectedPlanning);
  renamePlanningBtn.addEventListener("click", renameSelectedPlanning);
  updatePlanningBtn.addEventListener("click", updateSelectedPlanning);
  newPlanningBtn.addEventListener("click", createNewPlanning);

  document.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      isMouseDown = true;
    }
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
    cell.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return; // ignore tout sauf clic gauche

      if (state.blockMode) {
        handleBlockCellClick(cell);
        return;
      }

      applyActionToCell(cell);
    });

    cell.addEventListener("mouseenter", () => {
      if (state.blockMode) return;

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
  renderStats();
  updateEraserButton();

  taskNameInput.value = "";
  taskColorInput.value = "#4f46e5";
  taskNameInput.focus();
}

function handleTaskColorChange() {
  if (taskNameInput.value.trim() !== "") return;

  const task = state.tasks.find((t) => t.id === state.selectedTaskId);
  if (!task) return;

  task.color = taskColorInput.value;

  for (const key in state.cells) {
    if (state.cells[key].taskId === task.id) {
      state.cells[key].color = task.color;
    }
  }

  saveState();
  renderTasks();
  renderSelection();
  renderCellsFromState();
  renderStats();
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
    item.title = "Double-clic pour renommer";

    item.addEventListener("dblclick", (event) => {
      event.stopPropagation();

      const newName = prompt("Renommer la tâche :", task.name);

      if (newName && newName.trim() !== "") {
        task.name = newName.trim();
        saveState();
        renderTasks();
        renderSelection();
        renderCellsFromState();
        renderStats();
        updateEraserButton();
      }
    });

    item.addEventListener("click", (event) => {
      if (event.detail > 1) return;

      state.selectedTaskId = task.id;
      state.eraserMode = false;
      saveState();
      renderTasks();
      renderSelection();
      updateEraserButton();
    });

    if (task.id === state.selectedTaskId && !state.eraserMode) {
      item.classList.add("selected");
    }

    item.innerHTML = 
      '<span class="task-swatch" style="background:' + task.color + '"></span>' +
      '<span class="task-name">' + escapeHtml(task.name) + '</span>' +
      '<button class="task-delete-btn" type="button" title="Supprimer">✕</button>';

    const deleteBtn = item.querySelector(".task-delete-btn");

    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteTask(task.id);
    });

    tasksList.appendChild(item);
  });
}

function renderStats() {
  if (!statsList) return;

  const stats = calculateTaskStats();
  renderWeekSummary(stats);

  if (stats.length === 0) {
    statsList.innerHTML = `<p class="hint">Aucune donnée.</p>`;
    return;
  }

  statsList.innerHTML = stats
    .map((item) => {
      return `
        <div class="stat-item">
          <span class="stat-color" style="background:${item.color}"></span>
          <span class="stat-name">${escapeHtml(item.name)}</span>
          <span class="stat-time">${item.timeLabel}</span>
          <span class="stat-percent">${item.percentLabel}</span>
        </div>
      `;
    })
    .join("");
}

function renderWeekSummary(stats) {
  const totalWeekMinutes = 168 * 60;
  const plannedMinutes = stats.reduce((sum, item) => sum + item.minutes, 0);
  const remainingMinutes = Math.max(0, totalWeekMinutes - plannedMinutes);
  const plannedPercent = (plannedMinutes / totalWeekMinutes) * 100;

  if (plannedTimeEl) {
    plannedTimeEl.textContent = `Planifié : ${formatDuration(plannedMinutes)} / 168h00`;
  }

  if (remainingTimeEl) {
    remainingTimeEl.textContent = `Restant : ${formatDuration(remainingMinutes)}`;
  }

  if (plannedPercentEl) {
    plannedPercentEl.textContent = `${plannedPercent.toFixed(1)}%`;
  }

  if (weekProgressFillEl) {
    weekProgressFillEl.style.width = `${Math.min(plannedPercent, 100)}%`;
  }
}

function calculateTaskStats() {
  const minutesPerCell = 15;
  const totalWeekMinutes = 168 * 60;

  const taskMap = new Map(
    state.tasks.map((task) => [
      task.id,
      {
        id: task.id,
        name: task.name,
        color: task.color,
        minutes: 0
      }
    ])
  );

  for (const key in state.cells) {
    const cellData = state.cells[key];
    if (!cellData || !cellData.taskId) continue;

    const taskStat = taskMap.get(cellData.taskId);
    if (!taskStat) continue;

    taskStat.minutes += minutesPerCell;
  }

  return Array.from(taskMap.values())
    .map((task) => {
      const percent = totalWeekMinutes > 0
        ? (task.minutes / totalWeekMinutes) * 100
        : 0;

      return {
        ...task,
        timeLabel: formatDuration(task.minutes),
        percentLabel: `${percent.toFixed(1)}%`
      };
    })
    .filter((task) => task.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}`;
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
  renderStats();
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

  if (state.eraserMode) {
    state.blockMode = false;
    blockStartCell = null;
  }

  saveState();
  renderTasks();
  renderSelection();
  updateEraserButton();
  updateBlockModeButton();
}

function toggleBlockMode() {
  state.blockMode = !state.blockMode;

  if (state.blockMode) {
    state.eraserMode = false;
  }

  blockStartCell = null;
  saveState();
  renderSelection();
  updateEraserButton();
  updateBlockModeButton();
}

function updateBlockModeButton() {
  blockModeBtn.textContent = state.blockMode
    ? "Mode bloc : ON"
    : "Mode bloc : OFF";
}

function handleBlockCellClick(cell) {
  if (state.eraserMode) return;

  if (!blockStartCell) {
    blockStartCell = cell;
    return;
  }

  fillBlockRange(blockStartCell, cell);
  blockStartCell = null;
  saveState();
  renderCellsFromState();
  renderStats();
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
    renderStats();
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
  renderStats();
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
  const hour = Number(cell.dataset.hour);
  const quarter = Number(cell.dataset.quarter || 0);
  const dayName = days[dayIndex] || "Jour inconnu";
  const timeLabel = formatTime(hour, quarter);

  if (!cellData || !cellData.taskId) {
    cell.title = `${dayName} - ${timeLabel}\nCase vide`;
    return;
  }

  const task = state.tasks.find((t) => t.id === cellData.taskId);
  const taskLabel = task ? task.name : "Tâche supprimée";
  const range = getTaskRangeForCell(cell, cellData.taskId);

  cell.title = `${dayName} • ${timeLabel}\n${taskLabel}\n${range.start} → ${range.end}`;
}

function formatTime(hour, quarter) {
  return `${String(hour).padStart(2, "0")}h${String(quarter).padStart(2, "0")}`;
}

function slotToMinutes(hour, quarter) {
  return hour * 60 + quarter;
}

function minutesToTimeLabel(totalMinutes) {
  if (totalMinutes === 1440) {
    return "24h00";
  }

  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, "0")}h${String(minute).padStart(2, "0")}`;
}

function getTaskRangeForCell(cell, taskId) {
  const currentDayIndex = cell.dataset.dayIndex;
  const allDayCells = cells.filter((c) => c.dataset.dayIndex === currentDayIndex);

  const sortedCells = allDayCells.slice().sort((a, b) => {
    const aMinutes = slotToMinutes(Number(a.dataset.hour), Number(a.dataset.quarter || 0));
    const bMinutes = slotToMinutes(Number(b.dataset.hour), Number(b.dataset.quarter || 0));
    return aMinutes - bMinutes;
  });

  const currentIndex = sortedCells.indexOf(cell);

  let startIndex = currentIndex;
  let endIndex = currentIndex;

  while (startIndex > 0) {
    const prevCell = sortedCells[startIndex - 1];
    const prevKey = getCellKey(prevCell);
    if (!state.cells[prevKey] || state.cells[prevKey].taskId !== taskId) {
      break;
    }
    startIndex--;
  }

  while (endIndex < sortedCells.length - 1) {
    const nextCell = sortedCells[endIndex + 1];
    const nextKey = getCellKey(nextCell);
    if (!state.cells[nextKey] || state.cells[nextKey].taskId !== taskId) {
      break;
    }
    endIndex++;
  }

  const startCell = sortedCells[startIndex];
  const endCell = sortedCells[endIndex];

  const startMinutes = slotToMinutes(
    Number(startCell.dataset.hour),
    Number(startCell.dataset.quarter || 0)
  );

  const endMinutes =
    slotToMinutes(
      Number(endCell.dataset.hour),
      Number(endCell.dataset.quarter || 0)
    ) + 15;

  return {
    start: minutesToTimeLabel(startMinutes),
    end: minutesToTimeLabel(endMinutes)
  };
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
  const quarter = cell.dataset.quarter || "0";
  return `${dayIndex}-${hour}-${quarter}`;
}

function fillBlockRange(startCell, endCell) {
  const startDay = Number(startCell.dataset.dayIndex);
  const endDay = Number(endCell.dataset.dayIndex);

  if (startDay !== endDay) {
    return;
  }

  const selectedTask = state.tasks.find((task) => task.id === state.selectedTaskId);
  if (!selectedTask) return;

  const dayCells = cells
    .filter((cell) => Number(cell.dataset.dayIndex) === startDay)
    .sort(compareCellsByTime);

  const startIndex = dayCells.indexOf(startCell);
  const endIndex = dayCells.indexOf(endCell);

  if (startIndex === -1 || endIndex === -1) return;

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);

  for (let i = from; i <= to; i++) {
    const cell = dayCells[i];
    const key = getCellKey(cell);

    state.cells[key] = {
      taskId: selectedTask.id,
      name: selectedTask.name,
      color: selectedTask.color
    };
  }
}

function compareCellsByTime(a, b) {
  const aMinutes = slotToMinutes(
    Number(a.dataset.hour),
    Number(a.dataset.quarter || 0)
  );

  const bMinutes = slotToMinutes(
    Number(b.dataset.hour),
    Number(b.dataset.quarter || 0)
  );

  return aMinutes - bMinutes;
}

function clearPlanning() {
  const confirmed = window.confirm("Vider toutes les cases du planning ?");
  if (!confirmed) return;

  state.cells = {};
  saveState();
  renderCellsFromState();
  renderStats();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}