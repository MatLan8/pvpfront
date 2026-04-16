import type { EntryEdge, LaserStepNorm } from "./types";
import {
  directionToEntryEdge,
  posEqual,
  vectorToEntryEdge,
  vectorToExitEdge,
} from "./laserGeometry";

export function findPathIndicesForCell(
  path: LaserStepNorm[],
  gx: number,
  gy: number,
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i].position;
    if (p.x === gx && p.y === gy) indices.push(i);
  }
  return indices;
}

export type SegmentEntryExit = {
  entry: EntryEdge;
  exit: EntryEdge | null;
};

export function getSegmentEntryExit(
  path: LaserStepNorm[],
  idx: number,
  laserDirection: "Up" | "Down" | "Left" | "Right" | null,
): SegmentEntryExit {
  const curr = path[idx].position;
  const prev = idx > 0 ? path[idx - 1].position : null;
  const next = idx + 1 < path.length ? path[idx + 1].position : null;

  let entry: EntryEdge;
  if (prev && !posEqual(prev, curr)) {
    entry = vectorToEntryEdge(curr.x - prev.x, curr.y - prev.y);
  } else {
    entry = laserDirection ? directionToEntryEdge(laserDirection) : "top";
  }

  let exit: EntryEdge | null = null;
  if (next && !posEqual(next, curr)) {
    exit = vectorToExitEdge(next.x - curr.x, next.y - curr.y);
  }

  return { entry, exit };
}
