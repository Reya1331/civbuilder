// js/saving.js

const SAVE_KEY = "river-valley-save-v1";

export function saveGame(world, state) {
  try {
    const saveData = {
      version: 1,
      world,
      state,
      savedAt: Date.now()
    };

    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(saveData)
    );

    return true;
  } catch (error) {
    console.error("Could not save game:", error);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) return null;

    const saveData = JSON.parse(raw);

    if (
      saveData.version !== 1 ||
      !saveData.world ||
      !saveData.state
    ) {
      return null;
    }

    return {
      world: saveData.world,
      state: saveData.state
    };
  } catch (error) {
    console.error("Could not load game:", error);
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}
