import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startConnection } from "../../services/signalr";
import { useGameSessionContext } from "../../contexts/GameSessionContext";
import { useGameTimer } from "../../hooks/useGameTimer";
import { useGameEndState } from "../../hooks/useGameEndState";
import type { BasePublicState } from "../../types/gameSession";
import { showGameToast } from "../../services/gameToast";
import styles from "./WordleGamePage.module.css";

import GameEndModals from "../../components/GameEndModals/GameEndModals";
import GameChat from "../../components/GameChat/GameChat";
import GameSessionTimer from "../../components/GameSessionTimer/GameSessionTimer";
import GameHeader from "../../components/GameHeader/GameHeader";
import IconTeam from "../../assets/players_icon.png";

type LetterResult = "absent" | "present" | "correct";

type GuessResultNorm = {
  word: string;
  states: LetterResult[];
};

const MAX_GUESSES = 3;

const KEYBOARD_ROW_1 = "QWERTYUIOP".split("");
const KEYBOARD_ROW_2 = "ASDFGHJKL".split("");
const KEYBOARD_ROW_3 = "ZXCVBNM".split("");

const LETTER_PRIORITY: Record<LetterResult, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

type WordleGamePlayerState = {
  playerId: string;
  remainingGuesses: number;
};

type WordleGamePublic = {
  status: "running" | "completed" | "failed";
  players: WordleGamePlayerState[];
};

type PublicState = BasePublicState<WordleGamePublic>;

type WordlePrivateRaw = Record<string, unknown>;

function normalizeLetterState(raw: unknown): LetterResult {
  if (typeof raw === "number") {
    if (raw === 1) return "present";
    if (raw === 2) return "correct";
    return "absent";
  }
  const s = String(raw).toLowerCase();
  if (s === "present") return "present";
  if (s === "correct") return "correct";
  return "absent";
}

function normalizeGuess(item: unknown): GuessResultNorm | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const word = String(o.word ?? o.Word ?? "").toLowerCase();
  const statesRaw = o.states ?? o.States;
  if (!Array.isArray(statesRaw)) return null;
  const states = statesRaw.map(normalizeLetterState);
  if (states.length !== 5) return null;
  return { word, states };
}

function normalizeWordlePlayers(raw: unknown): WordleGamePlayerState[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [...(raw as Iterable<unknown>)];
  return arr.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      playerId: String(o.playerId ?? o.PlayerId ?? ""),
      remainingGuesses: Number(o.remainingGuesses ?? o.RemainingGuesses ?? 0),
    };
  });
}

function normalizeWordleGame(raw: unknown): WordleGamePublic | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const statusRaw = String(g.status ?? g.Status ?? "running").toLowerCase();
  const status =
    statusRaw === "failed" || statusRaw === "completed" ? statusRaw : "running";
  const players = normalizeWordlePlayers(g.players ?? g.Players);
  return { status, players };
}

function normalizeWordlePrivate(
  raw: unknown,
  hasStarted: boolean,
): { remainingGuesses: number; guesses: GuessResultNorm[] } {
  if (!hasStarted || raw == null || typeof raw !== "object") {
    return { remainingGuesses: MAX_GUESSES, guesses: [] };
  }
  const o = raw as WordlePrivateRaw;
  const remainingGuesses = Number(
    o.remainingGuesses ?? o.RemainingGuesses ?? MAX_GUESSES,
  );
  const guessesRaw = o.guesses ?? o.Guesses;
  const guesses: GuessResultNorm[] = [];
  if (Array.isArray(guessesRaw)) {
    for (const item of guessesRaw) {
      const g = normalizeGuess(item);
      if (g) guesses.push(g);
    }
  }
  return { remainingGuesses, guesses };
}

function tileClassForResult(
  r: LetterResult,
):
  | typeof styles.tileCorrect
  | typeof styles.tilePresent
  | typeof styles.tileAbsent {
  if (r === "correct") return styles.tileCorrect;
  if (r === "present") return styles.tilePresent;
  return styles.tileAbsent;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

function keyboardLetterStates(
  guesses: GuessResultNorm[],
): Map<string, LetterResult> {
  const map = new Map<string, LetterResult>();
  for (const guess of guesses) {
    for (let i = 0; i < 5; i++) {
      const ch = (guess.word[i] ?? "").toUpperCase();
      if (!/^[A-Z]$/.test(ch)) continue;
      const st = guess.states[i] ?? "absent";
      const prev = map.get(ch);
      if (prev === undefined || LETTER_PRIORITY[st] > LETTER_PRIORITY[prev]) {
        map.set(ch, st);
      }
    }
  }
  return map;
}

export default function WordleGamePage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const playerId = sessionStorage.getItem("playerId");

  const {
    publicState: publicStateRaw,
    privateData: privateDataRaw,
    setError,
  } = useGameSessionContext();
  const publicState = publicStateRaw as PublicState | null;
  const privateData = privateDataRaw as WordlePrivateRaw | null;

  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasStarted = publicState?.hasStarted === true;
  const gameStateRaw = hasStarted ? (publicState?.game ?? null) : null;

  const gameState = useMemo(
    (): WordleGamePublic | null => normalizeWordleGame(gameStateRaw),
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
    () => normalizeWordlePrivate(privateData, hasStarted),
    [privateData, hasStarted],
  );

  const { remainingGuesses: privateRemaining, guesses } = normalizedPrivate;

  const gamePlayers = useMemo(
    () => gameState?.players ?? [],
    [gameState?.players],
  );

  const canType =
    hasStarted &&
    isGameRunning &&
    !hasTimedOut &&
    guesses.length < MAX_GUESSES &&
    privateRemaining > 0;

  const activeRowIndex = canType ? guesses.length : -1;

  const isInteractionLocked = !hasStarted || !isGameRunning || hasTimedOut;

  const guessCount = guesses.length;
  useEffect(() => {
    setDraft("");
  }, [guessCount]);

  const keyboardStates = useMemo(
    () => keyboardLetterStates(guesses),
    [guesses],
  );

  const appendLetter = useCallback(
    (letter: string) => {
      const L = letter.toUpperCase();
      if (!/^[A-Z]$/.test(L)) return;
      setDraft((d) => (canType && d.length < 5 ? d + L : d));
    },
    [canType],
  );

  const removeLastLetter = useCallback(() => {
    setDraft((d) => d.slice(0, -1));
  }, []);

  const submitGuess = useCallback(async () => {
    const trimmed = draft.trim().toUpperCase();
    if (trimmed.length !== 5 || !/^[A-Z]{5}$/.test(trimmed)) {
      showGameToast({
        variant: "error",
        message: "Enter exactly 5 letters.",
      });
      return;
    }

    if (
      !sessionCode ||
      !gameState ||
      !canType ||
      isSubmitting ||
      isInteractionLocked
    ) {
      return;
    }

    const word = trimmed.toLowerCase();

    try {
      setIsSubmitting(true);
      const connection = await startConnection();
      await connection.invoke("SubmitAction", sessionCode, {
        type: "guess",
        data: { word },
      });
    } catch (err) {
      console.error(err);
      setError("Failed to submit guess.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    draft,
    sessionCode,
    gameState,
    canType,
    isSubmitting,
    isInteractionLocked,
    setError,
  ]);

  useEffect(() => {
    if (!canType) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "Enter") {
        e.preventDefault();
        void submitGuess();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        removeLastLetter();
        return;
      }

      if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        appendLetter(e.key);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canType, submitGuess, appendLetter, removeLastLetter]);

  return (
    <div className={styles.whole}>
      <GameHeader sessionCode={sessionCode!} />
      <div className={styles.page}>
        <div className={styles.layout}>
          <aside className={styles.playersPanel}>
            <div className={styles.label}>
              <img src={IconTeam} alt="team" width={25} height={25} />
              <h2 className={styles.panelTitle}>Players</h2>
            </div>
            <hr />

            {publicState?.players?.length ? (
              <ul className={styles.playerList}>
                {publicState.players.map((player) => {
                  const gamePlayer = gamePlayers.find(
                    (p) => p.playerId === player.playerId,
                  );
                  const guessesUsed =
                    gamePlayer != null
                      ? Math.max(0, MAX_GUESSES - gamePlayer.remainingGuesses)
                      : null;

                  return (
                    <li key={player.playerId} className={styles.playerItem}>
                      <div className={styles.playerNameRow}>
                        <span>{player.nickname}</span>
                        {!player.isConnected && (
                          <span className={styles.disconnectedTag}>
                            Disconnected
                          </span>
                        )}
                      </div>

                      {hasStarted && guessesUsed != null && (
                        <div className={styles.playerMeta}>
                          <span>
                            Guesses: {guessesUsed} / {MAX_GUESSES}
                          </span>
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

          <main className={styles.gamePanel}>
            <div className={styles.topBar}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Wordle</h1>
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
                <div className={styles.gameSectionHeader}>
                  <div className={styles.content}>
                    <h2 className={styles.sectionTitle}>
                      Work together to guess the hidden word.
                    </h2>

                    <p className={styles.hint}>3 guesses per player</p>

                    <div className={styles.colorContainer}>
                      <div className={styles.colorDiv}>
                        <div
                          className={styles.colorItem}
                          style={{ backgroundColor: "#f5793a" }}
                        />
                        <span className={styles.colorItemText}>
                          Letter is in correct position
                        </span>
                      </div>

                      <div className={styles.colorDiv}>
                        <div
                          className={styles.colorItem}
                          style={{ backgroundColor: "#85c0f9" }}
                        />
                        <span className={styles.colorItemText}>
                          Letter is in the word but in the wrong position
                        </span>
                      </div>

                      <div className={styles.colorDiv}>
                        <div
                          className={styles.colorItem}
                          style={{ backgroundColor: "#3a3a3c" }}
                        />
                        <span className={styles.colorItemText}>
                          Letter is not in the word
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.wordGridWrap}>
                  <div className={styles.wordRows}>
                    {[0, 1, 2].map((rowIndex) => {
                      const guess = guesses[rowIndex];
                      const isDraftRow = rowIndex === activeRowIndex;

                      return (
                        <div
                          key={rowIndex}
                          className={styles.wordRow}
                          aria-label={
                            guess
                              ? `Guess ${rowIndex + 1} result`
                              : isDraftRow
                                ? `Guess ${rowIndex + 1} (typing)`
                                : `Guess ${rowIndex + 1} (empty)`
                          }
                        >
                          {Array.from({ length: 5 }, (_, col) => {
                            if (guess) {
                              const ch = guess.word[col] ?? "";
                              const st = guess.states[col] ?? "absent";
                              return (
                                <div
                                  key={col}
                                  className={`${styles.tile} ${tileClassForResult(st)}`}
                                >
                                  {ch.toUpperCase()}
                                </div>
                              );
                            }

                            if (isDraftRow) {
                              const ch = draft[col] ?? "";
                              const isCaretCol =
                                col === draft.length && draft.length < 5;
                              return (
                                <div
                                  key={col}
                                  className={`${styles.tile} ${styles.tileDraft} ${isCaretCol ? styles.tileDraftActive : ""}`}
                                >
                                  {ch}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={col}
                                className={`${styles.tile} ${styles.tileInactive}`}
                              >
                                {""}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className={styles.keyboard}
                    role="group"
                    aria-label="On-screen keyboard"
                  >
                    {[KEYBOARD_ROW_1, KEYBOARD_ROW_2, KEYBOARD_ROW_3].map(
                      (row, ri) => (
                        <div key={ri} className={styles.keyboardRow}>
                          {row.map((letter) => {
                            const st = keyboardStates.get(letter);
                            const stateClass =
                              st === "correct"
                                ? styles.keyboardKeyCorrect
                                : st === "present"
                                  ? styles.keyboardKeyPresent
                                  : st === "absent"
                                    ? styles.keyboardKeyAbsent
                                    : styles.keyboardKeyDefault;
                            const keyDisabled =
                              !canType || isSubmitting || draft.length >= 5;
                            return (
                              <button
                                key={letter}
                                type="button"
                                className={`${styles.keyboardKey} ${stateClass}`}
                                aria-label={`Letter ${letter}`}
                                disabled={keyDisabled}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => appendLetter(letter)}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      ),
                    )}
                  </div>

                  <div className={styles.guessRow}>
                    <button
                      type="button"
                      className={styles.guessButton}
                      disabled={isInteractionLocked || isSubmitting || !canType}
                      onClick={() => void submitGuess()}
                    >
                      Guess
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>

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
          winTitle="You guessed the word!"
          winMessage="Your team found the secret word."
          loseTitle="Guesses used up"
          loseMessage="The team did not guess the word in time. Check the toast for the answer if shown."
          timeoutTitle="Time over"
          timeoutMessage="You ran out of time."
        />
      </div>
    </div>
  );
}
