
import {
  createWorld,
  getTile
} from "./world.js";

import {
  createGameState,
  placeBuilding,
  getTileContents,
  collectProduction
} from "./gameplay.js";

import {
  getBuilding
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

// ==========================================
// INITIALIZATION
// ==========================================

const canvas = document.getElementById("world-canvas");

if (!canvas) {
  throw new Error('Missing canvas element: "world-canvas"');
}

const ctx = canvas.getContext("2d");

const TILE_SIZE = 16;
const DRAW_SIZE = 32;

const savedGame = loadGame();

let world = savedGame?.world ?? createWorld();
let state = savedGame?.state ?? createGameState();

let selectedTool = "select";
let selectedTile = null;

let camera = {
  x: 0,
  y: 0,
  zoom: 1
};

let viewWidth = 960;
let viewHeight = 640;

let pointer = {
  down: false,
  dragging: false,
  x: -1,
  y: -1,
  startX: 0,
  startY: 0
};

// ==========================================
// TEXTURES
// ==========================================

const terrainTextures = {};
const buildingTextures = {};

const terrainNames = [
  "grass",
  "forest",
  "grass_water",
  "mountain",
  "mountain_copper",
  "mountain_iron",
  "river",
  "ocean"
];

const buildingNames = [
  "road",
  "canal",
  "bridge",
  "farm",
  "windmill",
  "lumber-mill",
  "quarry",
  "residence",
  "library",
  "pasture",
  "waterwheel",
  "waterwheel2",
  "windmill2"
];

const terrainColors = {
  grass: "#638f4b",
  forest: "#315b39",
  grass_water: "#83a95d",
  mountain: "#85847c",
  mountain_copper: "#ad7545",
  mountain_iron: "#727b83",
  river: "#398fbe",
  ocean: "#286a9d"
};

const fallbackIcons = {
  road: "▪",
  canal: "💧",
  bridge: "🌉",
  farm: "🌾",
  windmill: "⚙",
  "lumber-mill": "🪵",
  quarry: "⛏",
  residence: "⌂",
  library: "▤",
  pasture: "♧",
  waterwheel: "⚙",
  waterwheel2: "⚡",
  windmill2: "⚡"
};

function loadTexture(path) {
  const image = new Image();

  image.onload = () => {
    // Redraw automatically after an image finishes loading.
  };

  image.onerror = () => {
    console.warn(`Texture not found: ${path}`);
  };

  image.src = path;

  return image;
}

for (const name of terrainNames) {
  terrainTextures[name] = loadTexture(
    `assets/terrain/${name}.png`
  );
}

for (const id of buildingNames) {
  const building = getBuilding(id);

  if (building?.texture) {
    buildingTextures[id] = loadTexture(
      `assets/buildings/${building.texture}`
    );
  }
}

// ==========================================
// CAMERA
// ==========================================

function clampCamera() {
  const mapWidth =
    world.width * DRAW_SIZE * camera.zoom;

  const mapHeight =
    world.height * DRAW_SIZE * camera.zoom;

  camera.x = Math.max(
    0,
    Math.min(camera.x, Math.max(0, mapWidth - viewWidth))
  );

  camera.y = Math.max(
    0,
    Math.min(camera.y, Math.max(0, mapHeight - viewHeight))
  );
}

function centerCameraOnStart() {
  camera.x =
    world.start.x * DRAW_SIZE +
    DRAW_SIZE / 2 -
    viewWidth / 2;

  camera.y =
    world.start.y * DRAW_SIZE +
    DRAW_SIZE / 2 -
    viewHeight / 2;

  clampCamera();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  viewWidth = rect.width;
  viewHeight = rect.height;

  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  clampCamera();
}

window.addEventListener("resize", resizeCanvas);

// ==========================================
// DRAWING TERRAIN
// ==========================================

function drawTerrain(tile, x, y, size) {
  const image = terrainTextures[tile.terrain];

  if (image?.complete && image.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, size, size);
  } else {
    ctx.fillStyle =
      terrainColors[tile.terrain] ?? "#638f4b";

    ctx.fillRect(x, y, size, size);
  }

  ctx.strokeStyle = "rgba(0, 0, 0, 0.10)";
  ctx.lineWidth = 0.5;

  ctx.strokeRect(x, y, size, size);
}

// ==========================================
// DRAWING BUILDINGS
// ==========================================

function drawBuilding(id, x, y, size) {
  const image = buildingTextures[id];

  if (image?.complete && image.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, size, size);
    return;
  }

  ctx.font = `${Math.max(12, size * 0.7)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    fallbackIcons[id] ?? "?",
    x + size / 2,
    y + size / 2
  );
}

function drawInfrastructure(tile, x, y, size) {
  if (tile.infrastructure.road) {
    drawBuilding("road", x, y, size);
  }

  if (tile.infrastructure.canal) {
    drawBuilding("canal", x, y, size);
  }

  if (tile.infrastructure.bridge) {
    drawBuilding("bridge", x, y, size);
  }
}

function drawTile(tile, x, y, size) {
  drawTerrain(tile, x, y, size);

  drawInfrastructure(tile, x, y, size);

  if (tile.buildings.main) {
    drawBuilding(
      tile.buildings.main,
      x,
      y,
      size
    );
  }

  for (const id of tile.buildings.agriculture) {
    drawBuilding(id, x, y, size);
  }

  if (tile.buildings.water) {
    drawBuilding(
      tile.buildings.water,
      x,
      y,
      size
    );
  }
}

// ==========================================
// MAP RENDERING
// ==========================================

function render() {
  ctx.clearRect(0, 0, viewWidth, viewHeight);

  const size = DRAW_SIZE * camera.zoom;

  const startX = Math.max(
    0,
    Math.floor(camera.x / size)
  );

  const startY = Math.max(
    0,
    Math.floor(camera.y / size)
  );

  const endX = Math.min(
    world.width,
    Math.ceil((camera.x + viewWidth) / size)
  );

  const endY = Math.min(
    world.height,
    Math.ceil((camera.y + viewHeight) / size)
  );

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = getTile(world, x, y);

      if (!tile) continue;

      drawTile(
        tile,
        x * size - camera.x,
        y * size - camera.y,
        size
      );
    }
  }

  // Selected tile.
  if (selectedTile) {
    const x = selectedTile.x * size - camera.x;
    const y = selectedTile.y * size - camera.y;

    ctx.strokeStyle = "#fff3a0";
    ctx.lineWidth = 3;

    ctx.strokeRect(
      x + 1,
      y + 1,
      size - 2,
      size - 2
    );
  }

  // Placement cursor.
  if (
    pointer.x >= 0 &&
    pointer.y >= 0 &&
    !pointer.down
  ) {
    const x = Math.floor(
      (pointer.x + camera.x) / size
    );

    const y = Math.floor(
      (pointer.y + camera.y) / size
    );

    if (getTile(world, x, y)) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;

      ctx.strokeRect(
        x * size - camera.x + 2,
        y * size - camera.y + 2,
        size - 4,
        size - 4
      );
    }
  }

  requestAnimationFrame(render);
}

// ==========================================
// TILE INTERACTION
// ==========================================

function getTileFromPointer(event) {
  const rect = canvas.getBoundingClientRect();

  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  const size = DRAW_SIZE * camera.zoom;

  return {
    x: Math.floor((mouseX + camera.x) / size),
    y: Math.floor((mouseY + camera.y) / size)
  };
}

function handleTileClick(x, y) {
  const tile = getTile(world, x, y);

  if (!tile) return;

  selectedTile = { x, y };
  state.selectedTile = selectedTile;

  if (selectedTool !== "select") {
    const result = placeBuilding(
      world,
      state,
      selectedTool,
      x,
      y
    );

    updateStatus(result.reason);

    if (result.valid) {
      updateResources();
      saveGame(world, state);
    }
  }

  updateInspector();
  updateResearch();
}

canvas.addEventListener("pointerdown", event => {
  pointer.down = true;
  pointer.dragging = false;

  pointer.startX = event.clientX;
  pointer.startY = event.clientY;

  const rect = canvas.getBoundingClientRect();

  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
  const rect = canvas.getBoundingClientRect();

  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;

  if (!pointer.down) return;

  const dx = event.clientX - pointer.startX;
  const dy = event.clientY - pointer.startY;

  if (Math.abs(dx) + Math.abs(dy) > 5) {
    pointer.dragging = true;
  }

  if (pointer.dragging) {
    camera.x -= dx;
    camera.y -= dy;

    pointer.startX = event.clientX;
    pointer.startY = event.clientY;

    clampCamera();
  }
});

canvas.addEventListener("pointerup", event => {
  if (!pointer.dragging) {
    const position = getTileFromPointer(event);

    handleTileClick(position.x, position.y);
  }

  pointer.down = false;
  pointer.dragging = false;
});

canvas.addEventListener("pointercancel", () => {
  pointer.down = false;
  pointer.dragging = false;
});

// ==========================================
// ZOOM
// ==========================================

canvas.addEventListener("wheel", event => {
  event.preventDefault();

  const oldZoom = camera.zoom;

  const newZoom = Math.max(
    0.5,
    Math.min(
      3,
      oldZoom * (event.deltaY < 0 ? 1.1 : 0.9)
    )
  );

  const rect = canvas.getBoundingClientRect();

  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  const worldX = (mouseX + camera.x) / oldZoom;
  const worldY = (mouseY + camera.y) / oldZoom;

  camera.zoom = newZoom;

  camera.x = worldX * newZoom - mouseX;
  camera.y = worldY * newZoom - mouseY;

  clampCamera();
}, { passive: false });

// ==========================================
// KEYBOARD CAMERA MOVEMENT
// ==========================================

const keys = new Set();

window.addEventListener("keydown", event => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) return;

  const key = event.key.toLowerCase();

  const movementKeys = [
    "w", "a", "s", "d",
    "arrowup", "arrowdown",
    "arrowleft", "arrowright"
  ];

  if (movementKeys.includes(key)) {
    keys.add(key);
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
  keys.clear();
});

function keyboardMovement() {
  const speed = 7;

  if (keys.has("w") || keys.has("arrowup")) {
    camera.y -= speed;
  }

  if (keys.has("s") || keys.has("arrowdown")) {
    camera.y += speed;
  }

  if (keys.has("a") || keys.has("arrowleft")) {
    camera.x -= speed;
  }

  if (keys.has("d") || keys.has("arrowright")) {
    camera.x += speed;
  }

  clampCamera();

  requestAnimationFrame(keyboardMovement);
}

// ==========================================
// RESOURCE DISPLAY
// ==========================================

function updateResources() {
  for (const [resource, amount] of Object.entries(state.resources)) {
    const element = document.getElementById(
      `resource-${resource}`
    );

    if (element) {
      element.textContent = amount;
    }
  }

  document.getElementById("population").textContent =
    state.population;

  document.getElementById("happiness").textContent =
    `${state.happiness}%`;

  document.getElementById("year").textContent =
    state.year;
}

// ==========================================
// TILE INSPECTOR
// ==========================================

function updateInspector() {
  if (!selectedTile) return;

  const tile = getTile(
    world,
    selectedTile.x,
    selectedTile.y
  );

  if (!tile) return;

  document.getElementById("selected-coordinates").textContent =
    `${tile.x}, ${tile.y}`;

  document.getElementById("coordinates").textContent =
    `Tile: ${tile.x}, ${tile.y}`;

  document.getElementById("terrain-name").textContent =
    tile.terrain.replaceAll("_", " ");

  const descriptions = {
    grass: "Ordinary grassland.",
    forest: "Forest resources. Suitable for a Lumber Mill.",
    grass_water: "Grass beside water or a canal.",
    mountain: "Mountain terrain. Suitable for a Quarry.",
    mountain_copper: "Copper deposit.",
    mountain_iron: "Iron deposit.",
    river: "Freshwater river.",
    ocean: "Ocean water."
  };

  document.getElementById("terrain-description").textContent =
    descriptions[tile.terrain] ?? "";

  const swatch = document.getElementById("terrain-swatch");

  if (swatch) {
    swatch.style.backgroundImage =
      `url("assets/terrain/${tile.terrain}.png")`;

    swatch.style.backgroundSize = "cover";

    swatch.style.backgroundColor =
      terrainColors[tile.terrain] ?? "#638f4b";
  }

  const contents = getTileContents(tile);
  const list = document.getElementById("tile-contents");

  list.replaceChildren();

  if (contents.length === 0) {
    const item = document.createElement("li");

    item.textContent = "Nothing built here";
    item.className = "muted";

    list.appendChild(item);
  } else {
    for (const content of contents) {
      const item = document.createElement("li");

      item.textContent = content;

      list.appendChild(item);
    }
  }
}

// ==========================================
// BUILDING TOOLBAR
// ==========================================

function setTool(tool) {
  selectedTool = tool;
  state.selectedTool = tool;

  document.querySelectorAll(".tool-button").forEach(button => {
    const active = button.dataset.tool === tool;

    button.classList.toggle("active", active);

    button.setAttribute(
      "aria-pressed",
      String(active)
    );
  });

  const building = getBuilding(tool);

  document.getElementById("build-selection").textContent =
    building
      ? `Selected: ${building.name}`
      : "No building selected";

  updateStatus(
    building
      ? `Select a tile to construct ${building.name}.`
      : "Select a tile."
  );
}

document.querySelectorAll(".tool-button").forEach(button => {
  button.addEventListener("click", () => {
    setTool(button.dataset.tool);
  });
});

document.getElementById("cancel-build").addEventListener("click", () => {
  setTool("select");
});

// ==========================================
// RESEARCH
// ==========================================

function updateResearch() {
  const status = getResearchStatus(state);

  const statusElement = document.getElementById("research-status");

  const progressElement = document.getElementById(
    "research-progress-fill"
  );

  if (!status.name) {
    statusElement.textContent = state.researched.length
      ? `Completed: ${state.researched.join(", ")}`
      : "Build a Library to begin researching.";

    progressElement.style.width = "0%";
  } else {
    statusElement.textContent =
      `${status.name}: ${status.progress}/${status.cost}`;

    progressElement.style.width =
      `${Math.min(100, status.progress / status.cost * 100)}%`;
  }

  const hasLibrary = world.tiles.some(row =>
    row.some(tile => tile.buildings.main === "library")
  );

  document.getElementById("open-research").disabled =
    !hasLibrary;
}

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

  tree.replaceChildren();

  for (const [id, research] of Object.entries(RESEARCH)) {
    const completed = state.researched.includes(id);
    const active = state.activeResearch === id;

    const node = document.createElement("article");

    node.className = "research-node";

    if (completed) node.classList.add("completed");
    if (active) node.classList.add("active");

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
        : `Research cost: ${research.cost}`;

    const button = document.createElement("button");

    button.className = "secondary-button";
    button.type = "button";

    button.textContent = active ? "In Progress" : "Research";

    button.disabled = completed || active;

    button.addEventListener("click", () => {
      const result = startResearch(world, state, id);

      updateStatus(result.reason);
      updateResearchTree();
      updateResearch();

      saveGame(world, state);
    });

    node.append(
      title,
      description,
      status,
      button
    );

    tree.appendChild(node);
  }
}

// ==========================================
// GAME CLOCK
// ==========================================

// One game year = five real minutes.
setInterval(() => {
  if (state.paused) return;

  collectProduction(world, state);

  if (state.activeResearch) {
    const result = advanceResearch(state, 1);

    if (result?.completed) {
      updateStatus(`${result.name} research completed!`);
    }
  }

  updateResources();
  updateResearch();

  saveGame(world, state);
}, 5 * 60 * 1000);

// ==========================================
// PAUSE
// ==========================================

document.getElementById("pause-button").addEventListener("click", event => {
  state.paused = !state.paused;

  event.currentTarget.textContent =
    state.paused ? "▶" : "Ⅱ";

  event.currentTarget.setAttribute(
    "aria-label",
    state.paused ? "Resume game" : "Pause game"
  );

  updateStatus(
    state.paused ? "Game paused." : "Game resumed."
  );

  saveGame(world, state);
});

// ==========================================
// SAVE BUTTON
// ==========================================

const saveButton = document.getElementById("save-button");

if (saveButton) {
  saveButton.addEventListener("click", () => {
    const success = saveGame(world, state);

    updateStatus(
      success ? "Game saved." : "Unable to save game."
    );
  });
}

// ==========================================
// INITIAL STARTUP
// ==========================================

resizeCanvas();
centerCameraOnStart();

updateResources();
updateResearch();
setTool("select");

requestAnimationFrame(render);
requestAnimationFrame(keyboardMovement);

updateStatus("Welcome to your new river valley settlement.");
