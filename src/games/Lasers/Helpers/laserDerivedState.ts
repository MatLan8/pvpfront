import { directionToEntryEdge, posKey } from "./laserGeometry";
import {
  normalizeCheckpoints,
  normalizeLaserPath,
  normalizeMirrors,
  normalizePlayers,
  normalizeZoneCells,
  parseDirection,
  pickPosition,
} from "./normalizeBackend";
import type {
  EntryEdge,
  LaserGamePublic,
  LocalCell,
  NormalizedPrivate,
  Position,
  PrivateDataRaw,
} from "./types";

export function normalizeLaserGamePublic(
  gameStateRaw: unknown | null,
): LaserGamePublic | null {
  if (!gameStateRaw) return null;
  const g = gameStateRaw as Record<string, unknown>;
  const statusRaw = (g.status ?? g.Status ?? "running") as string;
  const status =
    statusRaw === "failed" || statusRaw === "completed"
      ? statusRaw
      : "running";
  const players = normalizePlayers(g.players ?? g.Players);
  const laserStart = pickPosition(g.laserStart ?? g.LaserStart);
  const laserDirection = parseDirection(g.laserDirection ?? g.LaserDirection);
  const laserPath = normalizeLaserPath(g.laserPath ?? g.LaserPath);
  const checkpointsPerPlayer = 3;
  return {
    status,
    players,
    hitCheckpoints: Number(g.hitCheckpoints ?? g.HitCheckpoints ?? 0),
    laserStart,
    laserDirection,
    laserPath,
    totalCheckpoints: players.length * checkpointsPerPlayer,
  };
}

export function normalizeLasersPrivate(
  privateData: PrivateDataRaw | null,
  hasStarted: boolean,
): NormalizedPrivate {
  if (!privateData || !hasStarted) {
    return {
      checkpoints: [],
      mirrors: [],
      zoneIndex: 0,
      zoneCells: [],
    };
  }

  const checkpoints = normalizeCheckpoints(
    privateData.checkpoints ?? privateData.Checkpoints,
  );
  const mirrors = normalizeMirrors(privateData.mirrors ?? privateData.Mirrors);
  const zoneIndex = Number(privateData.zoneIndex ?? privateData.ZoneIndex ?? 0);
  const zoneCells = normalizeZoneCells(
    privateData.zoneCells ?? privateData.ZoneCells,
  );

  return {
    checkpoints,
    mirrors,
    zoneIndex,
    zoneCells,
  };
}

export function computeZoneOrigin(zoneCells: Position[]): Position {
  if (zoneCells.length === 0) return { x: 0, y: 0 };
  return {
    x: Math.min(...zoneCells.map((c) => c.x)),
    y: Math.min(...zoneCells.map((c) => c.y)),
  };
}

export function buildLocalCells(
  zoneOrigin: Position,
  zoneSize: number,
): LocalCell[] {
  const list: LocalCell[] = [];
  for (let ly = 0; ly < zoneSize; ly++) {
    for (let lx = 0; lx < zoneSize; lx++) {
      list.push({
        lx,
        ly,
        gx: zoneOrigin.x + lx,
        gy: zoneOrigin.y + ly,
      });
    }
  }
  return list;
}

/** Entry edge for the global laser start cell when it lies in this player's zone. */
export function buildLaserEntryEdgeMap(
  gameState: LaserGamePublic | null,
  zoneCells: Position[],
): Record<string, EntryEdge> {
  const out: Record<string, EntryEdge> = {};
  if (
    !gameState?.laserStart ||
    !gameState.laserDirection ||
    zoneCells.length === 0
  ) {
    return out;
  }
  const zoneSet = new Set(zoneCells.map(posKey));
  const start = gameState.laserStart;
  if (!zoneSet.has(posKey(start))) return out;
  out[posKey(start)] = directionToEntryEdge(gameState.laserDirection);
  return out;
}
