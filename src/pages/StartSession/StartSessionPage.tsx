import styles from "./StartSessionPage.module.css";
import { useGetUser } from "../../api/useGetUser";
import { useStartSession } from "../../api/useStartSession";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import SessionModal from "../../components/modals/SessionModal";
import Header from "../../components/Headers/LoggedInHeader";
import { useGetLeaderSessions } from "../../api/useGetLeaderSessions";

function StartSession() {
  const navigate = useNavigate();
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  const userId = localStorage.getItem("userId");
  if (userId === null) {
    return <div className={styles.error}>No user ID found.</div>;
  }

  const { data: user, isLoading, error, refetch } = useGetUser(userId);
  const { mutate, isPending } = useStartSession();

  const { data: sessions = [], isLoading: sessionsLoading } =
    useGetLeaderSessions(userId);

  const activeSessions = sessions.filter((s) => !s.completedAtUtc);

  const finishedSessions = sessions.filter((s) => s.completedAtUtc);

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;
  if (!user) {
    return <div className={styles.error}>User not found.</div>;
  }
  const noCreds = user.remainingCredits === 0;

  const handleStartSession = () => {
    mutate(
      { LeaderId: userId },
      {
        onSuccess: (data) => {
          setSessionCode(data.sessionCode);
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
    if (!sessionCode) {
      return <div className={styles.error}>Error. No session code.</div>;
    }
    sessionStorage.setItem("sessionCode", sessionCode);
    navigate(`/waiting-room/${sessionCode}`);
  };

  return (
    <div className={styles.page}>
      <Header />
      <div>
        <p>Hello, {user.displayName}!</p>
      </div>
      <div>
        <p>
          You have {user.remainingCredits} remaining game sessions.
          <a href="/buy">Buy more credits.</a>
        </p>
      </div>
      <div>
        <button
          className={styles.elegante}
          onClick={handleStartSession}
          disabled={isPending || noCreds}
        >
          <span className={styles.text}>
            {isPending ? "Starting..." : "START NEW GAME"}
          </span>
        </button>
      </div>

      <div className={styles.sessionsSection}>
        <h2 className={styles.sectionTitle}>Your Sessions</h2>

        {sessionsLoading ? (
          <p>Loading sessions...</p>
        ) : (
          <>
            {/* ACTIVE SESSIONS */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                {/* <div className={styles.liveDot}></div> */}
                <h3>Active Sessions</h3>
              </div>

              {activeSessions.length === 0 ? (
                <p className={styles.emptyText}>No active sessions.</p>
              ) : (
                <table className={styles.sessionTable}>
                  <thead>
                    <tr>
                      <th>Session Code</th>
                      <th>Started</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {activeSessions.map((session) => (
                      <tr key={session.sessionId}>
                        <td className={styles.codeCell}>
                          {session.sessionCode}
                        </td>

                        <td>
                          {new Date(session.createdAtUtc).toLocaleString()}
                        </td>

                        <td>
                          <button className={styles.smallButton}>Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* FINISHED SESSIONS */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Finished Sessions</h3>
              </div>

              {finishedSessions.length === 0 ? (
                <p className={styles.emptyText}>No finished sessions.</p>
              ) : (
                <table className={styles.sessionTable}>
                  <thead>
                    <tr>
                      <th>Session Code</th>
                      <th>Finished</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {finishedSessions.map((session) => (
                      <tr key={session.sessionId}>
                        <td className={styles.codeCell}>
                          {session.sessionCode}
                        </td>

                        <td>
                          {new Date(session.completedAtUtc!).toLocaleString()}
                        </td>

                        <td>
                          <button className={styles.reportButton}>
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* {sessionCode && (
        <div className={styles.code}>
          <div className={styles.card}>
            <p>
              Game Session Code: <strong>{sessionCode}</strong>{" "}
            </p>
            <button className={styles.elegante} onClick={handleJoinGame}>
              Go to the game
            </button>
          </div>
        </div>
      )} */}
      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessionCode={sessionCode}
        onJoin={handleJoinGame}
      />
    </div>
  );
}

export default StartSession;
