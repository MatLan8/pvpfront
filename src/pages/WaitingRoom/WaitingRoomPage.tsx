import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import styles from "./WaitingRoomPage.module.css";

type WaitingRoomPayload = {
  sessionCode: string;
  players: string[];
};

export default function WaitingRoomPage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<string[]>(() => {
    const stored = sessionStorage.getItem("waitingRoomPlayers");
    return stored ? JSON.parse(stored) : [];
  });

  const [error, setError] = useState("");

  const nickname = sessionStorage.getItem("nickname");
  const playerId = sessionStorage.getItem("playerId");

  useEffect(() => {
    if (!sessionCode || !nickname || !playerId) {
      navigate("/");
      return;
    }

    const gameStarted = sessionStorage.getItem("gameStarted");

    if (gameStarted === "true") {
      navigate(`/game/${sessionCode}`);
      return;
    }

    let isMounted = true;

    const setup = async () => {
      try {
        const connection = await startConnection();

        const handlePlayersUpdated = (payload: WaitingRoomPayload) => {
          if (!isMounted) return;
          if (payload.sessionCode !== sessionCode) return;

          setPlayers(payload.players);
          sessionStorage.setItem(
            "waitingRoomPlayers",
            JSON.stringify(payload.players),
          );
        };

        const handleGameStarted = () => {
          sessionStorage.setItem("gameStarted", "true");
          navigate(`/game/${sessionCode}`);
        };

        connection.off("WaitingRoomPlayersUpdated");
        connection.off("GameStarted");

        connection.on("WaitingRoomPlayersUpdated", handlePlayersUpdated);
        connection.on("GameStarted", handleGameStarted);

        connection.onreconnected(async () => {
          try {
            const reconnectedConnection = await startConnection();

            await reconnectedConnection.invoke(
              "JoinSession",
              sessionCode,
              playerId,
              nickname,
            );

            const latestWaitingState =
              await reconnectedConnection.invoke<WaitingRoomPayload>(
                "GetWaitingRoomState",
                sessionCode,
              );

            if (!isMounted) return;

            setPlayers(latestWaitingState.players);
            sessionStorage.setItem(
              "waitingRoomPlayers",
              JSON.stringify(latestWaitingState.players),
            );
          } catch (err) {
            console.error(err);
            if (isMounted) {
              setError("Failed to restore session after reconnect.");
            }
          }
        });

        await connection.invoke("JoinSession", sessionCode, playerId, nickname);

        const latestWaitingState = await connection.invoke<WaitingRoomPayload>(
          "GetWaitingRoomState",
          sessionCode,
        );

        if (!isMounted) return;

        setPlayers(latestWaitingState.players);
        sessionStorage.setItem(
          "waitingRoomPlayers",
          JSON.stringify(latestWaitingState.players),
        );
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load waiting room.");
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
      <div className={styles.card}>
        <h1 className={styles.title}>Waiting Room</h1>

        <div className={styles.infoBox}>
          <p className={styles.infoItem}>
            <span className={styles.infoLabel}>Session:</span> {sessionCode}
          </p>
          <p className={styles.infoItem}>
            <span className={styles.infoLabel}>You:</span> {nickname}
          </p>
        </div>

        <h2 className={styles.subtitle}>Players</h2>

        {players.length === 0 ? (
          <p className={styles.empty}>No players yet...</p>
        ) : (
          <ul className={styles.playerList}>
            {players.map((player, index) => (
              <li key={`${player}-${index}`} className={styles.playerItem}>
                {player}
              </li>
            ))}
          </ul>
        )}

        <p className={styles.waitingText}>
          Waiting for more players to join...
        </p>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
