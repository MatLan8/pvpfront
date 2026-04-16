export const MIRRORS_PER_PLAYER = 3;

/** Cells per side of each player's zone (backend grid is 6x6). */
export const ZONE_SIZE = 3;

export const DRAG_TYPE = "application/x-laser-mirror";

export const ZONE_NAMES = [
  "Top left",
  "Top right",
  "Bottom left",
  "Bottom right",
] as const;
