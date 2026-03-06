import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createConnection } from "../../services/signalr";
import styles from "./JoinSessionPage.module.css";

function JoinSessionPage() {
  const [nickname, setNickname] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const navigate = useNavigate();

  const handleJoin = async () => {
    setError("");

    if (!nickname.trim() || !sessionCode.trim()) {
      setError("Enter both name and session code.");
      return;
    }

    try {
      setIsJoining(true);

      const connection = createConnection();

      if (connection.state === "Disconnected") {
        await connection.start();
      }

      await connection.invoke(
        "JoinSession",
        sessionCode.trim(),
        nickname.trim(),
      );

      sessionStorage.setItem("nickname", nickname.trim());
      sessionStorage.setItem("sessionCode", sessionCode.trim());

      navigate(`/waiting-room/${sessionCode.trim()}`);
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
