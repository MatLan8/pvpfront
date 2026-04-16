import type { BasePublicState } from "../../../types/gameSession";

export type MirrorKind = "LeftTurn" | "RightTurn";

export type Position = { x: number; y: number };

export type LaserGamePlayerState = {
  playerId: string;
  mirrorCount: number;
  zoneIndex: number;
};

export type LaserStepNorm = {
  position: Position;
  axis: "Horizontal" | "Vertical";
};

export type LaserGamePublic = {
  status: "running" | "completed" | "failed";
  players: LaserGamePlayerState[];
  hitCheckpoints: number;
  laserStart: Position | null;
  laserDirection: "Up" | "Down" | "Left" | "Right" | null;
  laserPath: LaserStepNorm[];
  totalCheckpoints: number;
};

export type PublicState = BasePublicState<LaserGamePublic>;

export type PrivateDataRaw = {
  checkpoints?: unknown;
  Checkpoints?: unknown;
  mirrors?: unknown;
  Mirrors?: unknown;
  zoneIndex?: number;
  ZoneIndex?: number;
  zoneCells?: unknown;
  ZoneCells?: unknown;
};

export type EntryEdge = "top" | "bottom" | "left" | "right";

export type NormalizedPrivate = {
  checkpoints: Position[];
  mirrors: { position: Position; type: MirrorKind }[];
  zoneIndex: number;
  zoneCells: Position[];
};

export type LocalCell = { lx: number; ly: number; gx: number; gy: number };
