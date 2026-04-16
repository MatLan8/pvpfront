import type { EntryEdge, Position } from "./types";

export function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function directionToEntryEdge(
  dir: "Up" | "Down" | "Left" | "Right",
): EntryEdge {
  switch (dir) {
    case "Down":
      return "top";
    case "Up":
      return "bottom";
    case "Right":
      return "left";
    case "Left":
      return "right";
    default:
      return "top";
  }
}

export function vectorToEntryEdge(dx: number, dy: number): EntryEdge {
  if (dx === 1) return "left";
  if (dx === -1) return "right";
  if (dy === 1) return "top";
  if (dy === -1) return "bottom";
  return "top";
}

export function vectorToExitEdge(dx: number, dy: number): EntryEdge {
  if (dx === 1) return "right";
  if (dx === -1) return "left";
  if (dy === 1) return "bottom";
  if (dy === -1) return "top";
  return "right";
}

export function edgeMidpoint(edge: EntryEdge): { x1: string; y1: string } {
  switch (edge) {
    case "top":
      return { x1: "50", y1: "0" };
    case "bottom":
      return { x1: "50", y1: "100" };
    case "left":
      return { x1: "0", y1: "50" };
    case "right":
      return { x1: "100", y1: "50" };
    default:
      return { x1: "50", y1: "0" };
  }
}
