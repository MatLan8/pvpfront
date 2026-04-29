import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSessionContext } from "../../contexts/GameSessionContext";
import { useGameTimer } from "../../hooks/useGameTimer";
import { useGameEndState } from "../../hooks/useGameEndState";
import styles from "./TimelineGamePage.module.css";

import GameEndModals from "../../components/GameEndModals/GameEndModals";
import GameChat from "../../components/GameChat/GameChat";
import GameSessionTimer from "../../components/GameSessionTimer/GameSessionTimer";
import IconTeam from "../../assets/players_icon.png";
import GameHeader from "../../components/GameHeader/GameHeader";

// =====================================================
// Types
// =====================================================

interface TimelineCard {
  Id: string;
  Title: string;
  Description: string;
}

interface TimelineSlot {
  // Either a full card (owner only) or hidden info (others)
  IsFilled: boolean;
  OwnerId?: string;
  OwnerNickname?: string;
  // Card details (only populated for owner via private data)
  card?: TimelineCard;
}

interface TimelinePlacedCard {
  SlotIndex: number;
  Card: TimelineCard;
}

interface TimelineGamePublic {
  GameType: string;
  Status: "running" | "completed" | "failed";
  Lives: number;
  MaxLives: number;
  Timeline: (TimelineSlot | null)[];
  FilledSlots: number;
  TotalSlots: number;
}

interface TimelinePlayerPrivate {
  Hand: TimelineCard[];
  HandCount: number;
  PlacedCards: TimelinePlacedCard[];
}

type PrivateDataRaw = TimelinePlayerPrivate | null;
type PublicState = TimelineGamePublic | null;

// =====================================================
// Helpers
// =====================================================

function normalizePublicState(
  raw: unknown,
): TimelineGamePublic | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const timelineArray = obj.Timeline ?? obj.timeline;
  const timeline = Array.isArray(timelineArray)
    ? timelineArray.map((item) => {
        if (!item || typeof item !== "object") return null;
        const slot = item as Record<string, unknown>;
        // Handle both old format (card object) and new format (IsFilled)
        const isFilled = slot.IsFilled ?? slot.isFilled;
        if (isFilled === true) {
          return {
            IsFilled: true,
            OwnerId: (slot.OwnerId ?? slot.ownerId) as string,
            OwnerNickname: (slot.OwnerNickname ?? slot.ownerNickname) as string,
          };
        }
        return null; // Empty slot
      })
    : [];

  return {
    GameType: String(obj.GameType ?? obj.gameType ?? ""),
    Status: (obj.Status ?? obj.status ?? "running") as "running" | "completed" | "failed",
    Lives: Number(obj.Lives ?? obj.lives ?? 3),
    MaxLives: Number(obj.MaxLives ?? obj.maxLives ?? 3),
    Timeline: timeline,
    FilledSlots: Number(obj.FilledSlots ?? obj.filledSlots ?? 0),
    TotalSlots: Number(obj.TotalSlots ?? obj.totalSlots ?? 16),
  };
}

function normalizePrivateData(raw: unknown): TimelinePlayerPrivate {
  if (!raw || typeof raw !== "object") {
    return { Hand: [], HandCount: 0, PlacedCards: [] };
  }

  const obj = raw as Record<string, unknown>;

  const handArray = obj.Hand ?? obj.hand;
  const hand = Array.isArray(handArray)
    ? handArray.map((item) => {
        if (!item || typeof item !== "object") return null;
        const card = item as Record<string, unknown>;
        return {
          Id: (card.Id ?? card.id) as string,
          Title: (card.Title ?? card.title) as string,
          Description: (card.Description ?? card.description) as string,
        };
      }).filter((c): c is TimelineCard => c !== null)
    : [];

  const placedArray = obj.PlacedCards ?? obj.placedCards;
  const placedCards = Array.isArray(placedArray)
    ? placedArray.map((item) => {
        if (!item || typeof item !== "object") return null;
        const placed = item as Record<string, unknown>;
        const cardObj = placed.Card ?? placed.card;
        if (!cardObj || typeof cardObj !== "object") return null;
        const card = cardObj as Record<string, unknown>;
        return {
          SlotIndex: Number(placed.SlotIndex ?? placed.slotIndex ?? -1),
          Card: {
            Id: (card.Id ?? card.id) as string,
            Title: (card.Title ?? card.title) as string,
            Description: (card.Description ?? card.description) as string,
          },
        };
      }).filter((p): p is TimelinePlacedCard => p !== null && p.SlotIndex >= 0)
    : [];

  return {
    Hand: hand,
    HandCount: Number(obj.HandCount ?? obj.handCount ?? hand.length),
    PlacedCards: placedCards,
  };
}

// =====================================================
// Component
// =====================================================

export default function TimelineGamePage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();

  const playerId = sessionStorage.getItem("playerId");

  const {
    publicState: publicStateRaw,
    privateData: privateDataRaw,
    error,
    setError,
  } = useGameSessionContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const hasStarted = publicStateRaw?.hasStarted === true;
  const gameStateRaw = hasStarted
    ? (publicStateRaw?.game as Record<string, unknown> | null | undefined)
    : null;

  const gameState = useMemo(
    () => normalizePublicState(gameStateRaw),
    [gameStateRaw],
  );

  const privateData = useMemo(
    () => normalizePrivateData(privateDataRaw),
    [privateDataRaw],
  );

  const isGameRunning = gameState?.Status === "running";

  const {
    timerRemainingSeconds,
    timerStartedAtUtc,
    timerEndsAtUtc,
    hasTimedOut,
    isGameTimeOver,
    handleTimerExpired,
  } = useGameTimer({
    sessionCode,
    hasStarted,
    isGameRunning,
    publicState: publicStateRaw,
    setError,
  });

  const {
    hasGameEnded,
    showWinModal,
    showLoseTimeModal,
    dismissEndModal,
    reopenEndModal,
  } = useGameEndState({
    gameStatus: gameState?.Status ?? null,
    isGameTimeOver,
  });

  const isInteractionLocked = !hasStarted || !isGameRunning || hasTimedOut;
  const allSlotsFilled = (gameState?.FilledSlots ?? 0) === 16;

  // =====================================================
  // Actions
  // =====================================================

  const submitAction = useCallback(
    async (type: string, data: object) => {
      if (!sessionCode) return;
      const connection = await startConnection();
      await connection.invoke("SubmitAction", sessionCode, { type, data });
    },
    [sessionCode],
  );

  const handlePlaceCard = useCallback(
    async (cardId: string, slotIndex: number) => {
      if (!sessionCode || isInteractionLocked || isSubmitting) return;

      try {
        setIsSubmitting(true);
        await submitAction("place_card", { cardId, slotIndex });
        setSelectedCardId(null);
        setSelectedSlotIndex(null);
      } catch (err) {
        console.error(err);
        setError("Failed to place card.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionCode, isInteractionLocked, isSubmitting, submitAction, setError],
  );

  const handleRemoveCard = useCallback(
    async (slotIndex: number) => {
      if (!sessionCode || isInteractionLocked || isSubmitting) return;

      try {
        setIsSubmitting(true);
        await submitAction("remove_card", { slotIndex });
      } catch (err) {
        console.error(err);
        setError("Failed to remove card.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionCode, isInteractionLocked, isSubmitting, submitAction, setError],
  );

  const handleVerify = useCallback(async () => {
    if (!sessionCode || isInteractionLocked || isSubmitting || !allSlotsFilled)
      return;

    try {
      setIsSubmitting(true);
      await submitAction("verify", {});
    } catch (err) {
      console.error(err);
      setError("Failed to verify timeline.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    sessionCode,
    isInteractionLocked,
    isSubmitting,
    allSlotsFilled,
    submitAction,
    setError,
  ]);

  // =====================================================
  // Render
  // =====================================================

  return (
    <div>
      <GameHeader sessionCode={sessionCode!} />

      <div className={styles.page}>
        <div className={styles.layout}>
          <aside className={styles.playersPanel}>
            <div className={styles.label}>
              <img src={IconTeam} alt="team" width="25" height="25" />
              <h5 className={styles.panelTitle}>Players</h5>
            </div>
            <hr />

            {publicStateRaw?.players?.length ? (
              <ul className={styles.playerList}>
                {publicStateRaw.players.map((player) => (
                  <li key={player.playerId} className={styles.playerItem}>
                    <div className={styles.playerNameRow}>
                      <span>{player.nickname}</span>
                      {!player.isConnected && (
                        <span className={styles.disconnectedTag}>
                          Disconnected
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No players found.</p>
            )}
          </aside>

          <main className={styles.gamePanel}>
            <div className={styles.topBar}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Timeline</h1>

                {hasGameEnded && (
                  <button
                    type="button"
                    className={styles.reportModalButton}
                    onClick={() => reopenEndModal()}
                  >
                    View end modal
                  </button>
                )}
              </div>

              {hasStarted && isGameRunning && (
                <GameSessionTimer
                  key={`${sessionCode ?? "session"}-${publicStateRaw?.hasStarted ? "started" : "waiting"}`}
                  remainingSeconds={timerRemainingSeconds}
                  startedAtUtc={timerStartedAtUtc}
                  endsAtUtc={timerEndsAtUtc}
                  isRunning={!hasTimedOut}
                  onExpired={handleTimerExpired}
                />
              )}
            </div>

            <div className={styles.line} />

            {!hasStarted || !gameState ? (
              <div>
                <h2 className={styles.sectionTitle}>Waiting room</h2>
                <p className={styles.empty}>Waiting for the game to start.</p>
              </div>
            ) : (
              <>
                {/* Header Area: Objective + Lives */}
                <div className={styles.gameInfo}>
                  <div className={styles.objective}>
                    <h2 className={styles.sectionTitle}>Objective</h2>
                    <p className={styles.objectiveText}>
                      Collaborate with your team to reconstruct the 16-step story
                      in chronological order. Place cards on the timeline,
                      then verify when complete!
                    </p>
                  </div>
                  <div className={styles.livesDisplay}>
                    <span className={styles.livesLabel}>Team Lives</span>
                    <div className={styles.livesHearts}>
                      {Array.from({ length: gameState.MaxLives }).map((_, i) => (
                        <span
                          key={i}
                          className={`${styles.heart} ${i < gameState.Lives ? styles.heartFull : styles.heartEmpty}`}
                        >
                          ♥
                        </span>
                      ))}
                    </div>
                    <span className={styles.livesCount}>
                      {gameState.Lives} / {gameState.MaxLives}
                    </span>
                  </div>
                </div>

                {/* Shared Timeline */}
                <div className={styles.timelineSection}>
                  <h2 className={styles.sectionTitle}>Timeline</h2>
                  <p className={styles.timelineProgress}>
                    {gameState.FilledSlots} / {gameState.TotalSlots} slots
                    filled
                  </p>

                  <div className={styles.timelineGrid}>
                    {gameState.Timeline.map((slot, index) => {
                      const isFilled = slot?.IsFilled ?? false;
                      const isOwner = slot?.OwnerId === playerId;
                      const ownerNickname = slot?.OwnerNickname;
                      
                      // Find card details if we're the owner
                      let cardData: TimelineCard | undefined;
                      if (isOwner && isFilled) {
                        const placed = privateData.PlacedCards.find(p => p.SlotIndex === index);
                        cardData = placed?.Card;
                      }

                      return (
                        <div
                          key={index}
                          className={`${styles.timelineSlot} ${isFilled ? styles.slotFilled : styles.slotEmpty} ${selectedSlotIndex === index ? styles.slotSelected : ""} ${!isFilled && selectedCardId ? styles.canPlace : ""}`}
                          onClick={() => {
                            if (isInteractionLocked) return;
                            
                            if (isFilled) {
                              // Only owner can remove
                              if (isOwner) {
                                handleRemoveCard(index);
                              }
                              // Non-owners can't interact with filled slots
                            } else if (selectedCardId) {
                              // Empty slot with selected card: place card
                              handlePlaceCard(selectedCardId, index);
                            }
                            // Empty slot without selected card: do nothing
                          }}
                        >
                          <span className={styles.slotIndex}>{index + 1}</span>
                          {isFilled ? (
                            cardData ? (
                              // Owner can see the card
                              <div className={styles.cardContent}>
                                <span className={styles.cardTitle}>
                                  {cardData.Title}
                                </span>
                                <span className={styles.cardDescription}>
                                  {cardData.Description}
                                </span>
                              </div>
                            ) : (
                              // Non-owner sees hidden card
                              <div className={styles.hiddenCard}>
                                <span className={styles.hiddenCardText}>Hidden Card</span>
                                <span className={styles.hiddenCardOwner}>
                                  Placed by {ownerNickname}
                                </span>
                              </div>
                            )
                          ) : (
                            <span className={styles.slotEmptyText}>Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className={styles.timelineHint}>
                    {selectedCardId 
                      ? "Click an empty slot to place the selected card." 
                      : "Select a card from your hand, then click an empty slot to place it. Click YOUR filled slot to remove it."}
                  </p>
                </div>

                {/* Player's Hand */}
                <div className={styles.handSection}>
                  <h2 className={styles.sectionTitle}>
                    Your Hand ({privateData.HandCount} cards)
                  </h2>

                  {privateData.Hand.length === 0 ? (
                    <p className={styles.emptyHand}>
                      You have no cards in hand.
                    </p>
                  ) : (
                    <div className={styles.handGrid}>
                      {privateData.Hand.map((card) => (
                        <div
                          key={card.Id}
                          className={`${styles.handCard} ${selectedCardId === card.Id ? styles.cardSelected : ""} ${isInteractionLocked ? styles.cardDisabled : ""}`}
                          onClick={() => {
                            if (!isInteractionLocked) {
                              setSelectedCardId((prev) =>
                                prev === card.Id ? null : card.Id,
                              );
                            }
                          }}
                        >
                          <span className={styles.cardTitle}>{card.Title}</span>
                          <span className={styles.cardDescription}>
                            {card.Description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedCardId && (
                    <div className={styles.placeInstructions}>
                      <p>
                        Card selected:{" "}
                        <strong>
                          {privateData.Hand.find((c) => c.Id === selectedCardId)
                            ?.Title}
                        </strong>
                      </p>
                      <p className={styles.hint}>
                        Click an empty slot on the timeline to place the card.
                      </p>
                    </div>
                  )}
                </div>

                {/* Verify Button */}
                <div className={styles.verifySection}>
                  <button
                    type="button"
                    className={`${styles.verifyButton} ${!allSlotsFilled || isInteractionLocked || isSubmitting ? styles.verifyButtonDisabled : ""}`}
                    disabled={!allSlotsFilled || isInteractionLocked || isSubmitting}
                    onClick={() => void handleVerify()}
                  >
                    {isSubmitting ? "Verifying..." : "Verify Timeline"}
                  </button>
                  {!allSlotsFilled && (
                    <p className={styles.verifyHint}>
                      Fill all 16 slots before verifying.
                    </p>
                  )}
                </div>
              </>
            )}

            {error && <p className={styles.error}>{error}</p>}
          </main>

          <aside className={styles.chatPanel}>
            <GameChat sessionCode={sessionCode!} playerId={playerId!} />
          </aside>
        </div>

        <GameEndModals
          showWinModal={showWinModal}
          showLoseModal={false}
          showLoseTimeModal={showLoseTimeModal}
          onDismiss={dismissEndModal}
          onViewReport={() => navigate(`/report`)}
          winTitle="Timeline Complete!"
          winMessage="Your team correctly ordered all 16 story cards. Great teamwork!"
          loseTitle="Game Over"
          loseMessage="The timeline was incorrect and the team ran out of lives."
          timeoutTitle="Time Over"
          timeoutMessage="You ran out of time."
        />
      </div>
    </div>
  );
}