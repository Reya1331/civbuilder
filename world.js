// js/world.js

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const TILE_SIZE = 16;

export const TERRAIN = {
  GRASS: "grass",
  FOREST: "forest",
  GRASS_WATER: "grass_water",
  MOUNTAIN: "mountain",
  COPPER: "mountain_copper",
  IRON: "mountain_iron",
  RIVER: "river",
  OCEAN: "ocean"
};

let worldSeed = Math.floor(Math.random() * 999999999);

// Seeded random number generator.
function randomGenerator(seed) {
  let value = seed >>> 0;

  return function () {
    value += 0x6D2B79F5;

    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getWorldSeed() {
  return worldSeed;
}

export function setWorldSeed(seed) {
  worldSeed = seed;
}

// Each tile has independent layers.
export function createTile(x, y, terrain = TERRAIN.GRASS) {
  return {
    x,
    y,
    terrain,

    infrastructure: {
      road: false,
      canal: false,
      bridge: false
    },

    buildings: {
      main: null,
      agriculture: [],
      water: null
    }
  };
}

function setTerrain(tiles, x, y, terrain) {
  if (
    x < 0 || x >= MAP_WIDTH ||
    y < 0 || y >= MAP_HEIGHT
  ) return;

  tiles[y][x].terrain = terrain;
}

// Create a cluster of terrain.
function createCluster(
  tiles,
  random,
  centerX,
  centerY,
  radiusX,
  radiusY,
  terrain,
  irregularity = 0.2
) {
  for (let y = -radiusY; y <= radiusY; y++) {
    for (let x = -radiusX; x <= radiusX; x++) {
      const distance =
        (x * x) / (radiusX * radiusX) +
        (y * y) / (radiusY * radiusY);

      if (distance > 1) continue;
      if (random() < irregularity) continue;

      const tile = tiles[centerY + y]?.[centerX + x];

      if (!tile) continue;

      if (
        tile.terrain === TERRAIN.RIVER ||
        tile.terrain === TERRAIN.OCEAN
      ) continue;

      tile.terrain = terrain;
    }
  }
}

// Generate a winding river.
function generateRiver(tiles) {
  for (let x = 4; x < MAP_WIDTH - 4; x++) {
    const centerY =
      50 +
      Math.sin(x / 10) * 8 +
      Math.sin(x / 21) * 5;

    const width = 2;

    for (let offset = -width; offset <= width; offset++) {
      setTerrain(
        tiles,
        x,
        Math.round(centerY + offset),
        TERRAIN.RIVER
      );
    }
  }
}

// Generate an irregular coastline.
function generateOcean(tiles) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const coastline = 5 + Math.floor(Math.sin(y / 10) * 3);

    for (let x = 0; x < coastline; x++) {
      setTerrain(tiles, x, y, TERRAIN.OCEAN);
    }
  }

  for (let x = 0; x < MAP_WIDTH; x++) {
    const coastline = 96 + Math.floor(Math.sin(x / 12) * 2);

    for (let y = coastline; y < MAP_HEIGHT; y++) {
      setTerrain(tiles, x, y, TERRAIN.OCEAN);
    }
  }
}

// Convert mountain tiles into ore deposits.
function generateOres(tiles, random) {
  const mountains = [];

  for (const row of tiles) {
    for (const tile of row) {
      if (tile.terrain === TERRAIN.MOUNTAIN) {
        mountains.push(tile);
      }
    }
  }

  // Distribute both types of ore.
  for (let i = 0; i < Math.min(16, mountains.length); i++) {
    const index = Math.floor(random() * mountains.length);
    const tile = mountains.splice(index, 1)[0];

    tile.terrain = i % 2 === 0
      ? TERRAIN.COPPER
      : TERRAIN.IRON;
  }
}

// Convert grass touching water or canals.
export function updateWaterEdges(tiles) {
  // Reset previously generated grass-water variants.
  for (const row of tiles) {
    for (const tile of row) {
      if (tile.terrain === TERRAIN.GRASS_WATER) {
        tile.terrain = TERRAIN.GRASS;
      }
    }
  }

  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      const tile = tiles[y][x];

      // Canal tiles themselves can support farmland.
      if (
        tile.terrain === TERRAIN.GRASS &&
        tile.infrastructure.canal
      ) {
        tile.terrain = TERRAIN.GRASS_WATER;
        continue;
      }

      if (tile.terrain !== TERRAIN.GRASS) continue;

      const neighbors = [
        tiles[y - 1]?.[x],
        tiles[y + 1]?.[x],
        tiles[y]?.[x - 1],
        tiles[y]?.[x + 1]
      ];

      const touchesWater = neighbors.some(neighbor =>
        neighbor && (
          neighbor.terrain === TERRAIN.RIVER ||
          neighbor.terrain === TERRAIN.OCEAN ||
          neighbor.infrastructure?.canal
        )
      );

      if (touchesWater) {
        tile.terrain = TERRAIN.GRASS_WATER;
      }
    }
  }
}

export function createWorld(seed = worldSeed) {
  worldSeed = seed;

  const random = randomGenerator(seed);

  const tiles = Array.from(
    { length: MAP_HEIGHT },
    (_, y) => Array.from(
      { length: MAP_WIDTH },
      (_, x) => createTile(x, y)
    )
  );

  // 1. Water.
  generateOcean(tiles);
  generateRiver(tiles);

  // 2. Forests.
  for (let i = 0; i < 35; i++) {
    createCluster(
      tiles,
      random,
      10 + Math.floor(random() * 80),
      8 + Math.floor(random() * 82),
      2 + Math.floor(random() * 4),
      2 + Math.floor(random() * 4),
      TERRAIN.FOREST
    );
  }

  // 3. Mountain ranges.
  const mountainCenters = [
    { x: 28, y: 22 },
    { x: 75, y: 18 },
    { x: 76, y: 76 },
    { x: 22, y: 82 }
  ];

  for (const center of mountainCenters) {
    createCluster(
      tiles,
      random,
      center.x,
      center.y,
      7,
      5,
      TERRAIN.MOUNTAIN,
      0.12
    );
  }

  // 4. Ore deposits.
  generateOres(tiles, random);

  // 5. Guarantee starting resources.
  createCluster(
    tiles, random,
    42, 35, 3, 3,
    TERRAIN.FOREST, 0
  );

  createCluster(
    tiles, random,
    65, 32, 5, 4,
    TERRAIN.MOUNTAIN, 0
  );

  setTerrain(tiles, 64, 32, TERRAIN.COPPER);
  setTerrain(tiles, 66, 33, TERRAIN.IRON);

  // 6. Convert shoreline grass.
  updateWaterEdges(tiles);

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    seed,
    tiles,

    // Starting position in the river valley.
    start: {
      x: 49,
      y: 43
    }
  };
}

export function getTile(world, x, y) {
  if (!world) return null;

  return world.tiles[y]?.[x] ?? null;
}

export function getNeighbors(world, x, y) {
  return [
    getTile(world, x, y - 1),
    getTile(world, x, y + 1),
    getTile(world, x - 1, y),
    getTile(world, x + 1, y)
  ].filter(Boolean);
}
