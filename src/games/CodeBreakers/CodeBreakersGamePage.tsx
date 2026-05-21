import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSessionContext } from "../../contexts/GameSessionContext";
import { useGameTimer } from "../../hooks/useGameTimer";
import { useGameEndState } from "../../hooks/useGameEndState";
import type { BasePublicState } from "../../types/gameSession";
import { showGameToast } from "../../services/gameToast";
import styles from "./CodeBreakersGamePage.module.css";

import GameEndModals from "../../components/GameEndModals/GameEndModals";
import GameChat from "../../components/GameChat/GameChat";
import GameSessionTimer from "../../components/GameSessionTimer/GameSessionTimer";
import GameHeader from "../../components/Headers/GameHeader";
import IconTeam from "../../assets/players_icon.png";

type CBPlayerPublic = {
  playerId: string;
  isReady: boolean;
};

type CodeBreakersPublic = {
  status: "running" | "completed" | "failed";
  maxAttempts: number;
  mistakeCount: number;
  players: CBPlayerPublic[];
};

type PublicState = BasePublicState<CodeBreakersPublic>;

type CBPrivateRaw = Record<string, unknown>;

type CodeBreakersPrivate = {
  hint: string;
  submittedCode: string;
  isReady: boolean;
};

function normalizeCBPlayers(raw: unknown): CBPlayerPublic[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [...(raw as Iterable<unknown>)];
  return arr.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      playerId: String(o.playerId ?? o.PlayerId ?? ""),
      isReady: Boolean(o.isReady ?? o.IsReady ?? false),
    };
  });
}

function normalizeCBGame(raw: unknown): CodeBreakersPublic | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const statusRaw = String(g.status ?? g.Status ?? "running").toLowerCase();
  const status =
    statusRaw === "failed" || statusRaw === "completed" ? statusRaw : "running";
  const maxAttempts = Number(g.maxAttempts ?? g.MaxAttempts ?? 3);
  const mistakeCount = Number(g.mistakeCount ?? g.MistakeCount ?? 0);
  const players = normalizeCBPlayers(g.players ?? g.Players);
  return { status, maxAttempts, mistakeCount, players };
}

function normalizeCBPrivate(
  raw: unknown,
  hasStarted: boolean,
): CodeBreakersPrivate {
  if (!hasStarted || raw == null || typeof raw !== "object") {
    return { hint: "", submittedCode: "", isReady: false };
  }
  const o = raw as CBPrivateRaw;
  return {
    hint: String(o.hint ?? o.Hint ?? ""),
    submittedCode: String(o.submittedCode ?? o.SubmittedCode ?? ""),
    isReady: Boolean(o.isReady ?? o.IsReady ?? false),
  };
}

export default function CodeBreakersGamePage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const playerId = sessionStorage.getItem("playerId");

  const {
    publicState: publicStateRaw,
    privateData: privateDataRaw,
    error,
    setError,
  } = useGameSessionContext();
  const publicState = publicStateRaw as PublicState | null;
  const privateData = privateDataRaw as CBPrivateRaw | null;

  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const hasStarted = publicState?.hasStarted === true;
  const gameStateRaw = hasStarted ? (publicState?.game ?? null) : null;

  const gameState = useMemo(
    (): CodeBreakersPublic | null => normalizeCBGame(gameStateRaw),
    [gameStateRaw],
  );

  const isGameRunning = gameState?.status === "running";

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
    publicState,
    setError,
  });

  const {
    hasGameEnded,
    showWinModal,
    showLoseModal,
    showLoseTimeModal,
    dismissEndModal,
    reopenEndModal,
  } = useGameEndState({
    gameStatus: gameState?.status ?? null,
    isGameTimeOver,
  });

  const normalizedPrivate = useMemo(
    () => normalizeCBPrivate(privateData, hasStarted),
    [privateData, hasStarted],
  );

  const gamePlayers = useMemo(
    () => gameState?.players ?? [],
    [gameState?.players],
  );

  const isReady = normalizedPrivate.isReady;
  const attemptsLeft =
    gameState != null
      ? gameState.maxAttempts - gameState.mistakeCount
      : null;

  const isInteractionLocked = !hasStarted || !isGameRunning || hasTimedOut;

  const handleReadyToggle = useCallback(async () => {
    if (!sessionCode || !gameState || isSubmitting || isInteractionLocked) return;

    if (!isReady) {
      const code = digits.join("");
      if (code.length !== 4 || !/^\d{4}$/.test(code)) {
        showGameToast({
          variant: "error",
          message: "Enter a 4-digit code before readying up.",
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const connection = await startConnection();

      if (isReady) {
        await connection.invoke("SubmitAction", sessionCode, {
          type: "set_ready",
          data: {},
        });
        return;
      }

      const code = digits.join("");
      await connection.invoke("SubmitAction", sessionCode, {
        type: "submit_code",
        data: { code },
      });
      await connection.invoke("SubmitAction", sessionCode, {
        type: "set_ready",
        data: {},
      });
    } catch (err) {
      console.error(err);
      setError(isReady ? "Failed to update ready state." : "Failed to submit code.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    sessionCode,
    gameState,
    isSubmitting,
    isInteractionLocked,
    isReady,
    digits,
    setError,
  ]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (isReady || isInteractionLocked) return;

      const ch = value.replace(/\D/g, "").slice(-1);
      setDigits((prev) => {
        const next = [...prev];
        next[index] = ch;
        return next;
      });

      if (ch && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [isReady, isInteractionLocked],
  );

  const handleDigitKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleReadyToggle();
        return;
      }

      if (isReady || isInteractionLocked) return;

      if (e.key === "Backspace") {
        if (digits[index] === "" && index > 0) {
          e.preventDefault();
          setDigits((prev) => {
            const next = [...prev];
            next[index - 1] = "";
            return next;
          });
          inputRefs.current[index - 1]?.focus();
        }
      }

      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }

      if (e.key === "ArrowRight" && index < 3) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, isReady, isInteractionLocked, handleReadyToggle],
  );

  return (
    <div className={styles.whole}>
      <GameHeader sessionCode={sessionCode!} />
      <div className={styles.page}>
        <div className={styles.layout}>
          {/* Players panel */}
          <aside className={styles.playersPanel}>
            <div className={styles.label}>
              <img src={IconTeam} alt="team" width={25} height={25} />
              <h2 className={styles.panelTitle}>Players</h2>
            </div>
            <hr />

            {publicState?.players?.length ? (
              <ul className={styles.playerList}>
                {publicState.players.map((player) => {
                  const gp = gamePlayers.find(
                    (p) => p.playerId === player.playerId,
                  );

                  return (
                    <li
                      key={player.playerId}
                      className={`${styles.playerItem} ${gp?.isReady ? styles.playerItemReady : ""}`}
                    >
                      <div className={styles.playerNameRow}>
                        <span>{player.nickname}</span>
                        {!player.isConnected && (
                          <span className={styles.disconnectedTag}>
                            Disconnected
                          </span>
                        )}
                      </div>

                      {hasStarted && gp && (
                        <div className={styles.playerMeta}>
                          <span>{gp.isReady ? "Ready" : "Not ready"}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>No players found.</p>
            )}
          </aside>

          {/* Game panel */}
          <main className={styles.gamePanel}>
            <div className={styles.topBar}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Code Breakers</h1>
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

              {hasStarted && (
                <div className={styles.timerRow}>
                  {isGameRunning && (
                    <GameSessionTimer
                      key={`${sessionCode ?? "session"}-${publicState?.hasStarted ? "started" : "waiting"}`}
                      remainingSeconds={timerRemainingSeconds}
                      startedAtUtc={timerStartedAtUtc}
                      endsAtUtc={timerEndsAtUtc}
                      isRunning={!hasTimedOut}
                      onExpired={handleTimerExpired}
                    />
                  )}

                  {gameState && attemptsLeft != null && (
                    <div className={styles.attemptsBadge}>
                      <span>Attempts left:</span>
                      <span className={styles.attemptsBadgeValue}>
                        {attemptsLeft}
                      </span>
                    </div>
                  )}
                </div>
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
                {/* Hint */}
                <div className={styles.hintSection}>
                  <h2 className={styles.sectionTitle}>Your hint</h2>
                  <div className={styles.hintCard}>
                    {normalizedPrivate.hint || "No hint available."}
                  </div>
                </div>

                {/* Code input */}
                <div className={styles.codeSection}>
                  <h2 className={styles.sectionTitle}>Enter the 4-digit code</h2>

                  <div className={styles.codeBoxes}>
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digits[i]}
                        readOnly={isReady || isInteractionLocked}
                        className={`${styles.codeDigitBox} ${isReady || isInteractionLocked ? styles.codeDigitBoxDisabled : ""}`}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        autoComplete="off"
                      />
                    ))}
                  </div>

                  <div className={styles.submitRow}>
                    <button
                      type="button"
                      className={`${styles.readyButton} ${isReady ? styles.readyButtonUnready : styles.readyButtonReady}`}
                      disabled={isInteractionLocked || isSubmitting}
                      onClick={() => void handleReadyToggle()}
                    >
                      {isReady ? "Unready" : "Ready"}
                    </button>

                    {isReady && (
                      <p className={styles.waitingText}>
                        Waiting for other players...
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {error ? <p className={styles.error}>{error}</p> : null}
          </main>

          {/* Chat panel */}
          <aside className={styles.chatPanel}>
            <GameChat sessionCode={sessionCode!} playerId={playerId!} />
          </aside>
        </div>

        <GameEndModals
          showWinModal={showWinModal}
          showLoseModal={showLoseModal}
          showLoseTimeModal={showLoseTimeModal}
          onDismiss={dismissEndModal}
          onViewReport={() => navigate(`/report`)}
          winTitle="Code cracked!"
          winMessage="Your team found the correct code. Great teamwork!"
          loseTitle="Out of attempts"
          loseMessage="The team could not crack the code."
          timeoutTitle="Time over"
          timeoutMessage="You ran out of time."
        />
      </div>
    </div>
  );
}
