import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, User, Hash } from "lucide-react";
import { startConnection } from "../../services/signalr";
import styles from "./Modals.module.css";

interface JoinSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function JoinSessionModal({ isOpen, onClose }: JoinSessionModalProps) {
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

      onClose();
      navigate(`/waiting-room/${trimmedSessionCode}`);
    } catch (err: any) {
      setError(err?.message || "Failed to join session.");
    } finally {
      setIsJoining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeButton}>
          <X size={18} />
        </button>

        <h2 className={styles.title}>Join Game</h2>

        {/* NAME */}
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <div className={styles.inputWrapper}>
            <User size={16} className={styles.icon} />
            <input
              className={styles.input}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
        </div>

        {/* SESSION CODE */}
        <div className={styles.field}>
          <label className={styles.label}>Session Code</label>
          <div className={styles.inputWrapper}>
            <Hash size={16} className={styles.icon} />
            <input
              className={styles.input}
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="Enter session code"
            />
          </div>
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

export default JoinSessionModal;
