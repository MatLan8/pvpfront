import { useEffect, useRef } from "react";
import styles from "./GameSessionTimer.module.css";

type GameSessionTimerProps = {
  remainingSeconds: number | null;
  startedAtUtc?: string | null;
  endsAtUtc?: string | null;
  isRunning: boolean;
  onExpired?: () => void;
};

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function GameSessionTimer({
  remainingSeconds,
  isRunning,
  onExpired,
}: GameSessionTimerProps) {
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      hasExpiredRef.current = false;
      return;
    }

    if (remainingSeconds !== null && remainingSeconds <= 0 && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpired?.();
    }

    if (remainingSeconds !== null && remainingSeconds > 0) {
      hasExpiredRef.current = false;
    }
  }, [remainingSeconds, isRunning, onExpired]);

  return (
    <div className={styles.timer}>
      <span className={styles.label}>Time left:</span>
      <span className={styles.value}>{formatTime(remainingSeconds ?? 0)}</span>
    </div>
  );
}
