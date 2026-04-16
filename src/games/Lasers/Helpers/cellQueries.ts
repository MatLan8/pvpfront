import type { MirrorKind, Position } from "./types";

export function cellContainsCheckpoint(
  gx: number,
  gy: number,
  checkpoints: Position[],
): boolean {
  return checkpoints.some((c) => c.x === gx && c.y === gy);
}

export function mirrorAtCell(
  gx: number,
  gy: number,
  mirrors: { position: Position; type: MirrorKind }[],
): { position: Position; type: MirrorKind } | undefined {
  return mirrors.find((m) => m.position.x === gx && m.position.y === gy);
}
