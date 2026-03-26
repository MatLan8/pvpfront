import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import styles from "./GameEndModal.module.css";

type GameEndModalProps = {
  isOpen: boolean;
  result: "win" | "lose";
  title?: string;
  message: string;
  primaryButtonText?: string;
  onPrimaryClick?: () => void;
  secondaryButtonText?: string;
  onSecondaryClick?: () => void;
  showConfetti?: boolean;
};

export default function GameEndModal({
  isOpen,
  result,
  title,
  message,
  primaryButtonText,
  onPrimaryClick,
  secondaryButtonText,
  onSecondaryClick,
  showConfetti = false,
}: GameEndModalProps) {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isOpen) return null;

  const resolvedTitle =
    title ?? (result === "win" ? "Congratulations!" : "Game Over");

  return (
    <>
      {showConfetti && result === "win" && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
        />
      )}

      <div className={styles.backdrop}>
        <div
          className={`${styles.modal} ${
            result === "win" ? styles.winModal : styles.loseModal
          }`}
        >
          <div className={styles.icon}>{result === "win" ? "🎉" : "❌"}</div>

          <h2 className={styles.title}>{resolvedTitle}</h2>
          <p className={styles.message}>{message}</p>

          <div className={styles.actions}>
            {secondaryButtonText && onSecondaryClick && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onSecondaryClick}
              >
                {secondaryButtonText}
              </button>
            )}

            {primaryButtonText && onPrimaryClick && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onPrimaryClick}
              >
                {primaryButtonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
