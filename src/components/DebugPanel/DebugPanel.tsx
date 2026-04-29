import { useState } from "react";
import { changeGame } from "../../services/signalr";
import styles from "./DebugPanel.module.css";

interface DebugPanelProps {
  sessionCode: string;
  totalGames: number;
  currentGameIndex: number;
}

const GAME_NAMES = ["Lasers", "Connections", "Timeline"];

export default function DebugPanel({
  sessionCode,
  totalGames,
  currentGameIndex,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const handleChangeGame = async (gameNumber: number) => {
    if (isChanging || gameNumber === currentGameIndex + 1) return;

    try {
      setIsChanging(true);
      await changeGame(sessionCode, gameNumber);
    } catch (err) {
      console.error("Failed to change game:", err);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "▼" : "▲"} Debug
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.title}>Change Game Override</div>
          <div className={styles.description}>
            Manually switch to a different game in the pipeline.
          </div>

          <div className={styles.buttonGrid}>
            {Array.from({ length: Math.min(totalGames, GAME_NAMES.length) }).map((_, index) => {
              const gameNumber = index + 1;
              const isActive = index === currentGameIndex;
              const gameName = GAME_NAMES[index];

              return (
                <button
                  key={index}
                  type="button"
                  className={`${styles.gameButton} ${isActive ? styles.active : ""} ${isChanging ? styles.disabled : ""}`}
                  disabled={isActive || isChanging}
                  onClick={() => handleChangeGame(gameNumber)}
                >
                  {gameName}
                  {isActive && <span className={styles.activeBadge}>Active</span>}
                </button>
              );
            })}
          </div>

          <div className={styles.info}>
            Current: {currentGameIndex + 1} / {GAME_NAMES.length}
          </div>
        </div>
      )}
    </div>
  );
}