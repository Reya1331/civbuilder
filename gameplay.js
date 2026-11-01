// js/gameplay.js

import {
  getTile,
  getNeighbors,
  updateWaterEdges
} from "./world.js";

import {
  getBuilding,
  isBuildingUnlocked
} from "./buildings.js";

export function createGameState() {
  return {
    resources: {
      wood: 20,
      stone: 15,
      iron: 0,
      copper: 0,
      grain: 10,
      food: 25,
      fiber: 0
    },

    population: 5,
    happiness: 85,
    year: 1,

    researched: [],
    activeResearch: null,
    researchProgress: 0,

    selectedTool: "select",
    selectedTile: null,

    paused: false
  };
}

export function canAfford(state, cost = {}) {
  return Object.entries(cost).every(([resource, amount]) =>
    (state.resources[resource] ?? 0) >= amount
  );
}

export function spendResources(state, cost = {}) {
  if (!canAfford(state, cost)) return false;

  for (const [resource, amount] of Object.entries(cost)) {
    state.resources[resource] -= amount;
  }

  return true;
}

export function canPlaceBuilding(
  world,
  state,
  buildingId,
  x,
  y
) {
  const tile = getTile(world, x, y);
  const building = getBuilding(buildingId);

  if (!tile || !building) {
    return { valid: false, reason: "Invalid tile or building." };
  }

  if (!isBuildingUnlocked(buildingId, state.researched)) {
    return { valid: false, reason: "This building is locked." };
  }

  if (!building.terrain.includes(tile.terrain)) {
    return {
      valid: false,
      reason: `Requires: ${building.terrain.join(", ")}.`
    };
  }

  const layer = building.layer;

  if (layer === "main" && tile.buildings.main) {
    return { valid: false, reason: "This tile already has a building." };
  }

  if (
    layer === "agriculture" &&
    tile.buildings.agriculture.includes(buildingId)
  ) {
    return { valid: false, reason: "This building is already here." };
  }

  if (layer === "water" && tile.buildings.water) {
    return { valid: false, reason: "This water tile is occupied." };
  }

  if (
    layer === "infrastructure" &&
    tile.infrastructure[buildingId]
  ) {
    return { valid: false, reason: "This infrastructure already exists." };
  }

  if (!canAfford(state, building.cost)) {
    return { valid: false, reason: "Not enough resources." };
  }

  // A canal must connect to existing water or another canal.
  if (buildingId === "canal") {
    const connectsToWater = getNeighbors(world, x, y).some(neighbor =>
      neighbor.terrain === "river" ||
      neighbor.terrain === "ocean" ||
      neighbor.infrastructure.canal
    );

    if (!connectsToWater) {
      return {
        valid: false,
        reason: "Canals must connect to water or another canal."
      };
    }
  }

  // A bridge must be placed over water.
  if (buildingId === "bridge" &&
      !["river", "ocean"].includes(tile.terrain)) {
    return { valid: false, reason: "Bridges must occupy water tiles." };
  }

  return { valid: true, reason: "Ready to build." };
}

export function placeBuilding(
  world,
  state,
  buildingId,
  x,
  y
) {
  const result = canPlaceBuilding(
    world,
    state,
    buildingId,
    x,
    y
  );

  if (!result.valid) return result;

  const building = getBuilding(buildingId);
  const tile = getTile(world, x, y);

  if (!spendResources(state, building.cost)) {
    return { valid: false, reason: "Not enough resources." };
  }

  if (building.layer === "main") {
    tile.buildings.main = buildingId;
  } else if (building.layer === "agriculture") {
    tile.buildings.agriculture.push(buildingId);
  } else if (building.layer === "water") {
    tile.buildings.water = buildingId;
  } else if (building.layer === "infrastructure") {
    tile.infrastructure[buildingId] = true;
  }

  if (buildingId === "canal") {
    updateWaterEdges(world.tiles);
  }

  return {
    valid: true,
    reason: `${building.name} constructed.`
  };
}

export function getTileContents(tile) {
  if (!tile) return [];

  const contents = [];

  if (tile.infrastructure.road) contents.push("Road");
  if (tile.infrastructure.canal) contents.push("Water Canal");
  if (tile.infrastructure.bridge) contents.push("Bridge");

  if (tile.buildings.main) {
    contents.push(getBuilding(tile.buildings.main)?.name);
  }

  for (const id of tile.buildings.agriculture) {
    contents.push(getBuilding(id)?.name);
  }

  if (tile.buildings.water) {
    contents.push(getBuilding(tile.buildings.water)?.name);
  }

  return contents.filter(Boolean);
}

export function collectProduction(world, state) {
  for (const row of world.tiles) {
    for (const tile of row) {
      const main = tile.buildings.main;

      if (main === "lumber-mill") {
        state.resources.wood += 2;
      }

      if (main === "quarry") {
        state.resources.stone += 2;

        if (tile.terrain === "mountain_iron") {
          state.resources.iron += 1;
        }

        if (tile.terrain === "mountain_copper") {
          state.resources.copper += 1;
        }
      }

      if (tile.buildings.agriculture.includes("farm")) {
        if (state.resources.grain > 0) {
          state.resources.grain -= 1;
          state.resources.food += 5;
        }
      }
    }
  }

  state.year++;
}
