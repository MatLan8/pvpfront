import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSession } from "../../hooks/useGameSession";
import styles from "./ConnectionsGamePage.module.css";

import GameChat from "../../components/GameChat/GameChat";
import GameSessionTimer from "../../components/GameSessionTimer/GameSessionTimer";

type PublicPlayer = {
  playerId: string;
  nickname: string;
  isConnected: boolean;
};

type GamePlayerState = {
  playerId: string;
  isReady: boolean;
  selectedCount: number;
};

type SolvedGroup = {
  name: string;
  words: string[];
};

type PublicState = {
  sessionCode: string;
  playerCount: number;
  players: PublicPlayer[];
  hasStarted: boolean;
  remainingSeconds?: number;
  RemainingSeconds?: number;
  timerStartedAtUtc?: string;
  TimerStartedAtUtc?: string;
  timerEndsAtUtc?: string;
  TimerEndsAtUtc?: string;
  game: {
    status: "running" | "completed" | "failed";
    mistakeCount: number;
    maxMistakes: number;
    solvedGroups: SolvedGroup[];
    players: GamePlayerState[];
  } | null;
};

type PrivateData = {
  visibleWords?: string[];
  VisibleWords?: string[];
  selectedWords?: string[];
  SelectedWords?: string[];
};

type TimerUpdatedPayload = {
  remainingSeconds?: number;
  RemainingSeconds?: number;
  timerStartedAtUtc?: string;
  TimerStartedAtUtc?: string;
  timerEndsAtUtc?: string;
  TimerEndsAtUtc?: string;
};

export default function ConnectionsGamePage() {
  const { sessionCode } = useParams();

  const nickname = sessionStorage.getItem("nickname");
  const playerId = sessionStorage.getItem("playerId");

  const { publicState, privateData, error, setError } = useGameSession<
    PublicState,
    PrivateData
  >({
    sessionCode,
    nickname,
    playerId,
  });

  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverRemainingSeconds, setServerRemainingSeconds] = useState<number | null>(null);
  const [serverTimerStartedAtUtc, setServerTimerStartedAtUtc] = useState<string | null>(null);
  const [serverTimerEndsAtUtc, setServerTimerEndsAtUtc] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const hasStarted = publicState?.hasStarted === true;
  const gameState = hasStarted ? publicState?.game ?? null : null;
  const isGameRunning = gameState?.status === "running";

  const timerRemainingSecondsFromState =
    publicState?.remainingSeconds ?? publicState?.RemainingSeconds ?? null;

  const timerStartedAtUtcFromState =
    publicState?.timerStartedAtUtc ?? publicState?.TimerStartedAtUtc ?? null;

  const timerEndsAtUtcFromState =
    publicState?.timerEndsAtUtc ?? publicState?.TimerEndsAtUtc ?? null;

  const timerRemainingSeconds =
    serverRemainingSeconds ?? timerRemainingSecondsFromState;

  const timerStartedAtUtc =
    serverTimerStartedAtUtc ?? timerStartedAtUtcFromState;

  const timerEndsAtUtc =
    serverTimerEndsAtUtc ?? timerEndsAtUtcFromState;

  const currentPlayerGameState = useMemo(() => {
    if (!gameState || !playerId) return null;
    return gameState.players.find((p) => p.playerId === playerId) ?? null;
  }, [gameState, playerId]);

  const visibleWords = useMemo(() => {
    if (!hasStarted) return [];
    return privateData?.visibleWords ?? privateData?.VisibleWords ?? [];
  }, [hasStarted, privateData]);

  const backendSelectedWords = useMemo(() => {
    if (!hasStarted) return [];
    return privateData?.selectedWords ?? privateData?.SelectedWords ?? [];
  }, [hasStarted, privateData]);

  const isReady = currentPlayerGameState?.isReady ?? false;
  const mistakesLeft =
    gameState != null ? gameState.maxMistakes - gameState.mistakeCount : null;

  const isInteractionLocked = !hasStarted || !isGameRunning || hasTimedOut;

  const fetchRemainingTime = useCallback(async () => {
    if (!sessionCode || !hasStarted || !isGameRunning) return;

    try {
      const connection = await startConnection();
      const remaining = await connection.invoke("GetRemainingTime", sessionCode);

      if (typeof remaining === "number") {
        const safeRemaining = Math.max(0, remaining);
        setServerRemainingSeconds(safeRemaining);

        if (safeRemaining <= 0) {
          setHasTimedOut(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [sessionCode, hasStarted, isGameRunning]);

  const handleTimerExpired = useCallback(() => {
    setHasTimedOut(true);
    setServerRemainingSeconds(0);
    setError("Time is up. Waiting for the server to finalize the match.");
  }, [setError]);

  useEffect(() => {
    setSelectedWords(backendSelectedWords);
  }, [backendSelectedWords]);

  useEffect(() => {
    const filteredSelections = selectedWords.filter((word) =>
      visibleWords.includes(word),
    );

    if (filteredSelections.length !== selectedWords.length) {
      setSelectedWords(filteredSelections);
    }
  }, [visibleWords, selectedWords]);

  useEffect(() => {
    if (!hasStarted) {
      setHasTimedOut(false);
      setServerRemainingSeconds(null);
      setServerTimerStartedAtUtc(null);
      setServerTimerEndsAtUtc(null);
      setSelectedWords([]);
      return;
    }

    if (!isGameRunning) {
      setHasTimedOut(false);
    }
  }, [hasStarted, isGameRunning]);

  useEffect(() => {
    if (!sessionCode) return;

    let isMounted = true;
    let dispose: (() => void) | undefined;

    const bindRealtimeEvents = async () => {
      try {
        const connection = await startConnection();

        const handleTimerUpdated = (payload: TimerUpdatedPayload) => {
          if (!isMounted) return;

          const nextRemaining =
            payload?.remainingSeconds ?? payload?.RemainingSeconds ?? null;
          const nextStartedAt =
            payload?.timerStartedAtUtc ?? payload?.TimerStartedAtUtc ?? null;
          const nextEndsAt =
            payload?.timerEndsAtUtc ?? payload?.TimerEndsAtUtc ?? null;

          if (typeof nextRemaining === "number") {
            const safeRemaining = Math.max(0, nextRemaining);
            setServerRemainingSeconds(safeRemaining);

            if (safeRemaining <= 0) {
              setHasTimedOut(true);
            }
          }

          if (typeof nextStartedAt === "string") {
            setServerTimerStartedAtUtc(nextStartedAt);
          }

          if (typeof nextEndsAt === "string") {
            setServerTimerEndsAtUtc(nextEndsAt);
          }
        };

        const handleGameTimedOut = () => {
          if (!isMounted) return;
          setHasTimedOut(true);
          setServerRemainingSeconds(0);
          setError("Time is up. Game finished.");
        };

        const handleGameCompleted = () => {
          if (!isMounted) return;
          setHasTimedOut(false);
        };

        const handleGameFailed = () => {
          if (!isMounted) return;
          setHasTimedOut(false);
        };

        connection.off("TimerUpdated");
        connection.off("GameTimedOut");
        connection.off("GameCompleted");
        connection.off("GameFailed");

        connection.on("TimerUpdated", handleTimerUpdated);
        connection.on("GameTimedOut", handleGameTimedOut);
        connection.on("GameCompleted", handleGameCompleted);
        connection.on("GameFailed", handleGameFailed);

        dispose = () => {
          connection.off("TimerUpdated", handleTimerUpdated);
          connection.off("GameTimedOut", handleGameTimedOut);
          connection.off("GameCompleted", handleGameCompleted);
          connection.off("GameFailed", handleGameFailed);
        };
      } catch (err) {
        console.error(err);
      }
    };

    void bindRealtimeEvents();

    return () => {
      isMounted = false;
      dispose?.();
    };
  }, [sessionCode, setError]);

  useEffect(() => {
    if (!hasStarted || !isGameRunning) return;

    void fetchRemainingTime();

    const intervalId = window.setInterval(() => {
      void fetchRemainingTime();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasStarted, isGameRunning, fetchRemainingTime]);

  const toggleWordSelection = async (word: string) => {
    if (
      !sessionCode ||
      !gameState ||
      isInteractionLocked ||
      isReady ||
      isSubmitting
    ) {
      return;
    }

    const nextSelection = selectedWords.includes(word)
      ? selectedWords.filter((w) => w !== word)
      : [...selectedWords, word];

    setSelectedWords(nextSelection);

    try {
      setIsSubmitting(true);
      const connection = await startConnection();

      await connection.invoke("SubmitAction", sessionCode, {
        type: "set_selection",
        data: {
          words: nextSelection,
        },
      });
    } catch (err) {
      console.error(err);
      setError("Failed to update selection.");
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
      const connection = await startConnection();

      await connection.invoke("SubmitAction", sessionCode, {
        type: "set_ready",
        data: {
          isReady: !isReady,
        },
      });
    } catch (err) {
      console.error(err);
      setError("Failed to update ready state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.playersPanel}>
          <h2 className={styles.panelTitle}>Players</h2>

          {publicState?.players?.length ? (
            <ul className={styles.playerList}>
              {publicState.players.map((player) => {
                const gamePlayer = gameState?.players.find(
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
                        <span>{gamePlayer.isReady ? "Ready" : "Not ready"}</span>
                        <span>Selected: {gamePlayer.selectedCount}</span>
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
            <h1 className={styles.title}>Connections</h1>

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
                  <div className={styles.mistakesBadge}>
                    Mistakes left: {mistakesLeft}
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
                <h2 className={styles.sectionTitle}>Your remaining words</h2>

                <button
                  className={`${styles.readyButton} ${
                    isReady ? styles.readyButtonUnready : styles.readyButtonReady
                  }`}
                  onClick={handleReadyToggle}
                  disabled={isSubmitting || isInteractionLocked}
                >
                  {isReady ? "Unready" : "Ready"}
                </button>
              </div>

              {visibleWords.length === 0 ? (
                <p className={styles.empty}>No words left.</p>
              ) : (
                <div className={styles.wordsGrid}>
                  {visibleWords.map((word) => {
                    const isSelected = selectedWords.includes(word);

                    return (
                      <button
                        key={word}
                        type="button"
                        className={`${styles.wordCard} ${
                          isSelected ? styles.wordCardSelected : ""
                        } ${isReady || isInteractionLocked ? styles.wordCardLocked : ""}`}
                        onClick={() => toggleWordSelection(word)}
                        disabled={isReady || isInteractionLocked}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className={styles.line} />

              {gameState?.solvedGroups?.length ? (
                <div className={styles.solvedSection}>
                  <h2 className={styles.sectionTitle}>Solved Groups</h2>

                  <div className={styles.solvedGroups}>
                    {gameState.solvedGroups.map((group, index) => (
                      <div
                        key={`${group.name}-${index}`}
                        className={`${styles.solvedGroupCard} ${
                          styles[`solvedGroupColor${index % 4}`]
                        }`}
                      >
                        <div className={styles.solvedGroupTitle}>{group.name}</div>

                        <div className={styles.solvedWordsRow}>
                          {group.words.map((word) => (
                            <span key={word} className={styles.solvedWord}>
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </main>

        <aside className={styles.chatPanel}>
          <GameChat sessionCode={sessionCode!} playerId={playerId!} />
        </aside>
      </div>
    </div>
  );
}
