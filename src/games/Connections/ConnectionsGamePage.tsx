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

type PublicState = {
  sessionCode: string;
  playerCount: number;
  players: PublicPlayer[];
  hasStarted: boolean;
  game: {
    status: string;
    guessCount: number;
  } | null;
};

type PrivateData = {
  visibleWords?: string[];
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

  const [error, setError] = useState("");

  const visibleWords = useMemo(() => {
    return privateData?.visibleWords ?? [];
  }, [privateData]);

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

        connection.off("ReceivePublicState");
        connection.off("ReceivePrivateData");

        connection.on("ReceivePublicState", handlePublicState);
        connection.on("ReceivePrivateData", handlePrivateData);

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

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.playersPanel}>
          <h2 className={styles.panelTitle}>Players</h2>

          {publicState?.players?.length ? (
            <ul className={styles.playerList}>
              {publicState.players.map((player) => (
                <li key={player.playerId} className={styles.playerItem}>
                  {player.nickname}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No players found.</p>
          )}
        </aside>

        <main className={styles.gamePanel}>
          <h1 className={styles.title}>Connections</h1>

          <p className={styles.subtitle}>Your visible words</p>

          {visibleWords.length === 0 ? (
            <p className={styles.empty}>No words received yet.</p>
          ) : (
            <div className={styles.wordsGrid}>
              {visibleWords.map((word) => (
                <div key={word} className={styles.wordCard}>
                  {word}
                </div>
              ))}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </main>

        <GameChat sessionCode={sessionCode!} playerId={playerId!} />
      </div>
    </div>
  );
}
