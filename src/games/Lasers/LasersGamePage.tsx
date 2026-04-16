import {
  Fragment,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSessionContext } from "../../contexts/GameSessionContext";
import { useGameTimer } from "../../hooks/useGameTimer";
import { useGameEndState } from "../../hooks/useGameEndState";
import styles from "./LaserGamePage.module.css";

import GameEndModals from "../../components/GameEndModals/GameEndModals";
import GameChat from "../../components/GameChat/GameChat";
import GameSessionTimer from "../../components/GameSessionTimer/GameSessionTimer";

import {
  buildLaserEntryEdgeMap,
  buildLocalCells,
  cellContainsCheckpoint,
  computeZoneOrigin,
  DRAG_TYPE,
  edgeMidpoint,
  findPathIndicesForCell,
  getSegmentEntryExit,
  mirrorAtCell,
  MIRRORS_PER_PLAYER,
  normalizeLaserGamePublic,
  normalizeLasersPrivate,
  posKey,
  ZONE_NAMES,
  ZONE_SIZE,
  type LaserGamePublic,
  type MirrorKind,
  type PrivateDataRaw,
  type PublicState,
} from "./Helpers";

export default function LasersGamePage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();

  const playerId = sessionStorage.getItem("playerId");

  const {
    publicState: publicStateRaw,
    privateData: privateDataRaw,
    error,
    setError,
  } = useGameSessionContext();
  const publicState = publicStateRaw as PublicState | null;
  const privateData = privateDataRaw as PrivateDataRaw | null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const hasStarted = publicState?.hasStarted === true;
  const gameStateRaw = hasStarted ? (publicState?.game ?? null) : null;

  const gameState = useMemo(
    (): LaserGamePublic | null => normalizeLaserGamePublic(gameStateRaw),
    [gameStateRaw],
  );

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
    showLoseTimeModal,
    dismissEndModal,
    reopenEndModal,
  } = useGameEndState({
    gameStatus: gameState?.status ?? null,
    isGameTimeOver,
  });

  const gamePlayers = useMemo(
    () => gameState?.players ?? [],
    [gameState?.players],
  );

  const normalizedPrivate = useMemo(
    () => normalizeLasersPrivate(privateData, hasStarted),
    [privateData, hasStarted],
  );

  const zoneOrigin = useMemo(
    () => computeZoneOrigin(normalizedPrivate.zoneCells),
    [normalizedPrivate.zoneCells],
  );

  const currentPlayerGameState = useMemo(() => {
    if (!playerId) return null;
    return gamePlayers.find((p) => p.playerId === playerId) ?? null;
  }, [gamePlayers, playerId]);

  const mirrorCount =
    privateData && hasStarted
      ? normalizedPrivate.mirrors.length
      : (currentPlayerGameState?.mirrorCount ?? 0);

  const isInteractionLocked = !hasStarted || !isGameRunning || hasTimedOut;

  const laserEntryEdgeByCellKey = useMemo(
    () => buildLaserEntryEdgeMap(gameState, normalizedPrivate.zoneCells),
    [gameState, normalizedPrivate.zoneCells],
  );

  const zoneDisplayName = ZONE_NAMES[normalizedPrivate.zoneIndex] ?? "";

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
    if (!sessionCode || !gameState || isInteractionLocked || isSubmitting) {
      return;
    }

    const gx = zoneOrigin.x + localX;
    const gy = zoneOrigin.y + localY;

    try {
      setIsSubmitting(true);
      await submitAction("remove_mirror", { x: gx, y: gy });
    } catch (err) {
      console.error(err);
      setError("Failed to remove mirror.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPaletteDragStart = (e: React.DragEvent, mirrorType: MirrorKind) => {
    if (isInteractionLocked || mirrorCount >= MIRRORS_PER_PLAYER) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(DRAG_TYPE, mirrorType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const renderLaserInCell = (gx: number, gy: number) => {
    const path = gameState?.laserPath ?? [];
    const indices = findPathIndicesForCell(path, gx, gy);
    if (indices.length === 0) return null;

    const laserDirection = gameState?.laserDirection ?? null;

    const segments = indices.map((idx) => {
      const { entry, exit } = getSegmentEntryExit(path, idx, laserDirection);
      const { x1: ex, y1: ey } = edgeMidpoint(entry);

      let exitLine: ReactNode = null;
      if (exit) {
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
    const edge = laserEntryEdgeByCellKey[key];
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

  const localCells = useMemo(
    () => buildLocalCells(zoneOrigin, ZONE_SIZE),
    [zoneOrigin.x, zoneOrigin.y],
  );

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
                  <li key={player.playerId} className={styles.playerItem}>
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
                          const t = e.dataTransfer.getData(
                            DRAG_TYPE,
                          ) as MirrorKind;
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
                              disabled={isInteractionLocked || isSubmitting}
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
                  <div className={styles.selectionHeader}>
                    <div className={styles.zoneSelectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>Your zone</h2>
                        <p
                          style={{
                            margin: 0,
                            color: "#94a3b8",
                            fontWeight: 600,
                            textAlign: "start",
                          }}
                        >
                          {zoneDisplayName ? (
                            <>{zoneDisplayName} &middot; </>
                          ) : null}
                          Checkpoints hit: {gameState.hitCheckpoints} /{" "}
                          {gameState.totalCheckpoints}
                        </p>
                      </div>
                    </div>

                    <div className={styles.zoneIndicatorWrap}>
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
                  <p className={styles.paletteLabel}>
                    Drag a mirror into a cell
                  </p>
                  <div className={styles.paletteMirrors}>
                    <div
                      className={`${styles.paletteMirror} ${
                        isInteractionLocked || mirrorCount >= MIRRORS_PER_PLAYER
                          ? styles.paletteMirrorDisabled
                          : ""
                      }`}
                      draggable={
                        !isInteractionLocked && mirrorCount < MIRRORS_PER_PLAYER
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
                        isInteractionLocked || mirrorCount >= MIRRORS_PER_PLAYER
                          ? styles.paletteMirrorDisabled
                          : ""
                      }`}
                      draggable={
                        !isInteractionLocked && mirrorCount < MIRRORS_PER_PLAYER
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
        showLoseModal={false}
        showLoseTimeModal={showLoseTimeModal}
        onDismiss={dismissEndModal}
        onViewReport={() => navigate(`/report`)}
        winTitle="All checkpoints hit!"
        winMessage="Your team guided the laser through every checkpoint. Great teamwork."
        loseTitle="Game ended"
        loseMessage=""
        timeoutTitle="Time over"
        timeoutMessage="You ran out of time."
      />
    </div>
  );
}
