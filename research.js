// js/research.js

export const RESEARCH = {
  tools: {
    name: "Tools",
    branch: "Tools",
    description:
      "Develop better tools to improve farming, mining, and lumber production.",
    cost: 10,
    requires: [],
    requiresBuilding: "library",
    unlocks: {
      buildings: [],
      research: ["technology"],
      bonuses: ["improved_production"]
    }
  },

  technology: {
    name: "Technology",
    branch: "Technology",
    description:
      "Begin understanding energy and advanced mechanical systems.",
    cost: 25,
    requires: ["tools"],
    requiresBuilding: "library",
    unlocks: {
      buildings: ["waterwheel2", "windmill2"],
      research: ["science", "infrastructure"],
      bonuses: []
    }
  },

  science: {
    name: "Science",
    branch: "Science",
    description: "Unlock future scientific advancements.",
    cost: 40,
    requires: ["technology"],
    requiresBuilding: "library",
    unlocks: {
      buildings: [],
      research: [],
      bonuses: []
    }
  },

  infrastructure: {
    name: "Infrastructure",
    branch: "Infrastructure",
    description: "Unlock advanced construction and transportation.",
    cost: 40,
    requires: ["technology"],
    requiresBuilding: "library",
    unlocks: {
      buildings: [],
      research: [],
      bonuses: []
    }
  }
};

export function hasBuilding(world, buildingId) {
  return world.tiles.some(row =>
    row.some(tile => tile.buildings.main === buildingId)
  );
}

export function canResearch(world, state, researchId) {
  const research = RESEARCH[researchId];

  if (!research) {
    return { valid: false, reason: "Unknown research." };
  }

  if (state.researched.includes(researchId)) {
    return { valid: false, reason: "Already researched." };
  }

  if (!hasBuilding(world, research.requiresBuilding)) {
    return {
      valid: false,
      reason: `Requires a ${research.requiresBuilding}.`
    };
  }

  for (const requirement of research.requires) {
    if (!state.researched.includes(requirement)) {
      return {
        valid: false,
        reason: `Requires ${RESEARCH[requirement].name}.`
      };
    }
  }

  return { valid: true, reason: "Ready to research." };
}

export function startResearch(world, state, researchId) {
  const result = canResearch(world, state, researchId);

  if (!result.valid) return result;

  state.activeResearch = researchId;
  state.researchProgress = 0;

  return { valid: true, reason: "Research started." };
}

export function advanceResearch(state, amount = 1) {
  if (!state.activeResearch) return null;

  const research = RESEARCH[state.activeResearch];

  state.researchProgress += amount;

  if (state.researchProgress >= research.cost) {
    const completedId = state.activeResearch;

    state.researched.push(completedId);
    state.activeResearch = null;
    state.researchProgress = 0;

    return {
      completed: true,
      id: completedId,
      name: research.name,
      unlocks: research.unlocks
    };
  }

  return {
    completed: false,
    progress: state.researchProgress,
    cost: research.cost
  };
}

export function getResearchStatus(state) {
  if (!state.activeResearch) {
    return {
      name: null,
      progress: 0,
      cost: 0
    };
  }

  const research = RESEARCH[state.activeResearch];

  return {
    name: research.name,
    progress: state.researchProgress,
    cost: research.cost
  };
}
