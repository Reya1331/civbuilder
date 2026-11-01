// js/main.js

import {
  createWorld,
  TILE_SIZE,
  getTile
} from "./world.js";

import {
  createGameState,
  placeBuilding,
  getTileContents,
  collectProduction
} from "./gameplay.js";

import {
  BUILDINGS,
  getBuilding,
  getAvailableBuildings
} from "./buildings.js";

import {
  startResearch,
  advanceResearch,
  getResearchStatus,
  RESEARCH
} from "./research.js";

import {
  saveGame,
  loadGame
} from "./saving.js";

const canvas = document.getElementById("world-canvas");
const ctx = canvas.getContext("2d");

const TILE_DRAW_SIZE = 32;

let loaded = loadGame();

let world = loaded?.world ?? createWorld();
let state = loaded?.state ?? createGameState();

let camera = {
  x: world.start.x * TILE_DRAW_SIZE - canvas.width / 2,
  y: world.start.y * TILE_DRAW_SIZE - canvas.height / 2,
  zoom: 1
};

let selectedTool = "select";
let selectedTile = null;
let mousePosition = null;
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

const textures = {};
const textureNames = [
  "grass",
  "forest",
  "grass_water",
  "mountain",
  "mountain_copper",
  "mountain_iron",
  "river",
  "ocean"
];

for (const name of textureNames) {
  const image = new Image();
  image.src = `assets/terrain/${name}.png`;
  textures[name] = image;
}

const terrainColors = {
  grass: "#638f4b",
  forest: "#315b39",
  grass_water: "#80a85b",
  mountain: "#85847c",
  mountain_copper: "#ad7545",
  mountain_iron: "#727b83",
  river: "#398fbe",
  ocean: "#286a9d"
};

const buildingIcons = {
  road: "🟫",
  canal: "💧",
  bridge: "🌉",
  farm: "🌾",
  windmill: "⚙️",
  "lumber-mill": "🪵",
  quarry: "⛏️",
  residence: "🏠",
  library: "📚",
  waterwheel: "⚙️",
  waterwheel2: "⚡",
  windmill2: "⚡"
};

function drawTile(tile, screenX, screenY, size) {
  const image = textures[tile.terrain];

  if (image?.complete && image.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, screenX, screenY, size, size);
  } else {
    ctx.fillStyle = terrainColors[tile.terrain] ?? "#638f4b";
    ctx.fillRect(screenX, screenY, size, size);
  }

  // Subtle tile borders.
  ctx.strokeStyle = "rgba(0, 0, 0, 0.10)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(screenX, screenY, size, size);

  // Draw infrastructure.
  if (tile.infrastructure.road) {
    ctx.fillStyle = "#94704b";
    ctx.fillRect(
      screenX + size * 0.3,
      screenY + size * 0.3,
      size * 0.4,
      size * 0.4
    );
  }

  if (tile.infrastructure.canal) {
    ctx.strokeStyle = "#36b9e7";
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + size / 2);
    ctx.lineTo(screenX + size, screenY + size / 2);
    ctx.stroke();
  }

  if (tile.infrastructure.bridge) {
    drawIcon("🌉", screenX, screenY, size);
  }

  // Main building.
  if (tile.buildings.main) {
    drawIcon(
      buildingIcons[tile.buildings.main] ?? "🏠",
      screenX,
      screenY,
      size
    );
  }

  // Agriculture layer can contain multiple objects.
  for (const building of tile.buildings.agriculture) {
    drawIcon(
      buildingIcons[building] ?? "🌱",
      screenX,
      screenY,
      size
    );
  }

  // Water layer.
  if (tile.buildings.water) {
    drawIcon(
      buildingIcons[tile.buildings.water] ?? "⚙️",
      screenX,
      screenY,
      size
    );
  }
}

function drawIcon(icon, x, y, size) {
  ctx.font = `${Math.max(13, size * 0.7)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, x + size / 2, y + size / 2);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const size = TILE_DRAW_SIZE * camera.zoom;

  const startX = Math.max(0, Math.floor(camera.x / size));
  const startY = Math.max(0, Math.floor(camera.y / size));

  const endX = Math.min(
    world.width,
    Math.ceil((camera.x + canvas.width) / size)
  );

  const endY = Math.min(
    world.height,
    Math.ceil((camera.y + canvas.height) / size)
  );

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = getTile(world, x, y);
      if (!tile) continue;

      const screenX = x * size - camera.x;
      const screenY = y * size - camera.y;

      drawTile(tile, screenX, screenY, size);
    }
  }

  if (selectedTile) {
    const screenX = selectedTile.x * size - camera.x;
    const screenY = selectedTile.y * size - camera.y;

    ctx.strokeStyle = "#fff4a3";
    ctx.lineWidth = 3;
    ctx.strokeRect(screenX + 1, screenY + 1, size - 2, size - 2);
  }

  if (mousePosition && selectedTool !== "select") {
    const tileX = Math.floor(
      (mousePosition.x + camera.x) / size
    );
    const tileY = Math.floor(
      (mousePosition.y + camera.y) / size
    );

    const screenX = tileX * size - camera.x;
    const screenY = tileY * size - camera.y;

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
  }

  requestAnimationFrame(render);
}

function updateResourceDisplay() {
  for (const [resource, amount] of Object.entries(state.resources)) {
    const element = document.getElementById(`resource-${resource}`);
    if (element) element.textContent = amount;
  }

  document.getElementById("population").textContent = state.population;
  document.getElementById("happiness").textContent = `${state.happiness}%`;
  document.getElementById("year").textContent = state.year;
}

function updateInspector() {
  const tile = selectedTile
    ? getTile(world, selectedTile.x, selectedTile.y)
    : null;

  if (!tile) return;

  document.getElementById("selected-coordinates").textContent =
    `${tile.x}, ${tile.y}`;

  document.getElementById("coordinates").textContent =
    `Tile: ${tile.x}, ${tile.y}`;

  document.getElementById("terrain-name").textContent =
    tile.terrain.replaceAll("_", " ");

  const contents = getTileContents(tile);
  const list = document.getElementById("tile-contents");

  list.innerHTML = "";

  if (contents.length === 0) {
    list.innerHTML = '<li class="muted">Nothing built here</li>';
  } else {
    for (const content of contents) {
      const item = document.createElement("li");
      item.textContent = content;
      list.appendChild(item);
    }
  }

  const descriptions = {
    grass: "Ordinary grassland.",
    forest: "Forest resources. Suitable for a Lumber Mill.",
    grass_water: "Land beside water or a canal.",
    mountain: "Mountain terrain. Suitable for a Quarry.",
    mountain_copper: "Copper deposit.",
    mountain_iron: "Iron deposit.",
    river: "Freshwater river.",
    ocean: "Ocean water."
  };

  document.getElementById("terrain-description").textContent =
    descriptions[tile.terrain] ?? "";
}

function updateResearchDisplay() {
  const status = getResearchStatus(state);

  const text = document.getElementById("research-status");
  const progress = document.getElementById("research-progress-fill");

  if (!status.name) {
    text.textContent = state.researched.length
      ? "Research completed: " + state.researched.join(", ")
      : "Build a Library to begin researching.";

    progress.style.width = "0%";
  } else {
    text.textContent =
      `${status.name}: ${status.progress} / ${status.cost}`;

    progress.style.width =
      `${(status.progress / status.cost) * 100}%`;
  }

  document.getElementById("open-research").disabled =
    !world.tiles.some(row =>
      row.some(tile => tile.buildings.main === "library")
    );
}

function updateBuildSelection() {
  const building = getBuilding(selectedTool);

  document.getElementById("build-selection").textContent =
    building ? `Selected: ${building.name}` : "No building selected";
}

function setTool(tool) {
  selectedTool = tool;
  state.selectedTool = tool;

  document.querySelectorAll(".tool-button").forEach(button => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  updateBuildSelection();
  updateStatus(
    tool === "select"
      ? "Select a tile."
      : `Selected ${getBuilding(tool)?.name ?? tool}.`
  );
}

function updateStatus(message) {
  document.getElementById("game-status").textContent = message;
}

function canvasToTile(event) {
  const rect = canvas.getBoundingClientRect();

  const mouseX = (event.clientX - rect.left) *
    (canvas.width / rect.width);

  const mouseY = (event.clientY - rect.top) *
    (canvas.height / rect.height);

  const size = TILE_DRAW_SIZE * camera.zoom;

  return {
    x: Math.floor((mouseX + camera.x) / size),
    y: Math.floor((mouseY + camera.y) / size),
    mouseX,
    mouseY
  };
}

function handleMapClick(event) {
  if (isDragging) return;

  const position = canvasToTile(event);
  const tile = getTile(world, position.x, position.y);

  if (!tile) return;

  selectedTile = { x: position.x, y: position.y };
  state.selectedTile = selectedTile;

  if (selectedTool !== "select") {
    const result = placeBuilding(
      world,
      state,
      selectedTool,
      position.x,
      position.y
    );

    updateStatus(result.reason);

    if (result.valid) {
      updateResourceDisplay();
      saveGame(world, state);
    }
  }

  updateInspector();
  updateResearchDisplay();
}

canvas.addEventListener("mousedown", event => {
  isDragging = false;
  lastMouse = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("mousemove", event => {
  const rect = canvas.getBoundingClientRect();

  mousePosition = {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };

  if (event.buttons === 1) {
    const dx = event.clientX - lastMouse.x;
    const dy = event.clientY - lastMouse.y;

    if (Math.abs(dx) + Math.abs(dy) > 3) {
      isDragging = true;
    }

    if (isDragging) {
      camera.x -= dx * (canvas.width / rect.width);
      camera.y -= dy * (canvas.height / rect.height);
    }

    lastMouse = { x: event.clientX, y: event.clientY };
  }
});

canvas.addEventListener("mouseup", handleMapClick);

canvas.addEventListener("mouseleave", () => {
  mousePosition = null;
});

canvas.addEventListener("wheel", event => {
  event.preventDefault();

  const oldZoom = camera.zoom;
  const newZoom = Math.max(
    0.5,
    Math.min(2.5, oldZoom * (event.deltaY < 0 ? 1.1 : 0.9))
  );

  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);

  const worldX = (mouseX + camera.x) / oldZoom;
  const worldY = (mouseY + camera.y) / oldZoom;

  camera.zoom = newZoom;
  camera.x = worldX * newZoom - mouseX;
  camera.y = worldY * newZoom - mouseY;
}, { passive: false });

// Keyboard camera controls.
const keys = new Set();

window.addEventListener("keydown", event => {
  if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    keys.add(event.key.toLowerCase());
  }
});

window.addEventListener("keyup", event => {
  keys.delete(event.key.toLowerCase());
});

function moveCamera() {
  const speed = 8;

  if (keys.has("w") || keys.has("arrowup")) camera.y -= speed;
  if (keys.has("s") || keys.has("arrowdown")) camera.y += speed;
  if (keys.has("a") || keys.has("arrowleft")) camera.x -= speed;
  if (keys.has("d") || keys.has("arrowright")) camera.x += speed;

  const maxX = world.width * TILE_DRAW_SIZE * camera.zoom - canvas.width;
  const maxY = world.height * TILE_DRAW_SIZE * camera.zoom - canvas.height;

  camera.x = Math.max(0, Math.min(camera.x, Math.max(0, maxX)));
  camera.y = Math.max(0, Math.min(camera.y, Math.max(0, maxY)));

  requestAnimationFrame(moveCamera);
}

// Construction toolbar.
document.querySelectorAll(".tool-button").forEach(button => {
  button.addEventListener("click", () => {
    setTool(button.dataset.tool);
  });
});

document.getElementById("cancel-build").addEventListener("click", () => {
  setTool("select");
});

document.getElementById("pause-button").addEventListener("click", event => {
  state.paused = !state.paused;
  event.currentTarget.textContent = state.paused ? "▶" : "Ⅱ";
  event.currentTarget.setAttribute(
    "aria-label",
    state.paused ? "Resume game" : "Pause game"
  );
});

// Research dialog.
const researchDialog = document.getElementById("research-dialog");

document.getElementById("open-research").addEventListener("click", () => {
  updateResearchTree();
  researchDialog.showModal();
});

document.getElementById("close-research").addEventListener("click", () => {
  researchDialog.close();
});

function updateResearchTree() {
  const tree = document.getElementById("research-tree");
  tree.innerHTML = "";

  for (const [id, research] of Object.entries(RESEARCH)) {
    const completed = state.researched.includes(id);
    const active = state.activeResearch === id;

    const node = document.createElement("article");
    node.className = `research-node ${completed ? "completed" : ""}`;

    const title = document.createElement("h3");
    title.textContent = research.name;

    const description = document.createElement("p");
    description.textContent = research.description;

    const status = document.createElement("span");
    status.className = "node-state";
    status.textContent = completed
      ? "Completed"
      : active
        ? `In progress: ${state.researchProgress}/${research.cost}`
        : research.requires.length
          ? `Requires: ${research.requires.join(", ")}`
          : `Cost: ${research.cost} research`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = active ? "In Progress" : "Research";
    button.disabled = completed || active;

    button.addEventListener("click", () => {
      const result = startResearch(world, state, id);
      updateStatus(result.reason);
      updateResearchTree();
      updateResearchDisplay();
    });

    node.append(title, description, status, button);
    tree.appendChild(node);
  }
}

// Game clock: one year every five minutes.
setInterval(() => {
  if (state.paused) return;

  collectProduction(world, state);

  if (state.activeResearch) {
    const result = advanceResearch(state, 1);

    if (result?.completed) {
      updateStatus(`${result.name} research completed!`);
    }
  }

  updateResourceDisplay();
  updateResearchDisplay();
  saveGame(world, state);
}, 5 * 60 * 1000);

// Initial setup.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

updateResourceDisplay();
updateResearchDisplay();
updateBuildSelection();

requestAnimationFrame(render);
requestAnimationFrame(moveCamera);

updateStatus("Welcome to your new river valley settlement.");
