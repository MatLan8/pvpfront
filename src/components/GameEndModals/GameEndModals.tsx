import GameEndModal from "../GameEndModal/GameEndModal";

export type GameEndModalsProps = {
  showWinModal: boolean;
  showLoseModal: boolean;
  showLoseTimeModal: boolean;
  onDismiss: () => void;
  onViewReport: () => void;
  onEvaluatePeers?: () => void;
  winTitle?: string;
  winMessage?: string;
  loseTitle?: string;
  loseMessage?: string;
  timeoutTitle?: string;
  timeoutMessage?: string;
};

const defaultWinTitle = "You solved all groups!";
const defaultWinMessage =
  "Great teamwork. Your team completed the game successfully.";
const defaultLoseTitle = "Game Over";
const defaultLoseMessage =
  "Your team did not complete the game. You can close this window for now.";
const defaultTimeoutTitle = "You ran out of time";
const defaultTimeoutMessage =
  "Your team did not complete the game in time. You can close this window for now.";

export default function GameEndModals({
  showWinModal,
  showLoseModal,
  showLoseTimeModal,
  onDismiss,
  onViewReport,
  onEvaluatePeers,
  winTitle = defaultWinTitle,
  winMessage = defaultWinMessage,
  loseTitle = defaultLoseTitle,
  loseMessage = defaultLoseMessage,
  timeoutTitle = defaultTimeoutTitle,
  timeoutMessage = defaultTimeoutMessage,
}: GameEndModalsProps) {
  return (
    <>
      <GameEndModal
        isOpen={showWinModal}
        result="win"
        title={winTitle}
        message={winMessage}
        primaryButtonText="Close"
        onPrimaryClick={onDismiss}
        secondaryButtonText="Evaluate Teammates"
        onSecondaryClick={onEvaluatePeers || onViewReport}
        tertiaryButtonText="View Report"
        onTertiaryClick={onViewReport}
        showConfetti
      />

      <GameEndModal
        isOpen={showLoseModal}
        result="lose"
        title={loseTitle}
        message={loseMessage}
        primaryButtonText="Close"
        onPrimaryClick={onDismiss}
        secondaryButtonText="Evaluate Teammates"
        onSecondaryClick={onEvaluatePeers || onViewReport}
        tertiaryButtonText="View Report"
        onTertiaryClick={onViewReport}
      />

      <GameEndModal
        isOpen={showLoseTimeModal}
        result="lose"
        title={timeoutTitle}
        message={timeoutMessage}
        primaryButtonText="Close"
        onPrimaryClick={onDismiss}
        secondaryButtonText="Evaluate Teammates"
        onSecondaryClick={onEvaluatePeers || onViewReport}
        tertiaryButtonText="View Report"
        onTertiaryClick={onViewReport}
      />
    </>
  );
}
