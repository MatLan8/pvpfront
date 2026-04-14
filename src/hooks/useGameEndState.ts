import { useEffect, useState } from "react";

export type UseGameEndStateParams = {
  gameStatus: "running" | "completed" | "failed" | null;
  isGameTimeOver: boolean;
};

export type UseGameEndStateResult = {
  isGameWon: boolean;
  isGameLost: boolean;
  hasGameEnded: boolean;
  showWinModal: boolean;
  showLoseModal: boolean;
  showLoseTimeModal: boolean;
  dismissEndModal: () => void;
  reopenEndModal: () => void;
};

export function useGameEndState({
  gameStatus,
  isGameTimeOver,
}: UseGameEndStateParams): UseGameEndStateResult {
  const [isEndModalDismissed, setIsEndModalDismissed] = useState(false);

  useEffect(() => {
    if (gameStatus === "running") {
      setIsEndModalDismissed(false);
    }
  }, [gameStatus]);

  const isGameWon = gameStatus === "completed";
  const isGameLost = gameStatus === "failed";
  const hasGameEnded = isGameWon || isGameLost || isGameTimeOver;

  const showWinModal = isGameWon && !isEndModalDismissed;
  const showLoseModal = isGameLost && !isEndModalDismissed;
  const showLoseTimeModal = isGameTimeOver && !isEndModalDismissed;

  return {
    isGameWon,
    isGameLost,
    hasGameEnded,
    showWinModal,
    showLoseModal,
    showLoseTimeModal,
    dismissEndModal: () => setIsEndModalDismissed(true),
    reopenEndModal: () => setIsEndModalDismissed(false),
  };
}
