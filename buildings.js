// js/buildings.js

export const BUILDINGS = {
  road: {
    name: "Road",
    texture: "road.png",
    layer: "infrastructure",
    cost: { wood: 1 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Improves connected settlement productivity."
  },

  canal: {
    name: "Water Canal",
    texture: "canal.png",
    layer: "infrastructure",
    cost: { wood: 2, stone: 1 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Carries water to nearby farmland."
  },

  bridge: {
    name: "Bridge",
    texture: "bridge.png",
    layer: "infrastructure",
    cost: { wood: 2 },
    terrain: ["river", "ocean"],
    unlock: null,
    description: "Allows passage across water."
  },

  farm: {
    name: "Farmland",
    texture: "farm.png",
    layer: "agriculture",
    cost: {},
    terrain: ["grass_water"],
    unlock: null,
    description: "Produces food using planted grain."
  },

  windmill: {
    name: "Windmill",
    texture: "windmill.png",
    layer: "agriculture",
    cost: { wood: 12, stone: 5 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Improves agricultural production."
  },

  "lumber-mill": {
    name: "Lumber Mill",
    texture: "lumber_mill.png",
    layer: "main",
    cost: {},
    terrain: ["forest"],
    unlock: null,
    description: "Produces wood from nearby forests."
  },

  quarry: {
    name: "Quarry",
    texture: "quarry.png",
    layer: "main",
    cost: { wood: 6 },
    terrain: ["mountain", "mountain_copper", "mountain_iron"],
    unlock: null,
    description: "Extracts stone and mountain ores."
  },

  residence: {
    name: "Residence",
    texture: "residence.png",
    layer: "main",
    cost: { wood: 5 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Provides housing for your population."
  },

  library: {
    name: "Library",
    texture: "library.png",
    layer: "main",
    cost: { wood: 8, stone: 4 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Allows research into new advancements."
  },

  pasture: {
    name: "Pasture",
    texture: "pasture.png",
    layer: "main",
    cost: { wood: 6, stone: 4 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Produces food and fiber."
  },

  waterwheel: {
    name: "Waterwheel",
    texture: "waterwheel.png",
    layer: "water",
    cost: { wood: 10, stone: 2 },
    terrain: ["river"],
    unlock: null,
    description: "Uses flowing water to improve production."
  },

  waterwheel2: {
    name: "Electric Waterwheel",
    texture: "waterwheel2.png",
    layer: "water",
    cost: { wood: 10, iron: 1, copper: 1 },
    terrain: ["river"],
    unlock: "technology",
    description: "Generates electricity using flowing water."
  },

  windmill2: {
    name: "Electric Windmill",
    texture: "windmill2.png",
    layer: "agriculture",
    cost: { copper: 1, fiber: 4 },
    terrain: ["grass", "grass_water"],
    unlock: "technology",
    description: "Generates electricity using wind."
  }
};

// Retrieve a building definition.
export function getBuilding(id) {
  return BUILDINGS[id] ?? null;
}

// Check whether a building is unlocked.
export function isBuildingUnlocked(id, researched = []) {
  const building = getBuilding(id);

  if (!building) return false;

  return !building.unlock || researched.includes(building.unlock);
}

// Get all currently unlocked buildings.
export function getAvailableBuildings(researched = []) {
  return Object.entries(BUILDINGS)
    .filter(([id]) => isBuildingUnlocked(id, researched))
    .map(([id, building]) => ({ id, ...building }));
}
