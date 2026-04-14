import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSession } from "../../hooks/useGameSession";
import { useGameTimer } from "../../hooks/useGameTimer";
import { useGameEndState } from "../../hooks/useGameEndState";
import type { BasePublicState } from "../../types/gameSession";
import styles from "./LaserGamePage.module.css";

import GameEndModals from "../../components/GameEndModals/GameEndModals";
import GameChat from "../../components/GameChat/GameChat";
import GameSessionTimer from "../../components/GameSessionTimer/GameSessionTimer";

const MIRRORS_PER_PLAYER = 2;
const DRAG_TYPE = "application/x-laser-mirror";

type MirrorKind = "LeftTurn" | "RightTurn";

type Position = { x: number; y: number };

type LaserGamePlayerState = {
  playerId: string;
  isReady: boolean;
  mirrorCount: number;
  zoneIndex: number;
};

type LaserGamePublic = {
  status: "running" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  players: LaserGamePlayerState[];
  hitCheckpoints: number;
};

type PublicState = BasePublicState<LaserGamePublic>;

type PrivateDataRaw = {
  checkpoints?: unknown;
  Checkpoints?: unknown;
  mirrors?: unknown;
  Mirrors?: unknown;
  laserStart?: unknown;
  LaserStart?: unknown;
  laserDirection?: string;
  LaserDirection?: string;
  laserPath?: unknown;
  LaserPath?: unknown;
  zoneIndex?: number;
  ZoneIndex?: number;
  zoneName?: string;
  ZoneName?: string;
  zoneCells?: unknown;
  ZoneCells?: unknown;
};

type LaserStepNorm = {
  position: Position;
  axis: "Horizontal" | "Vertical";
};

type EntryEdge = "top" | "bottom" | "left" | "right";

function pickPosition(raw: unknown): Position | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const x = o.x ?? o.X;
  const y = o.y ?? o.Y;
  if (typeof x === "number" && typeof y === "number") return { x, y };
  return null;
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function normalizePlayers(raw: unknown): LaserGamePlayerState[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [...(raw as Iterable<unknown>)];
  return arr.map((item) => {
    const o = item as Record<string, unknown>;
    const playerId = String(o.playerId ?? o.PlayerId ?? "");
    const isReady = Boolean(o.isReady ?? o.IsReady);
    const mirrorCount = Number(o.mirrorCount ?? o.MirrorCount ?? 0);
    const zoneIndex = Number(o.zoneIndex ?? o.ZoneIndex ?? 0);
    return { playerId, isReady, mirrorCount, zoneIndex };
  });
}

function normalizeAxis(raw: unknown): "Horizontal" | "Vertical" {
  if (typeof raw === "number") return raw === 1 ? "Vertical" : "Horizontal";
  if (typeof raw === "string") {
    return raw.toLowerCase() === "vertical" ? "Vertical" : "Horizontal";
  }
  return "Horizontal";
}

function normalizeLaserPath(raw: unknown): LaserStepNorm[] {
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

function normalizeCheckpoints(raw: unknown): Position[] {
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

function normalizeMirrors(raw: unknown): { position: Position; type: MirrorKind }[] {
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

function normalizeZoneCells(raw: unknown): Position[] {
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

function parseDirection(
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

function directionToEntryEdge(dir: "Up" | "Down" | "Left" | "Right"): EntryEdge {
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

function vectorToEntryEdge(dx: number, dy: number): EntryEdge {
  if (dx === 1) return "left";
  if (dx === -1) return "right";
  if (dy === 1) return "top";
  if (dy === -1) return "bottom";
  return "top";
}

function vectorToExitEdge(dx: number, dy: number): EntryEdge {
  if (dx === 1) return "right";
  if (dx === -1) return "left";
  if (dy === 1) return "bottom";
  if (dy === -1) return "top";
  return "right";
}

function edgeMidpoint(edge: EntryEdge): { x1: string; y1: string } {
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

function cellContainsCheckpoint(
  gx: number,
  gy: number,
  checkpoints: Position[],
): boolean {
  return checkpoints.some((c) => c.x === gx && c.y === gy);
}

function mirrorAtCell(
  gx: number,
  gy: number,
  mirrors: { position: Position; type: MirrorKind }[],
): { position: Position; type: MirrorKind } | undefined {
  return mirrors.find((m) => m.position.x === gx && m.position.y === gy);
}

function computeNewEntryEdges(
  path: LaserStepNorm[],
  zoneCells: Position[],
  laserStart: Position | null,
  laserDir: string | null,
): Record<string, EntryEdge> {
  const zoneSet = new Set(zoneCells.map(posKey));
  const dir = parseDirection(laserDir);
  const out: Record<string, EntryEdge> = {};

  for (let i = 0; i < path.length; i++) {
    const curr = path[i].position;
    if (!zoneSet.has(posKey(curr))) continue;

    const key = posKey(curr);

    if (i > 0) {
      const prev = path[i - 1].position;
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      if (dx !== 0 || dy !== 0) {
        out[key] = vectorToEntryEdge(dx, dy);
      }
    } else if (laserStart && posEqual(laserStart, curr) && dir) {
      out[key] = directionToEntryEdge(dir);
    }
    break;
  }
  return out;
}

export default function LasersGamePage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();

  const nickname = sessionStorage.getItem("nickname");
  const playerId = sessionStorage.getItem("playerId");

  const { publicState, privateData, error, setError } = useGameSession<
    PublicState,
    PrivateDataRaw
  >({
    sessionCode,
    nickname,
    playerId,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLaserPath, setShowLaserPath] = useState(true);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const lastPathSignatureRef = useRef<string>("");
  const [persistentEntryEdges, setPersistentEntryEdges] = useState<
    Record<string, EntryEdge>
  >({});

  const hasStarted = publicState?.hasStarted === true;
  const gameStateRaw = hasStarted ? (publicState?.game ?? null) : null;

  const gameState = useMemo((): LaserGamePublic | null => {
    if (!gameStateRaw) return null;
    const g = gameStateRaw as LaserGamePublic & {
      Status?: string;
      Attempts?: number;
      MaxAttempts?: number;
      HitCheckpoints?: number;
      Players?: unknown;
    };
    const statusRaw = (g.status ?? g.Status ?? "running") as string;
    const status =
      statusRaw === "failed" || statusRaw === "completed"
        ? statusRaw
        : "running";
    return {
      status,
      attempts: Number(g.attempts ?? g.Attempts ?? 0),
      maxAttempts: Number(g.maxAttempts ?? g.MaxAttempts ?? 3),
      players: normalizePlayers(g.players ?? g.Players),
      hitCheckpoints: Number(g.hitCheckpoints ?? g.HitCheckpoints ?? 0),
    };
  }, [gameStateRaw]);

  const isGameRunning = gameState?.status === "running";

  const {
    timerRemainingSeconds,
    timerStartedAtUtc,
    timerEndsAtUtc,
    hasTimedOut,
    isGameTimeOver,
    handleTimerExpired,
  } = useGameTimer({
    sessionCode,
    hasStarted,
    isGameRunning,
    publicState,
    setError,
  });

  const {
    hasGameEnded,
    showWinModal,
    showLoseModal,
    showLoseTimeModal,
    dismissEndModal,
    reopenEndModal,
  } = useGameEndState({
    gameStatus: gameState?.status ?? null,
    isGameTimeOver,
  });

  const gamePlayers = useMemo(
    () => normalizePlayers(gameState?.players),
    [gameState?.players],
  );

  const normalizedPrivate = useMemo(() => {
    const p = privateData;
    if (!p || !hasStarted) {
      return {
        checkpoints: [] as Position[],
        mirrors: [] as { position: Position; type: MirrorKind }[],
        laserStart: null as Position | null,
        laserDirection: null as string | null,
        laserPath: [] as LaserStepNorm[],
        zoneIndex: 0,
        zoneName: "",
        zoneCells: [] as Position[],
      };
    }

    const checkpoints = normalizeCheckpoints(p.checkpoints ?? p.Checkpoints);
    const mirrors = normalizeMirrors(p.mirrors ?? p.Mirrors);
    const laserStart = pickPosition(p.laserStart ?? p.LaserStart);
    const laserDirection = parseDirection(p.laserDirection ?? p.LaserDirection);
    const laserPath = normalizeLaserPath(p.laserPath ?? p.LaserPath);
    const zoneIndex = Number(p.zoneIndex ?? p.ZoneIndex ?? 0);
    const zoneName = String(p.zoneName ?? p.ZoneName ?? "");
    const zoneCells = normalizeZoneCells(p.zoneCells ?? p.ZoneCells);

    return {
      checkpoints,
      mirrors,
      laserStart,
      laserDirection,
      laserPath,
      zoneIndex,
      zoneName,
      zoneCells,
    };
  }, [privateData, hasStarted]);

  const zoneOrigin = useMemo(() => {
    const cells = normalizedPrivate.zoneCells;
    if (cells.length === 0) return { x: 0, y: 0 };
    return {
      x: Math.min(...cells.map((c) => c.x)),
      y: Math.min(...cells.map((c) => c.y)),
    };
  }, [normalizedPrivate.zoneCells]);

  const currentPlayerGameState = useMemo(() => {
    if (!playerId) return null;
    return gamePlayers.find((p) => p.playerId === playerId) ?? null;
  }, [gamePlayers, playerId]);

  const isReady = currentPlayerGameState?.isReady ?? false;
  const mirrorCountPublic = currentPlayerGameState?.mirrorCount ?? 0;
  const mirrorCount =
    normalizedPrivate.mirrors.length > 0
      ? normalizedPrivate.mirrors.length
      : mirrorCountPublic;

  const attempts = gameState?.attempts ?? 0;
  const maxAttempts = gameState?.maxAttempts ?? 3;
  const attemptsLeft = Math.max(0, maxAttempts - attempts);

  const isInteractionLocked = !hasStarted || !isGameRunning || hasTimedOut;

  useEffect(() => {
    const path = normalizedPrivate.laserPath;
    const sig = JSON.stringify(
      path.map((s) => [s.position.x, s.position.y, s.axis]),
    );
    if (path.length > 0) {
      if (sig !== lastPathSignatureRef.current) {
        lastPathSignatureRef.current = sig;
      }
      // Always show when we have a path: mirror placement sets visibility false;
      // if the next path matches the previous signature, we must still turn it on.
      setShowLaserPath(true);
    }
    if (path.length === 0) {
      lastPathSignatureRef.current = "";
    }
  }, [normalizedPrivate.laserPath]);

  useEffect(() => {
    if (normalizedPrivate.zoneCells.length === 0) return;

    const zoneSet = new Set(normalizedPrivate.zoneCells.map(posKey));

    if (normalizedPrivate.laserPath.length > 0) {
      const added = computeNewEntryEdges(
        normalizedPrivate.laserPath,
        normalizedPrivate.zoneCells,
        normalizedPrivate.laserStart,
        normalizedPrivate.laserDirection,
      );
      if (Object.keys(added).length > 0) {
        setPersistentEntryEdges((prev) => ({ ...prev, ...added }));
      }
      return;
    }

    if (
      normalizedPrivate.laserStart &&
      normalizedPrivate.laserDirection &&
      zoneSet.has(posKey(normalizedPrivate.laserStart))
    ) {
      const edge = directionToEntryEdge(normalizedPrivate.laserDirection as "Up" | "Down" | "Left" | "Right");
      const key = posKey(normalizedPrivate.laserStart);
      setPersistentEntryEdges((prev) => ({ ...prev, [key]: edge }));
    }
  }, [
    normalizedPrivate.laserPath,
    normalizedPrivate.zoneCells,
    normalizedPrivate.laserStart,
    normalizedPrivate.laserDirection,
  ]);

  const submitAction = useCallback(
    async (type: string, data: object) => {
      if (!sessionCode) return;
      const connection = await startConnection();
      await connection.invoke("SubmitAction", sessionCode, { type, data });
    },
    [sessionCode],
  );

  const handlePlaceMirror = async (
    localX: number,
    localY: number,
    mirrorType: MirrorKind,
  ) => {
    if (
      !sessionCode ||
      !gameState ||
      isInteractionLocked ||
      isReady ||
      isSubmitting ||
      mirrorCount >= MIRRORS_PER_PLAYER
    ) {
      return;
    }

    const gx = zoneOrigin.x + localX;
    const gy = zoneOrigin.y + localY;

    if (mirrorAtCell(gx, gy, normalizedPrivate.mirrors)) {
      return;
    }

    try {
      setIsSubmitting(true);
      setShowLaserPath(false);
      await submitAction("place_mirror", {
        x: gx,
        y: gy,
        type: mirrorType,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to place mirror.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMirror = async (localX: number, localY: number) => {
    if (!sessionCode || !gameState || isInteractionLocked || isReady || isSubmitting) {
      return;
    }

    const gx = zoneOrigin.x + localX;
    const gy = zoneOrigin.y + localY;

    try {
      setIsSubmitting(true);
      setShowLaserPath(false);
      await submitAction("remove_mirror", { x: gx, y: gy });
    } catch (err) {
      console.error(err);
      setError("Failed to remove mirror.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadyToggle = async () => {
    if (!sessionCode || isSubmitting || !gameState || isInteractionLocked) {
      return;
    }

    try {
      setIsSubmitting(true);
      await submitAction("set_ready", { isReady: !isReady });
    } catch (err) {
      console.error(err);
      setError("Failed to update ready state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPaletteDragStart = (e: React.DragEvent, mirrorType: MirrorKind) => {
    if (
      isInteractionLocked ||
      isReady ||
      mirrorCount >= MIRRORS_PER_PLAYER
    ) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(DRAG_TYPE, mirrorType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const renderLaserInCell = (gx: number, gy: number) => {
    if (!showLaserPath) return null;

    const path = normalizedPrivate.laserPath;
    const indices: number[] = [];
    for (let i = 0; i < path.length; i++) {
      const p = path[i].position;
      if (p.x === gx && p.y === gy) indices.push(i);
    }
    if (indices.length === 0) return null;

    const segments = indices.map((idx) => {
      const curr = path[idx].position;
      const prev = idx > 0 ? path[idx - 1].position : null;
      const next =
        idx + 1 < path.length ? path[idx + 1].position : null;

      let entry: EntryEdge;
      if (prev && !posEqual(prev, curr)) {
        entry = vectorToEntryEdge(curr.x - prev.x, curr.y - prev.y);
      } else {
        const d = parseDirection(normalizedPrivate.laserDirection);
        entry = d ? directionToEntryEdge(d) : "top";
      }

      const { x1: ex, y1: ey } = edgeMidpoint(entry);

      let exitLine: ReactNode = null;
      if (next && !posEqual(next, curr)) {
        const exit = vectorToExitEdge(next.x - curr.x, next.y - curr.y);
        const { x1: nx, y1: ny } = edgeMidpoint(exit);
        exitLine = (
          <line
            x1="50"
            y1="50"
            x2={nx}
            y2={ny}
            stroke="#3b82f6"
            strokeWidth="6"
            strokeLinecap="square"
          />
        );
      }

      return (
        <Fragment key={`laser-seg-${gx}-${gy}-${idx}`}>
          <line
            x1={ex}
            y1={ey}
            x2="50"
            y2="50"
            stroke="#3b82f6"
            strokeWidth="6"
            strokeLinecap="square"
          />
          {exitLine}
        </Fragment>
      );
    });

    return (
      <svg
        className={styles.cellLaserSvg}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {segments}
      </svg>
    );
  };

  const renderEntryMarker = (gx: number, gy: number) => {
    const key = posKey({ x: gx, y: gy });
    const edge = persistentEntryEdges[key];
    if (!edge) return null;
    const cls =
      edge === "top"
        ? styles.entryTop
        : edge === "bottom"
          ? styles.entryBottom
          : edge === "left"
            ? styles.entryLeft
            : styles.entryRight;
    return <div className={`${styles.entryMarker} ${cls}`} aria-hidden />;
  };

  const zoneIndicatorActiveIndex = normalizedPrivate.zoneIndex;

  const localCells: { lx: number; ly: number; gx: number; gy: number }[] = [
    { lx: 0, ly: 0, gx: zoneOrigin.x, gy: zoneOrigin.y },
    { lx: 1, ly: 0, gx: zoneOrigin.x + 1, gy: zoneOrigin.y },
    { lx: 0, ly: 1, gx: zoneOrigin.x, gy: zoneOrigin.y + 1 },
    { lx: 1, ly: 1, gx: zoneOrigin.x + 1, gy: zoneOrigin.y + 1 },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.playersPanel}>
          <h2 className={styles.panelTitle}>Players</h2>

          {publicState?.players?.length ? (
            <ul className={styles.playerList}>
              {publicState.players.map((player) => {
                const gamePlayer = gamePlayers.find(
                  (p) => p.playerId === player.playerId,
                );

                return (
                  <li
                    key={player.playerId}
                    className={`${styles.playerItem} ${
                      gamePlayer?.isReady ? styles.playerItemReady : ""
                    }`}
                  >
                    <div className={styles.playerNameRow}>
                      <span>{player.nickname}</span>
                      {!player.isConnected && (
                        <span className={styles.disconnectedTag}>
                          Disconnected
                        </span>
                      )}
                    </div>

                    {hasStarted && gamePlayer && (
                      <div className={styles.playerMeta}>
                        <span>
                          {gamePlayer.isReady ? "Ready" : "Not ready"}
                        </span>
                        <span>Mirrors: {gamePlayer.mirrorCount}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.empty}>No players found.</p>
          )}
        </aside>

        <main className={styles.gamePanel}>
          <div className={styles.topBar}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Lasers</h1>

              {hasGameEnded && (
                <button
                  type="button"
                  className={styles.reportModalButton}
                  onClick={() => reopenEndModal()}
                >
                  View end modal
                </button>
              )}
            </div>

            {hasStarted && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {isGameRunning && (
                  <GameSessionTimer
                    key={`${sessionCode ?? "session"}-${publicState?.hasStarted ? "started" : "waiting"}`}
                    remainingSeconds={timerRemainingSeconds}
                    startedAtUtc={timerStartedAtUtc}
                    endsAtUtc={timerEndsAtUtc}
                    isRunning={!hasTimedOut}
                    onExpired={handleTimerExpired}
                  />
                )}

                {gameState && (
                  <div className={styles.attemptsBadge}>
                    Attempts left: {attemptsLeft}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.line} />

          {!hasStarted || !gameState ? (
            <div>
              <h2 className={styles.sectionTitle}>Waiting room</h2>
              <p className={styles.empty}>Waiting for the game to start.</p>
            </div>
          ) : (
            <>
              <div className={styles.selectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Your zone</h2>
                  {normalizedPrivate.zoneName ? (
                    <p
                      style={{
                        margin: 0,
                        color: "#94a3b8",
                        fontWeight: 600,
                        textAlign: "start",
                      }}
                    >
                      {normalizedPrivate.zoneName.replace(/-/g, " ")}
                      <>
                        {" "}
                        &middot; Checkpoints hit: {gameState.hitCheckpoints} / 8
                      </>
                    </p>
                  ) : null}
                </div>

                <button
                  className={`${styles.readyButton} ${
                    isReady
                      ? styles.readyButtonUnready
                      : styles.readyButtonReady
                  }`}
                  onClick={handleReadyToggle}
                  disabled={isSubmitting || isInteractionLocked}
                >
                  {isReady ? "Unready" : "Ready"}
                </button>
              </div>

              <div className={styles.gridContainer}>
                <div className={styles.gameGrid}>
                  {localCells.map(({ lx, ly, gx, gy }) => {
                    const cellKey = `${lx}-${ly}`;
                    const cp = cellContainsCheckpoint(
                      gx,
                      gy,
                      normalizedPrivate.checkpoints,
                    );
                    const mir = mirrorAtCell(gx, gy, normalizedPrivate.mirrors);
                    const dropHighlight = dropTarget === cellKey;

                    return (
                      <div
                        key={cellKey}
                        className={`${styles.gridCell} ${
                          dropHighlight ? styles.gridCellDropOver : ""
                        }`}
                        onDragOver={(e) => {
                          if (
                            isInteractionLocked ||
                            isReady ||
                            mir ||
                            mirrorCount >= MIRRORS_PER_PLAYER
                          ) {
                            return;
                          }
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                          setDropTarget(cellKey);
                        }}
                        onDragLeave={() => {
                          setDropTarget((t) => (t === cellKey ? null : t));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDropTarget(null);
                          const t = e.dataTransfer.getData(DRAG_TYPE) as MirrorKind;
                          if (t !== "LeftTurn" && t !== "RightTurn") return;
                          void handlePlaceMirror(lx, ly, t);
                        }}
                      >
                        {renderEntryMarker(gx, gy)}
                        {cp ? <div className={styles.checkpoint} /> : null}
                        {renderLaserInCell(gx, gy)}
                        {mir ? (
                          <>
                            <div
                              className={`${styles.mirror} ${
                                mir.type === "LeftTurn"
                                  ? styles.mirrorLeftTurn
                                  : styles.mirrorRightTurn
                              }`}
                            />
                            <button
                              type="button"
                              className={styles.mirrorRemoveBtn}
                              title="Remove mirror"
                              disabled={
                                isInteractionLocked || isReady || isSubmitting
                              }
                              onClick={(ev) => {
                                ev.stopPropagation();
                                void handleRemoveMirror(lx, ly);
                              }}
                            >
                              ×
                            </button>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.paletteRow}>
                  <p className={styles.paletteLabel}>Drag a mirror into a cell</p>
                  <div className={styles.paletteMirrors}>
                    <div
                      className={`${styles.paletteMirror} ${
                        isInteractionLocked ||
                        isReady ||
                        mirrorCount >= MIRRORS_PER_PLAYER
                          ? styles.paletteMirrorDisabled
                          : ""
                      }`}
                      draggable={
                        !isInteractionLocked &&
                        !isReady &&
                        mirrorCount < MIRRORS_PER_PLAYER
                      }
                      onDragStart={(e) => onPaletteDragStart(e, "LeftTurn")}
                    >
                      <div className={styles.paletteMirrorPreview}>
                        <div
                          className={`${styles.paletteLine} ${styles.mirrorLeftTurn}`}
                        />
                      </div>
                      <span className={styles.paletteMirrorCaption}>
                        Left turn
                      </span>
                    </div>
                    <div
                      className={`${styles.paletteMirror} ${
                        isInteractionLocked ||
                        isReady ||
                        mirrorCount >= MIRRORS_PER_PLAYER
                          ? styles.paletteMirrorDisabled
                          : ""
                      }`}
                      draggable={
                        !isInteractionLocked &&
                        !isReady &&
                        mirrorCount < MIRRORS_PER_PLAYER
                      }
                      onDragStart={(e) => onPaletteDragStart(e, "RightTurn")}
                    >
                      <div className={styles.paletteMirrorPreview}>
                        <div
                          className={`${styles.paletteLine} ${styles.mirrorRightTurn}`}
                        />
                      </div>
                      <span className={styles.paletteMirrorCaption}>
                        Right turn
                      </span>
                    </div>
                  </div>

                  <div className={styles.zoneIndicatorWrap}>
                    <p className={styles.zoneIndicatorLabel}>Your quadrant</p>
                    <div className={styles.zoneIndicator}>
                      {[0, 1, 2, 3].map((zi) => (
                        <div
                          key={zi}
                          className={`${styles.zoneIndicatorCell} ${
                            zi === zoneIndicatorActiveIndex
                              ? styles.zoneIndicatorActive
                              : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </main>

        <aside className={styles.chatPanel}>
          <GameChat sessionCode={sessionCode!} playerId={playerId!} />
        </aside>
      </div>

      <GameEndModals
        showWinModal={showWinModal}
        showLoseModal={showLoseModal}
        showLoseTimeModal={showLoseTimeModal}
        onDismiss={dismissEndModal}
        onViewReport={() => navigate(`/report`)}
        winTitle="All checkpoints hit!"
        winMessage="Your team guided the laser through every checkpoint. Great teamwork."
        loseTitle="No attempts left"
        loseMessage="The team ran out of attempts. You can close this window for now."
        timeoutTitle="You ran out of time"
        timeoutMessage="The laser game ended because time ran out."
      />
    </div>
  );
}
