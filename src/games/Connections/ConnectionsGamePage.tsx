import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSession } from "../../hooks/useGameSession";
import { useGameTimer } from "../../hooks/useGameTimer";
import { useGameEndState } from "../../hooks/useGameEndState";
import type { BasePublicState } from "../../types/gameSession";
import styles from "./ConnectionsGamePage.module.css";

import GameEndModals from "../../components/GameEndModals/GameEndModals";
import GameChat from "../../components/GameChat/GameChat";
import GameSessionTimer from "../../components/GameSessionTimer/GameSessionTimer";

type GamePlayerState = {
  playerId: string;
  isReady: boolean;
  selectedCount: number;
};

type SolvedGroup = {
  name: string;
  words: string[];
};

type ConnectionsGame = {
  status: "running" | "completed" | "failed";
  mistakeCount: number;
  maxMistakes: number;
  solvedGroups: SolvedGroup[];
  players: GamePlayerState[];
};

type PublicState = BasePublicState<ConnectionsGame>;

type PrivateData = {
  visibleWords?: string[];
  VisibleWords?: string[];
  selectedWords?: string[];
  SelectedWords?: string[];
};

export default function ConnectionsGamePage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();

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

  const hasStarted = publicState?.hasStarted === true;
  const gameState = hasStarted ? (publicState?.game ?? null) : null;
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
      setSelectedWords([]);
    }
  }, [hasStarted]);

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
                        <span>
                          {gamePlayer.isReady ? "Ready" : "Not ready"}
                        </span>
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
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Connections</h1>

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
                        <div className={styles.solvedGroupTitle}>
                          {group.name}
                        </div>

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

      <GameEndModals
        showWinModal={showWinModal}
        showLoseModal={showLoseModal}
        showLoseTimeModal={showLoseTimeModal}
        onDismiss={dismissEndModal}
        onViewReport={() => navigate(`/report`)}
      />
    </div>
  );
}
