import type {
  LaserGamePlayerState,
  MirrorKind,
  LaserStepNorm,
  Position,
} from "./types";

export function pickPosition(raw: unknown): Position | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const x = o.x ?? o.X;
  const y = o.y ?? o.Y;
  if (typeof x === "number" && typeof y === "number") return { x, y };
  return null;
}

export function normalizePlayers(raw: unknown): LaserGamePlayerState[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [...(raw as Iterable<unknown>)];
  return arr.map((item) => {
    const o = item as Record<string, unknown>;
    const playerId = String(o.playerId ?? o.PlayerId ?? "");
    const mirrorCount = Number(o.mirrorCount ?? o.MirrorCount ?? 0);
    const zoneIndex = Number(o.zoneIndex ?? o.ZoneIndex ?? 0);
    return { playerId, mirrorCount, zoneIndex };
  });
}

function normalizeAxis(raw: unknown): "Horizontal" | "Vertical" {
  if (typeof raw === "number") return raw === 1 ? "Vertical" : "Horizontal";
  if (typeof raw === "string") {
    return raw.toLowerCase() === "vertical" ? "Vertical" : "Horizontal";
  }
  return "Horizontal";
}

export function normalizeLaserPath(raw: unknown): LaserStepNorm[] {
  if (!Array.isArray(raw)) return [];
  const out: LaserStepNorm[] = [];
  for (const step of raw) {
    if (!step || typeof step !== "object") continue;
    const o = step as Record<string, unknown>;
    const pos = pickPosition(o.position ?? o.Position);
    if (!pos) continue;
    const axisRaw = o.axis ?? o.Axis;
    out.push({ position: pos, axis: normalizeAxis(axisRaw) });
  }
  return out;
}

export function normalizeCheckpoints(raw: unknown): Position[] {
  if (!Array.isArray(raw)) return [];
  const out: Position[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const p = pickPosition(o.position ?? o.Position);
    if (p) out.push(p);
  }
  return out;
}

function normalizeMirrorType(raw: unknown): MirrorKind | null {
  if (typeof raw === "number") {
    if (raw === 1) return "LeftTurn";
    if (raw === 2) return "RightTurn";
    return null;
  }
  const s = String(raw);
  if (s === "LeftTurn" || s === "RightTurn") return s;
  return null;
}

export function normalizeMirrors(
  raw: unknown,
): { position: Position; type: MirrorKind }[] {
  if (!Array.isArray(raw)) return [];
  const out: { position: Position; type: MirrorKind }[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const p = pickPosition(o.position ?? o.Position);
    if (!p) continue;
    const t = normalizeMirrorType(o.type ?? o.Type);
    if (t) out.push({ position: p, type: t });
  }
  return out;
}

export function normalizeZoneCells(raw: unknown): Position[] {
  if (!Array.isArray(raw)) return [];
  const out: Position[] = [];
  for (const c of raw) {
    const p = pickPosition(c);
    if (p) out.push(p);
  }
  return out;
}

const DIRECTION_BY_INDEX: Record<number, "Up" | "Down" | "Left" | "Right"> = {
  0: "Up",
  1: "Down",
  2: "Left",
  3: "Right",
};

export function parseDirection(
  d: unknown,
): "Up" | "Down" | "Left" | "Right" | null {
  if (d == null) return null;
  if (typeof d === "number") return DIRECTION_BY_INDEX[d] ?? null;
  if (typeof d === "string") {
    const u = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
    if (u === "Up" || u === "Down" || u === "Left" || u === "Right") return u;
  }
  return null;
}
