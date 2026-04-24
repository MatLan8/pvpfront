import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useGameSessionContext } from "../../contexts/GameSessionContext";
import { useGameTimer } from "../../hooks/useGameTimer";
import { useGameEndState } from "../../hooks/useGameEndState";
import { startConnection } from "../../services/signalr";
import { showGameToast } from "../../services/gameToast";

import GameChat from "../../components/GameChat/GameChat";
import GameEndModals from "../../components/GameEndModals/GameEndModals";
import GameHeader from "../../components/GameHeader/GameHeader";
import styles from "./SolveTheStoryGamePage.module.css";

interface TimelineSlot {
  Slot: number;
  CardId: string | null;
  PlayerId: string | null;
}

interface StoryCard {
  Id: string;
  Title: string;
  Description: string;
}

interface SolveTheStoryPrivateData {
  Hand: StoryCard[];
  PlacedCards: Record<number, string>;
  Lives: number;
  MaxLives: number;
  TotalSlots: number;
  FilledSlots: number;
}

interface SolveTheStoryPublicState {
  GameType: string;
  Status: "running" | "completed" | "failed";
  StoryId: string;
  StoryName: string;
  Timeline: TimelineSlot[];
  TotalSlots: number;
  FilledSlots: number;
  Lives: number;
  MaxLives: number;
  PlayerInfos: Array<{
    PlayerId: string;
    Nickname: string;
    PlacedCardCount: number;
  }>;
}

const STORY_CARDS: Record<string, { Title: string; Description: string }> = {
  c1: { Title: "The Intercept", Description: "A encrypted transmission is intercepted by intelligence agencies." },
  c2: { Title: "Code Broken", Description: "Cryptographers decipher the message - it's a warning." },
  c3: { Title: "Threat Identified", Description: "The source is traced to a rogue general planning a coup." },
  c4: { Title: "Operation Greenlight", Description: "A covert team is assembled to stop the plot." },
  c5: { Title: "Deep Cover", Description: "Agents infiltrate the general's inner circle." },
  c6: { Title: "The Meeting", Description: "Intelligence confirms the coup is set for midnight." },
  c7: { Title: "Countdown", Description: "The team moves into position at the capital." },
  c8: { Title: "Communications Cut", Description: "Phone lines go dead - it's starting." },
  c9: { Title: "Breach", Description: "Armed units surround the government building." },
  c10: { Title: "Agents Act", Description: "Our team takes down the signal jammers." },
  c11: { Title: "President Secured", Description: "The leader is evacuated to safety." },
  c12: { Title: "Resistance Forms", Description: "Loyal units rally and counter-attack." },
  c13: { Title: "General Arrested", Description: "The rogue is caught trying to flee." },
  c14: { Title: "Situation Normal", Description: "Order is restored throughout the city." },
  c15: { Title: "Debrief", Description: "The team receives commendations for their行动." },
  c16: { Title: "New Dawn", Description: "The nation rests safe - democracy prevails." }
};

export default function SolveTheStoryGamePage() {
  const { sessionCode } = useParams();
  const playerId = sessionStorage.getItem("playerId") ?? "";

  const { publicState: publicStateRaw, privateData: privateDataRaw, error, setError } = useGameSessionContext();

  const publicState = publicStateRaw as { game: SolveTheStoryPublicState } | null;
  const privateData = privateDataRaw as SolveTheStoryPrivateData | null;

  const gameState = publicState?.game as SolveTheStoryPublicState | null;
  const hasStarted = publicStateRaw?.hasStarted === true;
  const isGameRunning = gameState?.Status === "running";

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serverTimeline = useMemo(() => gameState?.Timeline ?? [], [gameState?.Timeline]);
  const serverHand = useMemo(() => privateData?.Hand ?? [], [privateData?.Hand]);

  const localHand = serverHand.length > 0 ? serverHand : [];
  const localTimeline = serverTimeline;

  const { timerRemainingSeconds, isGameTimeOver } = useGameTimer({
    sessionCode,
    hasStarted,
    isGameRunning,
    publicState: publicStateRaw as never,
    setError,
  });

  const { showWinModal, showLoseTimeModal, dismissEndModal } = useGameEndState({
    gameStatus: gameState?.Status ?? null,
    isGameTimeOver,
  });

  const lives = privateData?.Lives ?? 3;
  const maxLives = privateData?.MaxLives ?? 3;

  const submitAction = useCallback(async (type: string, data: object) => {
    if (!sessionCode) return;
    const connection = await startConnection();
    const result = await connection.invoke<{ success: boolean; message: string }>(
      "SubmitAction", sessionCode, { type, data }
    );
    return result;
  }, [sessionCode]);

  const handleSlotClick = useCallback(async (slotIndex: number) => {
    if (!selectedCardId || !sessionCode || isSubmitting) return;

    const card = localHand.find((c: StoryCard) => c.Id === selectedCardId);
    if (!card) return;

    const existingSlot = localTimeline.find((t: TimelineSlot) => t.Slot === slotIndex);
    if (existingSlot?.CardId && existingSlot.PlayerId !== playerId) {
      showGameToast({ variant: "error", message: "Cannot replace another player's card" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitAction("place_card", { cardId: card.Id, slot: slotIndex });
      if (!result?.success) {
        showGameToast({ variant: "error", message: result?.message || "Failed to place card" });
      }
      setSelectedCardId(null);
    } catch (err) {
      setError("Failed to place card");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCardId, sessionCode, isSubmitting, localHand, localTimeline, playerId, submitAction, setError]);

  const handleRemoveCard = useCallback(async (slotIndex: number) => {
    if (isSubmitting || !sessionCode) return;

    const slot = localTimeline.find((t: TimelineSlot) => t.Slot === slotIndex);
    if (!slot?.CardId || slot.PlayerId !== playerId) return;

    setIsSubmitting(true);
    try {
      const result = await submitAction("remove_card", { slot: slotIndex });
      if (!result?.success) {
        showGameToast({ variant: "error", message: result?.message || "Failed to remove card" });
      }
    } catch (err) {
      setError("Failed to remove card");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, sessionCode, localTimeline, playerId, submitAction, setError]);

  const handleVerify = useCallback(async () => {
    if (isSubmitting || !sessionCode) return;

    const filledCount = localTimeline.filter((t: TimelineSlot) => t.CardId).length;
    if (filledCount < 16) {
      showGameToast({ variant: "error", message: "All 16 slots must be filled before verifying" });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAction("verify_timeline", {});
    } catch (err) {
      setError("Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, sessionCode, localTimeline, submitAction, setError]);

  const filledSlotsCount = localTimeline.filter((t: TimelineSlot) => t.CardId).length;
  const canVerify = filledSlotsCount === 16 && isGameRunning;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!hasStarted) {
    return (
      <div className={styles.whole}>
        <GameHeader sessionCode={sessionCode!} />
        <div className={styles.page}>
          <div className={styles.layout}>
            <main className={styles.gamePanel}>
              <div className={styles.topBar}>
                <h1 className={styles.title}>SOLVE THE STORY</h1>
              </div>
              <div className={styles.line} />
              <div className={styles.waitingMessage}>
                Waiting for the game to start.
              </div>
            </main>
            <aside className={styles.chatPanel}>
              <GameChat sessionCode={sessionCode!} playerId={playerId} />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.whole}>
      <GameHeader sessionCode={sessionCode!} />
      <div className={styles.page}>
        <div className={styles.layout}>
          <main className={styles.gamePanel}>
            <div className={styles.topBar}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{gameState?.StoryName || "SOLVE THE STORY"}</h1>
              </div>
              <div className={styles.timerLives}>
                <div className={styles.timerBlock}>
                  <span className={styles.timerLabel}>Time</span>
                  <span className={styles.timerValue}>{formatTime(timerRemainingSeconds ?? 0)}</span>
                </div>
                <div className={styles.livesBlock}>
                  <span className={styles.livesLabel}>Lives</span>
                  <div className={styles.livesValue}>
                    {Array.from({ length: maxLives }).map((_, i) => (
                      <span key={i} className={`${styles.heart} ${i < lives ? styles.heartFilled : styles.heartEmpty}`}>
                        ♥
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.line} />

            <div className={styles.timelineSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Timeline</h2>
                <span className={styles.slotCounter}>{filledSlotsCount}/16</span>
              </div>

              <div className={styles.timelineGrid}>
                {localTimeline.map((slot: TimelineSlot) => {
                  const cardContent = slot.CardId ? STORY_CARDS[slot.CardId] : null;
                  return (
                    <div
                      key={`slot-${slot.Slot}`}
                      className={`${styles.slot} ${slot.CardId ? styles.filled : styles.empty}`}
                      onClick={() => {
                        if (!slot.CardId && selectedCardId) {
                          handleSlotClick(slot.Slot);
                        } else if (slot.CardId && slot.PlayerId === playerId) {
                          handleRemoveCard(slot.Slot);
                        }
                      }}
                    >
                      <span className={styles.slotNumber}>#{slot.Slot + 1}</span>
                      {cardContent ? (
                        <div className={styles.card}>
                          <h4>{cardContent.Title}</h4>
                          <p>{cardContent.Description}</p>
                        </div>
                      ) : (
                        <div className={styles.emptyPlaceholder}>Empty</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={styles.verifySection}>
                <button
                  onClick={handleVerify}
                  disabled={!canVerify || isSubmitting}
                  className={`${styles.verifyButton} ${canVerify ? styles.enabled : styles.disabled}`}
                >
                  Verify Timeline
                </button>
              </div>
            </div>

            <div className={styles.handSection}>
              <div className={styles.handHeader}>
                <h2 className={styles.handTitle}>Your Cards</h2>
              </div>
              <div className={styles.handCards}>
                {localHand.map((card: StoryCard) => (
                  <div
                    key={card.Id}
                    className={`${styles.handCard} ${selectedCardId === card.Id ? styles.selected : ""}`}
                    onClick={() => setSelectedCardId(selectedCardId === card.Id ? null : card.Id)}
                  >
                    <div className={styles.cardImagePlaceholder}>
                      <span className={styles.cardImagePlaceholderText}>IMG</span>
                    </div>
                    <h3 className={styles.cardTitle}>{card.Title}</h3>
                    <p className={styles.cardDescription}>{card.Description}</p>
                  </div>
                ))}
                {localHand.length === 0 && (
                  <div className={styles.emptyHand}>All cards deployed</div>
                )}
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </main>

          <aside className={styles.chatPanel}>
            <GameChat sessionCode={sessionCode!} playerId={playerId} />
          </aside>
        </div>

        <GameEndModals
          showWinModal={showWinModal}
          showLoseModal={gameState?.Status === "failed"}
          showLoseTimeModal={showLoseTimeModal}
          onDismiss={dismissEndModal}
          onViewReport={() => {}}
          winTitle="Timeline Restored!"
          winMessage="All evidence fragments correctly aligned."
          loseTitle="Game Over"
          loseMessage="Timeline reconstruction failed."
          timeoutTitle="Time Over"
          timeoutMessage="You ran out of time."
        />
      </div>
    </div>
  );
}