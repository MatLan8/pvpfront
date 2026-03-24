import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
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

type PublicState = {
  sessionCode: string;
  playerCount: number;
  players: PublicPlayer[];
  hasStarted: boolean;
  game: {
    status: "running" | "completed" | "failed";
    mistakeCount: number;
    maxMistakes: number;
    solvedGroups: string[][];
    players: GamePlayerState[];
  } | null;
};

type PrivateData = {
  visibleWords?: string[];
  VisibleWords?: string[];
};

export default function ConnectionsGamePage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();

  const nickname = sessionStorage.getItem("nickname");
  const playerId = sessionStorage.getItem("playerId");

  const [publicState, setPublicState] = useState<PublicState | null>(() => {
    const stored = sessionStorage.getItem("publicState");
    return stored ? JSON.parse(stored) : null;
  });

  const [privateData, setPrivateData] = useState<PrivateData | null>(() => {
    const stored = sessionStorage.getItem("privateData");
    return stored ? JSON.parse(stored) : null;
  });

  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

  const visibleWords = useMemo(() => {
    return privateData?.visibleWords ?? privateData?.VisibleWords ?? [];
  }, [privateData]);

  const gameState = publicState?.game ?? null;

  const currentPlayerGameState = useMemo(() => {
    if (!gameState || !playerId) return null;
    return gameState.players.find((p) => p.playerId === playerId) ?? null;
  }, [gameState, playerId]);

  const isReady = currentPlayerGameState?.isReady ?? false;

  useEffect(() => {
    if (!sessionCode || !nickname || !playerId) {
      navigate("/");
      return;
    }

    let isMounted = true;

    const setup = async () => {
      try {
        const connection = await startConnection();

        const handlePublicState = (payload: PublicState) => {
          if (!isMounted) return;

          setPublicState(payload);
          sessionStorage.setItem("publicState", JSON.stringify(payload));
        };

        const handlePrivateData = (payload: PrivateData) => {
          if (!isMounted) return;

          setPrivateData(payload);
          sessionStorage.setItem("privateData", JSON.stringify(payload));
        };

        const handleActionAcknowledged = (payload: {
          success: boolean;
          message: string;
        }) => {
          if (!isMounted) return;

          setActionMessage(payload.message);

          if (!payload.success) {
            setError(payload.message);
          } else {
            setError("");
          }
        };

        const handleGameCompleted = () => {
          if (!isMounted) return;
          setActionMessage("Game completed.");
        };

        const handleGameFailed = () => {
          if (!isMounted) return;
          setActionMessage("Game failed.");
        };

        connection.off("ReceivePublicState");
        connection.off("ReceivePrivateData");
        connection.off("ActionAcknowledged");
        connection.off("GameCompleted");
        connection.off("GameFailed");

        connection.on("ReceivePublicState", handlePublicState);
        connection.on("ReceivePrivateData", handlePrivateData);
        connection.on("ActionAcknowledged", handleActionAcknowledged);
        connection.on("GameCompleted", handleGameCompleted);
        connection.on("GameFailed", handleGameFailed);

        connection.onreconnected(async () => {
          try {
            const reconnectedConnection = await startConnection();

            await reconnectedConnection.invoke(
              "JoinSession",
              sessionCode,
              playerId,
              nickname,
            );

            const latestPublicState =
              await reconnectedConnection.invoke<PublicState>(
                "GetSessionState",
                sessionCode,
              );

            if (!isMounted) return;

            setPublicState(latestPublicState);
            sessionStorage.setItem(
              "publicState",
              JSON.stringify(latestPublicState),
            );
          } catch (err) {
            console.error(err);
            if (isMounted) {
              setError("Failed to restore game session after reconnect.");
            }
          }
        });

        await connection.invoke("JoinSession", sessionCode, playerId, nickname);

        const latestPublicState = await connection.invoke<PublicState>(
          "GetSessionState",
          sessionCode,
        );

        if (!isMounted) return;

        setPublicState(latestPublicState);
        sessionStorage.setItem(
          "publicState",
          JSON.stringify(latestPublicState),
        );
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load game room.");
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [sessionCode, nickname, playerId, navigate]);

  useEffect(() => {
    const filteredSelections = selectedWords.filter((word) =>
      visibleWords.includes(word),
    );

    if (filteredSelections.length !== selectedWords.length) {
      setSelectedWords(filteredSelections);
    }
  }, [visibleWords, selectedWords]);

  const toggleWordSelection = async (word: string) => {
    if (!sessionCode) return;
    if (isReady) return;
    if (isSubmitting) return;

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
    if (!sessionCode) return;
    if (isSubmitting) return;
    if (!gameState) return;
    if (gameState.status !== "running") return;

    try {
      setIsSubmitting(true);
      const connection = await startConnection();

      await connection.invoke("SubmitAction", sessionCode, {
        type: "set_ready",
        data: {
          isReady: !isReady,
        },
      });

      if (isReady) {
        setActionMessage("You are unready.");
      } else {
        setActionMessage("You are ready.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update ready state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const mistakesLeft =
    gameState != null ? gameState.maxMistakes - gameState.mistakeCount : null;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.playersPanel}>
          <h2 className={styles.panelTitle}>Players</h2>

          {publicState?.players?.length ? (
            <ul className={styles.playerList}>
              {publicState.players.map((player) => {
                const gamePlayer = gameState?.players?.find(
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
          <h1 className={styles.title}>Connections</h1>

          {gameState && (
            <div className={styles.gameInfoBox}>
              <p className={styles.infoItem}>
                <strong>Status:</strong> {gameState.status}
              </p>
              <p className={styles.infoItem}>
                <strong>Mistakes:</strong> {gameState.mistakeCount} /{" "}
                {gameState.maxMistakes}
              </p>
              <p className={styles.infoItem}>
                <strong>Mistakes left:</strong> {mistakesLeft}
              </p>
            </div>
          )}

          {gameState?.solvedGroups?.length ? (
            <div className={styles.solvedSection}>
              <h2 className={styles.sectionTitle}>Solved Groups</h2>

              <div className={styles.solvedGroups}>
                {gameState.solvedGroups.map((group, index) => (
                  <div key={index} className={styles.solvedGroupCard}>
                    {group.map((word) => (
                      <span key={word} className={styles.solvedWord}>
                        {word}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.selectionHeader}>
            <h2 className={styles.sectionTitle}>Your Visible Words</h2>
            <button
              className={styles.readyButton}
              onClick={handleReadyToggle}
              disabled={
                isSubmitting || !gameState || gameState.status !== "running"
              }
            >
              {isReady ? "Unready" : "Ready"}
            </button>
          </div>

          {visibleWords.length === 0 ? (
            <p className={styles.empty}>No words received yet.</p>
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

          <div className={styles.selectionInfo}>
            <p>
              <strong>Your selected words:</strong>{" "}
              {selectedWords.length > 0 ? selectedWords.join(", ") : "None"}
            </p>
            <p>
              You can select any number of your words, including zero. Once all
              players are ready, the backend checks whether the team selected
              exactly 4 words total and whether they form a correct group.
            </p>
          </div>

          {actionMessage && (
            <p className={styles.statusMessage}>{actionMessage}</p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </main>

        <GameChat sessionCode={sessionCode!} playerId={playerId!} />
      </div>
    </div>
  );
}
