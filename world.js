// js/world.js

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const TILE_SIZE = 16;

export const TERRAIN = {
  grass: "grass",
  forest: "forest",
  grass_water: "grass_water",
  mountain: "mountain",
  mountain_copper: "mountain_copper",
  mountain_iron: "mountain_iron",
  river: "river",
  ocean: "ocean"
};

let worldSeed = Math.floor(Math.random() * 999999999);

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

export function createTile(x, y, terrain = TERRAIN.grass) {
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

export function createWorld(seed = worldSeed) {
  worldSeed = seed;

  const random = randomGenerator(seed);

  const tiles = Array.from({ length: MAP_HEIGHT }, (_, y) =>
    Array.from({ length: MAP_WIDTH }, (_, x) =>
      createTile(x, y)
    )
  );

  // Small helper for safe terrain placement.
  function setTerrain(x, y, terrain) {
    if (
      x >= 0 && x < MAP_WIDTH &&
      y >= 0 && y < MAP_HEIGHT
    ) {
      tiles[y][x].terrain = terrain;
    }
  }

  // Ocean along the western and southern edges.
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const coastline = 5 + Math.floor(Math.sin(y / 10) * 3);

    for (let x = 0; x < coastline; x++) {
      setTerrain(x, y, TERRAIN.ocean);
    }
  }

  for (let x = 0; x < MAP_WIDTH; x++) {
    const coastline = 96 + Math.floor(Math.sin(x / 12) * 2);

    for (let y = coastline; y < MAP_HEIGHT; y++) {
      setTerrain(x, y, TERRAIN.ocean);
    }
  }

  // Generate a winding river through the starting region.
  for (let x = 5; x < 96; x++) {
    const centerY =
      52 +
      Math.sin(x / 10) * 8 +
      Math.sin(x / 21) * 5;

    const riverWidth = 2;

    for (let offset = -riverWidth; offset <= riverWidth; offset++) {
      setTerrain(
        x,
        Math.round(centerY + offset),
        TERRAIN.river
      );
    }
  }

  // Forest clusters.
  for (let cluster = 0; cluster < 32; cluster++) {
    const centerX = 10 + Math.floor(random() * 80);
    const centerY = 8 + Math.floor(random() * 82);
    const radius = 2 + Math.floor(random() * 4);

    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y > radius * radius) continue;

        if (random() > 0.2) {
          const tile = tiles[centerY + y]?.[centerX + x];

          if (tile && tile.terrain === TERRAIN.grass) {
            tile.terrain = TERRAIN.forest;
          }
        }
      }
    }
  }

  // Mountain ranges.
  const mountainCenters = [
    { x: 28, y: 22 },
    { x: 75, y: 18 },
    { x: 76, y: 76 },
    { x: 22, y: 82 }
  ];

  for (const center of mountainCenters) {
    for (let y = -5; y <= 5; y++) {
      for (let x = -7; x <= 7; x++) {
        const distance = (x * x) / 49 + (y * y) / 25;

        if (distance < 1 && random() > 0.15) {
          const tile = tiles[center.y + y]?.[center.x + x];

          if (tile && tile.terrain !== TERRAIN.ocean &&
              tile.terrain !== TERRAIN.river) {
            tile.terrain = TERRAIN.mountain;
          }
        }
      }
    }
  }

  // Ore deposits inside mountain ranges.
  const mountainTiles = [];

  for (const row of tiles) {
    for (const tile of row) {
      if (tile.terrain === TERRAIN.mountain) {
        mountainTiles.push(tile);
      }
    }
  }

  // Ensure both ore types exist in the starting region.
  const oreCount = Math.min(8, mountainTiles.length);

  for (let i = 0; i < oreCount; i++) {
    const tile = mountainTiles[
      Math.floor(random() * mountainTiles.length)
    ];

    tile.terrain = i % 2 === 0
      ? TERRAIN.mountain_iron
      : TERRAIN.mountain_copper;
  }

  // Guarantee a starting forest, mountain, and nearby water.
  function guaranteeTerrain(terrain, centerX, centerY) {
    for (let y = centerY - 2; y <= centerY + 2; y++) {
      for (let x = centerX - 2; x <= centerX + 2; x++) {
        setTerrain(x, y, terrain);
      }
    }
  }

  guaranteeTerrain(TERRAIN.forest, 42, 35);
  guaranteeTerrain(TERRAIN.mountain, 65, 32);

  setTerrain(64, 32, TERRAIN.mountain_copper);
  setTerrain(66, 33, TERRAIN.mountain_iron);

  // Grass touching water becomes grass_water.
  updateWaterEdges(tiles);

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    seed,
    tiles,
    start: { x: 49, y: 43 }
  };
}

export function updateWaterEdges(tiles) {
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      const tile = tiles[y][x];

      if (tile.terrain === TERRAIN.grass_water) {
        tile.terrain = TERRAIN.grass;
      }

      if (tile.terrain !== TERRAIN.grass) continue;

      const neighbors = [
        tiles[y - 1]?.[x],
        tiles[y + 1]?.[x],
        tiles[y]?.[x - 1],
        tiles[y]?.[x + 1]
      ];

      const touchesWater = neighbors.some(neighbor =>
        neighbor &&
        (
          neighbor.terrain === TERRAIN.river ||
          neighbor.terrain === TERRAIN.ocean ||
          neighbor.infrastructure?.canal
        )
      );

      if (touchesWater) {
        tile.terrain = TERRAIN.grass_water;
      }
    }
  }
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
