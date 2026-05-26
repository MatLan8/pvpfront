import styles from "./StartSessionPage.module.css";
import { useGetUser } from "../../api/useGetUser";
import { useStartSession } from "../../api/useStartSession";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import SessionModal from "../../components/modals/SessionModal";
import Header from "../../components/Headers/LoggedInHeader";
import { useGetLeaderSessions } from "../../api/useGetLeaderSessions";

interface SkillScores {
  communication: { score: number };
  teamwork: { score: number };
  problemSolving: { score: number };
  leadership: { score: number };
  timeManagement: { score: number };
}

interface PlayerEvaluation {
  playerId: string;
  nickname: string;
  overallScore: number;
  skills: SkillScores;
}

interface ReportJson {
  teamEvaluation: { overallScore: number };
  playerEvaluations: PlayerEvaluation[];
}

type ActiveTab = "active" | "finished";

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 75
      ? styles.scorePillGreen
      : score >= 50
        ? styles.scorePillAmber
        : styles.scorePillRed;
  return <span className={`${styles.scorePill} ${color}`}>{score}</span>;
}

function SkillBar({ label, score }: { label: string; score: number }) {
  return (
    <div className={styles.skillBar}>
      <span className={styles.skillBarLabel}>{label}</span>
      <div className={styles.skillBarTrack}>
        <div className={styles.skillBarFill} style={{ width: `${score}%` }} />
      </div>
      <span className={styles.skillBarValue}>{score}</span>
    </div>
  );
}

function FinishedSessionRow({ session }: { session: any }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  let report: ReportJson | null = null;
  try {
    report = session.rawJson ? JSON.parse(session.rawJson) : null;
  } catch {
    report = null;
  }

  const teamScore = report?.teamEvaluation?.overallScore ?? null;
  const players = report?.playerEvaluations ?? [];

  const date = new Date(session.reportCreatedAtUtc!).toLocaleDateString(
    undefined,
    { day: "2-digit", month: "short", year: "numeric" },
  );

  return (
    <>
      <tr
        className={`${styles.finishedRow} ${expanded ? styles.finishedRowExpanded : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className={styles.dateCell}>
          <span className={styles.datePrimary}>{date}</span>
        </td>

        <td className={styles.playersCell}>
          <div className={styles.playerChips}>
            {players.slice(0, 4).map((p) => (
              <span key={p.playerId} className={styles.playerChip}>
                <span className={styles.playerAvatar}>
                  {p.nickname.charAt(0).toUpperCase()}
                </span>
                <span className={styles.playerName}>{p.nickname}</span>
                <ScorePill score={p.overallScore} />
              </span>
            ))}
            {players.length === 0 && (
              <span className={styles.noData}>No players recorded</span>
            )}
          </div>
        </td>

        <td className={styles.teamScoreCell}>
          {teamScore !== null ? (
            <ScorePill score={teamScore} />
          ) : (
            <span className={styles.noData}>—</span>
          )}
        </td>

        <td className={styles.actionsCell}>
          <button
            className={styles.expandToggle}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className={styles.reportButton}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/report/${session.sessionCode}`);
            }}
          >
            Full report
          </button>
        </td>
      </tr>

      {expanded && report && (
        <tr className={styles.expandedRow}>
          <td colSpan={4}>
            <div className={styles.expandedContent}>
              <div className={styles.expandedGrid}>
                {players.map((p) => (
                  <div key={p.playerId} className={styles.playerCard}>
                    <div className={styles.playerCardHeader}>
                      <div className={styles.playerCardAvatar}>
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={styles.playerCardName}>{p.nickname}</p>
                        <p className={styles.playerCardScore}>
                          Overall: <strong>{p.overallScore}</strong>
                        </p>
                      </div>
                    </div>
                    <div className={styles.skillBars}>
                      <SkillBar
                        label="Communication"
                        score={p.skills.communication.score}
                      />
                      <SkillBar
                        label="Teamwork"
                        score={p.skills.teamwork.score}
                      />
                      <SkillBar
                        label="Problem-solving"
                        score={p.skills.problemSolving.score}
                      />
                      <SkillBar
                        label="Leadership"
                        score={p.skills.leadership.score}
                      />
                      <SkillBar
                        label="Time mgmt"
                        score={p.skills.timeManagement.score}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StartSession() {
  const navigate = useNavigate();
  const [selectedSessionCode, setSelectedSessionCode] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const userId = localStorage.getItem("userId");
  if (userId === null) {
    return <div className={styles.error}>No user ID found.</div>;
  }

  const { data: user, isLoading, error, refetch } = useGetUser(userId);
  const { mutate, isPending } = useStartSession();
  const { data: sessions = [], isLoading: sessionsLoading } =
    useGetLeaderSessions(userId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;
  if (!user) return <div className={styles.error}>User not found.</div>;

  const noCreds = user.remainingCredits === 0;
  const activeSessions = sessions.filter((s) => !s.reportCreatedAtUtc);
  const finishedSessions = sessions.filter((s) => s.reportCreatedAtUtc);

  const handleStartSession = () => {
    mutate(
      { LeaderId: userId },
      {
        onSuccess: (data) => {
          setSelectedSessionCode(data.sessionCode);
          setIsModalOpen(true);
          refetch();
        },
        onError: (error) => {
          console.error("Failed to start session:", error.Error);
          alert(`Failed to start session: ${error.Error}`);
        },
      },
    );
  };

  const handleJoinGame = () => {
    sessionStorage.setItem("nickname", user.displayName);
    sessionStorage.setItem("playerId", userId);
    if (!selectedSessionCode) return;
    sessionStorage.setItem("sessionCode", selectedSessionCode);
    navigate(`/waiting-room/${selectedSessionCode}`);
  };

  return (
    <div className={styles.page}>
      <Header />

      {/* ── Hero / top section ── */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.greeting}>Hello, {user.displayName}</p>
          <p className={styles.credits}>
            <span className={styles.creditsNumber}>
              {user.remainingCredits}
            </span>
            <span className={styles.creditsLabel}>
              {user.remainingCredits === 1 ? "session" : "sessions"} remaining.
            </span>
            <a href="/buy" className={styles.buyLink}>
              Buy more
            </a>
          </p>
        </div>

        <div className={styles.heroActions}>
          {/* Secondary: bulk sessions (placeholder) */}
          <button
            className={styles.secondaryAction}
            onClick={() => alert("Multiple session creation coming soon!")}
            title="Start multiple sessions at once (coming soon)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="1"
                y="1"
                width="6"
                height="6"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="9"
                y="1"
                width="6"
                height="6"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="1"
                y="9"
                width="6"
                height="6"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="9"
                y="9"
                width="6"
                height="6"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            Start multiple sessions
          </button>

          {/* Primary: start new game */}
          <button
            className={styles.primaryAction}
            onClick={handleStartSession}
            disabled={isPending || noCreds}
          >
            {isPending ? (
              <>
                <span className={styles.spinner} />
                Starting…
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8 2v12M2 8h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Start new session
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === "active" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Active
          {activeSessions.length > 0 && (
            <span className={styles.tabBadge}>{activeSessions.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "finished" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("finished")}
        >
          Finished
          {finishedSessions.length > 0 && (
            <span className={styles.tabBadge}>{finishedSessions.length}</span>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      {sessionsLoading ? (
        <p className={styles.loading}>Loading sessions…</p>
      ) : (
        <>
          {/* ACTIVE SESSIONS — cards */}
          {activeTab === "active" && (
            <div className={styles.activeGrid}>
              {activeSessions.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      opacity=".3"
                    />
                    <path
                      d="M14 20h12M20 14v12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity=".5"
                    />
                  </svg>
                  <p>No active sessions. Start one above!</p>
                </div>
              ) : (
                activeSessions.map((session) => (
                  <button
                    key={session.sessionId}
                    className={styles.activeCard}
                    onClick={() => {
                      setSelectedSessionCode(session.sessionCode);
                      setIsModalOpen(true);
                    }}
                  >
                    <span className={styles.activeCardPulse} />
                    <span className={styles.activeCardCode}>
                      {session.sessionCode}
                    </span>
                    <span className={styles.activeCardDate}>
                      {new Date(session.createdAtUtc).toLocaleString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                    <span className={styles.activeCardOpen}>Open →</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* FINISHED SESSIONS — table */}
          {activeTab === "finished" && (
            <div className={styles.tableWrapper}>
              {finishedSessions.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      opacity=".3"
                    />
                    <path
                      d="M13 20l5 5 9-9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity=".5"
                    />
                  </svg>
                  <p>No finished sessions yet.</p>
                </div>
              ) : (
                <table className={styles.sessionTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "110px" }}>Date</th>
                      <th>Players</th>
                      <th style={{ width: "90px" }}>Team score</th>
                      <th style={{ width: "130px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {finishedSessions.map((session) => (
                      <FinishedSessionRow
                        key={session.sessionId}
                        session={session}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessionCode={selectedSessionCode}
        onJoin={handleJoinGame}
      />
    </div>
  );
}

export default StartSession;
