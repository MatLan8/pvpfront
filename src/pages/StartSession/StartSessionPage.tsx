import styles from "./StartSessionPage.module.css";
import { useGetUser } from "../../api/useGetUser";
import { useStartSession } from "../../api/useStartSession";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function StartSession() {
    const navigate = useNavigate();
    const [sessionCode, setSessionCode] = useState<string | null>(null);
    
    const userId = localStorage.getItem("userId");
    if (userId === null) {
        return <div className={styles.error}>No user ID found.</div>
    }

    const { data: user, isLoading, error, refetch } = useGetUser(userId);
    const { mutate, isPending } = useStartSession();

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>{error.message}</div>;
    if (!user) {
        return <div className={styles.error}>User not found.</div>
    }
    const noCreds = user.remainingCredits === 0;

    const handleStartSession = () => {
        mutate(
            { LeaderId: userId },
            {
                onSuccess: (data) => {
                    setSessionCode(data.sessionCode);
                    refetch();
                },
                onError: (error) => {
                    console.error("Failed to start session:", error.Error);
                    alert(`Failed to start session: ${error.Error}`);
                },
            }
        );
    };

    const handleJoinGame = () => {
        sessionStorage.setItem("nickname", user.displayName);
        sessionStorage.setItem("playerId", userId);
        if (!sessionCode) {
            return <div className={styles.error}>Error. No session code.</div>
        }
        sessionStorage.setItem("sessionCode", sessionCode);
        navigate(`/waiting-room/${sessionCode}`)
    }

    return (
        <div className={styles.page}>
            <div>
                <p>Hello, {user.displayName}</p>
            </div>
            <hr />
            <div>
                <p>You have {user.remainingCredits} remaining game sessions</p>

            </div>
            <div >
                <button className={styles.elegante}
                    onClick={handleStartSession}
                    disabled={isPending || noCreds}
                >
                    <span className={styles.text}>{isPending ? "Starting..." : "START NEW GAME"}</span>
                </button>

            </div>
            {sessionCode && (
                <div className={styles.code}>
                    <div className={styles.card}>
                        <p>Game Session Code: <strong>{sessionCode}</strong> </p>
                        <button 
                            className={styles.elegante}
                            onClick={handleJoinGame}>
                                Go to the game
                            </button>
                    </div>
                </div>
            )}

        </div>
    );

}

export default StartSession;