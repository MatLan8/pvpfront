import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSession } from "../../hooks/useGameSession";
import styles from "./ConnectionsGamePage.module.css";

import GameChat from "../../components/GameChat/GameChat";

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

  const gameState = publicState?.game ?? null;

  const visibleWords = useMemo(() => {
    return privateData?.visibleWords ?? privateData?.VisibleWords ?? [];
  }, [privateData]);

  const backendSelectedWords = useMemo(() => {
    return privateData?.selectedWords ?? privateData?.SelectedWords ?? [];
  }, [privateData]);

  const currentPlayerGameState = useMemo(() => {
    if (!gameState || !playerId) return null;
    return gameState.players.find((p) => p.playerId === playerId) ?? null;
  }, [gameState, playerId]);

  const isReady = currentPlayerGameState?.isReady ?? false;
  const mistakesLeft =
    gameState != null ? gameState.maxMistakes - gameState.mistakeCount : null;

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

  const toggleWordSelection = async (word: string) => {
    if (!sessionCode || isReady || isSubmitting) return;

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
    if (
      !sessionCode ||
      isSubmitting ||
      !gameState ||
      gameState.status !== "running"
    ) {
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

                    {gamePlayer && (
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
            <h1 className={styles.title}>Connections</h1>

            {gameState && (
              <div className={styles.mistakesBadge}>
                Mistakes left: {mistakesLeft}
              </div>
            )}
          </div>
          <div className={styles.line} />

          <div className={styles.selectionHeader}>
            <h2 className={styles.sectionTitle}>Your remaining words</h2>

            <button
              className={`${styles.readyButton} ${
                isReady ? styles.readyButtonUnready : styles.readyButtonReady
              }`}
              onClick={handleReadyToggle}
              disabled={
                isSubmitting || !gameState || gameState.status !== "running"
              }
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
                    } ${isReady ? styles.wordCardLocked : ""}`}
                    onClick={() => toggleWordSelection(word)}
                    disabled={isReady || gameState?.status !== "running"}
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

          {error && <p className={styles.error}>{error}</p>}
        </main>

        <aside className={styles.chatPanel}>
          <GameChat sessionCode={sessionCode!} playerId={playerId!} />
        </aside>
      </div>
    </div>
  );
}
