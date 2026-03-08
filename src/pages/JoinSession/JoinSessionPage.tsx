import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import styles from "./JoinSessionPage.module.css";

function JoinSessionPage() {
  const [nickname, setNickname] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const navigate = useNavigate();

  const getOrCreatePlayerId = () => {
    let playerId = sessionStorage.getItem("playerId");

    if (!playerId) {
      playerId = crypto.randomUUID();
      sessionStorage.setItem("playerId", playerId);
    }

    return playerId;
  };

  const handleJoin = async () => {
    setError("");

    const trimmedNickname = nickname.trim();
    const trimmedSessionCode = sessionCode.trim().toUpperCase();

    if (!trimmedNickname || !trimmedSessionCode) {
      setError("Enter both name and session code.");
      return;
    }

    try {
      setIsJoining(true);

      const playerId = getOrCreatePlayerId();
      const connection = await startConnection();

      connection.off("WaitingRoomPlayersUpdated");
      connection.off("ReceivePublicState");
      connection.off("ReceivePrivateData");
      connection.off("GameStarted");

      connection.on("WaitingRoomPlayersUpdated", (payload) => {
        sessionStorage.setItem(
          "waitingRoomPlayers",
          JSON.stringify(payload.players),
        );
      });

      connection.on("ReceivePublicState", (payload) => {
        sessionStorage.setItem("publicState", JSON.stringify(payload));
      });

      connection.on("ReceivePrivateData", (payload) => {
        sessionStorage.setItem("privateData", JSON.stringify(payload));
      });

      connection.on("GameStarted", () => {
        sessionStorage.setItem("gameStarted", "true");
      });

      await connection.invoke(
        "JoinSession",
        trimmedSessionCode,
        playerId,
        trimmedNickname,
      );

      sessionStorage.setItem("nickname", trimmedNickname);
      sessionStorage.setItem("sessionCode", trimmedSessionCode);

      navigate(`/waiting-room/${trimmedSessionCode}`);
    } catch (err: any) {
      setError(err?.message || "Failed to join session.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Join Session</h1>

        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Session Code</label>
          <input
            className={styles.input}
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
            placeholder="Enter session code"
          />
        </div>

        <button
          className={styles.button}
          onClick={handleJoin}
          disabled={isJoining}
        >
          {isJoining ? "Joining..." : "Join"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

export default JoinSessionPage;
