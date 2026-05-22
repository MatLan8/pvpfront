import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import styles from "./PeerEvaluationPage.module.css";
import GameHeader from "../../components/GameHeader/GameHeader";
import ReportLoadingPage from "../../components/ReportLoadingPage/ReportLoadingPage";
import { usePeerEvaluationData } from "./usePeerEvaluation";

// =====================================================
// Types
// =====================================================

interface PeerEvaluationRequest {
  evaluatorPlayerId: string;
  evaluatedPlayerId: string;
  communicationScore: number;
  teamworkScore: number;
  problemSolvingScore: number;
  leadershipScore: number;
  timeManagementScore: number;
  comment?: string;
}

// =====================================================
// API
// =====================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function submitPeerEvaluations(
  sessionCode: string,
  evaluations: PeerEvaluationRequest[],
): Promise<{ success: boolean }> {
  const { data } = await axios.post<{ success: boolean }>(
    `${API_BASE}/api/sessions/${sessionCode}/peer-evaluations`,
    evaluations,
  );
  return data;
}

// =====================================================
// Star Rating Component
// =====================================================

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function StarRating({ label, value, onChange, disabled }: StarRatingProps) {
  return (
    <div className={styles.starRow}>
      <span className={styles.starLabel}>{label}</span>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${styles.starButton} ${star <= value ? styles.starFilled : ""}`}
            onClick={() => !disabled && onChange(star)}
            disabled={disabled}
            aria-label={`${star} star`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function PeerEvaluationPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use the dedicated hook for peer evaluation data
  const {
    playerId,
    otherPlayers,
    status,
    isLoading,
    error,
  } = usePeerEvaluationData(sessionCode!);

  const [evaluations, setEvaluations] = useState<
    Record<string, PeerEvaluationRequest>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasAlreadySubmitted = status?.submittedPlayerIds.includes(playerId);

  // Redirect if no session code
  useEffect(() => {
    if (!sessionCode) {
      navigate("/");
    }
  }, [sessionCode, navigate]);

  if (!sessionCode) {
    return null;
  }

  if (isLoading) {
    return <ReportLoadingPage text="Loading peer evaluation..." />;
  }

  if (error) {
    return (
      <div>
        <GameHeader sessionCode={sessionCode} />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.successCard}>
              <h1>Unable to Load</h1>
              <p>Could not connect to the session. Please return to the game.</p>
              <button
                type="button"
                className={styles.continueButton}
                onClick={() => navigate("/")}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (otherPlayers.length === 0) {
    return (
      <div>
        <GameHeader sessionCode={sessionCode} />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.successCard}>
              <h1>No Players Found</h1>
              <p>Could not load player data. Please return to the game.</p>
              <button
                type="button"
                className={styles.continueButton}
                onClick={() => navigate("/")}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasAlreadySubmitted || submitted) {
    return (
      <div>
        <GameHeader sessionCode={sessionCode} />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.successCard}>
              <div className={styles.successIcon}>✓</div>
              <h1>Evaluation Submitted</h1>
              <p>Thank you for evaluating your teammates.</p>
              {status && !status.allSubmitted && (
                <>
                  <p className={styles.hint}>
                    Waiting for other players to complete their evaluations...
                  </p>
                  <p className={styles.progress}>
                    {status.submittedCount} / {otherPlayers.length + 1} players submitted
                  </p>
                </>
              )}
              {status?.allSubmitted && (
                <button
                  type="button"
                  className={styles.continueButton}
                  onClick={() => navigate(`/report`)}
                >
                  View Your Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Update evaluation for a player
  const updateEvaluation = useCallback(
    (
      evaluatedPlayerId: string,
      skill: keyof Omit<PeerEvaluationRequest, "evaluatorPlayerId" | "evaluatedPlayerId" | "comment">,
      value: number,
    ) => {
      setEvaluations((prev) => {
        const existing = prev[evaluatedPlayerId] || {
          evaluatorPlayerId: playerId,
          evaluatedPlayerId,
          communicationScore: 3,
          teamworkScore: 3,
          problemSolvingScore: 3,
          leadershipScore: 3,
          timeManagementScore: 3,
          comment: "",
        };

        return {
          ...prev,
          [evaluatedPlayerId]: {
            ...existing,
            [skill]: value,
          },
        };
      });
    },
    [playerId],
  );

  const handleSubmit = async () => {
    if (!sessionCode) return;

    const evals = Object.values(evaluations);
    const requiredCount = otherPlayers.length + 1; // +1 for AI assistant

    if (evals.length < requiredCount) {
      setSubmitError(`Please rate all ${requiredCount} teammates before submitting.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitPeerEvaluations(sessionCode, evals);
      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ["peer-evaluation-status", sessionCode] });
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <GameHeader sessionCode={sessionCode} />

      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1>Peer Evaluation</h1>
            <p>Rate your teammates on their soft skills during the game.</p>
            <p className={styles.subtitle}>
              Rate each player 1-5 stars on each skill.
            </p>
          </header>

          <div className={styles.playersGrid}>
            {otherPlayers.map((player) => {
              const eval_ = evaluations[player.playerId] || {
                communicationScore: 3,
                teamworkScore: 3,
                problemSolvingScore: 3,
                leadershipScore: 3,
                timeManagementScore: 3,
              };

              return (
                <article key={player.playerId} className={styles.playerCard}>
                  <h2 className={styles.playerName}>{player.nickname}</h2>

                  <div className={styles.ratings}>
                    <StarRating
                      label="Communication"
                      value={eval_.communicationScore}
                      onChange={(v) =>
                        updateEvaluation(player.playerId, "communicationScore", v)
                      }
                    />
                    <StarRating
                      label="Teamwork"
                      value={eval_.teamworkScore}
                      onChange={(v) =>
                        updateEvaluation(player.playerId, "teamworkScore", v)
                      }
                    />
                    <StarRating
                      label="Problem Solving"
                      value={eval_.problemSolvingScore}
                      onChange={(v) =>
                        updateEvaluation(player.playerId, "problemSolvingScore", v)
                      }
                    />
                    <StarRating
                      label="Leadership"
                      value={eval_.leadershipScore}
                      onChange={(v) =>
                        updateEvaluation(player.playerId, "leadershipScore", v)
                      }
                    />
                    <StarRating
                      label="Time Management"
                      value={eval_.timeManagementScore}
                      onChange={(v) =>
                        updateEvaluation(player.playerId, "timeManagementScore", v)
                      }
                    />
                  </div>

                  <div className={styles.commentSection}>
                    <label className={styles.commentLabel}>
                      Additional Comments (optional)
                    </label>
                    <textarea
                      className={styles.commentInput}
                      placeholder="Share any additional thoughts..."
                      rows={2}
                      value={eval_.comment || ""}
                      onChange={(e) =>
                        setEvaluations((prev) => ({
                          ...prev,
                          [player.playerId]: {
                            ...(prev[player.playerId] || {
                              evaluatorPlayerId: playerId,
                              evaluatedPlayerId: player.playerId,
                              communicationScore: 3,
                              teamworkScore: 3,
                              problemSolvingScore: 3,
                              leadershipScore: 3,
                              timeManagementScore: 3,
                            }),
                            comment: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </article>
              );
            })}
          </div>

          {/* AI Assistant Section */}
          <div className={styles.aiSection}>
            <h2 className={styles.aiTitle}>AI Game Assistant</h2>
            <p className={styles.aiSubtitle}>
              Rate the AI assistant that helped during the game.
            </p>

            <div className={styles.ratings}>
              <StarRating
                label="Communication"
                value={
                  evaluations["ai_assistant"]?.communicationScore ?? 3
                }
                onChange={(v) =>
                  setEvaluations((prev) => ({
                    ...prev,
                    ai_assistant: {
                      evaluatorPlayerId: playerId,
                      evaluatedPlayerId: "ai_assistant",
                      communicationScore: v,
                      teamworkScore:
                        prev.ai_assistant?.teamworkScore ?? 3,
                      problemSolvingScore:
                        prev.ai_assistant?.problemSolvingScore ?? 3,
                      leadershipScore:
                        prev.ai_assistant?.leadershipScore ?? 3,
                      timeManagementScore:
                        prev.ai_assistant?.timeManagementScore ?? 3,
                    },
                  }))
                }
              />
              <StarRating
                label="Teamwork"
                value={evaluations["ai_assistant"]?.teamworkScore ?? 3}
                onChange={(v) =>
                  setEvaluations((prev) => ({
                    ...prev,
                    ai_assistant: {
                      ...(prev.ai_assistant || {
                        evaluatorPlayerId: playerId,
                        evaluatedPlayerId: "ai_assistant",
                        communicationScore: 3,
                        problemSolvingScore: 3,
                        leadershipScore: 3,
                        timeManagementScore: 3,
                      }),
                      teamworkScore: v,
                    },
                  }))
                }
              />
              <StarRating
                label="Problem Solving"
                value={evaluations["ai_assistant"]?.problemSolvingScore ?? 3}
                onChange={(v) =>
                  setEvaluations((prev) => ({
                    ...prev,
                    ai_assistant: {
                      ...(prev.ai_assistant || {
                        evaluatorPlayerId: playerId,
                        evaluatedPlayerId: "ai_assistant",
                        communicationScore: 3,
                        teamworkScore: 3,
                        leadershipScore: 3,
                        timeManagementScore: 3,
                      }),
                      problemSolvingScore: v,
                    },
                  }))
                }
              />
              <StarRating
                label="Leadership"
                value={evaluations["ai_assistant"]?.leadershipScore ?? 3}
                onChange={(v) =>
                  setEvaluations((prev) => ({
                    ...prev,
                    ai_assistant: {
                      ...(prev.ai_assistant || {
                        evaluatorPlayerId: playerId,
                        evaluatedPlayerId: "ai_assistant",
                        communicationScore: 3,
                        teamworkScore: 3,
                        problemSolvingScore: 3,
                        timeManagementScore: 3,
                      }),
                      leadershipScore: v,
                    },
                  }))
                }
              />
              <StarRating
                label="Time Management"
                value={evaluations["ai_assistant"]?.timeManagementScore ?? 3}
                onChange={(v) =>
                  setEvaluations((prev) => ({
                    ...prev,
                    ai_assistant: {
                      ...(prev.ai_assistant || {
                        evaluatorPlayerId: playerId,
                        evaluatedPlayerId: "ai_assistant",
                        communicationScore: 3,
                        teamworkScore: 3,
                        problemSolvingScore: 3,
                        leadershipScore: 3,
                      }),
                      timeManagementScore: v,
                    },
                  }))
                }
              />
            </div>
          </div>

          {submitError && <p className={styles.error}>{submitError}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => void handleSubmit()}
              disabled={
                isSubmitting ||
                Object.keys(evaluations).length < otherPlayers.length + 1
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Evaluations"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}