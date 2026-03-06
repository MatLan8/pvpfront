import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createConnection } from "../../services/signalr";
import styles from "./WaitingRoomPage.module.css";

type WaitingRoomPayload = {
  sessionCode: string;
  players: string[];
};

export default function WaitingRoomPage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<string[]>([]);
  const [error, setError] = useState("");

  const nickname = sessionStorage.getItem("nickname");

  useEffect(() => {
    if (!sessionCode || !nickname) {
      navigate("/");
      return;
    }

    const connection = createConnection();

    const handlePlayersUpdated = (payload: WaitingRoomPayload) => {
      if (payload.sessionCode === sessionCode) {
        setPlayers(payload.players);
      }
    };

    const handleGameCompleted = () => {
      console.log("Game completed");
    };

    connection.on("WaitingRoomPlayersUpdated", handlePlayersUpdated);
    connection.on("GameCompleted", handleGameCompleted);

    connection.onreconnected(async () => {
      try {
        await connection.invoke("JoinSession", sessionCode, nickname);
      } catch (err) {
        console.error(err);
        setError("Failed to rejoin session after reconnect.");
      }
    });

    return () => {
      connection.off("WaitingRoomPlayersUpdated", handlePlayersUpdated);
      connection.off("GameCompleted", handleGameCompleted);
    };
  }, [sessionCode, nickname, navigate]);

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
