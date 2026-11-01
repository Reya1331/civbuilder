// js/buildings.js

export const BUILDINGS = {
  road: {
    name: "Road",
    layer: "infrastructure",
    cost: { wood: 1 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Improves connected settlement productivity."
  },

  canal: {
    name: "Water Canal",
    layer: "infrastructure",
    cost: { wood: 2, stone: 1 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Carries water to nearby farmland."
  },

  bridge: {
    name: "Bridge",
    layer: "infrastructure",
    cost: { wood: 2 },
    terrain: ["river", "ocean"],
    unlock: null,
    description: "Allows crossing water."
  },

  farm: {
    name: "Farmland",
    layer: "agriculture",
    cost: {},
    terrain: ["grass_water"],
    unlock: null,
    description: "Produces food using planted grain."
  },

  windmill: {
    name: "Windmill",
    layer: "agriculture",
    cost: { wood: 12, stone: 5 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Improves nearby agricultural production."
  },

  "lumber-mill": {
    name: "Lumber Mill",
    layer: "main",
    cost: {},
    terrain: ["forest"],
    unlock: null,
    description: "Produces wood from nearby forests."
  },

  quarry: {
    name: "Quarry",
    layer: "main",
    cost: { wood: 6 },
    terrain: ["mountain", "mountain_copper", "mountain_iron"],
    unlock: null,
    description: "Extracts stone and available mountain ores."
  },

  residence: {
    name: "Residence",
    layer: "main",
    cost: { wood: 5 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Provides housing for your population."
  },

  library: {
    name: "Library",
    layer: "main",
    cost: { wood: 8, stone: 4 },
    terrain: ["grass", "grass_water"],
    unlock: null,
    description: "Allows research into new advancements."
  },

  waterwheel: {
    name: "Waterwheel",
    layer: "water",
    cost: { wood: 10, stone: 2 },
    terrain: ["river"],
    unlock: null,
    description: "Uses flowing water to improve production."
  },

  waterwheel2: {
    name: "Electric Waterwheel",
    layer: "water",
    cost: { wood: 10, iron: 1, copper: 1 },
    terrain: ["river"],
    unlock: "technology",
    description: "Generates electricity using flowing water."
  },

  windmill2: {
    name: "Electric Windmill",
    layer: "agriculture",
    cost: { copper: 1, fiber: 4 },
    terrain: ["grass", "grass_water"],
    unlock: "technology",
    description: "Generates electricity using wind."
  }
};

export function getBuilding(id) {
  return BUILDINGS[id] ?? null;
}

export function isBuildingUnlocked(id, researched = []) {
  const building = getBuilding(id);
  if (!building) return false;

  return !building.unlock || researched.includes(building.unlock);
}

export function getAvailableBuildings(researched = []) {
  return Object.entries(BUILDINGS)
    .filter(([id]) => isBuildingUnlocked(id, researched))
    .map(([id, building]) => ({ id, ...building }));
}
